import { Building2, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials, organizationAccent } from "@/lib/format";
import type { Organization } from "@/types";

export function OrganizationAvatar({
  organization,
  className,
  showIcon = false,
}: {
  organization: Pick<Organization, "id" | "name" | "type">;
  className?: string;
  showIcon?: boolean;
}) {
  const Icon = organization.type === "brand" ? Store : Building2;
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
        organizationAccent(organization.id),
        className,
      )}
      aria-hidden
    >
      {showIcon ? <Icon className="size-4" /> : initials(organization.name)}
    </span>
  );
}

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
