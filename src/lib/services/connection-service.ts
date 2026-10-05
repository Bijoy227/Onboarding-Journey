import { createId, delay, demoStore } from "@/lib/mock/store";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import type {
  AppState,
  BrandConnection,
  BrandConnectionStatus,
  Organization,
} from "@/types";

/**
 * Brand connections: a Brokerage works with a Brand.
 *
 * Only the Platform Admin connects, suspends and ends them. There is no
 * request or approval. A connection holds no permissions itself; it only
 * makes the Brand assignable inside the Brokerage, and gives the Brokerage
 * Admin full access to it straight away.
 */

export class ConnectionError extends Error {}

/** Connections that are not ended: at most one per Brokerage and Brand. */
function openConnection(
  state: AppState,
  brokerageId: string,
  brandId: string,
): BrandConnection | undefined {
  return state.brandConnections.find(
    (connection) =>
      connection.brokerageOrganizationId === brokerageId &&
      connection.brandOrganizationId === brandId &&
      connection.status !== "ended",
  );
}

export async function connectBrand(input: {
  brokerageOrganizationId: string;
  brandOrganizationId: string;
  regions?: string[];
  actorUserId: string;
}): Promise<BrandConnection> {
  await delay();

  const state = demoStore.getState();
  const brokerage = state.organizations.find(
    (org) => org.id === input.brokerageOrganizationId,
  );
  const brand = state.organizations.find(
    (org) => org.id === input.brandOrganizationId,
  );
  if (brokerage?.type !== "brokerage") {
    throw new ConnectionError("Choose a Brokerage to connect.");
  }
  if (brand?.type !== "brand") {
    throw new ConnectionError("Choose a Brand to connect.");
  }
  if (openConnection(state, brokerage.id, brand.id)) {
    throw new ConnectionError(
      `${brokerage.name} and ${brand.name} are already connected.`,
    );
  }

  return demoStore.mutate((draft) => {
    const connection: BrandConnection = {
      id: createId("conn"),
      brokerageOrganizationId: brokerage.id,
      brandOrganizationId: brand.id,
      status: "active",
      regions: input.regions?.map((region) => region.trim()).filter(Boolean),
      connectedByUserId: input.actorUserId,
      connectedAt: new Date().toISOString(),
    };
    draft.brandConnections = [connection, ...draft.brandConnections];

    recordEvent(draft, {
      action: "connection.created",
      description: `${nameOf(draft, input.actorUserId)} connected ${brand.name} to ${brokerage.name}`,
      actorUserId: input.actorUserId,
      organizationId: brokerage.id,
    });

    return connection;
  });
}

/**
 * Suspend pauses access and keeps every assignment; resume restores them
 * unchanged.
 */
export async function setConnectionStatus(
  connectionId: string,
  status: Exclude<BrandConnectionStatus, "ended">,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const connection = draft.brandConnections.find(
      (item) => item.id === connectionId,
    );
    if (!connection) throw new ConnectionError("Connection not found.");
    if (connection.status === "ended") {
      throw new ConnectionError(
        "This connection has ended. Connect the organizations again instead.",
      );
    }

    draft.brandConnections = draft.brandConnections.map((item) =>
      item.id === connectionId ? { ...item, status } : item,
    );

    recordEvent(draft, {
      action: status === "suspended" ? "connection.suspended" : "connection.resumed",
      description: `${nameOf(draft, actorUserId)} ${
        status === "suspended" ? "suspended" : "resumed"
      } the connection between ${orgNameOf(
        draft,
        connection.brokerageOrganizationId,
      )} and ${orgNameOf(draft, connection.brandOrganizationId)}`,
      actorUserId,
      organizationId: connection.brokerageOrganizationId,
    });
  });
}

/**
 * Ending a connection removes the Brokerage's assignments to that Brand. The
 * Brand Access rows are soft-deleted so history remains; reconnecting later
 * starts with no assignments.
 */
export async function endConnection(
  connectionId: string,
  actorUserId: string,
): Promise<number> {
  await delay();

  return demoStore.mutate((draft) => {
    const connection = draft.brandConnections.find(
      (item) => item.id === connectionId,
    );
    if (!connection) throw new ConnectionError("Connection not found.");
    if (connection.status === "ended") return 0;

    const now = new Date().toISOString();
    draft.brandConnections = draft.brandConnections.map((item) =>
      item.id === connectionId
        ? { ...item, status: "ended" as const, endedByUserId: actorUserId, endedAt: now }
        : item,
    );

    const brokerageMembershipIds = new Set(
      draft.memberships
        .filter(
          (membership) =>
            membership.organizationId === connection.brokerageOrganizationId,
        )
        .map((membership) => membership.id),
    );
    let removed = 0;
    draft.brandAccess = draft.brandAccess.map((row) => {
      if (
        row.deletedAt ||
        row.brandOrganizationId !== connection.brandOrganizationId ||
        !brokerageMembershipIds.has(row.membershipId)
      ) {
        return row;
      }
      removed += 1;
      return { ...row, deletedAt: now };
    });

    recordEvent(draft, {
      action: "connection.ended",
      description: `${nameOf(draft, actorUserId)} ended the connection between ${orgNameOf(
        draft,
        connection.brokerageOrganizationId,
      )} and ${orgNameOf(draft, connection.brandOrganizationId)}${
        removed > 0
          ? `, removing ${removed} brand ${removed === 1 ? "assignment" : "assignments"}`
          : ""
      }`,
      actorUserId,
      organizationId: connection.brokerageOrganizationId,
    });

    return removed;
  });
}

/** Every connection touching this organization, ended ones last. */
export function getConnectionsForOrganization(
  state: AppState,
  organizationId: string,
  options?: { includeEnded?: boolean },
): BrandConnection[] {
  return state.brandConnections
    .filter(
      (connection) =>
        (connection.brokerageOrganizationId === organizationId ||
          connection.brandOrganizationId === organizationId) &&
        (options?.includeEnded || connection.status !== "ended"),
    )
    .sort(
      (a, b) =>
        Number(a.status === "ended") - Number(b.status === "ended") ||
        b.connectedAt.localeCompare(a.connectedAt),
    );
}

/** The other side of a connection, seen from one organization. */
export function getConnectedOrganization(
  state: AppState,
  connection: BrandConnection,
  fromOrganizationId: string,
): Organization | undefined {
  const otherId =
    connection.brokerageOrganizationId === fromOrganizationId
      ? connection.brandOrganizationId
      : connection.brokerageOrganizationId;
  return state.organizations.find((org) => org.id === otherId);
}

/**
 * Organizations of the opposite type that this one could be connected to:
 * not already connected (ended connections don't count).
 */
export function getConnectableOrganizations(
  state: AppState,
  organization: Organization,
): Organization[] {
  return state.organizations
    .filter((candidate) => {
      if (candidate.type === organization.type) return false;
      const [brokerageId, brandId] =
        organization.type === "brokerage"
          ? [organization.id, candidate.id]
          : [candidate.id, organization.id];
      return !openConnection(state, brokerageId, brandId);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
