"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { demoStore } from "@/lib/mock/store";
import {
  getActiveSubscription,
  getEntitledModules,
  getIncompleteSubscription,
  getModuleAccess,
  type ModuleAccess,
} from "@/lib/permissions/modules";
import {
  getEffectiveRole,
  getMembership,
  getPermissions,
} from "@/lib/permissions/permissions";
import type {
  AppState,
  Membership,
  ModuleAction,
  Organization,
  PermissionId,
  Plan,
  PlatformModule,
  Role,
  Session,
  Subscription,
  User,
} from "@/types";

/**
 * Subscribes to the store and triggers hydration from localStorage.
 *
 * React only calls this on the client, and only after the hydration render, so
 * reading persisted state here can never cause a server/client mismatch: the
 * server snapshot below reports "not hydrated", the app paints its loading
 * state, and the real data arrives on the next render.
 */
function subscribeToStore(onChange: () => void): () => void {
  const unsubscribe = demoStore.subscribe(onChange);
  demoStore.hydrate();
  return unsubscribe;
}

const serverNotHydrated = () => false;

type DemoContextValue = {
  /** The whole mock database. */
  state: AppState;
  session: Session | null;
  /** False until localStorage has been read on the client. */
  hydrated: boolean;
  /** Shows the permission inspector panel. */
  devMode: boolean;
  setDevMode: (value: boolean) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeToStore,
    demoStore.getHydrated,
    serverNotHydrated,
  );
  const state = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getState,
    demoStore.getState,
  );
  const session = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSession,
    demoStore.getSession,
  );
  const devMode = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getDevMode,
    serverNotHydrated,
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      session,
      hydrated,
      devMode,
      setDevMode: (next: boolean) => demoStore.setDevMode(next),
    }),
    [state, session, hydrated, devMode],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

function useDemoContext(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used inside <DemoProvider>.");
  }
  return context;
}

export function useDemo(): DemoContextValue {
  return useDemoContext();
}

export type SessionView = {
  user: User | null;
  organization: Organization | null;
  membership: Membership | undefined;
  role: Role | undefined;
  permissions: PermissionId[];
  /** Every organization the user is an active member of. */
  organizations: Organization[];
  isPlatformAdmin: boolean;
  isSignedIn: boolean;
  /**
   * The authorization primitive used across the UI.
   *
   * Resolved as: user -> membership for the current organization -> role ->
   * permissions. Platform Admin is deliberately excluded: it is a separate
   * platform-level capability, not an organization role.
   */
  can: (permission: PermissionId) => boolean;
  /** The current organization's active subscription and its plan. */
  subscription: Subscription | undefined;
  plan: Plan | undefined;
  /** A plan chosen in onboarding but not yet paid for. */
  pendingSubscription: Subscription | undefined;
  /** Every module the organization's plan includes. */
  entitledModules: PlatformModule[];
  /** What this member may do in each module, keyed by module id. */
  moduleAccess: ModuleAccess;
  /**
   * Module-level authorization, resolved as: organization -> plan -> module,
   * then user -> membership -> role or module grant -> action.
   */
  canModule: (moduleId: string, action?: ModuleAction) => boolean;
};

/** Everything a screen needs to know about who is signed in and what they may do. */
export function useSession(): SessionView {
  const { state, session } = useDemoContext();

  return useMemo(() => {
    const user = session
      ? (state.users.find((item) => item.id === session.userId) ?? null)
      : null;

    const organizationIds = state.memberships
      .filter(
        (membership) =>
          membership.userId === user?.id && membership.status === "active",
      )
      .map((membership) => membership.organizationId);

    const organizations = state.organizations.filter((org) =>
      organizationIds.includes(org.id),
    );

    const organization =
      state.organizations.find((org) => org.id === session?.organizationId) ??
      null;

    const membership = getMembership(state, user?.id, organization?.id);
    const role = getEffectiveRole(state, user?.id, organization?.id);
    const permissions = getPermissions(state, user?.id, organization?.id);

    const subscription = getActiveSubscription(state, organization?.id);
    const plan = subscription
      ? state.plans.find((item) => item.id === subscription.planId)
      : undefined;
    const moduleAccess = getModuleAccess(state, user?.id, organization?.id);

    return {
      user,
      organization,
      membership,
      role,
      permissions,
      organizations,
      isPlatformAdmin: Boolean(user?.isPlatformAdmin),
      isSignedIn: Boolean(user),
      can: (permission: PermissionId) => permissions.includes(permission),
      subscription,
      plan,
      pendingSubscription: getIncompleteSubscription(state, organization?.id),
      entitledModules: getEntitledModules(state, organization?.id),
      moduleAccess,
      canModule: (moduleId: string, action: ModuleAction = "view") =>
        moduleAccess[moduleId]?.includes(action) ?? false,
    };
  }, [state, session]);
}

/** Read-only access to the mock database for list/detail screens. */
export function useAppState(): AppState {
  return useDemoContext().state;
}
