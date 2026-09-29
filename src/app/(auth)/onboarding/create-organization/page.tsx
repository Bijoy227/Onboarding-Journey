"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Store } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OnboardingSteps } from "@/components/features/onboarding-steps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifiedUser } from "@/lib/demo/use-verified-user";
import { cn } from "@/lib/utils";
import { switchOrganization } from "@/lib/services/auth-service";
import {
  OrganizationError,
  createOrganization,
  domainFromEmail,
} from "@/lib/services/organization-service";
import type { OrganizationType, User } from "@/types";

/**
 * Self-service organization creation.
 *
 * Note what this form does NOT ask for: a "Brand Owner" or a "Broker user". The
 * organization is the business entity; the person creating it simply becomes
 * its first Organization Admin.
 */
export default function CreateOrganizationPage() {
  const user = useVerifiedUser();

  if (!user) return null;

  // Keyed by the signed-in user so the prefilled domain follows a demo-user
  // switch without syncing state in an effect.
  return <CreateOrganizationForm key={user.id} user={user} />;
}

function CreateOrganizationForm({ user }: { user: User }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<OrganizationType>("brand");
  const [domain, setDomain] = useState(() => domainFromEmail(user.email));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const organization = await createOrganization({
        name,
        type,
        domain,
        createdByUserId: user.id,
      });
      switchOrganization(organization.id);
      router.push(`/onboarding/verify-domain/${organization.id}`);
    } catch (caught) {
      setError(
        caught instanceof OrganizationError
          ? caught.message
          : "Could not create the organization.",
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <OnboardingSteps current="organization" />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create your organization</CardTitle>
          <CardDescription>
            You&apos;ll become its first Organization Admin automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                placeholder="Acme Foods"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Organization type</Label>
              <div className="grid grid-cols-2 gap-2">
                <TypeOption
                  icon={Store}
                  label="Brand"
                  description="A manufacturer or product brand"
                  selected={type === "brand"}
                  onSelect={() => setType("brand")}
                />
                <TypeOption
                  icon={Building2}
                  label="Brokerage"
                  description="A firm representing brands"
                  selected={type === "brokerage"}
                  onSelect={() => setType("brokerage")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work email</Label>
              <Input value={user.email} readOnly className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-domain">Domain</Label>
              <Input
                id="org-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Try <span className="font-mono">conflicted.com</span> to see what
                happens when a domain is already claimed.
              </p>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Continue
              </Button>
              <LinkButton type="button" variant="ghost" href="/dashboard">
                Cancel
              </LinkButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TypeOption({
  icon: Icon,
  label,
  description,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors hover:bg-accent",
        selected && "border-primary bg-accent",
      )}
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
