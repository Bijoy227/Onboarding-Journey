"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  DomainStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { updateOrganization } from "@/lib/services/organization-service";
import type { MembershipPolicy, Organization, User } from "@/types";

const POLICY_OPTIONS: {
  value: MembershipPolicy;
  label: string;
  description: string;
}[] = [
  {
    value: "anyone",
    label: "Anyone can request",
    description:
      "Any signed-in person can ask to join, whatever their email domain. An admin still approves.",
  },
  {
    value: "verified_domain",
    label: "Verified domain users can request",
    description:
      "Only people whose work email matches a verified domain can request access. An admin still approves.",
  },
  {
    value: "invite_only",
    label: "Invitation only",
    description: "Nobody can request access. Members join by invitation.",
  },
];

export default function OrganizationSettingsPage() {
  return (
    <PermissionGuard permission="organization.update">
      <SettingsView />
    </PermissionGuard>
  );
}

function SettingsView() {
  const { organization, user } = useSession();

  if (!organization || !user) return null;

  // Keyed by organization so switching organizations remounts the form with
  // that organization's values, rather than syncing them in an effect.
  return (
    <SettingsForm
      key={organization.id}
      organization={organization}
      user={user}
    />
  );
}

function SettingsForm({
  organization,
  user,
}: {
  organization: Organization;
  user: User;
}) {
  const state = useAppState();

  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description ?? "");
  const [policy, setPolicy] = useState<MembershipPolicy>(
    organization.membershipPolicy,
  );
  const [pending, setPending] = useState(false);

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );
  const primaryDomain = domains.find((domain) => domain.isPrimary) ?? domains[0];

  const dirty =
    name !== organization.name ||
    description !== (organization.description ?? "") ||
    policy !== organization.membershipPolicy;

  async function save() {
    setPending(true);
    try {
      await updateOrganization(
        organization.id,
        { name, description, membershipPolicy: policy },
        user.id,
      );
      toast.success("Organization updated");
    } catch {
      toast.error("Could not save the changes");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Organization settings"
        description="Profile and membership policy for this organization."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Textarea
              id="org-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Type</p>
              <OrganizationTypeBadge type={organization.type} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Primary domain
              </p>
              {primaryDomain ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {primaryDomain.domain}
                  </span>
                  <DomainStatusBadge verified={primaryDomain.verified} />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <OrganizationStatusBadge status={organization.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membership policy</CardTitle>
          <CardDescription>Who can request access to join?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={policy}
            onValueChange={(value) => setPolicy(value as MembershipPolicy)}
            className="space-y-3"
          >
            {POLICY_OPTIONS.map((option) => (
              <Label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-data-[checked]:border-primary"
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button
            variant="outline"
            disabled={!dirty || pending}
            onClick={() => {
              setName(organization.name);
              setDescription(organization.description ?? "");
              setPolicy(organization.membershipPolicy);
            }}
          >
            Discard
          </Button>
          <Button disabled={!dirty || pending} onClick={() => void save()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
