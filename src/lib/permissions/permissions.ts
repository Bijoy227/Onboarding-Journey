import type {
  AppState,
  Membership,
  OrganizationType,
  Permission,
  PermissionId,
  Role,
} from "@/types";

/**
 * The organization permission catalogue (architecture v2, section 4.2).
 *
 * These say what a member may administer: members, invitations, brand
 * assignments. They never give access to data. What a person may do inside a
 * business module is a module grant on their Brand Access, resolved in
 * `src/lib/permissions/access.ts`.
 */
export const PERMISSIONS: Permission[] = [
  {
    id: "organization.view",
    name: "View organization",
    description: "See the organization profile.",
    group: "Organization",
  },
  {
    id: "organization.update",
    name: "Update organization",
    description: "Edit the organization's profile and settings.",
    group: "Organization",
  },
  {
    id: "member.view",
    name: "View members",
    description: "See the member list.",
    group: "Members",
  },
  {
    id: "member.invite",
    name: "Invite members",
    description: "Send and revoke invitations.",
    group: "Members",
  },
  {
    id: "member.approve",
    name: "Approve access requests",
    description: "Approve or reject requests to join.",
    group: "Members",
  },
  {
    id: "member.update",
    name: "Change roles",
    description: "Change a member's role.",
    group: "Members",
  },
  {
    id: "member.suspend",
    name: "Suspend members",
    description: "Suspend or restore a membership.",
    group: "Members",
  },
  {
    id: "member.remove",
    name: "Remove members",
    description: "Remove a member from the organization.",
    group: "Members",
  },
  {
    id: "domain.view",
    name: "View domains",
    description: "See the organization's email domains.",
    group: "Domains",
  },
  {
    id: "domain.manage",
    name: "Manage domains",
    description: "Add, verify and remove email domains.",
    group: "Domains",
  },
  {
    id: "connection.view",
    name: "View connections",
    description:
      "See connected organizations: a Brand sees its Brokerages, a Brokerage sees its Brands.",
    group: "Connections",
  },
  {
    id: "access.manage",
    name: "Manage brand access",
    description:
      "Assign members to Brands and edit their module permissions for each one.",
    group: "Access",
  },
];

export const PERMISSION_BY_ID = new Map<PermissionId, Permission>(
  PERMISSIONS.map((permission) => [permission.id, permission]),
);

export const PERMISSION_GROUPS = Array.from(
  new Set(PERMISSIONS.map((permission) => permission.group)),
);

/** Role identifiers used throughout the seed data. */
export const ROLE_IDS = {
  brandAdmin: "role-brand-admin",
  brandMember: "role-brand-member",
  brokerageAdmin: "role-brokerage-admin",
  broker: "role-broker",
} as const;

const ADMIN_PERMISSIONS: PermissionId[] = PERMISSIONS.map(
  (permission) => permission.id,
);

/**
 * The four seeded system roles, one set per organization type. They are
 * separate from the global Identity roles: only ADMIN (the Platform Admin)
 * survives there. The Platform Admin can add custom roles for either type
 * (src/lib/services/role-service.ts); the system roles never change.
 */
export const ROLES: Role[] = [
  {
    id: ROLE_IDS.brandAdmin,
    key: "brand-admin",
    name: "Brand Admin",
    description:
      "Every Brand permission, and full access to every module the Brand has enabled.",
    organizationType: "brand",
    hasFullBrandAccess: true,
    isSystem: true,
    permissionIds: ADMIN_PERMISSIONS,
  },
  {
    id: ROLE_IDS.brandMember,
    key: "brand-member",
    name: "Brand Member",
    description:
      "Works on the Brand's data through their Brand Access: Full by default, or a custom list of modules.",
    organizationType: "brand",
    hasFullBrandAccess: false,
    isSystem: true,
    permissionIds: ["organization.view", "member.view", "connection.view"],
  },
  {
    id: ROLE_IDS.brokerageAdmin,
    key: "brokerage-admin",
    name: "Brokerage Admin",
    description:
      "Every Brokerage permission, and full access to every Brand actively connected to the Brokerage.",
    organizationType: "brokerage",
    hasFullBrandAccess: true,
    isSystem: true,
    permissionIds: ADMIN_PERMISSIONS,
  },
  {
    id: ROLE_IDS.broker,
    key: "broker",
    name: "Broker",
    description:
      "Works only on the Brands they are assigned to, each one Full or Custom.",
    organizationType: "brokerage",
    hasFullBrandAccess: false,
    isSystem: true,
    permissionIds: ["organization.view", "member.view"],
  },
];

/** The admin role for an organization type. */
export function adminRoleId(type: OrganizationType): string {
  return type === "brand" ? ROLE_IDS.brandAdmin : ROLE_IDS.brokerageAdmin;
}

/** The non-admin role for an organization type. */
export function memberRoleId(type: OrganizationType): string {
  return type === "brand" ? ROLE_IDS.brandMember : ROLE_IDS.broker;
}

/**
 * Organization-level authorization.
 *
 * Access is never derived from something like `user.role === "BrandOwner"`.
 * It is always resolved as:
 *   user -> active membership in an active organization -> role -> permissions
 */
export function hasPermission(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
  permission: PermissionId,
): boolean {
  return getPermissions(state, userId, organizationId).includes(permission);
}

/** Resolve the effective permissions a user holds inside one organization. */
export function getPermissions(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): PermissionId[] {
  const role = getEffectiveRole(state, userId, organizationId);
  return role ? role.permissionIds : [];
}

/**
 * The active membership linking a user to an organization, if any. The user,
 * the membership and the organization must all be active.
 */
export function getMembership(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): Membership | undefined {
  if (!userId || !organizationId) return undefined;
  const user = state.users.find((item) => item.id === userId);
  if (!user || user.status === "suspended") return undefined;
  const organization = state.organizations.find(
    (item) => item.id === organizationId,
  );
  if (!organization || organization.status !== "active") return undefined;
  return state.memberships.find(
    (membership) =>
      membership.userId === userId &&
      membership.organizationId === organizationId &&
      membership.status === "active",
  );
}

/** The role granted by that membership. */
export function getEffectiveRole(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): Role | undefined {
  const membership = getMembership(state, userId, organizationId);
  if (!membership) return undefined;
  return state.roles.find((role) => role.id === membership.roleId);
}

/** Roles that can be assigned inside an organization of the given type. */
export function getAssignableRoles(
  state: AppState,
  organizationType: OrganizationType,
): Role[] {
  return state.roles.filter(
    (role) => role.organizationType === organizationType,
  );
}

export function getRole(state: AppState, roleId: string): Role | undefined {
  return state.roles.find((role) => role.id === roleId);
}

/**
 * Can this role change other members' roles? Every organization keeps at
 * least one active member who can, so it is never left unmanageable.
 */
export function canManageRoles(role: Role | undefined): boolean {
  return Boolean(role?.permissionIds.includes("member.update"));
}
