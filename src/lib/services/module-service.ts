import { createId, delay, demoStore } from "@/lib/mock/store";
import { normalizeActions } from "@/lib/permissions/modules";
import { nameOf, recordEvent } from "@/lib/services/audit-service";
import type {
  AppState,
  ModuleAction,
  OrganizationType,
  PlatformModule,
} from "@/types";

/**
 * The platform module catalog.
 *
 * Only Platform Admins edit it. Organizations' enabled modules and members'
 * module grants point at these entries, so deleting one cleans up both.
 */

export class ModuleError extends Error {}

export type ModuleInput = {
  audience: OrganizationType;
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  group?: string;
  route?: string;
  features: string[];
  /** What the module supports. View is always included. */
  availableActions: ModuleAction[];
  /** A data: or http(s) image URL. */
  imageUrl?: string;
};

export type ModuleChanges = Partial<
  Omit<ModuleInput, "audience" | "parentId" | "imageUrl">
> & {
  /** A new image, or null to go back to the default icon. */
  imageUrl?: string | null;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Trade Spend Sandbox" -> "trade-spend-sandbox" */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateActions(actions: ModuleAction[]): ModuleAction[] {
  return normalizeActions(actions.length > 0 ? actions : ["view"]);
}

function validateSlug(
  state: AppState,
  audience: OrganizationType,
  slug: string,
  exceptModuleId?: string,
): string {
  const normalized = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(normalized)) {
    throw new ModuleError(
      "Use lowercase letters, numbers and single hyphens for the slug, e.g. trade-spend-sandbox.",
    );
  }
  const clash = state.modules.find(
    (module) =>
      module.audience === audience &&
      module.slug === normalized &&
      module.id !== exceptModuleId,
  );
  if (clash) {
    throw new ModuleError(
      `${clash.name} already uses the slug ${normalized} in the ${
        audience === "brand" ? "Brand" : "Brokerage"
      } catalog.`,
    );
  }
  return normalized;
}

function cleanFeatures(features: string[]): string[] {
  return features.map((feature) => feature.trim()).filter(Boolean);
}

/** Roughly 700 KB of data URL. Thumbnails made by the dialog are far smaller. */
const MAX_IMAGE_URL_LENGTH = 1_000_000;

function validateImageUrl(url: string | null | undefined): string | undefined {
  if (url === null || url === undefined || url.trim() === "") return undefined;
  const value = url.trim();
  if (
    !/^data:image\/[a-z0-9.+-]+;base64,/i.test(value) &&
    !/^https?:\/\//i.test(value)
  ) {
    throw new ModuleError(
      "The module image must be an uploaded image or a web address.",
    );
  }
  if (value.length > MAX_IMAGE_URL_LENGTH) {
    throw new ModuleError("That image is too large. Choose a smaller one.");
  }
  return value;
}

export async function createModule(
  input: ModuleInput,
  actorUserId: string,
): Promise<PlatformModule> {
  await delay();

  const name = input.name.trim();
  if (!name) throw new ModuleError("Give the module a name.");

  const state = demoStore.getState();
  const slug = validateSlug(state, input.audience, input.slug || slugify(name));
  const availableActions = validateActions(input.availableActions);
  const imageUrl = validateImageUrl(input.imageUrl);

  if (input.parentId) {
    const parent = state.modules.find((module) => module.id === input.parentId);
    if (!parent || parent.audience !== input.audience) {
      throw new ModuleError(
        "The parent module does not exist in this catalog.",
      );
    }
    if (parent.parentId) {
      throw new ModuleError(
        "Sub-modules can't have sub-modules of their own. List deeper screens as features instead.",
      );
    }
  }

  return demoStore.mutate((draft) => {
    const siblings = draft.modules.filter(
      (module) =>
        module.audience === input.audience &&
        (module.parentId ?? null) === (input.parentId ?? null),
    );

    const created: PlatformModule = {
      id: createId("mod"),
      audience: input.audience,
      slug,
      name,
      description: input.description.trim(),
      parentId: input.parentId,
      group: input.group?.trim() || undefined,
      route: input.route?.trim() || undefined,
      features: cleanFeatures(input.features),
      availableActions,
      imageUrl,
      sortOrder:
        siblings.reduce((max, module) => Math.max(max, module.sortOrder), -1) +
        1,
      createdAt: new Date().toISOString(),
    };

    draft.modules = [...draft.modules, created];

    recordEvent(draft, {
      action: "module.created",
      description: `${nameOf(draft, actorUserId)} added the ${
        created.parentId ? "sub-module" : "module"
      } ${created.name} to the ${
        created.audience === "brand" ? "Brand" : "Brokerage"
      } catalog`,
      actorUserId,
    });

    return created;
  });
}

