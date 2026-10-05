"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { demoStore } from "@/lib/mock/store";
import {
  getActiveBrand,
  getActiveModules,
  resolveAccess,
  type AccessContext,
  type ResolvedBrand,
} from "@/lib/permissions/access";
import type { ModuleAccess } from "@/lib/permissions/modules";
import type {
  AppState,
  Membership,
  ModuleAction,
  Organization,
  PermissionId,
  PlatformModule,
  Role,
  Session,
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
  /** The workspace: which membership requests act through. */
  organization: Organization | null;
  membership: Membership | undefined;
  role: Role | undefined;
  permissions: PermissionId[];
  /** Every organization the user holds an active membership in. */
  organizations: Organization[];
  isPlatformAdmin: boolean;
  /** The Platform Admin is inside an organization through support access. */
  isSupport: boolean;
  isSignedIn: boolean;
  /**
   * Organization-level authorization: what this person may administer.
   *
   * Resolved as: user -> membership for the current organization -> role ->
   * permissions. It never gives access to data.
   */
  can: (permission: PermissionId) => boolean;
  /** The full resolved context, or null without a way into the organization. */
  access: AccessContext | null;
  /** What the organization itself has enabled. */
  enabledModules: PlatformModule[];
  /**
   * Everything usable on the active Brand: the organization's own modules,
   * plus that Brand's modules when working on it from a Brokerage.
   */
  availableModules: PlatformModule[];
  /** Every Brand this person can work on in this organization. */
  brands: ResolvedBrand[];
  /** The Brand requests run against (the BrandID header). */
  activeBrand: ResolvedBrand | undefined;
  /** What this person may do in each module on the active Brand. */
  moduleAccess: ModuleAccess;
  /**
   * Module-level authorization on the active Brand, resolved as:
   * available modules, then role (admin) or Brand Access (Full or Custom
   * grants) -> action.
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

    const organizationIds = new Set(
      state.memberships
        .filter(
          (membership) =>
            membership.userId === user?.id && membership.status === "active",
        )
        .map((membership) => membership.organizationId),
    );
    const organizations = state.organizations.filter((org) =>
      organizationIds.has(org.id),
    );

    const organization =
      state.organizations.find((org) => org.id === session?.organizationId) ??
      null;

    const access = resolveAccess(
      state,
      user?.id,
      organization?.id,
      session?.brandId,
    );
    const permissions = access?.permissions ?? [];
    const moduleAccess = getActiveModules(access);
    const brands = access?.brands ?? [];
    const activeBrand = getActiveBrand(access);

    return {
      user,
      organization,
      membership: access?.membership,
      role: access?.role,
      permissions,
      organizations,
      isPlatformAdmin: Boolean(user?.isPlatformAdmin),
      isSupport: Boolean(access?.isSupport),
      isSignedIn: Boolean(user),
      can: (permission: PermissionId) => permissions.includes(permission),
      access,
      enabledModules: access?.enabledModules ?? [],
      availableModules: activeBrand?.available ?? [],
      brands,
      activeBrand,
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
