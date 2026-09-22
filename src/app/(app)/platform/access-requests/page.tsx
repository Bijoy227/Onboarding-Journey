"use client";

import { ClipboardList } from "lucide-react";

import { UserAvatar } from "@/components/common/avatars";
import {
  AccessRequestStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
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

export default function PlatformAccessRequestsPage() {
  return (
    <PlatformAdminGuard>
      <AccessRequestsView />
    </PlatformAdminGuard>
  );
}

function AccessRequestsView() {
  const state = useAppState();

  return (
    <>
      <PageHeader
        title="Access requests"
        description="Every request to join an organization, across the platform. Organization admins review their own — this view is for oversight."
      />

      {state.accessRequests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No access requests" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Requested role
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.accessRequests.map((request) => {
                  const requester = state.users.find(
                    (user) => user.id === request.userId,
                  );
                  const organization = state.organizations.find(
                    (org) => org.id === request.organizationId,
                  );
                  const role = state.roles.find(
                    (item) => item.id === request.requestedRoleId,
                  );

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={requester?.name ?? "?"}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {requester?.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {requester?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{organization?.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {relativeTime(request.requestedAt)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <RoleBadge name={role?.name ?? "—"} />
                      </TableCell>
                      <TableCell>
                        <AccessRequestStatusBadge status={request.status} />
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
