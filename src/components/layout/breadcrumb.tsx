"use client";

import { NAV_GROUPS } from "@/components/layout/nav-config";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSession } from "@/lib/demo/demo-provider";

/**
 * Resolves the current route back to its navigation group and item.
 *
 * Matches the longest href, so /organization/members resolves to "Members"
 * rather than to its "/organization" parent.
 */
function findNavLocation(pathname: string) {
  let best: { group?: string; item: string; length: number } | null = null;

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const matches =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (!matches) continue;
      if (!best || item.href.length > best.length) {
        best = { group: group.label, item: item.title, length: item.href.length };
      }
    }
  }

  return best;
}

export function OrganizationBreadcrumb({ pathname }: { pathname: string }) {
  const { organization, isPlatformAdmin } = useSession();
  const location = findNavLocation(pathname);

  const context = location?.group === "Platform admin"
    ? "Caboodle Platform"
    : (organization?.name ?? (isPlatformAdmin ? "Caboodle Platform" : "Caboodle"));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <span className="text-muted-foreground">{context}</span>
        </BreadcrumbItem>
        {location ? (
          <>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{location.item}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
