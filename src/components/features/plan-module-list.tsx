import { Check } from "lucide-react";

import { ModuleAvatar } from "@/components/features/module-icon";
import { buildModuleTree } from "@/lib/permissions/modules";
import { cn } from "@/lib/utils";
import type { PlatformModule } from "@/types";

/** Read-only list of what a plan includes: modules with their sub-modules. */
export function PlanModuleList({
  modules,
  className,
  dense,
}: {
  modules: PlatformModule[];
  className?: string;
  dense?: boolean;
}) {
  const tree = buildModuleTree(modules);

  if (tree.length === 0) {
    return <p className="text-sm text-muted-foreground">No modules.</p>;
  }

  return (
    <ul className={cn(dense ? "space-y-1.5" : "space-y-2.5", className)}>
      {tree.map(({ module: entry, children }) => (
        <li key={entry.id} className="flex items-start gap-2.5">
          {dense ? (
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ModuleAvatar entry={entry} />
          )}
          <div className="min-w-0">
            <p className={cn("font-medium", dense ? "text-xs" : "text-sm")}>
              {entry.name}
            </p>
            {children.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {children.map((child) => child.name).join(" · ")}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
