import type {
  AppState,
  ModuleAction,
  ModuleGrant,
  OrganizationType,
  PlatformModule,
} from "@/types";

/**
 * The module catalog and module entitlement.
 *
 * Entitlement is the ceiling: the Platform Admin enables modules per
 * organization, and nobody inside the organization can go above it. What one
 * person may do on one Brand is resolved on top of this, in
 * `src/lib/permissions/access.ts`.
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
  { id: "update", label: "Update", description: "Change existing records." },
  { id: "delete", label: "Delete", description: "Remove records." },
  {
    id: "import",
    label: "Import",
    description: "Bring records in from a file.",
  },
  {
    id: "export",
    label: "Export",
    description: "Download data out of the module.",
  },
];

export const ALL_MODULE_ACTIONS: ModuleAction[] = MODULE_ACTIONS.map(
  (action) => action.id,
);

export type ModuleNode = {
  module: PlatformModule;
  children: PlatformModule[];
};

/** What a person may do in each module on one Brand, keyed by module id. */
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

/**
 * The modules an organization has enabled: its module assignments for its own
 * audience. A sub-module only counts when its parent is enabled too. No
 * assignments means no modules (decision D4).
 */
export function getEnabledModules(
  state: AppState,
  organizationId: string | null | undefined,
): PlatformModule[] {
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  if (!organization) return [];

  const assigned = state.moduleAssignments
    .filter((assignment) => assignment.organizationId === organization.id)
    .map((assignment) => assignment.moduleId);
  const ids = new Set(normalizeModuleIds(state, organization.type, assigned));

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
 * Cleans grants against what is available: grants for modules the
 * organization lacks, actions the module doesn't support, empty grants and
 * sub-modules without a parent grant are dropped.
 */
export function normalizeGrants(
  grants: ModuleGrant[],
  available: PlatformModule[],
): ModuleGrant[] {
  const byId = new Map(available.map((module) => [module.id, module]));
  const cleaned = grants
    .filter((grant) => byId.has(grant.moduleId))
    .map((grant) => {
      const supported = byId.get(grant.moduleId)!.availableActions;
      return {
        moduleId: grant.moduleId,
        actions: normalizeActions(grant.actions).filter((action) =>
          supported.includes(action),
        ),
      };
    })
    .filter((grant) => grant.actions.length > 0);

  const granted = new Set(cleaned.map((grant) => grant.moduleId));
  return cleaned.filter((grant) => {
    const parentId = byId.get(grant.moduleId)?.parentId;
    return !parentId || granted.has(parentId);
  });
}

/**
 * Where a module's screen lives. A Brokerage's own modules and a Brand's own
 * modules sit at /modules/{slug}; a Brand module opened from a Brokerage sits
 * at /modules/brand/{slug}, because the same slug (files, category-review)
 * can exist in both catalogs.
 */
export function moduleHref(
  module: PlatformModule,
  workspaceType: OrganizationType | undefined,
): string {
  return module.audience === workspaceType || !workspaceType
    ? `/modules/${module.slug}`
    : `/modules/${module.audience}/${module.slug}`;
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

/** Organizations that have this module enabled. Used to warn before editing it. */
export function getModuleOrganizationCount(
  state: AppState,
  moduleId: string,
): number {
  return new Set(
    state.moduleAssignments
      .filter((assignment) => assignment.moduleId === moduleId)
      .map((assignment) => assignment.organizationId),
  ).size;
}
