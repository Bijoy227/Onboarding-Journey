"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ModuleAvatar } from "@/components/features/module-icon";
import type { ModuleNode } from "@/lib/permissions/modules";
import { cn } from "@/lib/utils";
import type { PlatformModule } from "@/types";

/**
 * Pick the modules and sub-modules an organization has enabled.
 *
 * Ticking a sub-module ticks its module too, and unticking a module drops its
 * sub-modules, so the selection always matches how access resolves.
 */
export function ModulePicker({
  tree,
  value,
  onChange,
  disabled,
}: {
  tree: ModuleNode[];
  value: string[];
  onChange: (moduleIds: string[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);

  function toggle(entry: PlatformModule, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(entry.id);
      if (entry.parentId) next.add(entry.parentId);
    } else {
      next.delete(entry.id);
      if (!entry.parentId) {
        const node = tree.find((item) => item.module.id === entry.id);
        node?.children.forEach((child) => next.delete(child.id));
      }
    }
    onChange(Array.from(next));
  }

  function setNode(node: ModuleNode, checked: boolean) {
    const next = new Set(selected);
    for (const entry of [node.module, ...node.children]) {
      if (checked) next.add(entry.id);
      else next.delete(entry.id);
    }
    onChange(Array.from(next));
  }

  const groups = Array.from(
    new Set(tree.map((node) => node.module.group ?? "Other")),
  );

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </p>
          <div className="divide-y rounded-xl border">
            {tree
              .filter((node) => (node.module.group ?? "Other") === group)
              .map((node) => {
                const childCount = node.children.length;
                const selectedChildren = node.children.filter((child) =>
                  selected.has(child.id),
                ).length;
                return (
                  <div key={node.module.id} className="p-3">
                    <PickerRow
                      entry={node.module}
                      checked={selected.has(node.module.id)}
                      onCheckedChange={(checked) =>
                        toggle(node.module, checked)
                      }
                      disabled={disabled}
                    />
                    {childCount > 0 ? (
                      <div className="mt-2 space-y-1 border-l pl-3 sm:ml-2">
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <p className="text-xs text-muted-foreground">
                            {selectedChildren} of {childCount} sub-modules
                          </p>
                          <button
                            type="button"
                            disabled={disabled}
                            className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                            onClick={() =>
                              setNode(node, selectedChildren < childCount)
                            }
                          >
                            {selectedChildren < childCount
                              ? "Select all"
                              : "Clear all"}
                          </button>
                        </div>
                        {node.children.map((child) => (
                          <PickerRow
                            key={child.id}
                            entry={child}
                            checked={selected.has(child.id)}
                            onCheckedChange={(checked) =>
                              toggle(child, checked)
                            }
                            disabled={disabled}
                            compact
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PickerRow({
  entry,
  checked,
  onCheckedChange,
  disabled,
  compact,
}: {
  entry: PlatformModule;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg",
        compact ? "px-1 py-1" : "",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(Boolean(next))}
        disabled={disabled}
        className="mt-0.5"
      />
      {compact ? null : <ModuleAvatar entry={entry} />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {entry.name}
          </span>
          {entry.group && compact ? (
            <span className="text-[11px] text-muted-foreground">
              {entry.group}
            </span>
          ) : null}
        </span>
        {!compact ? (
          <span className="block text-xs text-muted-foreground">
            {entry.description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
