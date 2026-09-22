"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/avatars";
import {
  MembershipStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
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
import { getAssignableRoles } from "@/lib/permissions/permissions";
import { isExternalEmail } from "@/lib/services/invitation-service";
import {
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

function MembersView() {
  const state = useAppState();
  const { organization, user, can } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Membership | null>(null);

  const roles = useMemo(
    () => (organization ? getAssignableRoles(state, organization.type) : []),
    [state, organization],
  );

  if (!organization) return null;

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );

  async function onChangeRole(membershipId: string, roleId: string) {
    if (!user) return;
    try {
      await changeMemberRole(membershipId, roleId, user.id);
      toast.success("Role updated");
    } catch {
      toast.error("Could not update the role");
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
    } catch {
      toast.error("Could not update the membership");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Members"
        description={`People with a membership in ${organization.name}. A role belongs to the membership, not to the person.`}
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
              : "This organization has no direct members. It may be managed by a brokerage."
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
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (candidate) => candidate.id === membership.userId,
                  );
                  const role = state.roles.find(
                    (candidate) => candidate.id === membership.roleId,
                  );
                  if (!member) return null;

                  const external = isExternalEmail(
                    member.email,
                    organization.id,
                  );
                  const isSelf = member.id === user?.id;

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
                            <p className="truncate text-xs text-muted-foreground sm:hidden">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
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
                          {can("role.assign") && !isSelf ? (
                            <FieldSelect
                              options={roles.map((item) => ({
                                value: item.id,
                                label: item.name,
                              }))}
                              value={membership.roleId}
                              onChange={(roleId) =>
                                void onChangeRole(membership.id, roleId)
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
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {relativeTime(membership.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {can("member.remove") && !isSelf ? (
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
                              {membership.status === "active" ? (
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
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setRemoving(membership)}
                              >
                                Remove member
                              </DropdownMenuItem>
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
              Their membership in {organization.name} ends immediately. The
              person keeps their Caboodle account and any memberships in other
              organizations.
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
