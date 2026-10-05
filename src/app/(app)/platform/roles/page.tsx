"use client";

import { useState } from "react";
import { Lock, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { SegmentedControl } from "@/components/common/segmented-control";
import { PageHeader } from "@/components/common/states";
import {
  RoleDialog,
  type RoleDialogTarget,
} from "@/components/features/role-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import { PERMISSIONS, getAssignableRoles } from "@/lib/permissions/permissions";
import { RoleError, deleteRole, getRoleUsage } from "@/lib/services/role-service";
import type { OrganizationType, Role } from "@/types";

export default function PlatformRolesPage() {
  return (
    <PlatformAdminGuard>
      <RolesView />
    </PlatformAdminGuard>
  );
}

function RolesView() {
  const state = useAppState();
  const { user } = useSession();
  const [type, setType] = useState<OrganizationType>("brand");
  const [dialog, setDialog] = useState<RoleDialogTarget | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const roles = getAssignableRoles(state, type);

  return (
    <>
      <PageHeader
        title="Roles"
        description="The roles organizations give their members. The four system roles can't be changed; add custom roles for Brand-type or Brokerage-type organizations, and every organization of that type can use them. A role says what members may administer, and whether they get full brand access."
        actions={
          <Button
            size="sm"
            onClick={() => setDialog({ kind: "create", organizationType: type })}
          >
            <Plus className="size-4" />
            New role
          </Button>
        }
      />

      <SegmentedControl
        label="Organization type"
        value={type}
        onChange={setType}
        options={[
          { value: "brand", label: "Brand roles" },
          { value: "brokerage", label: "Brokerage roles" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const usage = getRoleUsage(state, role.id);
          const inUse = usage.members > 0 || usage.pending > 0;
          return (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {role.name}
                  {role.isSystem ? (
                    <Badge variant="secondary">
                      <Lock className="size-3" />
                      System
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    >
                      Custom
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{role.description || "No description."}</CardDescription>
                {role.isSystem ? null : (
                  <CardAction className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDialog({ kind: "edit", role })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={inUse}
                      title={
                        inUse
                          ? "In use: give its members another role first"
                          : undefined
                      }
                      onClick={() => setDeleting(role)}
                    >
                      Delete
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {role.hasFullBrandAccess ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      <ShieldCheck className="size-3" />
                      Full brand access
                    </Badge>
                  ) : (
                    <Badge variant="outline">Access per Brand</Badge>
                  )}
                  <span>
                    {pluralize(usage.members, "member")} in{" "}
                    {pluralize(usage.organizations, "organization")}
                    {usage.pending > 0 ? ` · ${usage.pending} pending` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {PERMISSIONS.filter((permission) =>
                    role.permissionIds.includes(permission.id),
                  ).map((permission) => (
                    <Badge
                      key={permission.id}
                      variant="secondary"
                      className="font-mono text-[10px]"
                      title={permission.description}
                    >
                      {permission.id}
                    </Badge>
                  ))}
                  {role.permissionIds.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      No organization permissions.
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RoleDialog
        target={dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nobody holds it, so nobody loses anything. It stops being offered
              to {deleting?.organizationType === "brand" ? "Brand" : "Brokerage"}{" "}
              organizations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting || !user) return;
                try {
                  await deleteRole(deleting.id, user.id);
                  toast.success("Role deleted", { description: deleting.name });
                } catch (caught) {
                  toast.error(
                    caught instanceof RoleError
                      ? caught.message
                      : "Could not delete the role",
                  );
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
