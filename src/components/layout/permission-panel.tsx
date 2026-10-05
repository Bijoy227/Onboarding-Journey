"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDemo, useSession } from "@/lib/demo/demo-provider";
import { ACCESS_KIND_LABEL } from "@/lib/permissions/access";
import { MODULE_ACTIONS } from "@/lib/permissions/modules";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { cn } from "@/lib/utils";
import type { ModuleAction } from "@/types";

/** One letter per module action for the compact access column. */
const ACTION_LETTER: Record<ModuleAction, string> = {
  view: "V",
  create: "C",
  update: "U",
  delete: "D",
  import: "I",
  export: "X",
};

/**
 * The permission inspector.
 *
 * Its whole job is to make the authorization chain legible while presenting:
 * you can point at it and say "same application, different membership,
 * different role, different Brand, different access".
 */
export function PermissionPanel() {
  const { devMode, setDevMode } = useDemo();
  const {
    user,
    organization,
    role,
    permissions,
    isPlatformAdmin,
    isSupport,
    availableModules,
    brands,
    activeBrand,
    moduleAccess,
  } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  if (!devMode || !user) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 sm:inset-x-auto sm:right-4">
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-lg">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
          <Badge variant="secondary" className="font-mono text-[10px]">
            DEMO
          </Badge>
          <p className="flex-1 text-sm font-medium">Current session</p>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          >
            <ChevronDown
              className={cn("size-4 transition-transform", collapsed && "rotate-180")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDevMode(false)}
            aria-label="Hide panel"
          >
            <X className="size-4" />
          </Button>
        </div>

        {collapsed ? null : (
          <div className="space-y-3 p-3">
            <dl className="space-y-1.5 text-xs">
              <Row label="User" value={user.name} />
              <Row label="Organization" value={organization?.name ?? "—"} />
              <Row
                label="Role"
                value={
                  isSupport
                    ? "Platform Admin (support access)"
                    : isPlatformAdmin && !role
                      ? "Platform Admin (no membership)"
                      : (role?.name ?? "No membership")
                }
              />
              <Row
                label="Active brand"
                value={
                  activeBrand
                    ? `${activeBrand.brand.name} · ${ACCESS_KIND_LABEL[activeBrand.kind]}`
                    : "—"
                }
              />
              {organization?.type === "brokerage" ? (
                <Row label="Brands reachable" value={String(brands.length)} />
              ) : null}
            </dl>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Organization permissions
              </p>
              <ScrollArea className="h-40 rounded-lg border">
                <ul className="divide-y">
                  {PERMISSIONS.map((permission) => {
                    const granted = permissions.includes(permission.id);
                    return (
                      <li
                        key={permission.id}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 font-mono text-[11px]",
                          !granted && "text-muted-foreground",
                        )}
                      >
                        {granted ? (
                          <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="size-3.5 shrink-0" />
                        )}
                        {permission.id}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </div>

            {organization ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Modules on {activeBrand?.brand.name ?? "no brand"} (
                  {Object.keys(moduleAccess).length} of {availableModules.length}{" "}
                  available)
                </p>
                <ScrollArea className="h-32 rounded-lg border">
                  {availableModules.length === 0 ? (
                    <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                      Nothing is enabled for this organization or Brand yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {availableModules.map((entry) => {
                        const actions = moduleAccess[entry.id];
                        return (
                          <li
                            key={entry.id}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 text-[11px]",
                              !actions && "text-muted-foreground",
                              entry.parentId && "pl-6",
                            )}
                          >
                            <span className="flex-1 truncate font-mono">
                              {entry.slug}
                            </span>
                            <span className="shrink-0 font-mono tracking-wider">
                              {MODULE_ACTIONS.map((action) =>
                                actions?.includes(action.id)
                                  ? ACTION_LETTER[action.id]
                                  : "·",
                              ).join("")}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            ) : null}

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Permissions: user → membership → role. Modules: what is available
              on this brand (the organization&apos;s own modules, plus the
              Brand&apos;s from a Brokerage) ∩ (admin role, or the Brand Access
              for this brand: Full or Custom). V C U D I X = view, create, update,
              delete, import, export.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
