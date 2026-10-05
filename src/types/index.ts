/**
 * Domain model for the Caboodle access prototype (architecture v2).
 *
 * These types intentionally mirror the shape a real backend would expose, so the
 * mock service layer in `src/lib/services` can later be swapped for API calls
 * without reshaping the UI. See docs/caboodle-access-architecture.md.
 *
 * The core model is:
 *   Platform Admin -> Organizations -> Brands -> Users -> Module Access -> Permissions
 *
 *   User -> Membership -> Organization -> Role -> organization permissions
 *   Membership -> Brand Access (one per Brand) -> module grants
 */

export type OrganizationType = "brand" | "brokerage";

export type UserStatus = "active" | "invited" | "suspended";

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  /**
   * Platform Admin is deliberately NOT an organization role. It is a
   * platform-level capability that sits outside the membership model.
   */
  isPlatformAdmin?: boolean;
  /**
   * When the person proved they own their email with the one-time code. Unset
   * means the account exists but cannot go any further than verification.
   */
  emailVerifiedAt?: string;
  createdAt: string;
};

export type OrganizationDomain = {
  id: string;
  organizationId: string;
  domain: string;
  verified: boolean;
  verifiedAt?: string;
  isPrimary: boolean;
  /** Simulated DNS TXT value shown in the verification instructions. */
  verificationToken: string;
};

/** Who is allowed to ask for a membership in an organization. */
export type MembershipPolicy = "anyone" | "verified_domain" | "invite_only";

/** Suspended blocks every member, and for a Brand every brokerage's access too. */
export type OrganizationStatus = "active" | "suspended";

export type Organization = {
  id: string;
  name: string;
  /** Cannot change after creation. */
  type: OrganizationType;
  status: OrganizationStatus;
  membershipPolicy: MembershipPolicy;
  /** Short tagline used in cards and search results. */
  description?: string;
  createdAt: string;
  createdByUserId?: string;
};

export type MembershipStatus = "active" | "suspended" | "removed";

export type MembershipSource =
  | "created"
  | "invitation"
  | "access_request"
  | "platform_admin";

/** A person belongs to an organization. The role says what they may administer. */
export type Membership = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  source: MembershipSource;
  createdAt: string;
};

/** What a person may do inside one module. Any action implies view. */
export type ModuleAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "import"
  | "export";

export type ModuleGrant = {
  moduleId: string;
  actions: ModuleAction[];
};

/**
 * `full` follows whatever the organization has enabled, including modules
 * enabled later. `custom` is an explicit list that never grows on its own.
 */
export type AccessMode = "full" | "custom";

/**
 * One non-admin membership working on one Brand.
 *
 * In a Brand organization the row is created with the membership and always
 * points at that Brand. In a Brokerage the admin creates one per assigned
 * Brand, and only while an active connection exists. Admins have no rows:
 * their access is derived from the role.
 */
export type BrandAccess = {
  id: string;
  membershipId: string;
  brandOrganizationId: string;
  accessMode: AccessMode;
  /** Read only when `accessMode` is `custom`. A missing module means no access. */
  grants: ModuleGrant[];
  assignedByUserId?: string;
  assignedAt: string;
  /** Set when the connection ended. The row stays for history. */
  deletedAt?: string;
};

/**
 * One entry in the platform module catalog: either a module or, when
 * `parentId` is set, a sub-module. The catalog is two levels deep; screens,
 * tabs and reports below that are listed in `features`.
 */
export type PlatformModule = {
  id: string;
  /** Brand and Brokerage organizations have different module catalogs. */
  audience: OrganizationType;
  /** The slug the API checks. Unique within an audience, not across. */
  slug: string;
  name: string;
  description: string;
  parentId?: string;
  /** Menu group (for a module) or hub section (for a sub-module). */
  group?: string;
  /** Where the screen lives in caboodle.web today. Informational only. */
  route?: string;
  /** Screens, tabs and reports inside it that are not gated on their own. */
  features: string[];
  /**
   * The actions this module supports. A report that is view and export only
   * never offers create, update or delete, and Full never grants them.
   */
  availableActions: ModuleAction[];
  /**
   * Picture shown instead of the default icon. In the demo this is a small
   * data URL made in the browser; a real backend would store a file URL.
   */
  imageUrl?: string;
  sortOrder: number;
  createdAt: string;
};

