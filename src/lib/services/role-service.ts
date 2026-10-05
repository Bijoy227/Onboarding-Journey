import { createId, delay, demoStore } from "@/lib/mock/store";
import { PERMISSIONS, canManageRoles } from "@/lib/permissions/permissions";
import { nameOf, recordEvent } from "@/lib/services/audit-service";
import { syncBrandAccessForRole } from "@/lib/services/brand-access-service";
import { slugify } from "@/lib/services/module-service";
import type { AppState, OrganizationType, PermissionId, Role } from "@/types";

/**
 * Roles. The four system roles are seeded and never change. The Platform
 * Admin creates custom roles for Brand-type or Brokerage-type organizations;
 * a custom role is offered in every organization of its type.
 *
 * A role is a list of organization permissions plus the full brand access
 * flag. Editing a role in use takes effect at once for everyone holding it.
 */

export class RoleError extends Error {}

export type RoleInput = {
  name: string;
  description: string;
  organizationType: OrganizationType;
  permissionIds: PermissionId[];
  hasFullBrandAccess: boolean;
};

const KNOWN_PERMISSIONS = new Set(PERMISSIONS.map((permission) => permission.id));

function cleanInput(
  state: AppState,
  input: RoleInput,
  exceptRoleId?: string,
): RoleInput {
  const name = input.name.trim();
  if (!name) throw new RoleError("Give the role a name.");
  const clash = state.roles.find(
    (role) =>
      role.id !== exceptRoleId &&
      role.organizationType === input.organizationType &&
      role.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) {
    throw new RoleError(
      `There is already a ${clash.name} role for ${
        input.organizationType === "brand" ? "Brands" : "Brokerages"
      }.`,
    );
  }
  const permissionIds = PERMISSIONS.map((permission) => permission.id).filter(
    (id) => input.permissionIds.includes(id) && KNOWN_PERMISSIONS.has(id),
  );
  return {
    ...input,
    name,
    description: input.description.trim(),
    permissionIds,
  };
}

/** Memberships and pending invitations or requests that use a role. */
export function getRoleUsage(
  state: AppState,
  roleId: string,
): { members: number; organizations: number; pending: number } {
  const memberships = state.memberships.filter(
    (membership) => membership.roleId === roleId && membership.status !== "removed",
  );
  return {
    members: memberships.length,
    organizations: new Set(memberships.map((membership) => membership.organizationId))
      .size,
    pending:
      state.invitations.filter(
        (invitation) => invitation.roleId === roleId && invitation.status === "pending",
      ).length +
      state.accessRequests.filter(
        (request) => request.requestedRoleId === roleId && request.status === "pending",
      ).length,
  };
}

export async function createRole(
  input: RoleInput,
  actorUserId: string,
): Promise<Role> {
  await delay();

  return demoStore.mutate((draft) => {
    const cleaned = cleanInput(draft, input);
    const baseKey = `${cleaned.organizationType}-${slugify(cleaned.name)}`;
    let key = baseKey;
    for (let suffix = 2; draft.roles.some((role) => role.key === key); suffix += 1) {
      key = `${baseKey}-${suffix}`;
    }

    const role: Role = {
      id: createId("role"),
      key,
      name: cleaned.name,
      description: cleaned.description,
      organizationType: cleaned.organizationType,
      hasFullBrandAccess: cleaned.hasFullBrandAccess,
      isSystem: false,
      permissionIds: cleaned.permissionIds,
      createdByUserId: actorUserId,
      createdAt: new Date().toISOString(),
    };
    draft.roles = [...draft.roles, role];

    recordEvent(draft, {
      action: "role.created",
      description: `${nameOf(draft, actorUserId)} created the ${role.name} role for ${
        role.organizationType === "brand" ? "Brands" : "Brokerages"
      }`,
      actorUserId,
    });

    return role;
  });
}

/**
 * Updates a custom role. The organization type can't change, since members of
 * that type already hold it. Two things follow a change straight away:
 *
 * - Turning full brand access off gives Brand members their Brand Access at
 *   Full; in a Brokerage they keep no Brands until an admin assigns some.
 *   Turning it on removes their rows, because the access is now derived.
 * - No organization may be left without an active member who can change
 *   roles, so removing member.update is refused if it would do that.
 */
export async function updateRole(
  roleId: string,
  input: Omit<RoleInput, "organizationType">,
  actorUserId: string,
): Promise<Role> {
  await delay();

  return demoStore.mutate((draft) => {
    const existing = draft.roles.find((role) => role.id === roleId);
    if (!existing) throw new RoleError("Role not found.");
    if (existing.isSystem) {
      throw new RoleError("System roles can't be changed. Create a custom role instead.");
    }

    const cleaned = cleanInput(
      draft,
      { ...input, organizationType: existing.organizationType },
      roleId,
    );
    const updated: Role = {
      ...existing,
      name: cleaned.name,
      description: cleaned.description,
      permissionIds: cleaned.permissionIds,
      hasFullBrandAccess: cleaned.hasFullBrandAccess,
    };

    if (canManageRoles(existing) && !canManageRoles(updated)) {
      const stranded = draft.organizations.filter((organization) => {
        const active = draft.memberships.filter(
          (membership) =>
            membership.organizationId === organization.id &&
            membership.status === "active",
        );
        const managers = active.filter((membership) =>
          canManageRoles(
            membership.roleId === roleId
              ? updated
              : draft.roles.find((role) => role.id === membership.roleId),
          ),
        );
        const hadManager = active.some((membership) => membership.roleId === roleId);
        return hadManager && managers.length === 0;
      });
      if (stranded.length > 0) {
        throw new RoleError(
          `${stranded.map((org) => org.name).join(", ")} would have nobody left who can change roles. Keep "Change roles", or give someone there another role first.`,
        );
      }
    }

    draft.roles = draft.roles.map((role) => (role.id === roleId ? updated : role));

    if (existing.hasFullBrandAccess !== updated.hasFullBrandAccess) {
      for (const membership of draft.memberships) {
        if (membership.roleId === roleId && membership.status !== "removed") {
          syncBrandAccessForRole(draft, membership, actorUserId);
        }
      }
    }

    recordEvent(draft, {
      action: "role.updated",
      description: `${nameOf(draft, actorUserId)} updated the ${updated.name} role`,
      actorUserId,
    });

    return updated;
  });
}

/** Deletes a custom role nobody holds and no pending invitation or request uses. */
export async function deleteRole(roleId: string, actorUserId: string): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const role = draft.roles.find((item) => item.id === roleId);
    if (!role) throw new RoleError("Role not found.");
    if (role.isSystem) throw new RoleError("System roles can't be deleted.");

    const usage = getRoleUsage(draft, roleId);
    if (usage.members > 0 || usage.pending > 0) {
      throw new RoleError(
        `${role.name} is still in use (${usage.members} ${
          usage.members === 1 ? "member" : "members"
        }, ${usage.pending} pending). Give them another role first.`,
      );
    }

    draft.roles = draft.roles.filter((item) => item.id !== roleId);

    recordEvent(draft, {
      action: "role.deleted",
      description: `${nameOf(draft, actorUserId)} deleted the ${role.name} role`,
      actorUserId,
    });
  });
}
