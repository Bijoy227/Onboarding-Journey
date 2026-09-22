import { createId, delay, demoStore } from "@/lib/mock/store";
import { orgNameOf, nameOf, recordEvent } from "@/lib/services/audit-service";
import type {
  Organization,
  OrganizationRelationship,
  RelationshipType,
} from "@/types";

export class RelationshipError extends Error {}

/**
 * Relationships connect two organizations and are completely independent of
 * membership: nobody has to be a member of both sides for a Brand and a
 * Brokerage to work together.
 */
export async function createOrganizationRelationship(input: {
  sourceOrganizationId: string;
  targetOrganizationId: string;
  type: RelationshipType;
  regions?: string[];
  requestedByUserId: string;
}): Promise<OrganizationRelationship> {
  await delay();

  if (input.sourceOrganizationId === input.targetOrganizationId) {
    throw new RelationshipError("An organization cannot connect to itself.");
  }

  const state = demoStore.getState();
  const existing = state.relationships.find(
    (relationship) =>
      relationshipConnects(
        relationship,
        input.sourceOrganizationId,
        input.targetOrganizationId,
      ) &&
      (relationship.status === "active" || relationship.status === "pending"),
  );
  if (existing) {
    throw new RelationshipError(
      existing.status === "active"
        ? "These organizations are already connected."
        : "A request between these organizations is already pending.",
    );
  }

  return demoStore.mutate((draft) => {
    const relationship: OrganizationRelationship = {
      id: createId("rel"),
      sourceOrganizationId: input.sourceOrganizationId,
      targetOrganizationId: input.targetOrganizationId,
      type: input.type,
      // A brokerage managing a private brand is not a negotiation between two
      // parties, so it takes effect immediately.
      status: input.type === "brokerage_manages_brand" ? "active" : "pending",
      regions: input.regions,
      requestedByUserId: input.requestedByUserId,
      approvedByUserId:
        input.type === "brokerage_manages_brand" ? input.requestedByUserId : undefined,
      createdAt: new Date().toISOString(),
    };

    draft.relationships = [relationship, ...draft.relationships];

    recordEvent(draft, {
      action: "relationship.requested",
      description: `${nameOf(draft, input.requestedByUserId)} requested a relationship between ${orgNameOf(
        draft,
        input.sourceOrganizationId,
      )} and ${orgNameOf(draft, input.targetOrganizationId)}`,
      actorUserId: input.requestedByUserId,
      organizationId: input.targetOrganizationId,
    });

    return relationship;
  });
}

export async function approveOrganizationRelationship(
  relationshipId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const relationship = draft.relationships.find(
      (item) => item.id === relationshipId,
    );
    if (!relationship) throw new RelationshipError("Relationship not found.");

    draft.relationships = draft.relationships.map((item) =>
      item.id === relationshipId
        ? { ...item, status: "active" as const, approvedByUserId: actorUserId }
        : item,
    );

    recordEvent(draft, {
      action: "relationship.approved",
      description: `${nameOf(draft, actorUserId)} connected ${orgNameOf(
        draft,
        relationship.sourceOrganizationId,
      )} and ${orgNameOf(draft, relationship.targetOrganizationId)}`,
      actorUserId,
      organizationId: relationship.targetOrganizationId,
    });
  });
}

export async function rejectOrganizationRelationship(
  relationshipId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const relationship = draft.relationships.find(
      (item) => item.id === relationshipId,
    );
    if (!relationship) throw new RelationshipError("Relationship not found.");

    draft.relationships = draft.relationships.map((item) =>
      item.id === relationshipId
        ? { ...item, status: "rejected" as const, approvedByUserId: actorUserId }
        : item,
    );

    recordEvent(draft, {
      action: "relationship.rejected",
      description: `${nameOf(draft, actorUserId)} declined the relationship request from ${orgNameOf(
        draft,
        relationship.sourceOrganizationId,
      )}`,
      actorUserId,
      organizationId: relationship.targetOrganizationId,
    });
  });
}

export function relationshipConnects(
  relationship: OrganizationRelationship,
  organizationA: string,
  organizationB: string,
): boolean {
  return (
    (relationship.sourceOrganizationId === organizationA &&
      relationship.targetOrganizationId === organizationB) ||
    (relationship.sourceOrganizationId === organizationB &&
      relationship.targetOrganizationId === organizationA)
  );
}

/** Every relationship touching this organization, in either direction. */
export function getRelationships(
  organizationId: string,
): OrganizationRelationship[] {
  return demoStore
    .getState()
    .relationships.filter(
      (relationship) =>
        relationship.sourceOrganizationId === organizationId ||
        relationship.targetOrganizationId === organizationId,
    );
}

/** Requests this organization has received and not yet answered. */
export function getIncomingRequests(
  organizationId: string,
): OrganizationRelationship[] {
  return demoStore
    .getState()
    .relationships.filter(
      (relationship) =>
        relationship.targetOrganizationId === organizationId &&
        relationship.status === "pending",
    );
}

export function getOutgoingRequests(
  organizationId: string,
): OrganizationRelationship[] {
  return demoStore
    .getState()
    .relationships.filter(
      (relationship) =>
        relationship.sourceOrganizationId === organizationId &&
        relationship.status === "pending",
    );
}

/** Brands a brokerage manages outright (private label, no brand members). */
export function getManagedOrganizations(
  organizationId: string,
): OrganizationRelationship[] {
  return demoStore
    .getState()
    .relationships.filter(
      (relationship) =>
        relationship.sourceOrganizationId === organizationId &&
        relationship.type === "brokerage_manages_brand" &&
        relationship.status === "active",
    );
}

/**
 * Organizations this one could connect to: the opposite type, active, and not
 * already connected or pending.
 */
export function findConnectableOrganizations(
  organizationId: string,
  query: string,
): Organization[] {
  const state = demoStore.getState();
  const self = state.organizations.find((org) => org.id === organizationId);
  if (!self) return [];

  const oppositeType = self.type === "brand" ? "brokerage" : "brand";
  const normalized = query.trim().toLowerCase();

  return state.organizations.filter((org) => {
    if (org.id === organizationId) return false;
    if (org.type !== oppositeType) return false;
    if (org.status !== "active") return false;

    const connected = state.relationships.some(
      (relationship) =>
        relationshipConnects(relationship, organizationId, org.id) &&
        (relationship.status === "active" || relationship.status === "pending"),
    );
    if (connected) return false;

    if (!normalized) return true;
    return org.name.toLowerCase().includes(normalized);
  });
}

export function getAllRelationships(): OrganizationRelationship[] {
  return demoStore.getState().relationships;
}
