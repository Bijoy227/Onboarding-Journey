"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar, UserAvatar } from "@/components/common/avatars";
import {
  DomainStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
  RelationshipStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate } from "@/lib/format";
import { verifyDomain } from "@/lib/services/domain-service";
import { setOrganizationStatus } from "@/lib/services/organization-service";

export default function PlatformOrganizationDetailPage({
  params,
}: PageProps<"/platform/organizations/[organizationId]">) {
  const { organizationId } = use(params);
  return (
    <PlatformAdminGuard>
      <OrganizationDetail organizationId={organizationId} />
    </PlatformAdminGuard>
  );
}

function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const state = useAppState();
  const { user } = useSession();

  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );

  if (!organization || !user) {
    return (
      <EmptyState
        title="Organization not found"
        description="It may have been removed, or the demo data was reset."
        action={
          <LinkButton variant="outline" href="/platform/organizations">
            Back to organizations
          </LinkButton>
        }
      />
    );
  }

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );
  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );
  const relationships = state.relationships.filter(
    (relationship) =>
      relationship.sourceOrganizationId === organization.id ||
      relationship.targetOrganizationId === organization.id,
  );
  const events = state.auditEvents.filter(
    (event) => event.organizationId === organization.id,
  );

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="-ml-2 w-fit" href="/platform/organizations">
        <ArrowLeft className="size-4" />
        All organizations
      </LinkButton>

      <PageHeader
        title={organization.name}
        description={organization.description}
        actions={
          <Button
            variant={organization.status === "active" ? "outline" : "default"}
            size="sm"
            onClick={async () => {
              const next =
                organization.status === "active" ? "suspended" : "active";
              await setOrganizationStatus(organization.id, next, user.id);
              toast.success(
                next === "suspended"
                  ? "Organization suspended"
                  : "Organization restored",
              );
            }}
          >
            {organization.status === "active" ? "Suspend" : "Restore"}
          </Button>
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
              <OrganizationTypeBadge type={organization.type} />
              <OrganizationStatusBadge status={organization.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(organization.createdAt)} · Membership policy:{" "}
              {organization.membershipPolicy.replace("_", " ")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domains</CardTitle>
            <CardDescription>
              Platform admins can simulate verification for support cases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {domains.map((domain) => (
                <li
                  key={domain.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="truncate font-mono text-xs">
                    {domain.domain}
                  </span>
                  <div className="flex items-center gap-2">
                    <DomainStatusBadge verified={domain.verified} />
                    {!domain.verified ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={async () => {
                          await verifyDomain(domain.id, user.id);
                          toast.success("Domain verified");
                        }}
                      >
                        Verify
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No direct members"
                description="This organization exists without its own members."
              />
            ) : (
              <ul className="space-y-2.5">
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (candidate) => candidate.id === membership.userId,
                  );
                  const role = state.roles.find(
                    (candidate) => candidate.id === membership.roleId,
                  );
                  if (!member) return null;
                  return (
                    <li
                      key={membership.id}
                      className="flex items-center gap-2.5"
                    >
                      <UserAvatar
                        name={member.name}
                        className="size-7 text-[10px]"
                      />
                      <Link
                        href={`/platform/users/${member.id}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm hover:underline">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </Link>
                      <RoleBadge name={role?.name ?? "—"} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <EmptyState title="No relationships" />
          ) : (
            <ul className="space-y-2">
              {relationships.map((relationship) => {
                const source = state.organizations.find(
                  (org) => org.id === relationship.sourceOrganizationId,
                );
                const target = state.organizations.find(
                  (org) => org.id === relationship.targetOrganizationId,
                );
                return (
                  <li
                    key={relationship.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <span className="text-sm">
                      {source?.name}{" "}
                      <span className="text-muted-foreground">
                        {relationship.type === "brokerage_manages_brand"
                          ? "manages"
                          : "represents"}
                      </span>{" "}
                      {target?.name}
                    </span>
                    <RelationshipStatusBadge status={relationship.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={events} />
        </CardContent>
      </Card>
    </>
  );
}
