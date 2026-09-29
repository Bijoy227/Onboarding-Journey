"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { OrganizationAvatar } from "@/components/common/avatars";
import { OrganizationTypeBadge } from "@/components/common/badges";
import { DomainVerificationPanel } from "@/components/features/domain-verification";
import { OnboardingSteps } from "@/components/features/onboarding-steps";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";

/**
 * Step 5 of the onboarding journey: prove the organization owns its domain.
 * Either way, the journey continues to choosing a plan.
 */
export default function VerifyDomainPage({
  params,
}: PageProps<"/onboarding/verify-domain/[organizationId]">) {
  const { organizationId } = use(params);
  const router = useRouter();
  const state = useAppState();
  const { user } = useSession();

  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  const domain = state.domains.find(
    (item) => item.organizationId === organizationId && item.isPrimary,
  );

  if (!organization || !domain || !user) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Organization not found</CardTitle>
            <CardDescription>
              This organization does not exist in the demo data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <OnboardingSteps current="domain" className="mb-6" />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verify your organization</CardTitle>
          <CardDescription>
            Prove you own the domain. You can also do this later from Domains.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <OrganizationAvatar organization={organization} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{organization.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {domain.domain}
              </p>
            </div>
            <OrganizationTypeBadge type={organization.type} />
          </div>

          <DomainVerificationPanel
            domain={domain}
            organizationName={organization.name}
            actorUserId={user.id}
            onVerified={() => router.push("/onboarding/plan")}
          />

          {!domain.verified ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/onboarding/plan")}
            >
              Skip for now
            </Button>
          ) : (
            <Button className="w-full" onClick={() => router.push("/onboarding/plan")}>
              Continue to choose a plan
            </Button>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        You are already the Organization Admin. Verification is about proving
        domain ownership, not about granting you access.
      </p>
    </div>
  );
}
