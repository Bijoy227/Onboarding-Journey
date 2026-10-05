import { createId, delay, demoStore } from "@/lib/mock/store";
import { normalizeModuleIds } from "@/lib/permissions/modules";
import { nameOf, recordEvent } from "@/lib/services/audit-service";
import type { PlatformModule } from "@/types";

/**
 * Module entitlement: the Platform Admin enables modules per organization.
 *
 * This replaces plans, subscriptions and billing. It is the ceiling for
 * everyone inside the organization, admins included, and changes to it take
 * effect at once: Full access follows it automatically, and Custom grants for
 * a disabled module stay dormant until it is enabled again.
 */

export class EntitlementError extends Error {}

export type EntitlementResult = {
  enabled: PlatformModule[];
  disabled: PlatformModule[];
};

/** Sets the full list of enabled modules for one organization. */
export async function setEnabledModules(
  organizationId: string,
  moduleIds: string[],
  actorUserId: string,
): Promise<EntitlementResult> {
  await delay();

  return demoStore.mutate((draft) => {
    const organization = draft.organizations.find(
      (org) => org.id === organizationId,
    );
    if (!organization) throw new EntitlementError("Organization not found.");

    const next = new Set(
      normalizeModuleIds(draft, organization.type, moduleIds),
    );

    const current = draft.moduleAssignments.filter(
      (assignment) => assignment.organizationId === organizationId,
    );
    const currentIds = new Set(current.map((assignment) => assignment.moduleId));
    const byId = new Map(draft.modules.map((module) => [module.id, module]));

    const enabled = Array.from(next)
      .filter((id) => !currentIds.has(id))
      .map((id) => byId.get(id)!)
      .filter(Boolean);
    const disabled = Array.from(currentIds)
      .filter((id) => !next.has(id))
      .map((id) => byId.get(id))
      .filter((module): module is PlatformModule => Boolean(module));

    const now = new Date().toISOString();
    draft.moduleAssignments = [
      ...draft.moduleAssignments.filter(
        (assignment) =>
          assignment.organizationId !== organizationId ||
          next.has(assignment.moduleId),
      ),
      ...enabled.map((module) => ({
        id: createId("ma"),
        organizationId,
        moduleId: module.id,
        assignedByUserId: actorUserId,
        assignedAt: now,
      })),
    ];

    if (enabled.length > 0 || disabled.length > 0) {
      const parts = [
        enabled.length > 0
          ? `enabled ${enabled.map((module) => module.name).join(", ")}`
          : "",
        disabled.length > 0
          ? `disabled ${disabled.map((module) => module.name).join(", ")}`
          : "",
      ].filter(Boolean);
      recordEvent(draft, {
        action: "modules.updated",
        description: `${nameOf(draft, actorUserId)} ${parts.join(" and ")} for ${organization.name}`,
        actorUserId,
        organizationId,
      });
    }

    return { enabled, disabled };
  });
}
