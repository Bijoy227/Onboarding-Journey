import { createId, delay, demoStore } from "@/lib/mock/store";
import { recordEvent } from "@/lib/services/audit-service";
import { getOrganizationsForUser } from "@/lib/services/organization-service";
import type { Session, User } from "@/types";

/**
 * Mock authentication.
 *
 * There is no password check and no token: the demo signs in whichever seeded
 * user owns the email address. The important part is the shape of the API, so a
 * real identity provider can slot in behind these calls later.
 */

export class AuthError extends Error {}

/** Signs in an existing demo user and selects a sensible starting organization. */
export async function signIn(email: string): Promise<Session> {
  await delay();

  const state = demoStore.getState();
  const normalized = email.trim().toLowerCase();
  const user = state.users.find(
    (candidate) => candidate.email.toLowerCase() === normalized,
  );

  if (!user) {
    throw new AuthError(
      "No Caboodle account uses that email address. Try one of the demo accounts below.",
    );
  }

  if (user.status === "suspended") {
    throw new AuthError("This account is suspended.");
  }

  const organizations = getOrganizationsForUser(user.id);
  const session: Session = {
    userId: user.id,
    organizationId: organizations[0]?.id ?? null,
    brandId: null,
  };

  demoStore.setSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await delay(120);
  demoStore.setSession(null);
}

/** The signed-in user, or null. */
export function getCurrentUser(): User | null {
  const session = demoStore.getSession();
  if (!session) return null;
  return (
    demoStore.getState().users.find((user) => user.id === session.userId) ?? null
  );
}

/**
 * Registers a brand new person. They have no membership yet: the onboarding
 * journey decides whether they join an existing organization or create one.
 *
 * The email starts unverified. Nothing past the verification step is reachable
 * until `verifyEmailCode` succeeds.
 */
export async function signUp(input: {
  name: string;
  email: string;
}): Promise<User> {
  await delay();

  const normalized = input.email.trim().toLowerCase();
  const existing = demoStore
    .getState()
    .users.find((user) => user.email.toLowerCase() === normalized);

  if (existing) {
    throw new AuthError(
      "An account already exists for that email address. Sign in instead.",
    );
  }

  const user = demoStore.mutate((draft) => {
    const created: User = {
      id: createId("user"),
      name: input.name.trim() || normalized.split("@")[0],
      email: normalized,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    draft.users = [...draft.users, created];
    recordEvent(draft, {
      action: "user.created",
      description: `${created.name} created a Caboodle account`,
      actorUserId: created.id,
    });
    return created;
  });

  demoStore.setSession({ userId: user.id, organizationId: null, brandId: null });
  return user;
}

export const VERIFICATION_CODE_LENGTH = 6;

/**
 * Simulates emailing a one-time code. Nothing is sent: the demo accepts any
 * six-digit code, so this only exists to give the UI a realistic call to make.
 */
export async function sendEmailVerificationCode(
  userId: string,
): Promise<{ email: string; sentAt: string }> {
  await delay(500);

  const user = demoStore.getState().users.find((item) => item.id === userId);
  if (!user) throw new AuthError("Account not found.");

  return { email: user.email, sentAt: new Date().toISOString() };
}

/**
 * Checks the one-time code. In the demo every six-digit code is correct; a
 * real implementation would compare it with the code it emailed.
 */
export async function verifyEmailCode(
  userId: string,
  code: string,
): Promise<User> {
  await delay(600);

  if (!new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code.trim())) {
    throw new AuthError(
      `Enter the ${VERIFICATION_CODE_LENGTH}-digit code from the email.`,
    );
  }

  return demoStore.mutate((draft) => {
    const user = draft.users.find((item) => item.id === userId);
    if (!user) throw new AuthError("Account not found.");
    if (user.emailVerifiedAt) return user;

    const updated: User = { ...user, emailVerifiedAt: new Date().toISOString() };
    draft.users = draft.users.map((item) => (item.id === userId ? updated : item));

    recordEvent(draft, {
      action: "user.email_verified",
      description: `${updated.name} verified ${updated.email}`,
      actorUserId: updated.id,
    });

    return updated;
  });
}

/**
 * "Use a different email" on the verification screen. An account that never
 * verified its email has nothing attached to it yet, so it is simply dropped.
 */
export async function discardUnverifiedAccount(userId: string): Promise<void> {
  await delay(120);

  demoStore.mutate((draft) => {
    const user = draft.users.find((item) => item.id === userId);
    if (!user || user.emailVerifiedAt) return;
    draft.users = draft.users.filter((item) => item.id !== userId);
  });
  demoStore.setSession(null);
}

/**
 * Switches which organization the signed-in user acts through (the
 * OrganizationID header). The active Brand starts over in the new workspace.
 */
export function switchOrganization(organizationId: string | null): void {
  const session = demoStore.getSession();
  if (!session) return;
  demoStore.setSession({ ...session, organizationId, brandId: null });
}

/** Switches the active Brand (the BrandID header) inside the workspace. */
export function switchBrand(brandId: string): void {
  const session = demoStore.getSession();
  if (!session) return;
  demoStore.setSession({ ...session, brandId });
}

/**
 * The Platform Admin opens a customer organization for support. The resolver
 * gives full access there, and the visit is written to the audit log.
 */
export function openSupportWorkspace(
  organizationId: string,
  actorUserId: string,
): void {
  demoStore.mutate((draft) => {
    const organization = draft.organizations.find(
      (org) => org.id === organizationId,
    );
    recordEvent(draft, {
      action: "support.opened",
      description: `${
        draft.users.find((user) => user.id === actorUserId)?.name ?? "Someone"
      } opened ${organization?.name ?? "an organization"} with support access`,
      actorUserId,
      organizationId,
      isSupportAccess: true,
    });
  });
  switchOrganization(organizationId);
}

/** Restores the original demo data and signs out. */
export function resetDemo(): void {
  demoStore.reset();
}
