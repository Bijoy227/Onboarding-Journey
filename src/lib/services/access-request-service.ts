import { createId, delay, demoStore } from "@/lib/mock/store";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import { domainFromEmail } from "@/lib/services/organization-service";
import type { AccessRequest, Membership } from "@/types";

export class AccessRequestError extends Error {}

/**
 * Can this user ask to join, given the organization's membership policy?
 *
 * The policy is a gate on *requesting*, never the whole authorization model:
 * an admin still has to approve, and invitations bypass it entirely.
 */
export function canRequestAccess(
  userEmail: string,
  organizationId: string,
): { allowed: boolean; reason?: string } {
  const state = demoStore.getState();
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  if (!organization) return { allowed: false, reason: "Organization not found." };

  if (organization.membershipPolicy === "invite_only") {
    return {
      allowed: false,
      reason: `${organization.name} accepts new members by invitation only.`,
    };
  }

  if (organization.membershipPolicy === "verified_domain") {
    const domain = domainFromEmail(userEmail);
    const matches = state.domains.some(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.verified &&
        candidate.domain.toLowerCase() === domain,
    );
    if (!matches) {
      return {
        allowed: false,
        reason: `${organization.name} only accepts requests from its verified email domains. Ask an administrator for an invitation.`,
      };
    }
  }

  return { allowed: true };
}

export async function requestOrganizationAccess(input: {
  userId: string;
  organizationId: string;
  requestedRoleId: string;
  message?: string;
}): Promise<AccessRequest> {
  await delay();

  const state = demoStore.getState();
  const user = state.users.find((candidate) => candidate.id === input.userId);
  if (!user) throw new AccessRequestError("User not found.");

  const gate = canRequestAccess(user.email, input.organizationId);
  if (!gate.allowed) throw new AccessRequestError(gate.reason ?? "Not allowed.");

  const duplicate = state.accessRequests.some(
    (request) =>
      request.userId === input.userId &&
      request.organizationId === input.organizationId &&
      request.status === "pending",
  );
  if (duplicate) {
    throw new AccessRequestError("You already have a pending request to join.");
  }

  return demoStore.mutate((draft) => {
    const request: AccessRequest = {
      id: createId("req"),
      userId: input.userId,
      organizationId: input.organizationId,
      requestedRoleId: input.requestedRoleId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      message: input.message,
    };

    draft.accessRequests = [request, ...draft.accessRequests];

    recordEvent(draft, {
      action: "access_request.created",
      description: `${nameOf(draft, input.userId)} requested access to ${orgNameOf(
        draft,
        input.organizationId,
      )}`,
      actorUserId: input.userId,
      organizationId: input.organizationId,
    });

    return request;
  });
}

/** Approving a request is what actually creates the membership. */
export async function approveAccessRequest(
  requestId: string,
  actorUserId: string,
  roleId?: string,
): Promise<Membership> {
  await delay();

  return demoStore.mutate((draft) => {
    const request = draft.accessRequests.find((item) => item.id === requestId);
    if (!request) throw new AccessRequestError("Request not found.");
    if (request.status !== "pending") {
      throw new AccessRequestError("This request has already been reviewed.");
    }

    const effectiveRoleId = roleId ?? request.requestedRoleId;

    const existing = draft.memberships.find(
      (membership) =>
        membership.userId === request.userId &&
        membership.organizationId === request.organizationId,
    );

    const membership: Membership = existing
      ? { ...existing, status: "active", roleId: effectiveRoleId }
      : {
          id: createId("mem"),
          userId: request.userId,
          organizationId: request.organizationId,
          roleId: effectiveRoleId,
          status: "active",
          source: "access_request",
          createdAt: new Date().toISOString(),
        };

    draft.memberships = existing
      ? draft.memberships.map((item) =>
          item.id === existing.id ? membership : item,
        )
      : [...draft.memberships, membership];

    draft.accessRequests = draft.accessRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status: "approved" as const,
            reviewedByUserId: actorUserId,
            reviewedAt: new Date().toISOString(),
          }
        : item,
    );

    recordEvent(draft, {
      action: "access_request.approved",
      description: `${nameOf(draft, actorUserId)} approved ${nameOf(
        draft,
        request.userId,
      )}'s access request for ${orgNameOf(draft, request.organizationId)}`,
      actorUserId,
      organizationId: request.organizationId,
    });

    return membership;
  });
}

export async function rejectAccessRequest(
  requestId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const request = draft.accessRequests.find((item) => item.id === requestId);
    if (!request) throw new AccessRequestError("Request not found.");

    draft.accessRequests = draft.accessRequests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status: "rejected" as const,
            reviewedByUserId: actorUserId,
            reviewedAt: new Date().toISOString(),
          }
        : item,
    );

    recordEvent(draft, {
      action: "access_request.rejected",
      description: `${nameOf(draft, actorUserId)} rejected ${nameOf(
        draft,
        request.userId,
      )}'s access request for ${orgNameOf(draft, request.organizationId)}`,
      actorUserId,
      organizationId: request.organizationId,
    });
  });
}

export function getAccessRequests(organizationId?: string): AccessRequest[] {
  const requests = demoStore.getState().accessRequests;
  return organizationId
    ? requests.filter((request) => request.organizationId === organizationId)
    : requests;
}

export function getAccessRequestsForUser(userId: string): AccessRequest[] {
  return demoStore
    .getState()
    .accessRequests.filter((request) => request.userId === userId);
}
