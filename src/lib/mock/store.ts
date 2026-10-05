import { migrateState } from "@/lib/mock/migrations";
import { createSeedState } from "@/lib/mock/seed";
import type { AppState, Session } from "@/types";

/**
 * The mock database.
 *
 * This is the only place that knows the demo data is held in memory and mirrored
 * to localStorage. Services in `src/lib/services` read and write through it, and
 * React subscribes to it. Replacing this with a real API means rewriting the
 * services, not the UI.
 */

// v3 is architecture v2: plans, subscriptions and relationships gave way to
// module assignments, brand connections and brand access. Bumping the keys
// means a browser holding older data starts from the new seed instead of a
// state that is missing those collections.
const STATE_KEY = "caboodle.demo.state.v3";
const SESSION_KEY = "caboodle.demo.session.v2";
const DEV_MODE_KEY = "caboodle.demo.devmode.v1";

type Listener = () => void;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

class DemoStore {
  private state: AppState = createSeedState();
  private session: Session | null = null;
  private devMode = false;
  private listeners = new Set<Listener>();
  private hydrated = false;

  /** Load persisted state from localStorage. Safe to call more than once. */
  hydrate(): void {
    if (this.hydrated || !isBrowser()) return;
    this.hydrated = true;

    try {
      const rawState = window.localStorage.getItem(STATE_KEY);
      if (rawState) {
        const saved = JSON.parse(rawState) as AppState;
        this.state = migrateState(saved);
        if (this.state !== saved) this.persistState();
      } else {
        this.persistState();
      }

      const rawSession = window.localStorage.getItem(SESSION_KEY);
      this.session = rawSession ? (JSON.parse(rawSession) as Session) : null;
      this.devMode = window.localStorage.getItem(DEV_MODE_KEY) === "true";
    } catch {
      // Corrupt or unavailable storage: fall back to a clean demo.
      this.state = createSeedState();
      this.session = null;
    }

    this.emit();
  }

  getHydrated = (): boolean => this.hydrated;

  getState = (): AppState => this.state;

  getSession = (): Session | null => this.session;

  getDevMode = (): boolean => this.devMode;

  /** Toggles the permission inspector panel. */
  setDevMode(value: boolean): void {
    this.devMode = value;
    if (isBrowser()) {
      try {
        window.localStorage.setItem(DEV_MODE_KEY, String(value));
      } catch {
        // Ignored: the toggle still works for this page view.
      }
    }
    this.emit();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Apply a mutation to the database.
   *
   * The mutator receives a shallow-cloned state whose arrays are fresh, so it
   * can push/filter/map freely without touching the previous snapshot.
   */
  mutate<T>(mutator: (draft: AppState) => T): T {
    const draft: AppState = {
      users: [...this.state.users],
      organizations: [...this.state.organizations],
      domains: [...this.state.domains],
      memberships: [...this.state.memberships],
      roles: [...this.state.roles],
      brandConnections: [...this.state.brandConnections],
      brandAccess: [...this.state.brandAccess],
      invitations: [...this.state.invitations],
      accessRequests: [...this.state.accessRequests],
      auditEvents: [...this.state.auditEvents],
      modules: [...this.state.modules],
      moduleAssignments: [...this.state.moduleAssignments],
    };

    const result = mutator(draft);
    this.state = draft;
    this.persistState();
    this.emit();
    return result;
  }

  setSession(session: Session | null): void {
    this.session = session;
    this.persistSession();
    this.emit();
  }

  /** Restore the original demo data and sign the current user out. */
  reset(): void {
    this.state = createSeedState();
    this.session = null;
    this.persistState();
    this.persistSession();
    this.emit();
  }

  private persistState(): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage full or blocked: the demo still works for this page view.
    }
  }

  private persistSession(): void {
    if (!isBrowser()) return;
    try {
      if (this.session) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignored, as above.
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const demoStore = new DemoStore();

/** Simulates network latency so loading states are visible during the demo. */
export function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let idCounter = 0;

/** Stable-ish unique id generator for records created during the demo. */
export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}
