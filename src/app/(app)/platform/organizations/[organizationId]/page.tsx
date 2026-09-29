"use client";

import { use, useState } from "react";
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
import { AssignPlanDialog } from "@/components/features/assign-plan-dialog";
import { PlanModuleList } from "@/components/features/plan-module-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, formatDate, pluralize } from "@/lib/format";
import {
  getActiveSubscription,
  getEntitledModules,
  getIncompleteSubscription,
  getPlanMonthlyPrice,
  priceForCycle,
} from "@/lib/permissions/modules";
import { planLabel } from "@/lib/services/plan-service";
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
  const [assigning, setAssigning] = useState(false);

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

  const subscription = getActiveSubscription(state, organization.id);
  const pendingCheckout = getIncompleteSubscription(state, organization.id);
  const plan = state.plans.find((item) => item.id === subscription?.planId);
  const entitled = getEntitledModules(state, organization.id);

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
          <CardDescription>
            The plan decides which {organization.type} modules this
            organization has. Assigning one here skips payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan && subscription ? (
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="space-y-2 md:w-72 md:shrink-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {planLabel(state.organizations, plan)}
                  <Badge variant="secondary" className="capitalize">
                    {plan.tier}
                  </Badge>
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(
                    priceForCycle(
                      getPlanMonthlyPrice(state, plan),
                      subscription.billingCycle,
                    ),
                  )}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{subscription.billingCycle === "annual" ? "year" : "month"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {subscription.source === "platform_admin"
                    ? "Set up by Caboodle"
                    : "Self-service"}
                  {subscription.currentPeriodEnd
                    ? ` · renews ${formatDate(subscription.currentPeriodEnd)}`
                    : ""}
                  {subscription.paymentMethod
                    ? ` · ${subscription.paymentMethod.brand} •••• ${subscription.paymentMethod.last4}`
                    : " · invoiced"}
                </p>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {pluralize(entitled.length, "module")}
                </p>
                <div className="max-h-44 overflow-y-auto rounded-lg border p-3">
                  <PlanModuleList modules={entitled} dense />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {pendingCheckout
                ? "A plan was chosen during onboarding but never paid for, so no modules are on."
                : "No plan, so none of its members can use any module."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAssigning(true)}>
              {plan ? "Change plan" : "Assign plan"}
            </Button>
            <LinkButton
              size="sm"
              variant="outline"
              href={`/platform/plans/new?organizationId=${organization.id}`}
            >
              Build a custom plan
            </LinkButton>
            {plan?.tier === "custom" ? (
              <LinkButton
                size="sm"
                variant="ghost"
                href={`/platform/plans/${plan.id}`}
              >
                Edit {plan.name}
              </LinkButton>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AssignPlanDialog
        organization={assigning ? organization : null}
        onOpenChange={setAssigning}
      />

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
