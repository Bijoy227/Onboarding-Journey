"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { OrganizationTypeBadge } from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { BillingCycleToggle } from "@/components/features/billing-cycle-toggle";
import { PlanModuleList } from "@/components/features/plan-module-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  getActiveSubscription,
  getAssignablePlans,
  getPlanMonthlyPrice,
  normalizeModuleIds,
  priceForCycle,
} from "@/lib/permissions/modules";
import { planLabel } from "@/lib/services/plan-service";
import {
  SubscriptionError,
  assignPlan,
} from "@/lib/services/subscription-service";
import type { BillingCycle, Organization } from "@/types";

/**
 * Platform Admin: put an organization on any plan for its type. Takes effect
 * immediately and skips payment, the way an enterprise contract would.
 */
export function AssignPlanDialog({
  organization,
  onOpenChange,
}: {
  organization: Organization | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={organization !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {organization ? (
          <AssignPlanForm
            key={organization.id}
            organization={organization}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AssignPlanForm({
  organization,
  onDone,
}: {
  organization: Organization;
  onDone: () => void;
}) {
  const state = useAppState();
  const { user } = useSession();

  const current = getActiveSubscription(state, organization.id);
  const plans = getAssignablePlans(state, organization.type, organization.id);

  const [planId, setPlanId] = useState<string>(
    current?.planId ?? plans[0]?.id ?? "",
  );
  const [cycle, setCycle] = useState<BillingCycle>(
    current?.billingCycle ?? "monthly",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const plan = plans.find((item) => item.id === planId);
  const moduleIds = plan
    ? normalizeModuleIds(state, plan.audience, plan.moduleIds)
    : [];
  const unchanged =
    current?.planId === planId && current?.billingCycle === cycle;

  async function submit() {
    if (!user || !plan) return;
    setError(null);
    setPending(true);
    try {
      await assignPlan({
        organizationId: organization.id,
        planId: plan.id,
        billingCycle: cycle,
        actorUserId: user.id,
      });
      toast.success("Plan assigned", {
        description: `${organization.name} is on ${planLabel(state.organizations, plan)}.`,
      });
      onDone();
    } catch (caught) {
      setError(
        caught instanceof SubscriptionError
          ? caught.message
          : "Could not assign the plan.",
      );
      setPending(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Plan for {organization.name}
          <OrganizationTypeBadge type={organization.type} />
        </DialogTitle>
        <DialogDescription>
          Takes effect immediately with no payment step. Only{" "}
          {organization.type === "brand" ? "Brand" : "Brokerage"} plans are
          offered, because the module catalogs differ.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="assign-plan">Plan</Label>
        <FieldSelect
          id="assign-plan"
          className="w-full"
          value={planId || null}
          onChange={setPlanId}
          placeholder="Choose a plan"
          options={plans.map((item) => ({
            value: item.id,
            label: `${planLabel(state.organizations, item)} · ${formatCurrency(
              getPlanMonthlyPrice(state, item),
            )}/mo`,
          }))}
        />
        <p className="text-xs text-muted-foreground">
          Need something else?{" "}
          <Link
            href={`/platform/plans/new?organizationId=${organization.id}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Build a custom plan for {organization.name}
          </Link>
        </p>
      </div>

      <div className="space-y-2">
        <Label>Billing</Label>
        <div>
          <BillingCycleToggle value={cycle} onChange={setCycle} />
        </div>
      </div>

      {plan ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {pluralize(moduleIds.length, "module")}
            </p>
            <p className="text-sm tabular-nums">
              {formatCurrency(
                priceForCycle(getPlanMonthlyPrice(state, plan), cycle),
              )}
              <span className="text-xs text-muted-foreground">
                /{cycle === "annual" ? "year" : "month"}
              </span>
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <PlanModuleList
              modules={state.modules.filter((entry) =>
                moduleIds.includes(entry.id),
              )}
              dense
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !plan || unchanged}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {current ? "Change plan" : "Assign plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
