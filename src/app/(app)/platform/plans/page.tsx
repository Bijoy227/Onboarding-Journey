"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { OrganizationTypeBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/demo/demo-provider";
import { formatCurrency } from "@/lib/format";
import {
  getPlanListPrice,
  getPlanMonthlyPrice,
  getPlanSubscriberCount,
  normalizeModuleIds,
} from "@/lib/permissions/modules";
import type { OrganizationType, Plan } from "@/types";

const TIER_ORDER = { standard: 0, professional: 1, custom: 2 } as const;

export default function PlatformPlansPage() {
  return (
    <PlatformAdminGuard>
      <PlansView />
    </PlatformAdminGuard>
  );
}

function PlansView() {
  return (
    <>
      <PageHeader
        title="Plans"
        description="Standard and Professional are what onboarding offers, one of each per organization type. Custom plans are built here or by customers during onboarding, and can be private to a single organization."
        actions={
          <LinkButton size="sm" href="/platform/plans/new">
            <Plus className="size-4" />
            New custom plan
          </LinkButton>
        }
      />
      <PlanTable audience="brand" />
      <PlanTable audience="brokerage" />
    </>
  );
}

function PlanTable({ audience }: { audience: OrganizationType }) {
  const state = useAppState();
  const plans = state.plans
    .filter((plan) => plan.audience === audience)
    .sort(
      (a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name),
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {audience === "brand" ? "Brand plans" : "Brokerage plans"}
          <OrganizationTypeBadge type={audience} />
        </CardTitle>
        <CardDescription>
          Built from the {audience === "brand" ? "Brand" : "Brokerage"} module
          catalog only.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Plan</TableHead>
              <TableHead className="hidden md:table-cell">
                Available to
              </TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                Modules
              </TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="pr-4 text-right">Organizations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlanRow({ plan }: { plan: Plan }) {
  const state = useAppState();
  const owner = state.organizations.find(
    (org) => org.id === plan.organizationId,
  );
  const monthly = getPlanMonthlyPrice(state, plan);
  const listPrice = getPlanListPrice(state, plan);
  const moduleCount = normalizeModuleIds(
    state,
    plan.audience,
    plan.moduleIds,
  ).length;

  return (
    <TableRow>
      <TableCell className="pl-4">
        <Link
          href={`/platform/plans/${plan.id}`}
          className="group block min-w-0"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium group-hover:underline">
              {plan.name}
            </span>
            <Badge variant="secondary" className="capitalize">
              {plan.tier}
            </Badge>
          </span>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {plan.description}
          </span>
        </Link>
      </TableCell>
      <TableCell className="hidden text-sm md:table-cell">
        {owner ? (
          <Link
            href={`/platform/organizations/${owner.id}`}
            className="hover:underline"
          >
            Only {owner.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">
            Every {plan.audience === "brand" ? "brand" : "brokerage"}
          </span>
        )}
      </TableCell>
      <TableCell className="hidden text-right text-sm sm:table-cell">
        {moduleCount}
      </TableCell>
      <TableCell className="text-right">
        <p className="text-sm tabular-nums">{formatCurrency(monthly)}/mo</p>
        <p className="text-xs text-muted-foreground">
          {plan.fixedMonthlyPrice !== undefined
            ? listPrice > monthly
              ? `Bundle · list ${formatCurrency(listPrice)}`
              : "Bundle price"
            : "By module"}
        </p>
      </TableCell>
      <TableCell className="pr-4 text-right text-sm">
        {getPlanSubscriberCount(state, plan.id)}
      </TableCell>
    </TableRow>
  );
}
