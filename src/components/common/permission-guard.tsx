"use client";

import { UnauthorizedState } from "@/components/common/states";
import { useSession } from "@/lib/demo/demo-provider";
import type { PermissionId } from "@/types";

/**
 * Route-level authorization.
 *
 * Wrapping a page in this is what turns the permission matrix into something
 * the UI actually enforces: navigating straight to a URL you lack the
 * permission for renders the unauthorized state rather than the page.
 */
export function PermissionGuard({
  permission,
  children,
  description,
}: {
  permission: PermissionId;
  children: React.ReactNode;
  description?: string;
}) {
  const { can } = useSession();

  if (!can(permission)) {
    return <UnauthorizedState permission={permission} description={description} />;
  }

  return <>{children}</>;
}

/** The same idea for the Platform Admin area, which sits outside org roles. */
export function PlatformAdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPlatformAdmin } = useSession();

  if (!isPlatformAdmin) {
    return (
      <UnauthorizedState description="Platform administration is only available to Caboodle platform administrators. Sign in as constance@caboodle.com to explore it." />
    );
  }

  return <>{children}</>;
}