export async function updateModule(
  moduleId: string,
  changes: ModuleChanges,
  actorUserId: string,
): Promise<PlatformModule> {
  await delay();

  const state = demoStore.getState();
  const existing = state.modules.find((module) => module.id === moduleId);
  if (!existing) throw new ModuleError("Module not found.");

  const next: PlatformModule = { ...existing };

  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) throw new ModuleError("Give the module a name.");
    next.name = name;
  }
  if (changes.slug !== undefined) {
    next.slug = validateSlug(state, existing.audience, changes.slug, moduleId);
  }
  if (changes.description !== undefined) {
    next.description = changes.description.trim();
  }
  if (changes.group !== undefined)
    next.group = changes.group.trim() || undefined;
  if (changes.route !== undefined)
    next.route = changes.route.trim() || undefined;
  if (changes.features !== undefined) {
    next.features = cleanFeatures(changes.features);
  }
  if (changes.availableActions !== undefined) {
    next.availableActions = validateActions(changes.availableActions);
  }
  if (changes.imageUrl !== undefined) {
    next.imageUrl = validateImageUrl(changes.imageUrl);
  }

  return demoStore.mutate((draft) => {
    draft.modules = draft.modules.map((module) =>
      module.id === moduleId ? next : module,
    );

    recordEvent(draft, {
      action: "module.updated",
      description: `${nameOf(draft, actorUserId)} updated the module ${next.name}`,
      actorUserId,
    });

    return next;
  });
}

/**
 * Removes a module and its sub-modules from the catalog, from every
 * organization's enabled modules and from every member's grants. Returns how
 * many catalog entries went.
 */
export async function deleteModule(
  moduleId: string,
  actorUserId: string,
): Promise<number> {
  await delay();

  return demoStore.mutate((draft) => {
    const target = draft.modules.find((module) => module.id === moduleId);
    if (!target) throw new ModuleError("Module not found.");

    const removed = new Set(
      draft.modules
        .filter(
          (module) => module.id === moduleId || module.parentId === moduleId,
        )
        .map((module) => module.id),
    );

    draft.modules = draft.modules.filter((module) => !removed.has(module.id));
    draft.moduleAssignments = draft.moduleAssignments.filter(
      (assignment) => !removed.has(assignment.moduleId),
    );
    draft.brandAccess = draft.brandAccess.map((row) =>
      row.grants.some((grant) => removed.has(grant.moduleId))
        ? {
            ...row,
            grants: row.grants.filter((grant) => !removed.has(grant.moduleId)),
          }
        : row,
    );

    recordEvent(draft, {
      action: "module.deleted",
      description: `${nameOf(draft, actorUserId)} removed ${target.name} from the ${
        target.audience === "brand" ? "Brand" : "Brokerage"
      } catalog`,
      actorUserId,
    });

    return removed.size;
  });
}

/** How widely a module is used, shown before deleting it. */
export function getModuleUsage(
  state: AppState,
  moduleId: string,
): { organizations: number; grants: number; subModules: number } {
  const ids = new Set(
    state.modules
      .filter(
        (module) => module.id === moduleId || module.parentId === moduleId,
      )
      .map((module) => module.id),
  );
  return {
    organizations: new Set(
      state.moduleAssignments
        .filter((assignment) => ids.has(assignment.moduleId))
        .map((assignment) => assignment.organizationId),
    ).size,
    grants: state.brandAccess.filter(
      (row) =>
        !row.deletedAt && row.grants.some((grant) => ids.has(grant.moduleId)),
    ).length,
    subModules: ids.size - 1,
  };
}
