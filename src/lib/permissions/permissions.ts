import type {
  AppState,
  Membership,
  OrganizationType,
  Permission,
  PermissionId,
  Role,
} from "@/types";

/**
 * The permission catalogue. Permissions are deliberately generic identity /
 * access concerns — no business modules (CRM, trade spend, product specs) live
 * here, because this prototype is only about the identity foundation.
 */
export const PERMISSIONS: Permission[] = [
  {
    id: "organization.view",
    name: "View organization",
    description: "See the organization profile and overview.",
    group: "Organization",
  },
  {
    id: "organization.update",
    name: "Update organization",
    description: "Edit organization name, profile and settings.",
    group: "Organization",
  },
  {
    id: "member.view",
    name: "View members",
    description: "See who belongs to the organization.",
    group: "Members",
  },
  {
    id: "member.invite",
    name: "Invite members",
    description: "Send invitations to join the organization.",
    group: "Members",
  },
  {
    id: "member.update",
    name: "Update members",
    description: "Change a member's details.",
    group: "Members",
  },
  {
    id: "member.remove",
    name: "Remove members",
    description: "Remove a member from the organization.",
    group: "Members",
  },
  {
    id: "member.approve",
    name: "Approve access requests",
    description: "Approve or reject requests to join.",
    group: "Members",
  },
  {
    id: "member.suspend",
    name: "Suspend members",
    description: "Temporarily suspend a membership.",
    group: "Members",
  },
  {
    id: "role.view",
    name: "View roles",
    description: "See roles and the permissions they grant.",
    group: "Roles",
  },
  {
    id: "role.assign",
    name: "Assign roles",
    description: "Change which role a member holds.",
    group: "Roles",
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
    description: "Add or remove organization domains.",
    group: "Domains",
  },
  {
    id: "domain.verify",
    name: "Verify domains",
    description: "Run domain verification.",
    group: "Domains",
  },
  {
    id: "relationship.view",
    name: "View relationships",
    description: "See connected organizations.",
    group: "Relationships",
  },
  {
    id: "relationship.request",
    name: "Request relationships",
    description: "Ask another organization to connect.",
    group: "Relationships",
  },
  {
    id: "relationship.approve",
    name: "Approve relationships",
    description: "Accept an incoming relationship request.",
    group: "Relationships",
  },
  {
    id: "relationship.reject",
    name: "Reject relationships",
    description: "Decline an incoming relationship request.",
    group: "Relationships",
  },
  {
    id: "relationship.manage",
    name: "Manage relationships",
    description: "Manage managed/private brands and relationship metadata.",
    group: "Relationships",
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
  organizationAdmin: "role-org-admin",
  brandMember: "role-brand-member",
  broker: "role-broker",
  externalCollaborator: "role-external-collaborator",
} as const;

/**
 * Roles are collections of permissions, and are NOT tied to a specific
 * organization. "Organization Admin" means the same thing inside a Brand and
 * inside a Brokerage — what differs is the membership it is attached to.
 */
export const ROLES: Role[] = [
  {
    id: ROLE_IDS.organizationAdmin,
    name: "Organization Admin",
    description:
      "Full administrative control of the organization: members, roles, domains and relationships.",
    permissionIds: PERMISSIONS.map((permission) => permission.id),
  },
  {
    id: ROLE_IDS.brandMember,
    name: "Brand Member",
    description:
      "Works inside a Brand. Can see the organization, its members and its connected brokerages.",
    organizationType: "brand",
    permissionIds: ["organization.view", "member.view", "relationship.view"],
  },
  {
    id: ROLE_IDS.broker,
    name: "Broker",
    description:
      "Works inside a Brokerage. Can see the organization and request brand relationships.",
    organizationType: "brokerage",
    permissionIds: [
      "organization.view",
      "member.view",
      "relationship.view",
      "relationship.request",
    ],
  },
  {
    id: ROLE_IDS.externalCollaborator,
    name: "External Collaborator",
    description:
      "An invited collaborator from outside the organization's verified domain. Read-only access.",
    permissionIds: ["organization.view", "member.view", "relationship.view"],
  },
];

/**
 * The single authorization primitive of the prototype.
 *
 * Access is never derived from something like `user.role === "BrandOwner"`.
 * It is always resolved as:
 *   user -> membership for this organization -> role -> permissions
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

/** The active membership linking a user to an organization, if any. */
export function getMembership(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
): Membership | undefined {
  if (!userId || !organizationId) return undefined;
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
    (role) =>
      role.organizationType === undefined ||
      role.organizationType === organizationType,
  );
}
