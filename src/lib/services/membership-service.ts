import { delay, demoStore } from "@/lib/mock/store";
import { canManageRoles, getRole } from "@/lib/permissions/permissions";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import { syncBrandAccessForRole } from "@/lib/services/brand-access-service";
import type { AppState, Membership, MembershipStatus } from "@/types";

export class MembershipError extends Error {}

function requireMembership(
  memberships: Membership[],
  membershipId: string,
): Membership {
  const membership = memberships.find((item) => item.id === membershipId);
  if (!membership) throw new MembershipError("Membership not found.");
  return membership;
}

/**
 * Is this the organization's only active member who can change roles? With
 * custom roles that is no longer the same as being an admin, so the rule is
 * about the capability: someone must always be able to manage the others.
 */
function isLastRoleManager(draft: AppState, membership: Membership): boolean {
  if (membership.status !== "active") return false;
  if (!canManageRoles(getRole(draft, membership.roleId))) return false;
  return !draft.memberships.some(
    (other) =>
      other.id !== membership.id &&
      other.organizationId === membership.organizationId &&
      other.status === "active" &&
      canManageRoles(getRole(draft, other.roleId)),
  );
}

const LAST_MANAGER =
  "needs at least one active member who can change roles. Give another member such a role first.";

/**
 * Roles belong to memberships, so changing a role never touches the user.
 *
 * Becoming an admin removes the person's Brand Access rows: admin access is
 * derived. Leaving the admin role in a Brand creates their Brand Access at
 * Full. In a Brokerage the derived access disappears, so the caller passes the
 * Brands to keep in the same request, each starting at Full.
 */
export async function changeMemberRole(
  membershipId: string,
  roleId: string,
  actorUserId: string,
  options?: { brandIds?: string[] },
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const membership = requireMembership(draft.memberships, membershipId);
    const organization = draft.organizations.find(
      (org) => org.id === membership.organizationId,
    );
    const role = getRole(draft, roleId);
    if (!role) throw new MembershipError("Role not found.");
    if (role.organizationType !== organization?.type) {
      throw new MembershipError(
        `${role.name} is not a role in a ${
          organization?.type === "brand" ? "Brand" : "Brokerage"
        }.`,
      );
    }
    if (membership.roleId === roleId) return;
    if (!canManageRoles(role) && isLastRoleManager(draft, membership)) {
      throw new MembershipError(`${organization.name} ${LAST_MANAGER}`);
    }

    const updated: Membership = { ...membership, roleId };
    draft.memberships = draft.memberships.map((item) =>
      item.id === membershipId ? updated : item,
    );
    syncBrandAccessForRole(draft, updated, actorUserId, options?.brandIds);

    recordEvent(draft, {
      action: "member.role_changed",
      description: `${nameOf(draft, actorUserId)} changed ${nameOf(
        draft,
        membership.userId,
      )} to ${role.name} in ${organization.name}`,
      actorUserId,
      organizationId: membership.organizationId,
    });
  });
}

export async function setMembershipStatus(
  membershipId: string,
  status: MembershipStatus,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const membership = requireMembership(draft.memberships, membershipId);
    if (status !== "active" && isLastRoleManager(draft, membership)) {
      throw new MembershipError(
        `${orgNameOf(draft, membership.organizationId)} ${LAST_MANAGER}`,
      );
    }

    draft.memberships = draft.memberships.map((item) =>
      item.id === membershipId ? { ...item, status } : item,
    );

    // A removed member keeps no assignments: being added again starts over.
    // A suspended one keeps them, and restoring brings them back unchanged.
    if (status === "removed") {
      const now = new Date().toISOString();
      draft.brandAccess = draft.brandAccess.map((row) =>
        row.membershipId === membershipId && !row.deletedAt
          ? { ...row, deletedAt: now }
          : row,
      );
    }

    const verb =
      status === "suspended"
        ? "suspended"
        : status === "removed"
          ? "removed"
          : "reactivated";

    recordEvent(draft, {
      action: `member.${verb}`,
      description: `${nameOf(draft, actorUserId)} ${verb} ${nameOf(
        draft,
        membership.userId,
      )} in ${orgNameOf(draft, membership.organizationId)}`,
      actorUserId,
      organizationId: membership.organizationId,
    });
  });
}

export async function removeMember(
  membershipId: string,
  actorUserId: string,
): Promise<void> {
  return setMembershipStatus(membershipId, "removed", actorUserId);
}

/** Active and suspended memberships for an organization (removed are hidden). */
export function getMemberships(organizationId: string): Membership[] {
  return demoStore
    .getState()
    .memberships.filter(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.status !== "removed",
    );
}

export function getMembershipsForUser(userId: string): Membership[] {
  return demoStore
    .getState()
    .memberships.filter(
      (membership) =>
        membership.userId === userId && membership.status !== "removed",
    );
}
