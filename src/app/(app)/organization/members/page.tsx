"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  MembershipStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { AssignBrandsDialog } from "@/components/features/assign-brands-dialog";
import { BrandChecklist } from "@/components/features/brand-checklist";
import { InviteMemberDialog } from "@/components/features/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import {
  getReachableBrands,
  resolveMembershipBrands,
} from "@/lib/permissions/access";
import { getAssignableRoles, getRole } from "@/lib/permissions/permissions";
import { isExternalEmail } from "@/lib/services/invitation-service";
import {
  MembershipError,
  changeMemberRole,
  setMembershipStatus,
} from "@/lib/services/membership-service";
import { relativeTime } from "@/lib/format";
import type { Membership } from "@/types";

export default function MembersPage() {
  return (
    <PermissionGuard permission="member.view">
      <MembersView />
    </PermissionGuard>
  );
}

/** A Brokerage Admin losing the role must say which Brands to keep. */
type PendingRoleChange = { membership: Membership; roleId: string };

function MembersView() {
  const router = useRouter();
  const state = useAppState();
  const { organization, user, can } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Membership | null>(null);
  const [assigning, setAssigning] = useState<Membership | null>(null);
  const [roleChange, setRoleChange] = useState<PendingRoleChange | null>(null);

  const roles = useMemo(
    () => (organization ? getAssignableRoles(state, organization.type) : []),
    [state, organization],
  );

  if (!organization) return null;
  const isBrokerage = organization.type === "brokerage";

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );

  async function onChangeRole(
    membership: Membership,
    roleId: string,
    brandIds?: string[],
  ) {
    if (!user) return;
    const from = getRole(state, membership.roleId);
    const to = getRole(state, roleId);
    if (
      isBrokerage &&
      from?.hasFullBrandAccess &&
      !to?.hasFullBrandAccess &&
      brandIds === undefined
    ) {
      setRoleChange({ membership, roleId });
      return;
    }
    try {
      await changeMemberRole(membership.id, roleId, user.id, { brandIds });
      toast.success("Role updated", {
        description: to?.hasFullBrandAccess
          ? "Admins get full access to every Brand from the role, so their individual Brand assignments were removed."
          : !isBrokerage && from?.hasFullBrandAccess
            ? "Their Brand Access was created at Full. Restrict it on the Brand access page."
            : undefined,
      });
    } catch (caught) {
      toast.error(
        caught instanceof MembershipError
          ? caught.message
          : "Could not update the role",
      );
    } finally {
      setRoleChange(null);
    }
  }

  async function onSetStatus(
    membership: Membership,
    status: Membership["status"],
  ) {
    if (!user) return;
    try {
      await setMembershipStatus(membership.id, status, user.id);
      toast.success(
        status === "suspended"
          ? "Membership suspended"
          : status === "removed"
            ? "Member removed"
            : "Membership reactivated",
      );
    } catch (caught) {
      toast.error(
        caught instanceof MembershipError
          ? caught.message
          : "Could not update the membership",
      );
    } finally {
      setRemoving(null);
    }
  }

  const showsActions =
    can("member.suspend") || can("member.remove") || can("access.manage");

  return (
    <>
      <PageHeader
        title="Members"
        description={`People with a membership in ${organization.name}. A role belongs to the membership, not to the person, and decides what they may administer. ${
          isBrokerage
            ? "The Brands column shows which connected Brands each person works on."
            : "The Access column shows whether each person has every module or a custom list."
        }`}
        actions={
          can("member.invite") ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Invite member
            </Button>
          ) : null
        }
      />

      {memberships.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description={
            can("member.invite")
              ? "Invite someone, or approve a pending access request."
              : "This organization has no members of its own. A connected brokerage may work on it."
          }
          action={
            can("member.invite") ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                Invite member
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {isBrokerage ? "Brands" : "Access"}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (candidate) => candidate.id === membership.userId,
                  );
                  const role = getRole(state, membership.roleId);
                  if (!member) return null;

                  const external = isExternalEmail(
                    member.email,
                    organization.id,
                  );
                  const isSelf = member.id === user?.id;
                  const brands = resolveMembershipBrands(state, membership);
                  const brandAccess = brands[0]?.brandAccess;

                  return (
                    <TableRow key={membership.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={member.name}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.name}
                              {isSelf ? (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground lg:hidden">
                              {member.email}
                              {external ? (
                                <Badge variant="outline" className="shrink-0">
                                  External
                                </Badge>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm text-muted-foreground">
                            {member.email}
                          </span>
                          {external ? (
                            <Badge variant="outline" className="shrink-0">
                              External
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {can("member.update") && !isSelf ? (
                            <FieldSelect
                              options={roles.map((item) => ({
                                value: item.id,
                                label: item.name,
                              }))}
                              value={membership.roleId}
                              onChange={(roleId) =>
                                void onChangeRole(membership, roleId)
                              }
                              className="h-7 text-xs"
                            />
                          ) : (
                            <RoleBadge name={role?.name ?? "—"} />
                          )}
                          {membership.status !== "active" ? (
                            <MembershipStatusBadge status={membership.status} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {role?.hasFullBrandAccess ? (
                          <BrandAccessBadge kind="admin" />
                        ) : isBrokerage ? (
                          brands.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No brands
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {brands.map((entry) => (
                                <Badge
                                  key={entry.brand.id}
                                  variant="secondary"
                                  className="font-normal"
                                >
                                  {entry.brand.name}
                                  <span className="text-muted-foreground">
                                    · {entry.kind === "full" ? "Full" : "Custom"}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          )
                        ) : brands[0] ? (
                          <BrandAccessBadge kind={brands[0].kind} />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {relativeTime(membership.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {showsActions && !isSelf ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" />
                              }
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Member actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Group label, so it needs a group around it. */}
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                  {member.name}
                                </DropdownMenuLabel>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              {can("access.manage") &&
                              !role?.hasFullBrandAccess ? (
                                isBrokerage ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setAssigning(membership)}
                                    >
                                      Assign brands
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/organization/brand-access#member-${membership.id}`,
                                        )
                                      }
                                    >
                                      Brand access
                                    </DropdownMenuItem>
                                  </>
                                ) : brandAccess ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/organization/brand-access/${brandAccess.id}`,
                                      )
                                    }
                                  >
                                    Module access
                                  </DropdownMenuItem>
                                ) : null
                              ) : null}
                              {can("member.suspend") ? (
                                membership.status === "active" ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void onSetStatus(membership, "suspended")
                                    }
                                  >
                                    Suspend membership
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void onSetStatus(membership, "active")
                                    }
                                  >
                                    Reactivate membership
                                  </DropdownMenuItem>
                                )
                              ) : null}
                              {can("member.remove") ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setRemoving(membership)}
                                >
                                  Remove member
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <AssignBrandsDialog
        membership={assigning}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
      />

      <KeepBrandsDialog
        change={roleChange}
        onCancel={() => setRoleChange(null)}
        onConfirm={(brandIds) => {
          if (roleChange)
            void onChangeRole(roleChange.membership, roleChange.roleId, brandIds);
        }}
      />

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              Their membership in {organization.name} ends immediately, and so
              do their Brand assignments. The person keeps their Caboodle
              account and any memberships in other organizations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) void onSetStatus(removing, "removed");
              }}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Leaving the Brokerage Admin role takes away the derived access to every
 * connected Brand, so the Brands to keep are chosen in the same step.
 */
function KeepBrandsDialog({
  change,
  onCancel,
  onConfirm,
}: {
  change: PendingRoleChange | null;
  onCancel: () => void;
  onConfirm: (brandIds: string[]) => void;
}) {
  return (
    <Dialog
      open={change !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {change ? (
          <KeepBrandsForm
            key={`${change.membership.id}:${change.roleId}`}
            change={change}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function KeepBrandsForm({
  change,
  onCancel,
  onConfirm,
}: {
  change: PendingRoleChange;
  onCancel: () => void;
  onConfirm: (brandIds: string[]) => void;
}) {
  const state = useAppState();
  const organization = state.organizations.find(
    (org) => org.id === change.membership.organizationId,
  );
  const member = state.users.find((item) => item.id === change.membership.userId);
  const role = getRole(state, change.roleId);
  const connected = organization ? getReachableBrands(state, organization) : [];
  const [brandIds, setBrandIds] = useState<string[]>(() =>
    connected.map((brand) => brand.id),
  );
  const [pending, setPending] = useState(false);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Make {member?.name} a {role?.name}
        </DialogTitle>
        <DialogDescription>
          As an admin, {member?.name} works on every connected Brand. As a{" "}
          {role?.name} they only work on the Brands ticked here, each starting
          at Full access.
        </DialogDescription>
      </DialogHeader>
      <BrandChecklist
        brands={connected}
        value={brandIds}
        onChange={setBrandIds}
        disabled={pending}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            setPending(true);
            onConfirm(brandIds);
          }}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Change role
        </Button>
      </DialogFooter>
    </>
  );
}
