/**
 * Domain model for the Caboodle identity prototype.
 *
 * These types intentionally mirror the shape a real backend would expose, so the
 * mock service layer in `src/lib/services` can later be swapped for API calls
 * without reshaping the UI.
 *
 * The core model is:
 *   User -> Membership -> Organization -> Role -> Permissions
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

export type OrganizationStatus = "active" | "suspended";

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  membershipPolicy: MembershipPolicy;
  /** Short tagline used in cards and search results. */
  description?: string;
  createdAt: string;
  createdByUserId?: string;
};

export type MembershipStatus = "pending" | "active" | "suspended" | "removed";

export type MembershipSource = "invitation" | "access_request" | "created";

export type Membership = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  source: MembershipSource;
  /**
   * Which subscribed modules this member may use, and what they may do in
   * each. Ignored for roles that grant `module.full_access`.
   */
  moduleGrants?: ModuleGrant[];
  createdAt: string;
};

/** What a member may do inside one module. */
export type ModuleAction = "view" | "create" | "edit" | "delete" | "export";

export type ModuleGrant = {
  moduleId: string;
  actions: ModuleAction[];
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
  /** The slug caboodle.web checks. Unique within an audience, not across. */
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
   * Picture shown instead of the default icon. In the demo this is a small
   * data URL made in the browser; a real backend would store a file URL.
   */
  imageUrl?: string;
  /** List price in USD per month. */
  monthlyPrice: number;
  sortOrder: number;
  createdAt: string;
};

export type PlanTier = "standard" | "professional" | "custom";

export type Plan = {
  id: string;
  name: string;
  audience: OrganizationType;
  tier: PlanTier;
  description: string;
  /** Modules and sub-modules. A sub-module only counts if its parent is here. */
  moduleIds: string[];
  /** A bundle price. When unset the plan costs the sum of its modules. */
  fixedMonthlyPrice?: number;
  /** Set when a custom plan was built for one organization only. */
  organizationId?: string;
  createdByUserId?: string;
  createdAt: string;
};

export type BillingCycle = "monthly" | "annual";

/** `incomplete` means a plan was chosen but payment has not gone through. */
export type SubscriptionStatus = "incomplete" | "active" | "canceled";

export type SubscriptionSource = "self_service" | "platform_admin";

export type PaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
};

export type Subscription = {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  source: SubscriptionSource;
  paymentMethod?: PaymentMethod;
  createdByUserId: string;
  createdAt: string;
  startedAt?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
};

export type Invoice = {
  id: string;
  number: string;
  organizationId: string;
  subscriptionId: string;
  description: string;
  amount: number;
  status: "paid";
  issuedAt: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  /** When set, the role is only offered inside organizations of this type. */
  organizationType?: OrganizationType;
  permissionIds: PermissionId[];
};

export type Permission = {
  id: PermissionId;
  name: string;
  description: string;
  group: string;
};

export type RelationshipType =
  | "brokerage_represents_brand"
  | "brokerage_manages_brand";

export type RelationshipStatus = "pending" | "active" | "rejected" | "suspended";

export type OrganizationRelationship = {
  id: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  type: RelationshipType;
  status: RelationshipStatus;
  regions?: string[];
  requestedByUserId: string;
  approvedByUserId?: string;
  createdAt: string;
};

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Invitation = {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
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
  createdAt: string;
};

/** Every permission identifier understood by the prototype. */
export type PermissionId =
  | "organization.view"
  | "organization.update"
  | "member.view"
  | "member.invite"
  | "member.update"
  | "member.remove"
  | "member.approve"
  | "member.suspend"
  | "role.view"
  | "role.assign"
  | "domain.view"
  | "domain.manage"
  | "domain.verify"
  | "relationship.view"
  | "relationship.request"
  | "relationship.approve"
  | "relationship.reject"
  | "relationship.manage"
  | "billing.view"
  | "billing.manage"
  | "module.assign"
  | "module.full_access";

/** The full mock database. One object, persisted to localStorage. */
export type AppState = {
  users: User[];
  organizations: Organization[];
  domains: OrganizationDomain[];
  memberships: Membership[];
  roles: Role[];
  relationships: OrganizationRelationship[];
  invitations: Invitation[];
  accessRequests: AccessRequest[];
  auditEvents: AuditEvent[];
  modules: PlatformModule[];
  plans: Plan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
};

/** The demo "session" — who is signed in and which org they are looking at. */
export type Session = {
  userId: string;
  organizationId: string | null;
};
