import { delay, demoStore } from "@/lib/mock/store";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import type { Membership, MembershipStatus } from "@/types";

export class MembershipError extends Error {}

function requireMembership(
  memberships: Membership[],
  membershipId: string,
): Membership {
  const membership = memberships.find((item) => item.id === membershipId);
  if (!membership) throw new MembershipError("Membership not found.");
  return membership;
}

/** Roles belong to memberships, so changing a role never touches the user. */
export async function changeMemberRole(
  membershipId: string,
  roleId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const membership = requireMembership(draft.memberships, membershipId);
    const role = draft.roles.find((item) => item.id === roleId);
    if (!role) throw new MembershipError("Role not found.");

    draft.memberships = draft.memberships.map((item) =>
      item.id === membershipId ? { ...item, roleId } : item,
    );

    recordEvent(draft, {
      action: "member.role_changed",
      description: `${nameOf(draft, actorUserId)} changed ${nameOf(
        draft,
        membership.userId,
      )} to ${role.name} in ${orgNameOf(draft, membership.organizationId)}`,
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

    draft.memberships = draft.memberships.map((item) =>
      item.id === membershipId ? { ...item, status } : item,
    );

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
