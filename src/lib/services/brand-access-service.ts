import { createId, delay, demoStore } from "@/lib/mock/store";
import {
  getActiveConnections,
  getAvailableModules,
} from "@/lib/permissions/access";
import { normalizeGrants } from "@/lib/permissions/modules";
import { getRole } from "@/lib/permissions/permissions";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import type {
  AccessMode,
  AppState,
  BrandAccess,
  Membership,
  ModuleGrant,
} from "@/types";

/**
 * Brand Access: one non-admin membership working on one Brand.
 *
 * - In a Brand organization every non-admin has exactly one row, for that
 *   Brand, created with the membership.
 * - In a Brokerage the admin assigns members to actively connected Brands,
 *   one row each.
 * - New rows start at Full. Custom is an explicit list of module grants.
 * - Admins have no rows: their access is derived from the role.
 */

export class BrandAccessError extends Error {}

function newRow(
  membershipId: string,
  brandOrganizationId: string,
  actorUserId: string | undefined,
): BrandAccess {
  return {
    id: createId("ba"),
    membershipId,
    brandOrganizationId,
    accessMode: "full",
    grants: [],
    assignedByUserId: actorUserId,
    assignedAt: new Date().toISOString(),
  };
}

/** Brands a Brokerage can assign right now: its active connections. */
export function getAssignableBrandIds(
  state: AppState,
  brokerageId: string,
): Set<string> {
  return new Set(
    getActiveConnections(state, brokerageId).map(
      (connection) => connection.brandOrganizationId,
    ),
  );
}

/**
 * Brings a membership's rows in line with its role, inside a mutation.
 *
 * Admin roles lose their rows. A Brand member gets the row for their Brand.
 * A Broker gets Full rows for `brandIds`, which must be actively connected.
 */
export function syncBrandAccessForRole(
  draft: AppState,
  membership: Membership,
  actorUserId: string | undefined,
  brandIds: string[] = [],
): void {
  const organization = draft.organizations.find(
    (org) => org.id === membership.organizationId,
  );
  const role = getRole(draft, membership.roleId);
  if (!organization || !role) return;

  const now = new Date().toISOString();
  const live = draft.brandAccess.filter(
    (row) => row.membershipId === membership.id && !row.deletedAt,
  );

  if (role.hasFullBrandAccess) {
    if (live.length === 0) return;
    draft.brandAccess = draft.brandAccess.map((row) =>
      row.membershipId === membership.id && !row.deletedAt
        ? { ...row, deletedAt: now }
        : row,
    );
    return;
  }

  const wanted =
    organization.type === "brand"
      ? [organization.id]
      : brandIds.filter((id) =>
          getAssignableBrandIds(draft, organization.id).has(id),
        );
  const missing = wanted.filter(
    (brandId) => !live.some((row) => row.brandOrganizationId === brandId),
  );
  draft.brandAccess = [
    ...draft.brandAccess,
    ...missing.map((brandId) => newRow(membership.id, brandId, actorUserId)),
  ];
}

/**
 * Sets the full list of Brands a Broker is assigned to (flow F3). New Brands
 * start at Full; Brands dropped from the list lose their row. Rows for Brands
 * whose connection is suspended are left alone, so resuming restores them.
 */
