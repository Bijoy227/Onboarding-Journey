"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SegmentedControl } from "@/components/common/segmented-control";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/demo/demo-provider";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions/permissions";
import { RoleError, createRole, updateRole } from "@/lib/services/role-service";
import type { OrganizationType, PermissionId, Role } from "@/types";

export type RoleDialogTarget =
  | { kind: "create"; organizationType: OrganizationType }
  | { kind: "edit"; role: Role };

/**
 * Create or edit a custom role. Platform Admin only. A role is a name, the
 * organization permissions it grants, and whether it carries full brand
 * access; it is offered in every organization of its type.
 */
export function RoleDialog({
  target,
  onOpenChange,
}: {
  target: RoleDialogTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {target ? (
          <RoleForm
            key={target.kind === "edit" ? target.role.id : `new-${target.organizationType}`}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoleForm({
  target,
  onDone,
}: {
  target: RoleDialogTarget;
  onDone: () => void;
}) {
  const { user } = useSession();
  const existing = target.kind === "edit" ? target.role : undefined;

  const [organizationType, setOrganizationType] = useState<OrganizationType>(
    existing?.organizationType ??
      (target.kind === "create" ? target.organizationType : "brand"),
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [permissionIds, setPermissionIds] = useState<PermissionId[]>(
    existing?.permissionIds ?? ["organization.view", "member.view"],
  );
  const [hasFullBrandAccess, setHasFullBrandAccess] = useState(
    existing?.hasFullBrandAccess ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const typeLabel = organizationType === "brand" ? "Brand" : "Brokerage";

  function toggle(permissionId: PermissionId, on: boolean) {
    setPermissionIds((current) =>
      on
        ? [...current, permissionId]
        : current.filter((id) => id !== permissionId),
    );
  }

  async function submit() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      if (existing) {
        await updateRole(
          existing.id,
          { name, description, permissionIds, hasFullBrandAccess },
          user.id,
        );
        toast.success("Role updated", {
          description: "It applies at once to everyone who holds it.",
        });
      } else {
        await createRole(
          { name, description, organizationType, permissionIds, hasFullBrandAccess },
          user.id,
        );
        toast.success("Role created", {
          description: `Every ${typeLabel} organization can now give ${name.trim()} to its members.`,
        });
      }
      onDone();
    } catch (caught) {
      setError(caught instanceof RoleError ? caught.message : "Could not save the role.");
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
        <DialogTitle>{existing ? `Edit ${existing.name}` : "New role"}</DialogTitle>
        <DialogDescription>
          {existing
            ? `A custom role for ${typeLabel} organizations. Changes apply at once to everyone who holds it.`
            : "Offered in every organization of the type you choose. The type can't change later."}
        </DialogDescription>
      </DialogHeader>

      {!existing ? (
        <SegmentedControl
          label="Organization type"
          value={organizationType}
          onChange={setOrganizationType}
          disabled={pending}
          options={[
            { value: "brand", label: "Brand role" },
            { value: "brokerage", label: "Brokerage role" },
          ]}
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="role-name">Name</Label>
        <Input
          id="role-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={organizationType === "brand" ? "Brand Viewer" : "Senior Broker"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role-description">Description</Label>
        <Textarea
          id="role-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="What people with this role do."
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
        <Switch
          checked={hasFullBrandAccess}
          onCheckedChange={(checked) => setHasFullBrandAccess(Boolean(checked))}
          disabled={pending}
          className="mt-0.5"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Full brand access</span>
          <span className="block text-xs text-muted-foreground">
            {organizationType === "brand"
              ? "Every module available on the Brand, with every action, worked out from the role. Off: each person has a Brand Access, Full or Custom."
              : "Every connected Brand, with every module available on it, worked out from the role. Off: people only work on the Brands an admin assigns."}
          </span>
        </span>
      </label>

      <div className="space-y-3">
        <Label>Organization permissions</Label>
        {PERMISSION_GROUPS.map((group) => (
          <div key={group} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            {PERMISSIONS.filter((permission) => permission.group === group).map(
              (permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-2.5 text-sm"
                >
                  <Checkbox
                    checked={permissionIds.includes(permission.id)}
                    onCheckedChange={(checked) =>
                      toggle(permission.id, Boolean(checked))
                    }
                    disabled={pending}
                    className="mt-0.5"
                  />
                  <span>
                    {permission.name}
                    <span className="block text-xs text-muted-foreground">
                      {permission.description}
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="sticky -bottom-4 z-10 bg-popover!">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {existing ? "Save role" : "Create role"}
        </Button>
      </DialogFooter>
    </form>
  );
}
