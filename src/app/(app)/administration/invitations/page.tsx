"use client";

import { useState } from "react";
import { Copy, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { InvitationStatusBadge, RoleBadge } from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { InviteMemberDialog } from "@/components/features/invite-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";
import {
  isExternalEmail,
  resendInvitation,
  revokeInvitation,
} from "@/lib/services/invitation-service";

export default function InvitationsPage() {
  return (
    <PermissionGuard permission="member.invite">
      <InvitationsView />
    </PermissionGuard>
  );
}

function InvitationsView() {
  const state = useAppState();
  const { organization, user } = useSession();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!organization || !user) return null;

  const invitations = state.invitations.filter(
    (invitation) => invitation.organizationId === organization.id,
  );

  return (
    <>
      <PageHeader
        title="Invitations"
        description="Invitations are simulated in this prototype: no email is sent. Open an invitation link to walk through acceptance."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invite member
          </Button>
        }
      />

      {invitations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No invitations yet"
          description="Invite someone to join this organization."
          action={
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Invited by
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const role = state.roles.find(
                    (item) => item.id === invitation.roleId,
                  );
                  const inviter = state.users.find(
                    (item) => item.id === invitation.invitedByUserId,
                  );
                  const external = isExternalEmail(
                    invitation.email,
                    organization.id,
                  );

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm">
                            {invitation.email}
                          </span>
                          {external ? (
                            <Badge variant="outline" className="shrink-0">
                              External
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sent {relativeTime(invitation.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <RoleBadge name={role?.name ?? "—"} />
                        {invitation.brandOrganizationIds?.length ? (
                          <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
                            {invitation.brandOrganizationIds
                              .map(
                                (id) =>
                                  state.organizations.find((org) => org.id === id)
                                    ?.name,
                              )
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {inviter?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <InvitationStatusBadge status={invitation.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          {invitation.status === "pending" ? (
                            <>
                              <LinkButton
                                variant="outline"
                                size="sm"
                                href={`/invitations/${invitation.token}`}
                              >
                                Open link
                              </LinkButton>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Copy invitation link"
                                onClick={async () => {
                                  const url = `${window.location.origin}/invitations/${invitation.token}`;
                                  try {
                                    await navigator.clipboard.writeText(url);
                                    toast.success("Invitation link copied");
                                  } catch {
                                    toast.error("Could not copy the link");
                                  }
                                }}
                              >
                                <Copy className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await revokeInvitation(invitation.id, user.id);
                                  toast.success("Invitation revoked");
                                }}
                              >
                                Revoke
                              </Button>
                            </>
                          ) : invitation.status === "accepted" ? (
                            <span className="text-xs text-muted-foreground">
                              Joined
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await resendInvitation(invitation.id, user.id);
                                toast.success("Invitation resent");
                              }}
                            >
                              Resend
                            </Button>
                          )}
                        </div>
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
    </>
  );
}