export async function setMemberBrands(
  membershipId: string,
  brandIds: string[],
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const membership = draft.memberships.find((item) => item.id === membershipId);
    if (!membership) throw new BrandAccessError("Membership not found.");
    const organization = draft.organizations.find(
      (org) => org.id === membership.organizationId,
    );
    const role = getRole(draft, membership.roleId);
    if (organization?.type !== "brokerage") {
      throw new BrandAccessError(
        "Brand members always work on their own Brand. Edit their module access instead.",
      );
    }
    if (role?.hasFullBrandAccess) {
      throw new BrandAccessError(
        `${role.name}s already have every connected Brand.`,
      );
    }

    const assignable = getAssignableBrandIds(draft, organization.id);
    const unknown = brandIds.filter((id) => !assignable.has(id));
    if (unknown.length > 0) {
      throw new BrandAccessError(
        `${unknown.map((id) => orgNameOf(draft, id)).join(", ")} ${
          unknown.length === 1 ? "isn't" : "aren't"
        } connected to ${organization.name}. Only the Platform Admin can connect Brands.`,
      );
    }

    const wanted = new Set(brandIds);
    const now = new Date().toISOString();
    const live = draft.brandAccess.filter(
      (row) => row.membershipId === membershipId && !row.deletedAt,
    );
    const added = brandIds.filter(
      (brandId) => !live.some((row) => row.brandOrganizationId === brandId),
    );
    const removed = live.filter(
      (row) =>
        assignable.has(row.brandOrganizationId) &&
        !wanted.has(row.brandOrganizationId),
    );
    const removedIds = new Set(removed.map((row) => row.id));

    draft.brandAccess = [
      ...draft.brandAccess.map((row) =>
        removedIds.has(row.id) ? { ...row, deletedAt: now } : row,
      ),
      ...added.map((brandId) => newRow(membershipId, brandId, actorUserId)),
    ];

    if (added.length > 0 || removed.length > 0) {
      const parts = [
        added.length > 0
          ? `assigned ${nameOf(draft, membership.userId)} to ${added
              .map((id) => orgNameOf(draft, id))
              .join(", ")}`
          : "",
        removed.length > 0
          ? `${added.length > 0 ? "removed them from" : `removed ${nameOf(draft, membership.userId)} from`} ${removed
              .map((row) => orgNameOf(draft, row.brandOrganizationId))
              .join(", ")}`
          : "",
      ].filter(Boolean);
      recordEvent(draft, {
        action: "brand_access.assigned",
        description: `${nameOf(draft, actorUserId)} ${parts.join(" and ")} in ${organization.name}`,
        actorUserId,
        organizationId: organization.id,
      });
    }
  });
}

/**
 * Saves one Brand Access (flow F4). Custom grants are cleaned against what is
 * available on that Brand (the organization's own enabled modules, plus the
 * Brand's from a Brokerage): grants for anything else are removed, view is
 * forced on, and a sub-module without its parent is dropped. Full clears the
 * grants, which is how "reset to full access" works.
 */
export async function setBrandAccessModules(
  brandAccessId: string,
  input: { mode: AccessMode; grants?: ModuleGrant[] },
  actorUserId: string,
): Promise<BrandAccess> {
  await delay();

  return demoStore.mutate((draft) => {
    const row = draft.brandAccess.find(
      (item) => item.id === brandAccessId && !item.deletedAt,
    );
    if (!row) throw new BrandAccessError("This brand assignment no longer exists.");
    const membership = draft.memberships.find(
      (item) => item.id === row.membershipId,
    );
    if (!membership) throw new BrandAccessError("Membership not found.");

    const grants =
      input.mode === "custom"
        ? normalizeGrants(
            input.grants ?? [],
            getAvailableModules(
              draft,
              membership.organizationId,
              row.brandOrganizationId,
            ),
          )
        : [];
    const updated: BrandAccess = { ...row, accessMode: input.mode, grants };
    draft.brandAccess = draft.brandAccess.map((item) =>
      item.id === brandAccessId ? updated : item,
    );

    recordEvent(draft, {
      action: "brand_access.updated",
      description:
        input.mode === "full"
          ? `${nameOf(draft, actorUserId)} gave ${nameOf(
              draft,
              membership.userId,
            )} full access to ${orgNameOf(draft, row.brandOrganizationId)}`
          : `${nameOf(draft, actorUserId)} limited ${nameOf(
              draft,
              membership.userId,
            )} to ${grants.length} ${
              grants.length === 1 ? "module" : "modules"
            } on ${orgNameOf(draft, row.brandOrganizationId)}`,
      actorUserId,
      organizationId: membership.organizationId,
    });

    return updated;
  });
}
