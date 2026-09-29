import { getMembership, getPermissions } from "@/lib/permissions/permissions";
import type {
  AppState,
  BillingCycle,
  ModuleAction,
  ModuleGrant,
  OrganizationType,
  Plan,
  PlatformModule,
  Subscription,
} from "@/types";

/**
 * Module entitlement and module access.
 *
 * Two questions, answered in two layers:
 *   1. What has the organization paid for?
 *      organization -> active subscription -> plan -> modules
 *   2. What may this member do with it?
 *      user -> membership -> role (module.full_access) or module grants
 *
 * A member can never be granted a module the plan does not include, and a
 * sub-module is only usable when its parent module is too.
 */

export const MODULE_ACTIONS: {
  id: ModuleAction;
  label: string;
  description: string;
}[] = [
  {
    id: "view",
    label: "View",
    description: "Open the module and read its data.",
  },
  { id: "create", label: "Create", description: "Add new records." },
  { id: "edit", label: "Edit", description: "Change existing records." },
  { id: "delete", label: "Delete", description: "Remove records." },
  {
    id: "export",
    label: "Export",
    description: "Download data out of the module.",
  },
];

export const ALL_MODULE_ACTIONS: ModuleAction[] = MODULE_ACTIONS.map(
  (action) => action.id,
);

/** Annual billing charges ten months: two months free. */
export const ANNUAL_MONTHS_CHARGED = 10;

export type ModuleNode = {
  module: PlatformModule;
  children: PlatformModule[];
};

export type ModuleAccess = Record<string, ModuleAction[]>;

function bySortOrder(a: PlatformModule, b: PlatformModule): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/** The whole catalog for Brands or for Brokerages, in display order. */
export function getCatalog(
  state: AppState,
  audience: OrganizationType,
): PlatformModule[] {
  return state.modules
    .filter((module) => module.audience === audience)
    .sort(bySortOrder);
}

/**
 * Groups a flat list of modules into module -> sub-modules. Sub-modules whose
 * parent is not in the list are dropped, matching how access resolves.
 */
export function buildModuleTree(modules: PlatformModule[]): ModuleNode[] {
  const parents = modules
    .filter((module) => !module.parentId)
    .sort(bySortOrder);
  return parents.map((module) => ({
    module,
    children: modules
      .filter((child) => child.parentId === module.id)
      .sort(bySortOrder),
  }));
}

export function getModuleTree(
  state: AppState,
  audience: OrganizationType,
): ModuleNode[] {
  return buildModuleTree(getCatalog(state, audience));
}

/**
 * Cleans a selection of module ids: unknown ids, ids from the other audience
 * and sub-modules without their parent are removed.
 */
export function normalizeModuleIds(
  state: AppState,
  audience: OrganizationType,
  moduleIds: string[],
): string[] {
  const selected = new Set(moduleIds);
  return getCatalog(state, audience)
    .filter(
      (module) =>
        selected.has(module.id) &&
        (!module.parentId || selected.has(module.parentId)),
    )
    .map((module) => module.id);
}

export function sumModulePrices(state: AppState, moduleIds: string[]): number {
  const selected = new Set(moduleIds);
  return state.modules
    .filter((module) => selected.has(module.id))
    .reduce((total, module) => total + module.monthlyPrice, 0);
}

/** What the plan's modules would cost bought one by one. */
export function getPlanListPrice(state: AppState, plan: Plan): number {
  return sumModulePrices(
    state,
    normalizeModuleIds(state, plan.audience, plan.moduleIds),
  );
}

/** What the plan actually costs per month. */
export function getPlanMonthlyPrice(state: AppState, plan: Plan): number {
  return plan.fixedMonthlyPrice ?? getPlanListPrice(state, plan);
}

export function priceForCycle(monthly: number, cycle: BillingCycle): number {
  return cycle === "annual" ? monthly * ANNUAL_MONTHS_CHARGED : monthly;
}

/** The standard and professional plans offered in onboarding. */
export function getTierPlan(
  state: AppState,
  audience: OrganizationType,
  tier: "standard" | "professional",
): Plan | undefined {
  return state.plans.find(
    (plan) => plan.audience === audience && plan.tier === tier,
  );
}

