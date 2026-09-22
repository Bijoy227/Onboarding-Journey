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

  demoStore.setSession({ userId: user.id, organizationId: null });
  return user;
}

/** Switches which organization the signed-in user is currently looking at. */
export function switchOrganization(organizationId: string | null): void {
  const session = demoStore.getSession();
  if (!session) return;
  demoStore.setSession({ ...session, organizationId });
}

/** Restores the original demo data and signs out. */
export function resetDemo(): void {
  demoStore.reset();
}
