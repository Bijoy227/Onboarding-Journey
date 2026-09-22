"use client";

import { Building2, Globe, Link2, Users } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate, pluralize } from "@/lib/format";

export default function OrganizationOverviewPage() {
  return (
    <PermissionGuard permission="organization.view">
      <OrganizationOverview />
    </PermissionGuard>
  );
}

function OrganizationOverview() {
  const state = useAppState();
  const { organization, can } = useSession();

  if (!organization) return null;

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );

  const relationships = state.relationships.filter(
    (relationship) =>
      (relationship.sourceOrganizationId === organization.id ||
        relationship.targetOrganizationId === organization.id) &&
      relationship.status === "active",
  );

  /** A brokerage that manages this brand outright, if one does. */
  const managedBy = state.relationships.find(
    (relationship) =>
      relationship.targetOrganizationId === organization.id &&
      relationship.type === "brokerage_manages_brand" &&
      relationship.status === "active",
  );
  const managerOrganization = managedBy
    ? state.organizations.find(
        (org) => org.id === managedBy.sourceOrganizationId,
      )
    : undefined;

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
              {pluralize(relationships.length, "connected organization")}
            </p>
          </div>
        </CardContent>
      </Card>

      {managerOrganization ? (
        <Card className="border-violet-500/30">
          <CardHeader>
            <CardTitle className="text-base">
              Managed by {managerOrganization.name}
            </CardTitle>
            <CardDescription>
              This brand is operated by a brokerage rather than by its own
              members. A Brand does not need a &ldquo;Brand Owner&rdquo; user to
              exist in Caboodle.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription>
                People with a membership in {organization.name}.
              </CardDescription>
            </div>
            {can("member.view") ? (
              <LinkButton variant="ghost" size="sm" href="/organization/members">
                View all
              </LinkButton>
            ) : null}
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No direct members"
                description="This organization is managed through a relationship rather than by its own members."
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
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Domains</CardTitle>
                <CardDescription>
                  Verified domains power organization discovery.
                </CardDescription>
              </div>
              {can("domain.view") ? (
                <LinkButton variant="ghost" size="sm" href="/organization/domains">
                  Manage
                </LinkButton>
              ) : null}
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
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  Connected organizations
                </CardTitle>
                <CardDescription>
                  {organization.type === "brand"
                    ? "Brokerages representing this brand."
                    : "Brands this brokerage works with."}
                </CardDescription>
              </div>
              {can("relationship.view") ? (
                <LinkButton variant="ghost" size="sm" href="/relationships">
                  View all
                </LinkButton>
              ) : null}
            </CardHeader>
            <CardContent>
              {relationships.length === 0 ? (
                <EmptyState icon={Link2} title="No connections yet" />
              ) : (
                <ul className="space-y-2">
                  {relationships.map((relationship) => {
                    const otherId =
                      relationship.sourceOrganizationId === organization.id
                        ? relationship.targetOrganizationId
                        : relationship.sourceOrganizationId;
                    const other = state.organizations.find(
                      (org) => org.id === otherId,
                    );
                    if (!other) return null;
                    return (
                      <li
                        key={relationship.id}
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
                            {relationship.type === "brokerage_manages_brand"
                              ? "Managed brand"
                              : (relationship.regions?.join(", ") ??
                                "Represents brand")}
                          </p>
                        </div>
                        <OrganizationTypeBadge type={other.type} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {memberships.length === 0 && !managerOrganization ? (
        <EmptyState
          icon={Building2}
          title="This organization has no members"
          description="It can still exist, hold domains and take part in relationships."
        />
      ) : null}
    </>
  );
}
