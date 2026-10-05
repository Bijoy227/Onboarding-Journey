"use client";

import { Blocks, Building2, Globe, Link2, Users } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  ConnectionStatusBadge,
  DomainStatusBadge,
  MembershipStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
  RoleBadge,
} from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate, pluralize } from "@/lib/format";
import { buildModuleTree } from "@/lib/permissions/modules";
import {
  getConnectedOrganization,
  getConnectionsForOrganization,
} from "@/lib/services/connection-service";

export default function OrganizationOverviewPage() {
  return (
    <PermissionGuard permission="organization.view">
      <OrganizationOverview />
    </PermissionGuard>
  );
}

function OrganizationOverview() {
  const state = useAppState();
  const { organization, can, enabledModules, brands } = useSession();

  if (!organization) return null;

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );

  const connections = getConnectionsForOrganization(state, organization.id);
  const enabledTree = buildModuleTree(enabledModules);

  return (
    <>
      <PageHeader
        title={organization.name}
        description={organization.description}
        actions={
          can("organization.update") ? (
            <LinkButton variant="outline" size="sm" href="/organization/settings">
              Settings
            </LinkButton>
          ) : null
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <OrganizationAvatar
            organization={organization}
            className="size-12 text-base"
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{organization.name}</p>
              <OrganizationTypeBadge type={organization.type} />
              <OrganizationStatusBadge status={organization.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(organization.createdAt)} ·{" "}
              {pluralize(memberships.length, "member")} ·{" "}
              {pluralize(connections.length, "connection")} ·{" "}
              {pluralize(enabledModules.length, "module")} enabled
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>
              People with a membership in {organization.name}.
            </CardDescription>
            <CardAction>
              {can("member.view") ? (
                <LinkButton variant="ghost" size="sm" href="/organization/members">
                  View all
                </LinkButton>
              ) : null}
            </CardAction>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No direct members"
                description="A Brand doesn't need members of its own: a connected brokerage can run it."
              />
            ) : (
              <ul className="space-y-3">
                {memberships.slice(0, 5).map((membership) => {
                  const member = state.users.find(
                    (user) => user.id === membership.userId,
                  );
                  const role = state.roles.find(
                    (item) => item.id === membership.roleId,
                  );
                  return (
                    <li
                      key={membership.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member?.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member?.email}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {membership.status !== "active" ? (
                          <MembershipStatusBadge status={membership.status} />
                        ) : null}
                        <RoleBadge name={role?.name ?? "—"} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Domains</CardTitle>
              <CardDescription>
                Verified domains power organization discovery.
              </CardDescription>
              <CardAction>
                {can("domain.view") ? (
                  <LinkButton variant="ghost" size="sm" href="/organization/domains">
                    Manage
                  </LinkButton>
                ) : null}
              </CardAction>
            </CardHeader>
            <CardContent>
              {domains.length === 0 ? (
                <EmptyState icon={Globe} title="No domains" />
              ) : (
                <ul className="space-y-2">
                  {domains.map((domain) => (
                    <li
                      key={domain.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <span className="truncate font-mono text-xs">
                        {domain.domain}
                      </span>
                      <DomainStatusBadge verified={domain.verified} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enabled modules</CardTitle>
              <CardDescription>
                Set by the Platform Admin. Nobody in {organization.name} can
                go above this list.
                {organization.type === "brokerage"
                  ? " On each connected Brand you also get that Brand's enabled modules."
                  : " Connected brokerages get these too when they work on this Brand."}
              </CardDescription>
              <CardAction>
                <LinkButton variant="ghost" size="sm" href="/modules">
                  View
                </LinkButton>
              </CardAction>
            </CardHeader>
            <CardContent>
              {enabledTree.length === 0 ? (
                <EmptyState
                  icon={Blocks}
                  title="No modules yet"
                  description="A new organization starts with none until the Platform Admin enables some."
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {enabledTree.map(({ module: entry, children }) => (
                    <span
                      key={entry.id}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      {entry.name}
                      {children.length > 0 ? (
                        <span className="text-muted-foreground">
                          {" "}
                          +{children.length}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {can("connection.view") ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {organization.type === "brand" ? "Brokerages" : "Brands"}
                </CardTitle>
                <CardDescription>
                  {organization.type === "brand"
                    ? "Brokerages working with this Brand, connected by the Platform Admin."
                    : "Brands connected to this brokerage by the Platform Admin."}
                </CardDescription>
                <CardAction>
                  <LinkButton variant="ghost" size="sm" href="/connections">
                    View all
                  </LinkButton>
                </CardAction>
              </CardHeader>
              <CardContent>
                {connections.length === 0 ? (
                  <EmptyState icon={Link2} title="No connections yet" />
                ) : (
                  <ul className="space-y-2">
                    {connections.map((connection) => {
                      const other = getConnectedOrganization(
                        state,
                        connection,
                        organization.id,
                      );
                      if (!other) return null;
                      return (
                        <li
                          key={connection.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <OrganizationAvatar
                            organization={other}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {other.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {connection.regions?.join(", ") || "No region set"}
                            </p>
                          </div>
                          <ConnectionStatusBadge status={connection.status} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : organization.type === "brokerage" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your brands</CardTitle>
                <CardDescription>
                  The connected Brands you are assigned to. Your role
                  doesn&apos;t show the brokerage&apos;s whole portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {brands.length === 0 ? (
                  <EmptyState icon={Link2} title="No brands assigned yet" />
                ) : (
                  <ul className="space-y-2">
                    {brands.map((entry) => (
                      <li
                        key={entry.brand.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <OrganizationAvatar
                          organization={entry.brand}
                          className="size-7 text-[10px]"
                        />
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {entry.brand.name}
                        </p>
                        <BrandAccessBadge kind={entry.kind} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="This organization has no members"
          description="It can still exist, hold domains, have modules enabled and be connected to brokerages."
        />
      ) : null}
    </>
  );
}
