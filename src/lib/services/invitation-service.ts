import { createId, delay, demoStore } from "@/lib/mock/store";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import { domainFromEmail } from "@/lib/services/organization-service";
import type { Invitation, Membership, User } from "@/types";

export class InvitationError extends Error {}

/**
 * Does this email sit outside the organization's verified domains?
 *
 * An external address is never a reason to block an invitation. Domain
 * verification drives discovery and self-service onboarding; explicit
 * invitations are a separate, equally valid path in.
 */
export function isExternalEmail(email: string, organizationId: string): boolean {
  const domain = domainFromEmail(email);
  if (!domain) return true;
  return !demoStore
    .getState()
    .domains.some(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.verified &&
        candidate.domain.toLowerCase() === domain,
    );
}

export async function inviteMember(input: {
  email: string;
  organizationId: string;
  roleId: string;
  invitedByUserId: string;
}): Promise<Invitation> {
  await delay();

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new InvitationError("Enter a valid email address.");
  }

  const state = demoStore.getState();

  const alreadyPending = state.invitations.some(
    (invitation) =>
      invitation.email.toLowerCase() === email &&
      invitation.organizationId === input.organizationId &&
      invitation.status === "pending",
  );
  if (alreadyPending) {
    throw new InvitationError("That person already has a pending invitation.");
  }

  const existingUser = state.users.find(
    (user) => user.email.toLowerCase() === email,
  );
  const alreadyMember =
    existingUser &&
    state.memberships.some(
      (membership) =>
        membership.userId === existingUser.id &&
        membership.organizationId === input.organizationId &&
        membership.status === "active",
    );
  if (alreadyMember) {
    throw new InvitationError("That person is already a member.");
  }

  return demoStore.mutate((draft) => {
    const now = new Date();
    const invitation: Invitation = {
      id: createId("inv"),
      email,
      organizationId: input.organizationId,
      roleId: input.roleId,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      token: createId("token"),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
    };

    draft.invitations = [invitation, ...draft.invitations];

    recordEvent(draft, {
      action: "member.invited",
      description: `${nameOf(draft, input.invitedByUserId)} invited ${email} to ${orgNameOf(
        draft,
        input.organizationId,
      )}`,
      actorUserId: input.invitedByUserId,
      organizationId: input.organizationId,
    });

    return invitation;
  });
}

export async function revokeInvitation(
  invitationId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const invitation = draft.invitations.find((item) => item.id === invitationId);
    if (!invitation) throw new InvitationError("Invitation not found.");

    draft.invitations = draft.invitations.map((item) =>
      item.id === invitationId ? { ...item, status: "revoked" as const } : item,
    );

    recordEvent(draft, {
      action: "invitation.revoked",
      description: `${nameOf(draft, actorUserId)} revoked the invitation for ${invitation.email}`,
      actorUserId,
      organizationId: invitation.organizationId,
    });
  });
}

/** Simulates re-sending the invitation email by extending its expiry. */
export async function resendInvitation(
  invitationId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const invitation = draft.invitations.find((item) => item.id === invitationId);
    if (!invitation) throw new InvitationError("Invitation not found.");

    draft.invitations = draft.invitations.map((item) =>
      item.id === invitationId
        ? {
            ...item,
            status: "pending" as const,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
          }
        : item,
    );

    recordEvent(draft, {
      action: "invitation.resent",
      description: `${nameOf(draft, actorUserId)} resent the invitation for ${invitation.email}`,
      actorUserId,
      organizationId: invitation.organizationId,
    });
  });
}

export function getInvitationByToken(token: string): Invitation | undefined {
  return demoStore
    .getState()
    .invitations.find((invitation) => invitation.token === token);
}

/**
 * Accepts an invitation and creates the membership.
 *
 * If nobody has signed up with that email yet, the account is created here so
 * the demo can walk straight through the invite link without a signup detour.
 */
export async function acceptInvitation(
  token: string,
  options?: { name?: string },
): Promise<{ membership: Membership; user: User }> {
  await delay();

  return demoStore.mutate((draft) => {
    const invitation = draft.invitations.find((item) => item.token === token);
    if (!invitation) throw new InvitationError("This invitation link is not valid.");
    if (invitation.status === "accepted") {
      throw new InvitationError("This invitation has already been accepted.");
    }
    if (invitation.status !== "pending") {
      throw new InvitationError(`This invitation was ${invitation.status}.`);
    }

    let user = draft.users.find(
      (candidate) => candidate.email.toLowerCase() === invitation.email.toLowerCase(),
    );

    if (!user) {
      user = {
        id: createId("user"),
        name:
          options?.name?.trim() ||
          invitation.email
            .split("@")[0]
            .split(/[._-]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        email: invitation.email,
        status: "active",
        // Opening the link from the invitation email proves the address.
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      draft.users = [...draft.users, user];
    } else if (!user.emailVerifiedAt) {
      const verifiedUser: User = {
        ...user,
        emailVerifiedAt: new Date().toISOString(),
      };
      draft.users = draft.users.map((item) =>
        item.id === verifiedUser.id ? verifiedUser : item,
      );
      user = verifiedUser;
    }

    const existing = draft.memberships.find(
      (membership) =>
        membership.userId === user!.id &&
        membership.organizationId === invitation.organizationId,
    );

    const membership: Membership = existing
      ? { ...existing, status: "active", roleId: invitation.roleId }
      : {
          id: createId("mem"),
          userId: user.id,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
          status: "active",
          source: "invitation",
          createdAt: new Date().toISOString(),
        };

    draft.memberships = existing
      ? draft.memberships.map((item) => (item.id === existing.id ? membership : item))
      : [...draft.memberships, membership];

    draft.invitations = draft.invitations.map((item) =>
      item.id === invitation.id ? { ...item, status: "accepted" as const } : item,
    );

    recordEvent(draft, {
      action: "invitation.accepted",
      description: `${user.name} accepted the invitation to ${orgNameOf(
        draft,
        invitation.organizationId,
      )}`,
      actorUserId: user.id,
      organizationId: invitation.organizationId,
    });

    return { membership, user };
  });
}

export function getInvitations(organizationId?: string): Invitation[] {
  const invitations = demoStore.getState().invitations;
  return organizationId
    ? invitations.filter(
        (invitation) => invitation.organizationId === organizationId,
      )
    : invitations;
}
