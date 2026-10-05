"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { SegmentedControl } from "@/components/common/segmented-control";
import { EmptyState, PageHeader } from "@/components/common/states";
import {
  ModuleDialog,
  type ModuleDialogTarget,
} from "@/components/features/module-dialog";
import { ModuleAvatar } from "@/components/features/module-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import {
  MODULE_ACTIONS,
  getModuleOrganizationCount,
  getModuleTree,
  type ModuleNode,
} from "@/lib/permissions/modules";
import {
  ModuleError,
  deleteModule,
  getModuleUsage,
} from "@/lib/services/module-service";
import { cn } from "@/lib/utils";
import type { ModuleAction, OrganizationType, PlatformModule } from "@/types";

/**
 * Columns shared by the header and every tree row, so they line up. Narrow
 * screens keep only the module, its available actions and the menu.
 */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_11rem_6.5rem_7.5rem_2rem]";

/**
 * Where the tree's connector runs: the row's left padding (12px), the
 * expand button (24px) and its gap (8px), then half the module tile (14px).
 */
const CONNECTOR_X = "left-[57.5px]";

export default function PlatformModulesPage() {
  return (
    <PlatformAdminGuard>
      <ModulesCatalog />
    </PlatformAdminGuard>
  );
}

function ModulesCatalog() {
  const state = useAppState();
  const { user } = useSession();
  const [audience, setAudience] = useState<OrganizationType>("brand");
  const [dialog, setDialog] = useState<ModuleDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<PlatformModule | null>(null);
  const [query, setQuery] = useState("");
  // Everything starts expanded; this holds the modules folded away.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const tree = getModuleTree(state, audience);
  const subCount = tree.reduce(
    (total, node) => total + node.children.length,
    0,
  );
  const usage = deleting ? getModuleUsage(state, deleting.id) : null;
  const parentsWithChildren = tree
    .filter((node) => node.children.length > 0)
    .map((node) => node.module.id);

  const search = query.trim().toLowerCase();
  const matches = (entry: PlatformModule) =>
    entry.name.toLowerCase().includes(search) ||
    entry.slug.includes(search) ||
    (entry.group?.toLowerCase().includes(search) ?? false);

  // A matching sub-module keeps its parent in view, so the hierarchy stays
  // readable; a matching module brings all of its sub-modules along.
  const visible: ModuleNode[] = search
    ? tree.flatMap((node) => {
        if (matches(node.module)) return [node];
        const children = node.children.filter(matches);
        return children.length > 0 ? [{ module: node.module, children }] : [];
      })
    : tree;

  function organizationCount(moduleId: string) {
    return getModuleOrganizationCount(state, moduleId);
  }

  function toggle(moduleId: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  const allCollapsed =
    parentsWithChildren.length > 0 &&
    parentsWithChildren.every((id) => collapsed.has(id));

  return (
    <>
      <PageHeader
        title="Modules"
        description="The catalog the Platform Admin enables modules from, as a tree: each module with the sub-modules under it, and the actions it supports. Brands and Brokerages have separate catalogs; the same slug can exist in both as different modules. Seeded from the modules caboodle.web checks today."
        actions={
          <Button
            size="sm"
            onClick={() => setDialog({ kind: "create", audience })}
          >
            <Plus className="size-4" />
            New module
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Catalog"
          value={audience}
          onChange={(next) => {
            setAudience(next);
            setQuery("");
          }}
          options={[
            { value: "brand", label: "Brand modules" },
            { value: "brokerage", label: "Brokerage modules" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          {pluralize(tree.length, "module")} ·{" "}
          {pluralize(subCount, "sub-module")} ·{" "}
          {pluralize(
            state.organizations.filter((org) => org.type === audience).length,
            audience === "brand" ? "Brand" : "Brokerage",
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search modules and sub-modules"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search modules"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(search) || parentsWithChildren.length === 0}
          onClick={() =>
            setCollapsed(
              allCollapsed ? new Set() : new Set(parentsWithChildren),
            )
          }
        >
          {allCollapsed ? (
            <ChevronsUpDown className="size-3.5" />
          ) : (
            <ChevronsDownUp className="size-3.5" />
          )}
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No modules match"
          description="Search looks at names, slugs and groups."
        />
      ) : (
        <Card className="gap-0 py-0">
          <div
            className={cn(
              ROW_GRID,
              "border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground",
            )}
          >
            <span className="pl-8">Module</span>
            <span className="hidden md:block">Group</span>
            <span className="hidden text-right md:block">Organizations</span>
            <span className="text-right">Actions</span>
            <span />
          </div>
          <ul>
            {visible.map(({ module: entry, children }) => {
              const open = Boolean(search) || !collapsed.has(entry.id);
              // Only modules that already branch get the "Add sub-module"
              // leaf; a module without sub-modules offers it in its menu, so
              // the tree doesn't suggest children that aren't there.
              const showAdd = open && !search && children.length > 0;
              return (
                <li key={entry.id} className="border-b last:border-b-0">
                  <TreeRow
                    entry={entry}
                    childCount={children.length}
                    open={open}
                    connectorBelow={open && (children.length > 0 || showAdd)}
                    onToggle={
                      children.length > 0 && !search
                        ? () => toggle(entry.id)
                        : undefined
                    }
                    organizationCount={organizationCount(entry.id)}
                    onEdit={() => setDialog({ kind: "edit", entry })}
                    onAddChild={() =>
                      setDialog({
                        kind: "create",
                        audience,
                        parentId: entry.id,
                      })
                    }
                    onDelete={() => setDeleting(entry)}
                  />
                  {open && (children.length > 0 || showAdd) ? (
                    <ul aria-label={`Sub-modules of ${entry.name}`}>
                      {children.map((child, index) => (
                        <li key={child.id}>
                          <TreeRow
                            entry={child}
                            last={!showAdd && index === children.length - 1}
                            organizationCount={organizationCount(child.id)}
                            onEdit={() =>
                              setDialog({ kind: "edit", entry: child })
                            }
                            onDelete={() => setDeleting(child)}
                          />
                        </li>
                      ))}
                      {showAdd ? (
                        <li>
                          <AddChildRow
                            parentName={entry.name}
                            onClick={() =>
                              setDialog({
                                kind: "create",
                                audience,
                                parentId: entry.id,
                              })
                            }
                          />
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ModuleDialog
        target={dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {usage &&
              (usage.organizations > 0 ||
                usage.grants > 0 ||
                usage.subModules > 0)
                ? `It is disabled for ${pluralize(usage.organizations, "organization")}${
                    usage.grants > 0
                      ? ` and removed from ${pluralize(usage.grants, "custom brand access", "custom brand accesses")}`
                      : ""
                  }${
                    usage.subModules > 0
                      ? `, together with its ${pluralize(usage.subModules, "sub-module")}`
                      : ""
                  }. Everyone in those organizations loses it straight away.`
                : "No organization has it enabled, so nobody loses anything."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting || !user) return;
                try {
                  await deleteModule(deleting.id, user.id);
                  toast.success("Module deleted", {
                    description: deleting.name,
                  });
                } catch (caught) {
                  toast.error(
                    caught instanceof ModuleError
                      ? caught.message
                      : "Could not delete the module",
                  );
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * One node of the catalog tree. A module row can fold its sub-modules away; a
 * sub-module row hangs off its parent's connector line.
 */
function TreeRow({
  entry,
  childCount = 0,
  open = false,
  connectorBelow = false,
  last = false,
  onToggle,
  organizationCount,
  onEdit,
  onAddChild,
  onDelete,
}: {
  entry: PlatformModule;
  childCount?: number;
  open?: boolean;
  /** Draw the line down from this module to its first sub-module. */
  connectorBelow?: boolean;
  /** The last sub-module: its line stops at the elbow. */
  last?: boolean;
  onToggle?: () => void;
  organizationCount: number;
  onEdit: () => void;
  onAddChild?: () => void;
  onDelete: () => void;
}) {
  const isChild = Boolean(entry.parentId);

  return (
    <div
      className={cn(
        ROW_GRID,
        "relative px-3 transition-colors hover:bg-muted/40",
        isChild ? "py-1.5" : "py-2.5",
      )}
    >
      {isChild ? (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute top-0 w-px bg-border",
              CONNECTOR_X,
              last ? "h-1/2" : "bottom-0",
            )}
          />
          <span
            aria-hidden
            className={cn("absolute top-1/2 h-px w-3.5 bg-border", CONNECTOR_X)}
          />
        </>
      ) : connectorBelow ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 bottom-0 w-px bg-border",
            CONNECTOR_X,
          )}
        />
      ) : null}

      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          // Sub-modules start where the connector's elbow ends.
          isChild && "pl-[60px]",
        )}
      >
        {isChild ? null : onToggle ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${entry.name}`}
          >
            <ChevronRight
              className={cn("transition-transform", open && "rotate-90")}
            />
          </Button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        <ModuleAvatar
          entry={entry}
          className={cn("z-10", isChild && "size-6 rounded")}
          iconClassName={isChild ? "size-3" : "size-3.5"}
        />
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium",
              isChild ? "text-[13px]" : "text-sm",
            )}
          >
            {entry.name}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate font-mono">{entry.slug}</span>
            {childCount > 0 ? (
              <span className="shrink-0">
                · {pluralize(childCount, "sub-module")}
              </span>
            ) : null}
            {entry.features.length > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="shrink-0 cursor-default underline decoration-dotted underline-offset-2" />
                  }
                >
                  · {pluralize(entry.features.length, "screen")} inside
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {entry.features.join(" · ")}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        {entry.group ? (
          <Badge variant="outline" className="max-w-full truncate font-normal">
            {entry.group}
          </Badge>
        ) : null}
      </div>
      <span className="hidden text-right text-sm text-muted-foreground md:block">
        {organizationCount}
      </span>
      <div className="justify-self-end">
        <ActionsCell entry={entry} onEdit={onEdit} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions for {entry.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          {onAddChild ? (
            <DropdownMenuItem onClick={onAddChild}>
              Add sub-module
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** The last leaf under an open module: a shortcut to add a sub-module there. */
function AddChildRow({
  parentName,
  onClick,
}: {
  parentName: string;
  onClick: () => void;
}) {
  return (
    <div className="relative px-3 py-1.5">
      <span
        aria-hidden
        className={cn("absolute top-0 h-1/2 w-px bg-border", CONNECTOR_X)}
      />
      <span
        aria-hidden
        className={cn("absolute top-1/2 h-px w-3.5 bg-border", CONNECTOR_X)}
      />
      <button
        type="button"
        onClick={onClick}
        className="ml-[60px] flex items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Add a sub-module to ${parentName}`}
      >
        <span className="flex size-6 items-center justify-center rounded border border-dashed">
          <Plus className="size-3" />
        </span>
        Add sub-module
      </button>
    </div>
  );
}

/** One letter per action: view, create, update, delete, import, export. */
const ACTION_LETTER: Record<ModuleAction, string> = {
  view: "V",
  create: "C",
  update: "U",
  delete: "D",
  import: "I",
  export: "X",
};

/**
 * The actions this module supports, one letter each. Clicking opens the
 * editor, where they are changed.
 */
function ActionsCell({
  entry,
  onEdit,
}: {
  entry: PlatformModule;
  onEdit: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md px-1.5 py-0.5 font-mono text-xs tracking-wider transition-colors hover:bg-accent"
            aria-label={`Available actions in ${entry.name}`}
          />
        }
      >
        {MODULE_ACTIONS.map((action) =>
          entry.availableActions.includes(action.id) ? (
            <span key={action.id}>{ACTION_LETTER[action.id]}</span>
          ) : (
            <span key={action.id} className="text-muted-foreground/40">
              ·
            </span>
          ),
        )}
      </TooltipTrigger>
      <TooltipContent>
        {MODULE_ACTIONS.filter((action) =>
          entry.availableActions.includes(action.id),
        )
          .map((action) => action.label)
          .join(", ")}
      </TooltipContent>
    </Tooltip>
  );
}
