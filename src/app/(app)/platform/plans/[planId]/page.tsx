"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { PlanEditor } from "@/components/features/plan-editor";
import { useAppState } from "@/lib/demo/demo-provider";
import { planLabel } from "@/lib/services/plan-service";

export default function EditPlanPage({
  params,
}: PageProps<"/platform/plans/[planId]">) {
  const { planId } = use(params);
  return (
    <PlatformAdminGuard>
      <EditPlan planId={planId} />
    </PlatformAdminGuard>
  );
}

function EditPlan({ planId }: { planId: string }) {
  const state = useAppState();
  const plan = state.plans.find((item) => item.id === planId);

  if (!plan) {
    return (
      <EmptyState
        title="Plan not found"
        description="It may have been deleted, or the demo data was reset."
        action={
          <LinkButton variant="outline" href="/platform/plans">
            All plans
          </LinkButton>
        }
      />
    );
  }

  return (
    <>
      <LinkButton
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
        href="/platform/plans"
      >
        <ArrowLeft className="size-4" />
        All plans
      </LinkButton>
      <PageHeader
        title={planLabel(state.organizations, plan)}
        description={
          plan.tier === "custom"
            ? "A custom plan. Changes apply to every organization on it."
            : `Offered to every new ${plan.audience} during onboarding. It can be edited, not deleted.`
        }
      />
      <PlanEditor key={plan.id} plan={plan} />
    </>
  );
}
