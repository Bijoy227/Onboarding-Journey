"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  DomainStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import {
  RelationshipError,
  createOrganizationRelationship,
  findConnectableOrganizations,
} from "@/lib/services/relationship-service";

export default function FindOrganizationsPage() {
  return (
    <PermissionGuard permission="relationship.request">
      <FindOrganizationsView />
    </PermissionGuard>
  );
}

function FindOrganizationsView() {
  const state = useAppState();
  const { organization, user } = useSession();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Recomputed against `state` so results update the moment a request is sent.
  const results = useMemo(
    () => (organization ? findConnectableOrganizations(organization.id, query) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [organization, query, state],
  );

  if (!organization || !user) return null;

  const counterpartLabel = organization.type === "brand" ? "brokerage" : "brand";

  async function request(targetId: string) {
    if (!organization || !user) return;
    setPendingId(targetId);
    try {
      // The brokerage is always the source of a representation relationship.
      const brokerageIsUs = organization.type === "brokerage";
      await createOrganizationRelationship({
        sourceOrganizationId: brokerageIsUs ? organization.id : targetId,
        targetOrganizationId: brokerageIsUs ? targetId : organization.id,
        type: "brokerage_represents_brand",
        requestedByUserId: user.id,
      });
      toast.success("Relationship requested", {
        description: "The other organization's admins can approve or reject it.",
      });
    } catch (caught) {
      toast.error(
        caught instanceof RelationshipError
          ? caught.message
          : "Could not send the request",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Find organizations"
        description={`Search for a ${counterpartLabel} to work with. A relationship request has to be approved by the other organization before it becomes active.`}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={`Search ${counterpartLabel}s by name`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No organizations found"
          description={
            query
              ? `No ${counterpartLabel} matches "${query}" that you are not already connected to.`
              : `Every ${counterpartLabel} on the platform is already connected to or pending with ${organization.name}.`
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((result) => {
            const domain = state.domains.find(
              (candidate) =>
                candidate.organizationId === result.id && candidate.isPrimary,
            );
            const memberCount = state.memberships.filter(
              (membership) =>
                membership.organizationId === result.id &&
                membership.status === "active",
            ).length;

            return (
              <Card key={result.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  <OrganizationAvatar organization={result} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {result.name}
                      </p>
                      <OrganizationTypeBadge type={result.type} />
                    </div>
                    {domain ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {domain.domain}
                        </span>
                        <DomainStatusBadge verified={domain.verified} />
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {memberCount} member{memberCount === 1 ? "" : "s"}
                    </p>
                    <Button
                      size="sm"
                      className="mt-1"
                      disabled={pendingId === result.id}
                      onClick={() => void request(result.id)}
                    >
                      {pendingId === result.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Request relationship
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
