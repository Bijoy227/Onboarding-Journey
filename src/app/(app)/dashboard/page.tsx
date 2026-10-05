"use client";

import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Building2,
  Cable,
  Globe,
  KeyRound,
  Link2,
  Lock,
  Mail,
  PauseCircle,
  ShieldCheck,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  DomainStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { ModuleAvatar } from "@/components/features/module-icon";
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
import {
  ACCESS_KIND_LABEL,
  getBrandAccessRows,
} from "@/lib/permissions/access";
import {
  buildModuleTree,
  getEnabledModules,
  moduleHref,
} from "@/lib/permissions/modules";
import { getRole } from "@/lib/permissions/permissions";
import { switchBrand } from "@/lib/services/auth-service";
import { getConnectionsForOrganization } from "@/lib/services/connection-service";

export default function DashboardPage() {
  const state = useAppState();
  const {
    user,
    organization,
    role,
    permissions,
    can,
    access,
    isPlatformAdmin,
    isSupport,
    availableModules,
    brands,
    activeBrand,
    moduleAccess,
  } = useSession();

  if (!organization) {
    return <NoOrganizationDashboard isPlatformAdmin={isPlatformAdmin} />;
  }

  if (!access) {
    return (
      <>
        <PageHeader title={organization.name} />
        <EmptyState
          icon={PauseCircle}
          title={`Your access to ${organization.name} is paused`}
          description={
            organization.status === "suspended"
              ? `${organization.name} is suspended, which stops access for every member. Contact Caboodle.`
              : "Your membership isn't active. An administrator can restore it."
          }
        />
      </>
    );
  }

  const isBrokerage = organization.type === "brokerage";

  const members = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status === "active",
  );
  const connections = getConnectionsForOrganization(state, organization.id);

  const pendingAccessRequests = state.accessRequests.filter(
    (request) =>
      request.organizationId === organization.id && request.status === "pending",
  );
  const pendingInvitations = state.invitations.filter(
    (invitation) =>
      invitation.organizationId === organization.id &&
      invitation.status === "pending",
  );

  /** Brokers who can't open any Brand yet: something an admin can fix. */
  const unassigned = isBrokerage
    ? members.filter(
        (membership) =>
          !getRole(state, membership.roleId)?.hasFullBrandAccess &&
          getBrandAccessRows(state, membership.id).length === 0,
      )
    : [];

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? domains[0];

  const events = state.auditEvents
    .filter((event) => event.organizationId === organization.id)
    .slice(0, 6);

  /** Top-level modules this person can open on the active Brand. */
  const myModules = buildModuleTree(
    availableModules.filter((entry) => moduleAccess[entry.id]),
  );

  const attention =
    (pendingAccessRequests.length > 0 && can("member.approve")) ||
    (unassigned.length > 0 && can("access.manage"));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0] ?? ""}`}
        description={
          <>
            You are working in <strong>{organization.name}</strong> as{" "}
            <strong>
              {isSupport ? "Platform Admin (support)" : (role?.name ?? "a member")}
            </strong>
            {isBrokerage && activeBrand ? (
              <>
                , on <strong>{activeBrand.brand.name}</strong>
              </>
            ) : null}
            . Switching organization changes your role and permissions;
            switching Brand changes which modules you can use.
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
        {can("connection.view") ? (
          <StatCard
            label={isBrokerage ? "Connected brands" : "Connected brokerages"}
            value={connections.filter((item) => item.status === "active").length}
            icon={Link2}
            href="/connections"
          />
        ) : (
          <StatCard
            label={isBrokerage ? "Your brands" : "Modules you can use"}
            value={isBrokerage ? brands.length : Object.keys(moduleAccess).length}
            icon={isBrokerage ? Tag : Blocks}
            href={isBrokerage ? "/organization" : "/modules"}
          />
        )}
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
          {attention ? (
            <Card>
              <CardHeader>
                <CardTitle>Needs your attention</CardTitle>
                <CardDescription>Waiting on an admin.</CardDescription>
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
                {unassigned.length > 0 && can("access.manage") ? (
                  <ActionRow
                    icon={KeyRound}
                    title={`${pluralize(unassigned.length, "broker has", "brokers have")} no Brands yet`}
                    description="Assign them to a connected Brand so they can work."
                    href="/organization/brand-access"
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {isBrokerage ? (
            <Card>
              <CardHeader>
                <CardTitle>Your brands</CardTitle>
                <CardDescription>
                  {isSupport
                    ? `Every Brand connected to ${organization.name}, through support access.`
                    : role?.hasFullBrandAccess
                      ? `Every Brand connected to ${organization.name}, from your role.`
                      : "The connected Brands you are assigned to. Pick one to work on it."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {brands.length === 0 ? (
                  <EmptyState
                    icon={Tag}
                    title="No brands yet"
                    description={
                      role?.hasFullBrandAccess
                        ? "The Platform Admin hasn't connected any Brands to this brokerage."
                        : "Ask an admin to assign you to a connected Brand."
                    }
                    className="py-8"
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {brands.map((entry) => (
                      <button
                        key={entry.brand.id}
                        type="button"
                        onClick={() => switchBrand(entry.brand.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                          entry.brand.id === activeBrand?.brand.id
                            ? "border-primary bg-accent/40"
                            : ""
                        }`}
                      >
                        <OrganizationAvatar organization={entry.brand} />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="block truncate text-sm font-medium">
                            {entry.brand.name}
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <BrandAccessBadge kind={entry.kind} />
                            {pluralize(Object.keys(entry.modules).length, "module")}
                            {entry.brand.id === activeBrand?.brand.id
                              ? " · active"
                              : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Your modules</CardTitle>
              <CardDescription>
                {activeBrand
                  ? isBrokerage
                    ? `${organization.name}'s modules plus ${activeBrand.brand.name}'s own, limited to your access.`
                    : `${organization.name}'s enabled modules, limited to your access.`
                  : "Data is always reached through a Brand."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableModules.length === 0 ? (
                <EmptyState
                  icon={Blocks}
                  title="No modules yet"
                  description="The Platform Admin enables modules for each organization."
                  className="py-8"
                />
              ) : myModules.length === 0 ? (
                <EmptyState
                  icon={Lock}
                  title="You can't open any modules yet"
                  description={
                    activeBrand
                      ? "Ask an admin to grant you the modules you need under Brand access."
                      : "Ask an admin to assign you to a Brand."
                  }
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {myModules.slice(0, 6).map(({ module: entry }) => (
                      <Link
                        key={entry.id}
                        href={moduleHref(entry, organization.type)}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                      >
                        <ModuleAvatar
                          entry={entry}
                          className="size-8 rounded-lg"
                          iconClassName="size-4"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {entry.name}
                          </p>
                          <ModuleActionBadges
                            actions={moduleAccess[entry.id] ?? []}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <LinkButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    href="/modules"
                  >
                    All modules
                  </LinkButton>
                </div>
              )}
            </CardContent>
          </Card>

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
                How Caboodle resolved what you can do, on every request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AccessChainStep label="User" value={user?.name ?? ""} />
              <AccessChainStep
                label="Membership"
                value={isSupport ? "None: support access" : "Active"}
              />
              <AccessChainStep
                label="Organization"
                value={organization.name}
                trailing={<OrganizationTypeBadge type={organization.type} />}
              />
              <AccessChainStep
                label="Role"
                value={isSupport ? "Platform Admin" : (role?.name ?? "None")}
              />
              <AccessChainStep
                label="Brand"
                value={activeBrand?.brand.name ?? "No brand"}
              />
              <AccessChainStep
                label="Access on this brand"
                value={
                  activeBrand
                    ? `${ACCESS_KIND_LABEL[activeBrand.kind]} · ${pluralize(
                        Object.keys(moduleAccess).length,
                        "module",
                      )} of ${availableModules.length} available`
                    : "—"
                }
                trailing={
                  activeBrand ? <BrandAccessBadge kind={activeBrand.kind} /> : null
                }
              />
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Organization permissions
                </p>
                <p className="mt-1 text-sm">
                  {permissions.length} granted by the role. They say what you
                  may administer, never what data you see.
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
  value: number | string;
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
    const brands = state.organizations.filter((org) => org.type === "brand");
    const brokerages = state.organizations.filter(
      (org) => org.type === "brokerage",
    );
    const withoutModules = state.organizations.filter(
      (org) => getEnabledModules(state, org.id).length === 0,
    );

    return (
      <>
        <PageHeader
          title="Caboodle platform"
          description="You are administering the platform itself, not a customer organization. Customers create and run their own organizations; you enable their modules, connect Brands to Brokerages, and can set an organization up yourself when needed."
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
            label="Active connections"
            value={
              state.brandConnections.filter(
                (connection) => connection.status === "active",
              ).length
            }
            icon={Cable}
            href="/platform/connections"
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Brands"
            value={brands.length}
            icon={Tag}
            href="/platform/organizations"
          />
          <StatCard
            label="Brokerages"
            value={brokerages.length}
            icon={Link2}
            href="/platform/organizations"
          />
          <StatCard
            label="Organizations with no modules"
            value={withoutModules.length}
            icon={Blocks}
            href="/platform/organizations"
            highlight={withoutModules.length > 0}
          />
          <StatCard
            label="Catalog modules"
            value={state.modules.length}
            icon={Blocks}
            href="/platform/modules"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform activity</CardTitle>
            <CardDescription>
              Identity and access events across every organization.
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
        description="Organizations are the business entities in Caboodle: Brands and Brokerages. Join one that already exists, or create your own."
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
