"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Blocks, LifeBuoy, Plus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar, UserAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  DomainStatusBadge,
  MembershipStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
  RoleBadge,
} from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
import {
  ConnectDialog,
  ConnectionList,
} from "@/components/features/connection-controls";
import { EnabledModulesDialog } from "@/components/features/enabled-modules-dialog";
import { InviteMemberDialog } from "@/components/features/invite-member-dialog";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { resolveMembershipBrands } from "@/lib/permissions/access";
import { buildModuleTree, getEnabledModules } from "@/lib/permissions/modules";
import { adminRoleId, getRole } from "@/lib/permissions/permissions";
import { openSupportWorkspace } from "@/lib/services/auth-service";
import { getConnectionsForOrganization } from "@/lib/services/connection-service";
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
  const router = useRouter();
  const state = useAppState();
  const { user } = useSession();
  const [editingModules, setEditingModules] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inviting, setInviting] = useState(false);

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

  const isBrokerage = organization.type === "brokerage";
  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );
  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );
  const hasActiveAdmin = memberships.some(
    (membership) =>
      membership.status === "active" &&
      getRole(state, membership.roleId)?.hasFullBrandAccess,
  );
  const connections = getConnectionsForOrganization(state, organization.id, {
    includeEnded: true,
  });
  const enabled = getEnabledModules(state, organization.id);
  const enabledTree = buildModuleTree(enabled);
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                openSupportWorkspace(organization.id, user.id);
                toast.success(`Opened ${organization.name} with support access`, {
                  description: "You have full access there. Every change is audited.",
                });
                router.push("/dashboard");
              }}
            >
              <LifeBuoy className="size-4" />
              Open as support
            </Button>
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
                  {
                    description:
                      next === "suspended"
                        ? organization.type === "brand"
                          ? "Every member, and every connected brokerage, lost access."
                          : "Every member lost access."
                        : "Access is back as it was.",
                  },
                );
              }}
            >
              {organization.status === "active" ? "Suspend" : "Restore"}
            </Button>
          </>
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
              {organization.membershipPolicy.replace("_", " ")} ·{" "}
              {pluralize(memberships.length, "member")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enabled modules</CardTitle>
          <CardDescription>
            {isBrokerage
              ? `${organization.name}'s own tools, the ceiling for everyone in it, admins included. On each connected Brand they also get that Brand's enabled modules.`
              : `The ceiling for everyone working on ${organization.name}: its own members, and the people of every connected brokerage.`}{" "}
            Changes take effect at once.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setEditingModules(true)}>
              <Blocks className="size-4" />
              Edit modules
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {enabled.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              No modules yet. Nobody in {organization.name} can use anything
              until you enable some.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {enabledTree.map(({ module: entry, children }) => (
                <li key={entry.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {entry.name}
                    </span>
                    <ModuleActionBadges actions={entry.availableActions} />
                  </div>
                  {children.length > 0 ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {children.map((child) => child.name).join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isBrokerage ? "Connected Brands" : "Connected Brokerages"}
          </CardTitle>
          <CardDescription>
            {isBrokerage
              ? `${organization.name}'s admins get full access to every active connection; its brokers only to the Brands they are assigned.`
              : `Brokerages that can work on ${organization.name}'s data.`}
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setConnecting(true)}>
              <Plus className="size-4" />
              {isBrokerage ? "Connect a Brand" : "Connect a Brokerage"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ConnectionList
            connections={connections}
            emptyText={
              isBrokerage
                ? "No Brands connected yet."
                : "Not connected to any Brokerage."
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>
              {hasActiveAdmin
                ? "Their role, and how they reach each Brand."
                : "No active admin yet. Invite one to hand the organization over."}
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant={hasActiveAdmin ? "outline" : "default"}
                onClick={() => setInviting(true)}
              >
                <UserPlus className="size-4" />
                {hasActiveAdmin ? "Invite" : "Invite admin"}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members of its own"
                description={
                  isBrokerage
                    ? "Invite the first Brokerage Admin to get started."
                    : "A Brand can exist with no members, run by a connected brokerage."
                }
              />
            ) : (
              <ul className="space-y-3">
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (candidate) => candidate.id === membership.userId,
                  );
                  const role = getRole(state, membership.roleId);
                  if (!member) return null;
                  const brands = resolveMembershipBrands(state, membership);
                  return (
                    <li key={membership.id} className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
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
                        {membership.status !== "active" ? (
                          <MembershipStatusBadge status={membership.status} />
                        ) : null}
                        <RoleBadge name={role?.name ?? "—"} />
                      </div>
                      <div className="flex flex-wrap gap-1 pl-9">
                        {role?.hasFullBrandAccess ? (
                          <BrandAccessBadge kind="admin" />
                        ) : brands.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No brands
                          </span>
                        ) : (
                          brands.map((entry) => (
                            <Badge
                              key={entry.brand.id}
                              variant="secondary"
                              className="font-normal"
                            >
                              {isBrokerage ? `${entry.brand.name} · ` : ""}
                              {entry.kind === "full" ? "Full" : "Custom"}
                            </Badge>
                          ))
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Domains</CardTitle>
            <CardDescription>
              Platform admins can simulate verification for support cases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">No domains.</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={events} />
        </CardContent>
      </Card>

      <EnabledModulesDialog
        organization={editingModules ? organization : null}
        onOpenChange={setEditingModules}
      />
      <ConnectDialog
        open={connecting}
        onOpenChange={setConnecting}
        fixedOrganization={organization}
      />
      <InviteMemberDialog
        open={inviting}
        onOpenChange={setInviting}
        organizationId={organization.id}
        defaultRoleId={hasActiveAdmin ? undefined : adminRoleId(organization.type)}
      />
    </>
  );
}
