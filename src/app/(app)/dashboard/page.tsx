"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Globe,
  Link2,
  Mail,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
  OrganizationTypeBadge,
  DomainStatusBadge,
} from "@/components/common/badges";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";

export default function DashboardPage() {
  const state = useAppState();
  const { user, organization, role, permissions, can, isPlatformAdmin } =
    useSession();

  if (!organization) {
    return <NoOrganizationDashboard isPlatformAdmin={isPlatformAdmin} />;
  }

  const members = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status === "active",
  );

  const relationships = state.relationships.filter(
    (relationship) =>
      (relationship.sourceOrganizationId === organization.id ||
        relationship.targetOrganizationId === organization.id) &&
      relationship.status === "active",
  );

  const pendingAccessRequests = state.accessRequests.filter(
    (request) =>
      request.organizationId === organization.id && request.status === "pending",
  );

  const pendingInvitations = state.invitations.filter(
    (invitation) =>
      invitation.organizationId === organization.id &&
      invitation.status === "pending",
  );

  const pendingRelationshipRequests = state.relationships.filter(
    (relationship) =>
      relationship.targetOrganizationId === organization.id &&
      relationship.status === "pending",
  );

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? domains[0];

  const events = state.auditEvents
    .filter((event) => event.organizationId === organization.id)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0] ?? ""}`}
        description={
          <>
            You are working in <strong>{organization.name}</strong> as{" "}
            <strong>{role?.name ?? "a member"}</strong>. Switching organization
            changes your role, your permissions and everything you can see.
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Members"
          value={members.length}
          icon={Users}
          href={can("member.view") ? "/organization/members" : undefined}
        />
        <StatCard
          label="Connected organizations"
          value={relationships.length}
          icon={Link2}
          href={can("relationship.view") ? "/relationships" : undefined}
        />
        <StatCard
          label="Pending access requests"
          value={pendingAccessRequests.length}
          icon={UserCheck}
          href={
            can("member.approve") ? "/administration/access-requests" : undefined
          }
          highlight={pendingAccessRequests.length > 0}
        />
        <StatCard
          label="Pending invitations"
          value={pendingInvitations.length}
          icon={Mail}
          href={can("member.invite") ? "/administration/invitations" : undefined}
        />
      </div>

      {/* min-w-0 keeps a wide child (long permission ids, long event text) from
          stretching the grid track past the viewport on narrow screens. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {(pendingAccessRequests.length > 0 &&
            can("member.approve")) ||
          (pendingRelationshipRequests.length > 0 &&
            can("relationship.approve")) ? (
            <Card>
              <CardHeader>
                <CardTitle>Needs your attention</CardTitle>
                <CardDescription>
                  Requests waiting on an Organization Admin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingAccessRequests.length > 0 && can("member.approve") ? (
                  <ActionRow
                    icon={UserCheck}
                    title={`${pluralize(pendingAccessRequests.length, "person wants", "people want")} to join`}
                    description="Approve or reject requests to become a member."
                    href="/administration/access-requests"
                  />
                ) : null}
                {pendingRelationshipRequests.length > 0 &&
                can("relationship.approve") ? (
                  <ActionRow
                    icon={Link2}
                    title={`${pluralize(pendingRelationshipRequests.length, "organization wants", "organizations want")} to connect`}
                    description="Review incoming relationship requests."
                    href="/relationships/requests"
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Identity and access events in {organization.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed events={events} />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your access</CardTitle>
              <CardDescription>
                How Caboodle resolved what you can do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AccessChainStep label="User" value={user?.name ?? ""} />
              <AccessChainStep label="Membership" value="Active" />
              <AccessChainStep
                label="Organization"
                value={organization.name}
                trailing={<OrganizationTypeBadge type={organization.type} />}
              />
              <AccessChainStep label="Role" value={role?.name ?? "None"} />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Permissions
                </p>
                <p className="mt-1 text-sm">
                  {permissions.length} granted in this organization
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {permissions.slice(0, 6).map((permission) => (
                    <Badge
                      key={permission}
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {permission}
                    </Badge>
                  ))}
                  {permissions.length > 6 ? (
                    <Badge variant="outline" className="text-[10px]">
                      +{permissions.length - 6} more
                    </Badge>
                  ) : null}
                </div>
              </div>
              <LinkButton variant="outline" size="sm" className="w-full" href="/how-it-works">
                How access works
              </LinkButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <OrganizationAvatar organization={organization} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {organization.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {organization.description}
                  </p>
                </div>
              </div>
              {primaryDomain ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">
                      {primaryDomain.domain}
                    </span>
                  </div>
                  <DomainStatusBadge verified={primaryDomain.verified} />
                </div>
              ) : null}
              <LinkButton variant="outline" size="sm" className="w-full" href="/organization">
                Organization overview
              </LinkButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <Card className={highlight ? "border-amber-500/40" : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function AccessChainStep({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {trailing}
    </div>
  );
}

function NoOrganizationDashboard({
  isPlatformAdmin,
}: {
  isPlatformAdmin: boolean;
}) {
  const state = useAppState();

  if (isPlatformAdmin) {
    return (
      <>
        <PageHeader
          title="Caboodle platform"
          description="You are administering the platform itself, not a customer organization. Customers create and run their own organizations."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Organizations"
            value={state.organizations.length}
            icon={Building2}
            href="/platform/organizations"
          />
          <StatCard
            label="Users"
            value={state.users.length}
            icon={Users}
            href="/platform/users"
          />
          <StatCard
            label="Relationships"
            value={state.relationships.length}
            icon={Link2}
            href="/platform/relationships"
          />
          <StatCard
            label="Pending access requests"
            value={
              state.accessRequests.filter(
                (request) => request.status === "pending",
              ).length
            }
            icon={UserCheck}
            href="/platform/access-requests"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform activity</CardTitle>
            <CardDescription>
              Identity events across every organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed events={state.auditEvents.slice(0, 8)} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="You are not in an organization yet"
        description="Organizations are the business entities in Caboodle. Join one that already exists, or create your own."
      />
      <EmptyState
        icon={ShieldCheck}
        title="No membership yet"
        description="Your access to Caboodle comes through a membership in an organization."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/onboarding/discover">
              Find my organization
            </LinkButton>
            <LinkButton variant="outline" href="/onboarding/create-organization">
              Create an organization
            </LinkButton>
          </div>
        }
      />
    </>
  );
}
