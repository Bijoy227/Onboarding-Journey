"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";

import { OrganizationAvatar, UserAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  ConnectionStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate, pluralize } from "@/lib/format";
import type { BrandAccessKind } from "@/lib/permissions/access";
import { getRole } from "@/lib/permissions/permissions";
import {
  getConnectedOrganization,
  getConnectionsForOrganization,
} from "@/lib/services/connection-service";
import type { AppState, BrandAccess, BrandConnection, User } from "@/types";

export default function ConnectionsPage() {
  return (
    <PermissionGuard permission="connection.view">
      <ConnectionsView />
    </PermissionGuard>
  );
}

type Worker = {
  user: User;
  roleName: string;
  kind: BrandAccessKind;
  brandAccess?: BrandAccess;
};

/**
 * The Brokerage's people who work on one Brand: admins through the role, and
 * everyone with a Brand Access row for it. Computed even while the connection
 * is suspended, so the kept assignments stay visible.
 */
function workersOnBrand(
  state: AppState,
  connection: BrandConnection,
): Worker[] {
  return state.memberships
    .filter(
      (membership) =>
        membership.organizationId === connection.brokerageOrganizationId &&
        membership.status === "active",
    )
    .flatMap((membership): Worker[] => {
      const user = state.users.find((item) => item.id === membership.userId);
      const role = getRole(state, membership.roleId);
      if (!user || !role) return [];
      if (role.hasFullBrandAccess) {
        return [{ user, roleName: role.name, kind: "admin" }];
      }
      const row = state.brandAccess.find(
        (item) =>
          item.membershipId === membership.id &&
          item.brandOrganizationId === connection.brandOrganizationId &&
          !item.deletedAt,
      );
      return row
        ? [{ user, roleName: role.name, kind: row.accessMode, brandAccess: row }]
        : [];
    });
}

function ConnectionsView() {
  const state = useAppState();
  const { organization, can } = useSession();

  if (!organization) return null;
  const isBrokerage = organization.type === "brokerage";
  const connections = getConnectionsForOrganization(state, organization.id);

  return (
    <>
      <PageHeader
        title={isBrokerage ? "Brands" : "Brokerages"}
        description={
          isBrokerage
            ? `Brands connected to ${organization.name}, and who works on each one. Only the Platform Admin connects, suspends or ends a connection; assigning people to a connected Brand happens here and on Brand access.`
            : `Brokerages working with ${organization.name}. A Brand can work with as many brokerages as it needs. Only the Platform Admin connects them.`
        }
      />

      {connections.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={isBrokerage ? "No connected Brands yet" : "No connected brokerages yet"}
          description="Connections are made by the Platform Admin. Once one is made it appears here straight away."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {connections.map((connection) => {
            const other = getConnectedOrganization(
              state,
              connection,
              organization.id,
            );
            if (!other) return null;
            const workers = workersOnBrand(state, connection);
            const ownMembers = isBrokerage
              ? state.memberships.filter(
                  (membership) =>
                    membership.organizationId === other.id &&
                    membership.status === "active",
                ).length
              : null;

            return (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <OrganizationAvatar organization={other} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {other.name}
                        <OrganizationTypeBadge type={other.type} />
                      </CardTitle>
                      <CardDescription>
                        {connection.regions?.length
                          ? connection.regions.join(", ")
                          : "No region set"}{" "}
                        · connected {formatDate(connection.connectedAt)}
                      </CardDescription>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <ConnectionStatusBadge status={connection.status} />
                        {ownMembers === 0 ? (
                          <Badge variant="secondary">No members of its own</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isBrokerage
                      ? `Working on ${other.name}`
                      : `${other.name} people working on ${organization.name}`}{" "}
                    ({pluralize(workers.length, "person", "people")})
                  </p>
                  {connection.status === "suspended" ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Suspended: nobody at {isBrokerage ? organization.name : other.name}{" "}
                      can open {isBrokerage ? other.name : organization.name} right
                      now. Assignments are kept and come back on resume.
                    </p>
                  ) : null}
                  {workers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nobody yet.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {workers.map((worker) => {
                        const content = (
                          <>
                            <UserAvatar
                              name={worker.user.name}
                              className="size-6 text-[10px]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">
                                {worker.user.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {worker.roleName}
                              </span>
                            </span>
                            <BrandAccessBadge kind={worker.kind} />
                          </>
                        );
                        return (
                          <li key={worker.user.id}>
                            {isBrokerage &&
                            can("access.manage") &&
                            worker.brandAccess ? (
                              <Link
                                href={`/organization/brand-access/${worker.brandAccess.id}`}
                                className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent"
                              >
                                {content}
                              </Link>
                            ) : (
                              <div className="flex items-center gap-2.5 px-3 py-2">
                                {content}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

