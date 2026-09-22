"use client";

import { Network } from "lucide-react";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  OrganizationTypeBadge,
  RelationshipStatusBadge,
} from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";

export default function PlatformRelationshipsPage() {
  return (
    <PlatformAdminGuard>
      <RelationshipsView />
    </PlatformAdminGuard>
  );
}

function RelationshipsView() {
  const state = useAppState();

  /** Grouped by brand so the "one brand, many brokerages" shape is obvious. */
  const brands = state.organizations.filter((org) => org.type === "brand");

  return (
    <>
      <PageHeader
        title="Relationships"
        description="How organizations are connected across the platform. A Brand can work with many Brokerages, and a Brokerage with many Brands."
      />

      {state.relationships.length === 0 ? (
        <EmptyState icon={Network} title="No relationships yet" />
      ) : (
        <div className="space-y-4">
          {brands.map((brand) => {
            const connections = state.relationships.filter(
              (relationship) =>
                relationship.targetOrganizationId === brand.id ||
                relationship.sourceOrganizationId === brand.id,
            );
            if (connections.length === 0) return null;

            return (
              <Card key={brand.id}>
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <OrganizationAvatar organization={brand} />
                  <div className="flex-1">
                    <CardTitle className="text-base">{brand.name}</CardTitle>
                    <CardDescription>
                      {connections.filter((item) => item.status === "active")
                        .length}{" "}
                      active connection(s)
                    </CardDescription>
                  </div>
                  <OrganizationTypeBadge type={brand.type} />
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {connections.map((relationship) => {
                      const otherId =
                        relationship.sourceOrganizationId === brand.id
                          ? relationship.targetOrganizationId
                          : relationship.sourceOrganizationId;
                      const other = state.organizations.find(
                        (org) => org.id === otherId,
                      );
                      const requester = state.users.find(
                        (user) => user.id === relationship.requestedByUserId,
                      );
                      if (!other) return null;

                      return (
                        <li
                          key={relationship.id}
                          className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                        >
                          <OrganizationAvatar
                            organization={other}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {other.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Requested by {requester?.name ?? "someone"} ·{" "}
                              {relativeTime(relationship.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {relationship.regions?.map((region) => (
                              <Badge key={region} variant="outline">
                                {region}
                              </Badge>
                            ))}
                            {relationship.type === "brokerage_manages_brand" ? (
                              <Badge variant="secondary">Manages</Badge>
                            ) : null}
                            <RelationshipStatusBadge
                              status={relationship.status}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
