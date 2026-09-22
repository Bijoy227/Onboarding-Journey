"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { verifyDomain } from "@/lib/services/domain-service";
import type { OrganizationDomain } from "@/types";

/**
 * The simulated DNS verification step.
 *
 * Shown in onboarding and again on the Domains page, so both the unverified and
 * verified states are easy to demonstrate. Clicking verify simply succeeds:
 * there is no DNS lookup anywhere in this prototype.
 */
export function DomainVerificationPanel({
  domain,
  organizationName,
  actorUserId,
  onVerified,
}: {
  domain: OrganizationDomain;
  organizationName: string;
  actorUserId: string;
  onVerified?: () => void;
}) {
  const [pending, setPending] = useState(false);

  if (domain.verified) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/5">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <AlertDescription>
          <span className="font-medium text-foreground">Domain verified</span>
          <span className="ml-2 font-mono text-xs">{domain.domain}</span>
        </AlertDescription>
      </Alert>
    );
  }

  async function verify() {
    setPending(true);
    try {
      await verifyDomain(domain.id, actorUserId);
      toast.success("Domain verified", {
        description: `${organizationName} now controls ${domain.domain}.`,
      });
      onVerified?.();
    } catch {
      toast.error("Could not verify the domain");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        To verify that {organizationName} controls{" "}
        <span className="font-mono text-foreground">{domain.domain}</span>, add
        this DNS TXT record:
      </p>

      <dl className="divide-y rounded-lg border">
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-xs font-medium text-muted-foreground">Host</dt>
          <dd className="font-mono text-sm">@</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-xs font-medium text-muted-foreground">Value</dt>
          <dd className="truncate font-mono text-sm">
            {domain.verificationToken}
          </dd>
        </div>
      </dl>

      <Button onClick={() => void verify()} disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        I&apos;ve added the record — Verify
      </Button>

      <p className="text-xs text-muted-foreground">
        Verification proves the organization controls the domain. It improves
        discovery and membership controls, but it never means only people with
        this domain can belong: external collaborators can still be invited.
      </p>
    </div>
  );
}
