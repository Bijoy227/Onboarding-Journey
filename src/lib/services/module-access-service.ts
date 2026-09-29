import { delay, demoStore } from "@/lib/mock/store";
import { getEntitledModules, normalizeGrants } from "@/lib/permissions/modules";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import type { ModuleGrant } from "@/types";

export class ModuleAccessError extends Error {}

/**
 * Replaces a member's module grants.
 *
 * Grants are cleaned against the organization's current plan first, so an
 * admin can never hand out a module the organization has not subscribed to.
 */
export async function setMemberModuleGrants(
  membershipId: string,
  grants: ModuleGrant[],
  actorUserId: string,
): Promise<ModuleGrant[]> {
  await delay();

  return demoStore.mutate((draft) => {
    const membership = draft.memberships.find(
      (item) => item.id === membershipId,
    );
    if (!membership) throw new ModuleAccessError("Membership not found.");

    const cleaned = normalizeGrants(
      grants,
      getEntitledModules(draft, membership.organizationId),
    );

    draft.memberships = draft.memberships.map((item) =>
      item.id === membershipId ? { ...item, moduleGrants: cleaned } : item,
    );

    recordEvent(draft, {
      action: "member.module_access_updated",
      description: `${nameOf(draft, actorUserId)} gave ${nameOf(
        draft,
        membership.userId,
      )} access to ${cleaned.length} ${
        cleaned.length === 1 ? "module" : "modules"
      } in ${orgNameOf(draft, membership.organizationId)}`,
      actorUserId,
      organizationId: membership.organizationId,
    });

    return cleaned;
  });
}
