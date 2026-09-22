"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/avatars";
import {
  AccessRequestStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";
import { getAssignableRoles } from "@/lib/permissions/permissions";
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/services/access-request-service";

export default function AccessRequestsPage() {
  return (
    <PermissionGuard permission="member.approve">
      <AccessRequestsView />
    </PermissionGuard>
  );
}

function AccessRequestsView() {
  const state = useAppState();
  const { organization, user } = useSession();
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});

  if (!organization || !user) return null;

  const roles = getAssignableRoles(state, organization.type);
  const requests = state.accessRequests.filter(
    (request) => request.organizationId === organization.id,
  );
  const pending = requests.filter((request) => request.status === "pending");
  const reviewed = requests.filter((request) => request.status !== "pending");

  return (
    <>
      <PageHeader
        title="Access requests"
        description="People who found this organization from their work email domain and asked to join. Approving a request is what creates their membership."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending requests</CardTitle>
          <CardDescription>
            Nobody can see organization resources while their request is
            pending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No pending requests"
              description="Requests to join this organization appear here for review."
            />
          ) : (
            <ul className="space-y-3">
              {pending.map((request) => {
                const requester = state.users.find(
                  (candidate) => candidate.id === request.userId,
                );
                if (!requester) return null;
                const roleId =
                  roleOverrides[request.id] ?? request.requestedRoleId;

                return (
                  <li
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                  >
                    <UserAvatar name={requester.name} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {requester.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {requester.email} · requested{" "}
                        {relativeTime(request.requestedAt)}
                      </p>
                      {request.message ? (
                        <p className="text-xs text-muted-foreground italic">
                          &ldquo;{request.message}&rdquo;
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <FieldSelect
                        options={roles.map((role) => ({
                          value: role.id,
                          label: role.name,
                        }))}
                        value={roleId}
                        onChange={(value) =>
                          setRoleOverrides((current) => ({
                            ...current,
                            [request.id]: value,
                          }))
                        }
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await approveAccessRequest(
                              request.id,
                              user.id,
                              roleId,
                            );
                            toast.success("Access approved", {
                              description: `${requester.name} is now a member of ${organization.name}.`,
                            });
                          } catch {
                            toast.error("Could not approve the request");
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await rejectAccessRequest(request.id, user.id);
                            toast.success("Request rejected");
                          } catch {
                            toast.error("Could not reject the request");
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {reviewed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reviewed.map((request) => {
                const requester = state.users.find(
                  (candidate) => candidate.id === request.userId,
                );
                const role = state.roles.find(
                  (candidate) => candidate.id === request.requestedRoleId,
                );
                const reviewer = state.users.find(
                  (candidate) => candidate.id === request.reviewedByUserId,
                );
                return (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {requester?.name ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {reviewer ? `Reviewed by ${reviewer.name}` : "Reviewed"}
                        {request.reviewedAt
                          ? ` · ${relativeTime(request.reviewedAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleBadge name={role?.name ?? "—"} />
                      <AccessRequestStatusBadge status={request.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
