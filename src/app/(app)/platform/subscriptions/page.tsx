"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar } from "@/components/common/avatars";
import { OrganizationTypeBadge } from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { AssignPlanDialog } from "@/components/features/assign-plan-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ANNUAL_MONTHS_CHARGED,
  getActiveSubscription,
  getIncompleteSubscription,
  getPlanMonthlyPrice,
  priceForCycle,
} from "@/lib/permissions/modules";
import { planLabel } from "@/lib/services/plan-service";
import { cancelSubscription } from "@/lib/services/subscription-service";
import type { Organization } from "@/types";

export default function PlatformSubscriptionsPage() {
  return (
    <PlatformAdminGuard>
      <SubscriptionsView />
    </PlatformAdminGuard>
  );
}

function SubscriptionsView() {
  const state = useAppState();
  const { user } = useSession();
  const [assigning, setAssigning] = useState<Organization | null>(null);
  const [filter, setFilter] = useState("all");

  const rows = state.organizations.map((organization) => {
    const subscription = getActiveSubscription(state, organization.id);
    const pending = getIncompleteSubscription(state, organization.id);
    const plan = state.plans.find((item) => item.id === subscription?.planId);
    const monthly = plan ? getPlanMonthlyPrice(state, plan) : 0;
    return { organization, subscription, pending, plan, monthly };
  });

  // Annual subscriptions count at their monthly equivalent.
  const mrr = rows.reduce((total, row) => {
    if (!row.subscription || !row.plan) return total;
    return (
      total +
      (row.subscription.billingCycle === "annual"
        ? (row.monthly * ANNUAL_MONTHS_CHARGED) / 12
        : row.monthly)
    );
  }, 0);
  const active = rows.filter((row) => row.subscription).length;

  const visible = rows.filter((row) => {
    if (filter === "active") return Boolean(row.subscription);
    if (filter === "none") return !row.subscription;
    if (filter === "brand" || filter === "brokerage") {
      return row.organization.type === filter;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Which plan every organization is on. Customers pay for themselves during onboarding; from here you can put any organization on any plan for its type, with no payment step."
        actions={
          <FieldSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All organizations" },
              { value: "active", label: "With a plan" },
              { value: "none", label: "Without a plan" },
              { value: "brand", label: "Brands" },
              { value: "brokerage", label: "Brokerages" },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Monthly recurring revenue"
          value={formatCurrency(Math.round(mrr))}
        />
        <Stat
          label="Organizations on a plan"
          value={`${active} of ${rows.length}`}
        />
        <Stat label="Plans" value={String(state.plans.length)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Price
                </TableHead>
                <TableHead className="hidden md:table-cell">Renews</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(
                ({ organization, subscription, pending, plan, monthly }) => (
                  <TableRow key={organization.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={`/platform/organizations/${organization.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <OrganizationAvatar
                          organization={organization}
                          className="size-7 text-[10px]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium hover:underline">
                            {organization.name}
                          </p>
                          <OrganizationTypeBadge type={organization.type} />
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {plan && subscription ? (
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            {planLabel(state.organizations, plan)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.source === "platform_admin"
                              ? "Set up by Caboodle"
                              : "Self-service"}
                          </p>
                        </div>
                      ) : pending ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        >
                          Checkout not paid
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No plan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {subscription ? (
                        <>
                          <p className="text-sm tabular-nums">
                            {formatCurrency(
                              priceForCycle(monthly, subscription.billingCycle),
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subscription.billingCycle === "annual"
                              ? "per year"
                              : "per month"}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {subscription?.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : "—"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Subscription actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setAssigning(organization)}
                          >
                            {subscription ? "Change plan" : "Assign plan"}
                          </DropdownMenuItem>
                          {subscription ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={async () => {
                                  if (!user) return;
                                  await cancelSubscription(
                                    subscription.id,
                                    user.id,
                                  );
                                  toast.success("Subscription canceled", {
                                    description: `${organization.name} has no modules until it gets a plan again.`,
                                  });
                                }}
                              >
                                Cancel subscription
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignPlanDialog
        organization={assigning}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
