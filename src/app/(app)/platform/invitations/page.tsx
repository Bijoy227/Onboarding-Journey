"use client";

import { Mail } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { InvitationStatusBadge, RoleBadge } from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";

export default function PlatformInvitationsPage() {
  return (
    <PlatformAdminGuard>
      <InvitationsView />
    </PlatformAdminGuard>
  );
}

function InvitationsView() {
  const state = useAppState();

  return (
    <>
      <PageHeader
        title="Invitations"
        description="Invitations issued by organization administrators across the platform."
      />

      {state.invitations.length === 0 ? (
        <EmptyState icon={Mail} title="No invitations" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.invitations.map((invitation) => {
                  const organization = state.organizations.find(
                    (org) => org.id === invitation.organizationId,
                  );
                  const role = state.roles.find(
                    (item) => item.id === invitation.roleId,
                  );
                  const inviter = state.users.find(
                    (user) => user.id === invitation.invitedByUserId,
                  );

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <p className="truncate text-sm">{invitation.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          by {inviter?.name ?? "—"} ·{" "}
                          {relativeTime(invitation.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{organization?.name}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <RoleBadge name={role?.name ?? "—"} />
                      </TableCell>
                      <TableCell>
                        <InvitationStatusBadge status={invitation.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {invitation.status === "pending" ? (
                          <LinkButton
                            variant="outline"
                            size="sm"
                            href={`/invitations/${invitation.token}`}
                          >
                            Open
                          </LinkButton>
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
    </>
  );
}