/** Plans that can be assigned to an organization of this type. */
export function getAssignablePlans(
  state: AppState,
  audience: OrganizationType,
  organizationId?: string,
): Plan[] {
  return state.plans.filter(
    (plan) =>
      plan.audience === audience &&
      (!plan.organizationId || plan.organizationId === organizationId),
  );
}

export function getActiveSubscription(
  state: AppState,
  organizationId: string | null | undefined,
): Subscription | undefined {
  if (!organizationId) return undefined;
  return state.subscriptions.find(
    (subscription) =>
      subscription.organizationId === organizationId &&
      subscription.status === "active",
  );
}

/** A plan chosen during onboarding that has not been paid for yet. */
export function getIncompleteSubscription(
  state: AppState,
  organizationId: string | null | undefined,
): Subscription | undefined {
  if (!organizationId) return undefined;
  return state.subscriptions.find(
    (subscription) =>
      subscription.organizationId === organizationId &&
      subscription.status === "incomplete",
  );
}

export function getOrganizationPlan(
  state: AppState,
  organizationId: string | null | undefined,
): Plan | undefined {
  const subscription = getActiveSubscription(state, organizationId);
  if (!subscription) return undefined;
  return state.plans.find((plan) => plan.id === subscription.planId);
}

/**
 * The modules an organization is entitled to: exactly what its active plan
 * includes. No plan means no modules.
 */
export function getEntitledModules(
  state: AppState,
  organizationId: string | null | undefined,
): PlatformModule[] {
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  const plan = getOrganizationPlan(state, organizationId);
  if (!organization || !plan || plan.audience !== organization.type) return [];

  const ids = new Set(
    normalizeModuleIds(state, organization.type, plan.moduleIds),
  );
  return getCatalog(state, organization.type).filter((module) =>
    ids.has(module.id),
  );
}

/** Any action implies view, and actions always come back in a fixed order. */
export function normalizeActions(actions: ModuleAction[]): ModuleAction[] {
  if (actions.length === 0) return [];
  const set = new Set<ModuleAction>([...actions, "view"]);
  return ALL_MODULE_ACTIONS.filter((action) => set.has(action));
}

/**
 * Cleans a member's grants against what is available: grants for modules the
 * plan lacks, empty grants and sub-modules without a parent grant are dropped.
 */
export function normalizeGrants(
  grants: ModuleGrant[],
  available: PlatformModule[],
): ModuleGrant[] {
  const byId = new Map(available.map((module) => [module.id, module]));
  const cleaned = grants
    .filter((grant) => byId.has(grant.moduleId))
    .map((grant) => ({
      moduleId: grant.moduleId,
      actions: normalizeActions(grant.actions),
    }))
    .filter((grant) => grant.actions.length > 0);

  const granted = new Set(cleaned.map((grant) => grant.moduleId));
  return cleaned.filter((grant) => {
    const parentId = byId.get(grant.moduleId)?.parentId;
    return !parentId || granted.has(parentId);
  });
}

/**
 * What a user may do with each module in one organization, keyed by module id.
 * A module missing from the result is not usable at all.
 */
export function getModuleAccess(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): ModuleAccess {
  const membership = getMembership(state, userId, organizationId);
  if (!membership) return {};

  const entitled = getEntitledModules(state, organizationId);
  const access: ModuleAccess = {};

  if (
    getPermissions(state, userId, organizationId).includes("module.full_access")
  ) {
    for (const entry of entitled) access[entry.id] = [...ALL_MODULE_ACTIONS];
    return access;
  }

  for (const grant of normalizeGrants(
    membership.moduleGrants ?? [],
    entitled,
  )) {
    access[grant.moduleId] = grant.actions;
  }
  return access;
}

export function canUseModule(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
  moduleId: string,
  action: ModuleAction = "view",
): boolean {
  return (
    getModuleAccess(state, userId, organizationId)[moduleId]?.includes(
      action,
    ) ?? false
  );
}

export function findModuleBySlug(
  state: AppState,
  audience: OrganizationType,
  slug: string,
): PlatformModule | undefined {
  return state.modules.find(
    (module) => module.audience === audience && module.slug === slug,
  );
}

/** Organizations currently on a plan. Used to warn before editing it. */
export function getPlanSubscriberCount(
  state: AppState,
  planId: string,
): number {
  return state.subscriptions.filter(
    (subscription) =>
      subscription.planId === planId && subscription.status === "active",
  ).length;
}
