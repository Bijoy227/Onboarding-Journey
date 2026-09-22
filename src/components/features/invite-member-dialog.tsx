"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { FieldSelect } from "@/components/common/field-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { getAssignableRoles } from "@/lib/permissions/permissions";
import {
  InvitationError,
  inviteMember,
  isExternalEmail,
} from "@/lib/services/invitation-service";
import type { Organization, Role, User } from "@/types";

/**
 * Invite a member.
 *
 * An email outside the organization's verified domains is surfaced as
 * information, never as a blocker: explicit invitations are a legitimate way in
 * for consultants, agencies and other external collaborators.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = useAppState();
  const { organization, user } = useSession();

  if (!organization || !user) return null;

  const roles = getAssignableRoles(state, organization.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remounted on every open so the form always starts clean. */}
        {open ? (
          <InviteForm
            organization={organization}
            user={user}
            roles={roles}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  organization,
  user,
  roles,
  onDone,
}: {
  organization: Organization;
  user: User;
  roles: Role[];
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | null>(
    () =>
      roles.find((role) => role.name !== "Organization Admin")?.id ??
      roles[0]?.id ??
      null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const external =
    email.includes("@") && isExternalEmail(email, organization.id);

  async function submit() {
    if (!roleId) return;
    setPending(true);
    setError(null);
    try {
      await inviteMember({
        email,
        organizationId: organization.id,
        roleId,
        invitedByUserId: user.id,
      });
      toast.success("Invitation sent", {
        description: `${email.trim().toLowerCase()} can now accept and join ${organization.name}.`,
      });
      onDone();
    } catch (caught) {
      setError(
        caught instanceof InvitationError
          ? caught.message
          : "Could not send the invitation.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite member</DialogTitle>
        <DialogDescription>
          Send an invitation to join {organization.name}.
        </DialogDescription>
      </DialogHeader>

      <form
        id="invite-member-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <FieldSelect
            id="invite-role"
            className="w-full"
            options={roles.map((role) => ({
              value: role.id,
              label: role.name,
            }))}
            value={roleId}
            onChange={setRoleId}
            placeholder="Select a role"
          />
          <p className="text-xs text-muted-foreground">
            {roles.find((role) => role.id === roleId)?.description}
          </p>
        </div>

        {external ? (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle>External member</AlertTitle>
            <AlertDescription>
              This email domain does not match the organization&apos;s verified
              domain. They can still join, because they were explicitly invited.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="invite-member-form"
          disabled={pending || !roleId}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Send invitation
        </Button>
      </DialogFooter>
    </>
  );
}