/**
 * Module entitlement: the Platform Admin enabled this module for this
 * organization. This is the ceiling nobody inside the organization can exceed.
 */
export type ModuleAssignment = {
  id: string;
  organizationId: string;
  moduleId: string;
  assignedByUserId?: string;
  assignedAt: string;
};

export type Role = {
  id: string;
  /** Stable key, e.g. brand-admin. */
  key: string;
  name: string;
  description: string;
  /** The role is only offered inside organizations of this type. */
  organizationType: OrganizationType;
  /**
   * Full access to every enabled module, with every action, on the
   * organization's own Brand or on every actively connected Brand. Derived at
   * request time, never stored per brand.
   */
  hasFullBrandAccess: boolean;
  /** The four seeded roles. They can't be changed or deleted. */
  isSystem: boolean;
  permissionIds: PermissionId[];
  /** Custom roles only: who created the role, and when. */
  createdByUserId?: string;
  createdAt?: string;
};

export type Permission = {
  id: PermissionId;
  name: string;
  description: string;
  group: string;
};

/**
 * Suspended pauses access but keeps assignments. Ended removes assignments;
 * reconnecting later starts with none.
 */
export type BrandConnectionStatus = "active" | "suspended" | "ended";

/** A Brokerage works with a Brand. Only the Platform Admin writes it. */
export type BrandConnection = {
  id: string;
  brokerageOrganizationId: string;
  brandOrganizationId: string;
  status: BrandConnectionStatus;
  /** Metadata only. It does not scope data (decision D8). */
  regions?: string[];
  connectedByUserId: string;
  connectedAt: string;
  endedByUserId?: string;
  endedAt?: string;
};

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Invitation = {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  /**
   * Brokerage invitations only: the Brands to assign on acceptance, each at
   * Full. Checked against the connections active at acceptance time.
   */
  brandOrganizationIds?: string[];
  invitedByUserId: string;
  status: InvitationStatus;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export type AccessRequest = {
  id: string;
  userId: string;
  organizationId: string;
  requestedRoleId: string;
  status: AccessRequestStatus;
  requestedAt: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  message?: string;
};

export type AuditEvent = {
  id: string;
  /** Machine-readable action, e.g. "member.invited". */
  action: string;
  /** Human sentence rendered in the activity feed. */
  description: string;
  actorUserId?: string;
  organizationId?: string;
  /** The Platform Admin acted inside an organization through support access. */
  isSupportAccess?: boolean;
  createdAt: string;
};

/** Every organization permission understood by the prototype. */
export type PermissionId =
  | "organization.view"
  | "organization.update"
  | "member.view"
  | "member.invite"
  | "member.approve"
  | "member.update"
  | "member.suspend"
  | "member.remove"
  | "domain.view"
  | "domain.manage"
  | "connection.view"
  | "access.manage";

/** The full mock database. One object, persisted to localStorage. */
export type AppState = {
  users: User[];
  organizations: Organization[];
  domains: OrganizationDomain[];
  memberships: Membership[];
  roles: Role[];
  brandConnections: BrandConnection[];
  brandAccess: BrandAccess[];
  invitations: Invitation[];
  accessRequests: AccessRequest[];
  auditEvents: AuditEvent[];
  modules: PlatformModule[];
  moduleAssignments: ModuleAssignment[];
};

/**
 * The demo "session": who is signed in, which organization they act through
 * (the OrganizationID header) and which Brand is active (the BrandID header).
 */
export type Session = {
  userId: string;
  organizationId: string | null;
  brandId: string | null;
};
