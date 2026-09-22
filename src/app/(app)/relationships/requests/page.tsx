"use client";

import { GitCompareArrows } from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  OrganizationTypeBadge,
  RelationshipStatusBadge,
} from "@/components/common/badges";
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
import {
  approveOrganizationRelationship,
  rejectOrganizationRelationship,
} from "@/lib/services/relationship-service";
import type { OrganizationRelationship } from "@/types";

export default function RelationshipRequestsPage() {
  return (
    <PermissionGuard permission="relationship.view">
      <RequestsView />
    </PermissionGuard>
  );
}

function RequestsView() {
  const state = useAppState();
  const { organization, user, can } = useSession();

  if (!organization || !user) return null;

  const incoming = state.relationships.filter(
    (relationship) =>
      relationship.targetOrganizationId === organization.id &&
      relationship.status === "pending",
  );

  const outgoing = state.relationships.filter(
    (relationship) =>
      relationship.sourceOrganizationId === organization.id &&
      relationship.status === "pending",
  );

  const decided = state.relationships.filter(
    (relationship) =>
      (relationship.sourceOrganizationId === organization.id ||
        relationship.targetOrganizationId === organization.id) &&
      relationship.status === "rejected",
  );

  async function approve(relationship: OrganizationRelationship) {
    if (!user) return;
    try {
      await approveOrganizationRelationship(relationship.id, user.id);
      toast.success("Relationship approved", {
        description: "Both organizations can now see the connection.",
      });
    } catch {
      toast.error("Could not approve the relationship");
    }
  }

  async function reject(relationship: OrganizationRelationship) {
    if (!user) return;
    try {
      await rejectOrganizationRelationship(relationship.id, user.id);
      toast.success("Relationship request declined");
    } catch {
      toast.error("Could not decline the request");
    }
  }

  return (
    <>
      <PageHeader
        title="Relationship requests"
        description="Requests to connect this organization with another. Approving one makes the relationship visible to both sides."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incoming</CardTitle>
          <CardDescription>
            Organizations asking to work with {organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incoming.length === 0 ? (
            <EmptyState
              icon={GitCompareArrows}
              title="No incoming requests"
              description="When another organization asks to connect, it shows up here."
            />
          ) : (
            <ul className="space-y-3">
              {incoming.map((relationship) => {
                const source = state.organizations.find(
                  (org) => org.id === relationship.sourceOrganizationId,
                );
                const requester = state.users.find(
                  (candidate) => candidate.id === relationship.requestedByUserId,
                );
                if (!source) return null;

                return (
                  <li
                    key={relationship.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                  >
                    <OrganizationAvatar organization={source} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {source.name}
                        </p>
                        <OrganizationTypeBadge type={source.type} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested by {requester?.name ?? "someone"} ·{" "}
                        {relativeTime(relationship.createdAt)}
                        {relationship.regions?.length
                          ? ` · ${relationship.regions.join(", ")}`
                          : ""}
                      </p>
                    </div>
                    {can("relationship.approve") ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          onClick={() => void approve(relationship)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void reject(relationship)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <p className="shrink-0 text-xs text-muted-foreground">
                        Only an Organization Admin can decide.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outgoing</CardTitle>
          <CardDescription>
            Requests {organization.name} has sent and is waiting on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outgoing.length === 0 ? (
            <EmptyState
              icon={GitCompareArrows}
              title="No outgoing requests"
              description="Requests you send stay here until the other organization responds."
            />
          ) : (
            <ul className="space-y-3">
              {outgoing.map((relationship) => {
                const target = state.organizations.find(
                  (org) => org.id === relationship.targetOrganizationId,
                );
                if (!target) return null;
                return (
                  <li
                    key={relationship.id}
                    className="flex items-center gap-3 rounded-xl border p-4"
                  >
                    <OrganizationAvatar organization={target} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {target.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent {relativeTime(relationship.createdAt)}
                      </p>
                    </div>
                    <RelationshipStatusBadge status={relationship.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {decided.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {decided.map((relationship) => {
                const otherId =
                  relationship.sourceOrganizationId === organization.id
                    ? relationship.targetOrganizationId
                    : relationship.sourceOrganizationId;
                const other = state.organizations.find(
                  (org) => org.id === otherId,
                );
                if (!other) return null;
                return (
                  <li
                    key={relationship.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <span className="truncate text-sm">{other.name}</span>
                    <RelationshipStatusBadge status={relationship.status} />
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
