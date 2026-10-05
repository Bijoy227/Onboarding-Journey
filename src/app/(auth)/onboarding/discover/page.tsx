"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Clock, Loader2, SearchX } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import { OnboardingSteps } from "@/components/features/onboarding-steps";
import {
  DomainStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/lib/demo/demo-provider";
import { useVerifiedUser } from "@/lib/demo/use-verified-user";
import { ROLE_IDS } from "@/lib/permissions/permissions";
import {
  AccessRequestError,
  canRequestAccess,
  requestOrganizationAccess,
} from "@/lib/services/access-request-service";
import { switchOrganization } from "@/lib/services/auth-service";
import {
  discoverOrganizationByEmailSync,
  domainFromEmail,
} from "@/lib/services/organization-service";

/**
 * Step 3 of the onboarding journey: organization discovery.
 *
 * The domain is read straight off the user's work email. If an organization has
 * already claimed it, they can ask to join instead of creating a duplicate.
 */
export default function DiscoverPage() {
  const router = useRouter();
  const state = useAppState();
  const user = useVerifiedUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const result = discoverOrganizationByEmailSync(user.email);
  const domain = domainFromEmail(user.email);

  const existingRequest = state.accessRequests.find(
    (request) =>
      request.userId === user.id &&
      result.kind === "found" &&
      request.organizationId === result.organization.id,
  );

  const existingMembership = state.memberships.find(
    (membership) =>
      membership.userId === user.id &&
      result.kind === "found" &&
      membership.organizationId === result.organization.id &&
      membership.status === "active",
  );

  async function requestAccess(organizationId: string) {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      await requestOrganizationAccess({
        userId: user.id,
        organizationId,
        requestedRoleId:
          result.kind === "found" && result.organization.type === "brokerage"
            ? ROLE_IDS.broker
            : ROLE_IDS.brandMember,
      });
    } catch (caught) {
      setError(
        caught instanceof AccessRequestError
          ? caught.message
          : "Could not submit the request.",
      );
    } finally {
      setPending(false);
    }
  }

  if (existingMembership && result.kind === "found") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              You&apos;re already a member
            </CardTitle>
            <CardDescription>
              Your membership in {result.organization.name} is active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                switchOrganization(result.organization.id);
                router.push("/dashboard");
              }}
            >
              Go to {result.organization.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest && existingRequest.status === "pending") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Access request submitted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y rounded-lg border">
              <Row
                label="Organization"
                value={
                  result.kind === "found" ? result.organization.name : "—"
                }
              />
              <Row label="Status" value="Pending" />
            </dl>
            <Alert>
              <Clock className="size-4" />
              <AlertDescription>
                An organization administrator will review your request. You
                can&apos;t access organization resources until it&apos;s
                approved.
              </AlertDescription>
            </Alert>
            <p className="text-center text-xs text-muted-foreground">
              In the demo, sign in as an admin of{" "}
              {result.kind === "found" ? result.organization.name : "it"} to
              approve it, then come back.
            </p>
            <LinkButton variant="outline" className="w-full" href="/login">
              Switch demo user
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest && existingRequest.status === "rejected") {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Request not approved</CardTitle>
            <CardDescription>
              An administrator declined your request to join{" "}
              {result.kind === "found" ? result.organization.name : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton variant="outline" className="w-full" href="/onboarding/create-organization">
              Create a different organization
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result.kind === "found") {
    const gate = canRequestAccess(user.email, result.organization.id);

    return (
      <div className="mx-auto max-w-lg space-y-4">
        <OnboardingSteps current="organization" className="mb-6" />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              We found an organization associated with your email domain
            </CardTitle>
            <CardDescription>
              <span className="font-mono">{domain}</span> belongs to an
              organization that already exists on Caboodle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border p-4">
              <OrganizationAvatar
                organization={result.organization}
                className="size-10"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">
                    {result.organization.name}
                  </p>
                  <OrganizationTypeBadge type={result.organization.type} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {result.domain.domain}
                  </span>
                  <DomainStatusBadge verified={result.domain.verified} />
                </div>
              </div>
            </div>

            {!gate.allowed ? (
              <Alert>
                <AlertDescription>{gate.reason}</AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button
                disabled={pending || !gate.allowed}
                onClick={() => void requestAccess(result.organization.id)}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Request access
              </Button>
              <LinkButton variant="outline" href="/onboarding/create-organization">
                Create a different organization
              </LinkButton>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Notice what didn&apos;t happen: nobody at Caboodle had to create this
          organization or add you to it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <OnboardingSteps current="organization" />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            We couldn&apos;t find your organization
          </CardTitle>
          <CardDescription>
            No organization has claimed{" "}
            <span className="font-mono">{domain || "your email domain"}</span>{" "}
            yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              You can create it yourself — no one at Caboodle needs to set it up
              for you.
            </p>
          </div>
          <LinkButton className="w-full" href="/onboarding/create-organization">
            <Building2 className="size-4" />
            Create an organization
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium">
        {value === "Pending" ? (
          <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
        ) : null}
        {value === "Approved" ? (
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : null}
        {value}
      </dd>
    </div>
  );
}
