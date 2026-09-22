"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDemo, useSession } from "@/lib/demo/demo-provider";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { cn } from "@/lib/utils";

/**
 * The permission inspector.
 *
 * Its whole job is to make the authorization chain legible while presenting:
 * you can point at it and say "same application, different membership,
 * different role, different permissions".
 */
export function PermissionPanel() {
  const { devMode, setDevMode } = useDemo();
  const { user, organization, role, permissions, isPlatformAdmin } = useSession();
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
                  isPlatformAdmin && !role
                    ? "Platform Admin (no membership)"
                    : (role?.name ?? "No membership")
                }
              />
            </dl>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Effective permissions
              </p>
              <ScrollArea className="h-48 rounded-lg border">
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

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Resolved as user → membership for this organization → role →
              permissions. Never from a user-level role flag.
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
