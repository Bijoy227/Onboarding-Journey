"use client";

import { use } from "react";
import { ArrowLeft, Globe, Users } from "lucide-react";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  DomainStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import {
  EmptyState,
  PageHeader,
  UnauthorizedState,
} from "@/components/common/states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate } from "@/lib/format";

/**
 * A brand managed by the current brokerage.
 *
 * Access here comes from the management relationship, not from a membership:
 * nobody is a member of a private label brand, and it still works.
 */
export default function ManagedOrganizationPage({
  params,
}: PageProps<"/relationships/managed/[organizationId]">) {
  const { organizationId } = use(params);
  return (
    <PermissionGuard permission="relationship.view">
      <ManagedOrganizationDetail organizationId={organizationId} />
    </PermissionGuard>
  );
}

function ManagedOrganizationDetail({
  organizationId,
}: {
  organizationId: string;
}) {
  const state = useAppState();
  const { organization: current } = useSession();

  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );

  const management = state.relationships.find(
    (relationship) =>
      relationship.sourceOrganizationId === current?.id &&
      relationship.targetOrganizationId === organizationId &&
      relationship.type === "brokerage_manages_brand" &&
      relationship.status === "active",
  );

  if (!organization) {
    return (
      <EmptyState
        title="Organization not found"
        action={
          <LinkButton variant="outline" href="/relationships">
            Back to relationships
          </LinkButton>
        }
      />
    );
  }

  // Being able to see relationships is not the same as managing this one.
  if (!management) {
    return (
      <UnauthorizedState description={`${current?.name ?? "This organization"} does not manage ${organization.name}, so its details are not available here.`} />
    );
  }

  const members = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status === "active",
  );
  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );

  return (
    <>
      <LinkButton
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
        href="/relationships"
      >
        <ArrowLeft className="size-4" />
        All relationships
      </LinkButton>

      <PageHeader
        title={organization.name}
        description={organization.description}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <OrganizationAvatar
            organization={organization}
            className="size-12 text-base"
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <OrganizationTypeBadge type={organization.type} />
              <OrganizationStatusBadge status={organization.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(organization.createdAt)} · Managed by{" "}
              {current?.name}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand members</CardTitle>
            <CardDescription>
              People with a membership in {organization.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="None"
                description="This brand has no members of its own, and does not need any. It is operated entirely through the management relationship."
              />
            ) : (
              <ul className="space-y-2">
                {members.map((membership) => {
                  const member = state.users.find(
                    (user) => user.id === membership.userId,
                  );
                  return (
                    <li key={membership.id} className="text-sm">
                      {member?.name}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner / Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {current ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <OrganizationAvatar organization={current} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{current.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Manages this brand
                  </p>
                </div>
                <OrganizationTypeBadge type={current.type} />
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Domains
              </p>
              {domains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No domains.</p>
              ) : (
                <ul className="space-y-2">
                  {domains.map((domain) => (
                    <li
                      key={domain.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Globe className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-xs">
                          {domain.domain}
                        </span>
                      </span>
                      <DomainStatusBadge verified={domain.verified} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Why this matters for the model
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            In the old model a Brand had to be represented by a Brand Owner user,
            which made private label brands awkward to express. Here the brand is
            simply an organization with no members, operated by a brokerage
            through a management relationship.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
