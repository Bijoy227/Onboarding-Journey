"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { PlanEditor } from "@/components/features/plan-editor";
import { useAppState } from "@/lib/demo/demo-provider";

export default function NewPlanPage() {
  return (
    <PlatformAdminGuard>
      {/* useSearchParams needs a Suspense boundary to prerender the route. */}
      <Suspense>
        <NewPlan />
      </Suspense>
    </PlatformAdminGuard>
  );
}

/** ?organizationId= preselects a private plan for that organization. */
function NewPlan() {
  const state = useAppState();
  const organizationId = useSearchParams().get("organizationId") ?? undefined;
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );

  return (
    <>
      <LinkButton
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
        href={
          organization
            ? `/platform/organizations/${organization.id}`
            : "/platform/plans"
        }
      >
        <ArrowLeft className="size-4" />
        {organization ? organization.name : "All plans"}
      </LinkButton>
      <PageHeader
        title={
          organization
            ? `Custom plan for ${organization.name}`
            : "New custom plan"
        }
        description="Pick modules from the catalog, then price the plan by module or as a bundle."
      />
      <PlanEditor
        key={organization?.id ?? "any"}
        initialOrganizationId={organization?.id}
      />
    </>
  );
}
