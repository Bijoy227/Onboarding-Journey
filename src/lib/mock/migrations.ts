import { ALL_ACTIONS, createModuleCatalog, moduleId } from "@/lib/mock/module-catalog";
import type { AppState, ModuleAction, PlatformModule } from "@/types";

/**
 * Brings demo data saved by an earlier version of the prototype up to date,
 * so a browser keeps the organizations, members and access someone set up
 * instead of starting over. Every step is safe to run more than once.
 */

/**
 * Product Spec, Retailers, Distributors, Regions, Approved Promotions and
 * Trade Spend Sandbox are Brand modules only. Their old Brokerage copies go,
 * together with every assignment and grant that pointed at them.
 */
const REMOVED_BROKERAGE_COPIES = [
  "product-spec",
  "retailers",
  "distributors",
  "regions",
  "approved-promotions",
  "trade-spend-sandbox",
].map((slug) => moduleId("brokerage", slug));

/**
 * Fields a saved module may carry from versions that had managed actions,
 * module statuses and module requirements. None of them exist any more.
 */
type SavedModule = Partial<PlatformModule> & {
  actions?: string[];
  status?: string;
  requires?: string[];
};

const ACTIONS = new Set<string>(ALL_ACTIONS);

/** "edit" became "update"; anything outside the six actions is dropped. */
function cleanActions(actions: string[]): ModuleAction[] {
  return Array.from(
    new Set(actions.map((code) => (code === "edit" ? "update" : code))),
  ).filter((code): code is ModuleAction => ACTIONS.has(code));
}

function needsCleanup(state: AppState): boolean {
  if ("actions" in state) return true;
  const modules = state.modules as SavedModule[];
  return (
    modules.some(
      (module) =>
        "actions" in module ||
        "status" in module ||
        "requires" in module ||
        !Array.isArray(module.availableActions) ||
        !Array.isArray(module.features) ||
        module.availableActions.some((code) => !ACTIONS.has(code)),
    ) ||
    state.brandAccess.some((row) =>
      row.grants.some((grant) => grant.actions.some((code) => !ACTIONS.has(code))),
    )
  );
}

export function migrateState(saved: AppState): AppState {
  let state = saved;

  // 1. Drop the Brokerage copies of Brand modules.
  const removed = new Set(REMOVED_BROKERAGE_COPIES);
  if (state.modules.some((module) => removed.has(module.id))) {
    state = {
      ...state,
      modules: state.modules.filter((module) => !removed.has(module.id)),
      moduleAssignments: state.moduleAssignments.filter(
        (assignment) => !removed.has(assignment.moduleId),
      ),
      brandAccess: state.brandAccess.map((row) =>
        row.grants.some((grant) => removed.has(grant.moduleId))
          ? {
              ...row,
              grants: row.grants.filter((grant) => !removed.has(grant.moduleId)),
            }
          : row,
      ),
    };
  }

  // 2. Six fixed actions, no requirements, no module status: undo what the
  //    managed menus and actions version saved. Seeded modules take their
  //    catalog entry's actions, route, group and features back.
  if (needsCleanup(state)) {
    const seeded = new Map(
      createModuleCatalog(new Date().toISOString()).map((module) => [
        module.id,
        module,
      ]),
    );
    const { actions: _actions, ...rest } = state as AppState & { actions?: unknown };
    void _actions;
    state = {
      ...rest,
      modules: (state.modules as SavedModule[]).map((module) => {
        const {
          actions,
          status: _status,
          requires: _requires,
          ...kept
        } = module;
        void _status;
        void _requires;
        const seed = seeded.get(kept.id!);
        return {
          ...kept,
          group: kept.group ?? seed?.group,
          route: kept.route ?? seed?.route,
          features: kept.features ?? seed?.features ?? [],
          availableActions:
            seed?.availableActions ??
            cleanActions(kept.availableActions ?? actions ?? ["view"]),
        } as PlatformModule;
      }),
      brandAccess: state.brandAccess.map((row) => ({
        ...row,
        grants: row.grants
          .map((grant) => ({ ...grant, actions: cleanActions(grant.actions) }))
          .filter((grant) => grant.actions.length > 0),
      })),
    };
  }

  return state;
}
