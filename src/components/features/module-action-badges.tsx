import { Badge } from "@/components/ui/badge";
import { MODULE_ACTIONS } from "@/lib/permissions/modules";
import { cn } from "@/lib/utils";
import type { ModuleAction } from "@/types";

/** The actions a member holds in a module, as small chips. */
export function ModuleActionBadges({
  actions,
  className,
}: {
  actions: ModuleAction[];
  className?: string;
}) {
  if (actions.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {MODULE_ACTIONS.filter((action) => actions.includes(action.id)).map(
        (action) => (
          <Badge key={action.id} variant="secondary" className="text-[10px]">
            {action.label}
          </Badge>
        ),
      )}
    </div>
  );
}
