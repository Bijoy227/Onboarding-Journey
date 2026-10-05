"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailX, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
  OrganizationTypeBadge,
  RoleBadge,
} from "@/components/common/badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useAppState } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";
import { getAssignableBrandIds } from "@/lib/services/brand-access-service";
import { signIn, switchOrganization } from "@/lib/services/auth-service";
import {
  InvitationError,
  acceptInvitation,
  isExternalEmail,
} from "@/lib/services/invitation-service";

/**
 * The simulated invitation link.
 *
 * Opening it stands in for clicking through from an email. Accepting creates
 * the membership and its Brand Access, and signs the invitee in so the demo
 * can continue as them, inside the organization they just joined.
 */
export default function InvitationPage({
  params,
}: PageProps<"/invitations/[token]">) {
  const { token } = use(params);
  const router = useRouter();
  const state = useAppState();

  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invitation = state.invitations.find((item) => item.token === token);

  if (!invitation) {
    return (
      <Fallback
        title="This invitation link isn't valid"
        description="It may have been revoked, or the demo data may have been reset."
      />
    );
  }

  const organization = state.organizations.find(
    (org) => org.id === invitation.organizationId,
  );
  const role = state.roles.find((item) => item.id === invitation.roleId);
  const inviter = state.users.find(
    (user) => user.id === invitation.invitedByUserId,
  );
  const existingUser = state.users.find(
    (user) => user.email.toLowerCase() === invitation.email.toLowerCase(),
  );

  if (!organization) {
    return (
      <Fallback
        title="Organization not found"
        description="The organization behind this invitation no longer exists."
      />
    );
  }

  if (invitation.status === "accepted") {
    return (
      <Fallback
        title="Invitation already accepted"
        description={`${invitation.email} is already a member of ${organization.name}.`}
      />
    );
  }

  if (invitation.status !== "pending") {
    return (
      <Fallback
        title={`This invitation was ${invitation.status}`}
        description="Ask an admin of the organization to send a new one."
      />
    );
  }

  const external = isExternalEmail(invitation.email, organization.id);
  const assignable = getAssignableBrandIds(state, organization.id);
  const invitedBrands = (invitation.brandOrganizationIds ?? [])
    .map((id) => state.organizations.find((org) => org.id === id))
    .filter((org) => org !== undefined);
  const accessSummary = role?.hasFullBrandAccess
    ? organization.type === "brand"
      ? `Every module ${organization.name} has enabled`
      : `Every Brand connected to ${organization.name}`
    : organization.type === "brand"
      ? `Full access to ${organization.name}, unless an admin restricts it`
      : invitedBrands.length === 0
        ? "No Brands yet: an admin assigns them"
        : invitedBrands
            .map((brand) =>
              assignable.has(brand.id)
                ? `${brand.name} (Full)`
                : `${brand.name} (no longer connected, skipped)`,
            )
            .join(", ");

  async function accept() {
    setPending(true);
    setError(null);
    try {
      await acceptInvitation(token, { name });
      await signIn(invitation!.email);
      switchOrganization(invitation!.organizationId);
      toast.success("Welcome aboard", {
        description: `You're now a member of ${organization!.name}.`,
      });
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof InvitationError
          ? caught.message
          : "Could not accept the invitation.",
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">You&apos;ve been invited to join</CardTitle>
          <CardDescription>
            Invited by {inviter?.name ?? "an administrator"} ·{" "}
            {relativeTime(invitation.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border p-4">
            <OrganizationAvatar
              organization={organization}
              className="size-10"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{organization.name}</p>
                <OrganizationTypeBadge type={organization.type} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Role</span>
                <RoleBadge name={role?.name ?? "Member"} />
              </div>
            </div>
          </div>

          <dl className="divide-y rounded-lg border">
            <div className="flex items-center justify-between gap-4 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">
                Invitation sent to
              </dt>
              <dd className="truncate text-sm">{invitation.email}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-3 py-2.5">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                {organization.type === "brokerage" ? "Brands" : "Access"}
              </dt>
              <dd className="text-right text-sm">{accessSummary}</dd>
            </div>
          </dl>

          {external ? (
            <Alert>
              <TriangleAlert className="size-4" />
              <AlertTitle>External member</AlertTitle>
              <AlertDescription>
                This email domain does not match {organization.name}&apos;s
                verified domain. The invitation is still valid: being invited
                explicitly is its own path to membership.
              </AlertDescription>
            </Alert>
          ) : null}

          {!existingUser ? (
            <div className="space-y-2">
              <Label htmlFor="invite-name">Your name</Label>
              <Input
                id="invite-name"
                placeholder="David Chen"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You don&apos;t have a Caboodle account yet — accepting creates
                one.
              </p>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            className="w-full"
            disabled={pending}
            onClick={() => void accept()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept invitation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Fallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MailX className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <LinkButton variant="outline" href="/login">
            Back to sign in
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
