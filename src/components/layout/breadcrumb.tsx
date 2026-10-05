"use client";

import { NAV_GROUPS } from "@/components/layout/nav-config";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { findModuleBySlug } from "@/lib/permissions/modules";
import type { OrganizationType } from "@/types";

/**
 * Resolves the current route back to its navigation group and item.
 *
 * Matches the longest href, so /organization/members resolves to "Members"
 * rather than to its "/organization" parent.
 */
function findNavLocation(pathname: string, organizationType?: OrganizationType) {
  let best: { group?: string; item: string; length: number } | null = null;

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.organizationType && item.organizationType !== organizationType)
        continue;
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
  const state = useAppState();
  const { organization, isPlatformAdmin } = useSession();
  const location = findNavLocation(pathname, organization?.type);

  // Module pages are not in the static navigation: name them from the catalog.
  // A Brand module opened from a Brokerage lives under /modules/brand/.
  const brandModuleSlug = pathname.match(/^\/modules\/brand\/([^/]+)/)?.[1];
  const moduleSlug = brandModuleSlug ?? pathname.match(/^\/modules\/([^/]+)/)?.[1];
  const currentModule =
    moduleSlug && organization
      ? findModuleBySlug(
          state,
          brandModuleSlug ? "brand" : organization.type,
          decodeURIComponent(moduleSlug),
        )
      : undefined;

  const context = location?.group === "Platform admin"
    ? "Caboodle Platform"
    : (organization?.name ?? (isPlatformAdmin ? "Caboodle Platform" : "Caboodle"));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <span className="text-muted-foreground">{context}</span>
        </BreadcrumbItem>
        {currentModule ? (
          <>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="hidden sm:block">
              <span className="text-muted-foreground">Modules</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentModule.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : location ? (
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
