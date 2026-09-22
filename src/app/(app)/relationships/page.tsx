"use client";

import Link from "next/link";
import { Link2, Search } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar } from "@/components/common/avatars";
import {
  OrganizationTypeBadge,
  RelationshipStatusBadge,
} from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";
import type { OrganizationRelationship } from "@/types";

export default function RelationshipsPage() {
  return (
    <PermissionGuard permission="relationship.view">
      <RelationshipsView />
    </PermissionGuard>
  );
}

function RelationshipsView() {
  const state = useAppState();
  const { organization, can } = useSession();

  if (!organization) return null;

  const active = state.relationships.filter(
    (relationship) =>
      relationship.status === "active" &&
      (relationship.sourceOrganizationId === organization.id ||
        relationship.targetOrganizationId === organization.id),
  );

  /** Brands this brokerage runs outright, which need no brand members at all. */
  const managed = active.filter(
    (relationship) =>
      relationship.type === "brokerage_manages_brand" &&
      relationship.sourceOrganizationId === organization.id,
  );

  const partners = active.filter(
    (relationship) => !managed.includes(relationship),
  );

  return (
    <>
      <PageHeader
        title="Connected organizations"
        description={
          organization.type === "brand"
            ? "Brokerage firms that represent this brand. A brand can work with as many brokerages as it needs."
            : "Brands this brokerage works with. Relationships are independent of membership."
        }
        actions={
          can("relationship.request") ? (
            <LinkButton size="sm" href="/relationships/find">
              <Search className="size-4" />
              Find organizations
            </LinkButton>
          ) : null
        }
      />

      {partners.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No connected organizations yet"
          description={
            can("relationship.request")
              ? "Search for an organization to request a relationship."
              : "Once a relationship is approved it appears here."
          }
          action={
            can("relationship.request") ? (
              <LinkButton size="sm" href="/relationships/find">
                Find organizations
              </LinkButton>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {partners.map((relationship) => (
            <RelationshipCard
              key={relationship.id}
              relationship={relationship}
              currentOrganizationId={organization.id}
            />
          ))}
        </div>
      )}

      {managed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Managed brands</CardTitle>
            <CardDescription>
              Brands operated by {organization.name}. These exist without a
              &ldquo;Brand Owner&rdquo; user and may have no direct members at
              all.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {managed.map((relationship) => (
              <RelationshipCard
                key={relationship.id}
                relationship={relationship}
                currentOrganizationId={organization.id}
                managed
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function RelationshipCard({
  relationship,
  currentOrganizationId,
  managed,
}: {
  relationship: OrganizationRelationship;
  currentOrganizationId: string;
  managed?: boolean;
}) {
  const state = useAppState();

  const otherId =
    relationship.sourceOrganizationId === currentOrganizationId
      ? relationship.targetOrganizationId
      : relationship.sourceOrganizationId;

  const other = state.organizations.find((org) => org.id === otherId);
  if (!other) return null;

  const directMembers = state.memberships.filter(
    (membership) =>
      membership.organizationId === other.id && membership.status === "active",
  ).length;

  const body = (
    <>
      <OrganizationAvatar organization={other} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{other.name}</p>
          <OrganizationTypeBadge type={other.type} />
        </div>
        <p className="text-xs text-muted-foreground">
          {managed
            ? `${directMembers} direct member${directMembers === 1 ? "" : "s"}`
            : (relationship.regions?.join(", ") ?? "No region set")}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <RelationshipStatusBadge status={relationship.status} />
          {managed ? <Badge variant="secondary">Managed</Badge> : null}
          <span className="text-xs text-muted-foreground">
            {relativeTime(relationship.createdAt)}
          </span>
        </div>
      </div>
    </>
  );

  // Managed brands open into a detail view, which is where the "a Brand with no
  // members" case becomes visible.
  if (managed) {
    return (
      <Link
        href={`/relationships/managed/${other.id}`}
        className="flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-accent"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">{body}</div>
  );
}
