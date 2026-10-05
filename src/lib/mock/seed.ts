import {
  allSeededModuleIds,
  createModuleCatalog,
  moduleId,
} from "@/lib/mock/module-catalog";
import { ROLE_IDS, ROLES } from "@/lib/permissions/permissions";
import type {
  AppState,
  BrandAccess,
  ModuleAction,
  ModuleAssignment,
  ModuleGrant,
  OrganizationType,
  User,
} from "@/types";

/**
 * Seed data for the demo.
 *
 * Timestamps are expressed relative to the moment the demo data is created, so
 * the activity feed always reads sensibly no matter when the prototype is
 * opened.
 *
 * ABC Brokerage and Mike follow the worked example in section 5 of
 * docs/caboodle-access-architecture.md.
 */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return minutesAgo(days * 24 * 60);
}

function daysFromNow(days: number): string {
  return minutesAgo(-days * 24 * 60);
}

export const ORG_IDS = {
  acme: "org-acme",
  abc: "org-abc",
  xyzBroker: "org-xyz-broker",
  westCoast: "org-west-coast",
  privateLabel: "org-private",
  northwind: "org-northwind",
  conflict: "org-conflict",
} as const;

export const USER_IDS = {
  constance: "user-constance",
  alice: "user-alice",
  bob: "user-bob",
  sarahJohnson: "user-sarah-johnson",
  john: "user-john",
  mike: "user-mike",
  sarahLee: "user-sarah-lee",
  wendy: "user-wendy",
  nate: "user-nate",
  consultant: "user-consultant",
} as const;

/** Every seeded account has already been through email verification. */
function verified(users: User[]): User[] {
  return users.map((user) => ({ ...user, emailVerifiedAt: user.createdAt }));
}

/** Shorthand for seeded module grants: grants("brand", { files: ["view"] }). */
function grants(
  audience: OrganizationType,
  bySlug: Record<string, ModuleAction[]>,
): ModuleGrant[] {
  return Object.entries(bySlug).map(([slug, actions]) => ({
    moduleId: moduleId(audience, slug),
    actions,
  }));
}

/** The Platform Admin enabling modules for one organization. */
function enable(
  organizationId: string,
  audience: OrganizationType,
  slugs: string[],
  enabledDaysAgo: number,
): ModuleAssignment[] {
  return slugs.map((slug) => ({
    id: `ma-${organizationId}-${slug}`,
    organizationId,
    moduleId: moduleId(audience, slug),
    assignedByUserId: USER_IDS.constance,
    assignedAt: daysAgo(enabledDaysAgo),
  }));
}

function brandAccess(
  id: string,
  membershipId: string,
  brandOrganizationId: string,
  access: { mode: "full" } | { mode: "custom"; grants: ModuleGrant[] },
  assignedByUserId: string,
  assignedDaysAgo: number,
): BrandAccess {
  return {
    id,
    membershipId,
    brandOrganizationId,
    accessMode: access.mode,
    grants: access.mode === "custom" ? access.grants : [],
    assignedByUserId,
    assignedAt: daysAgo(assignedDaysAgo),
  };
}


/** Builds a fresh copy of the demo database. Called on first load and on reset. */
export function createSeedState(): AppState {
  return {
    roles: ROLES.map((role) => ({ ...role })),

    users: verified([
      {
        id: USER_IDS.constance,
        name: "Constance Reed",
        email: "constance@caboodle.com",
        status: "active",
        isPlatformAdmin: true,
        createdAt: daysAgo(400),
      },
      {
        id: USER_IDS.alice,
        name: "Alice Johnson",
        email: "alice@acmefoods.com",
        status: "active",
        createdAt: daysAgo(120),
      },
      {
        id: USER_IDS.bob,
        name: "Bob Smith",
        email: "bob@acmefoods.com",
        status: "active",
        createdAt: daysAgo(96),
      },
      {
        id: USER_IDS.sarahJohnson,
        name: "Sarah Johnson",
        email: "sarah@acmefoods.com",
        status: "active",
        createdAt: minutesAgo(45),
      },
      {
        id: USER_IDS.john,
        name: "John Carter",
        email: "john@abc-brokerage.com",
        status: "active",
        createdAt: daysAgo(110),
      },
      {
        id: USER_IDS.mike,
        name: "Mike Smith",
        email: "mike@abc-brokerage.com",
        status: "active",
        createdAt: daysAgo(88),
      },
      {
        id: USER_IDS.sarahLee,
        name: "Sarah Lee",
        email: "sarah@abc-brokerage.com",
        status: "active",
        createdAt: daysAgo(80),
      },
      {
        id: USER_IDS.wendy,
        name: "Wendy Cole",
        email: "wendy@westcoastbrokerage.com",
        status: "active",
        createdAt: daysAgo(60),
      },
      {
        id: USER_IDS.nate,
        name: "Nate Brooks",
        email: "nate@northwind.example",
        status: "active",
        createdAt: daysAgo(55),
      },
      {
        id: USER_IDS.consultant,
        name: "Dana Whitfield",
        email: "consultant@agency.com",
        status: "active",
        createdAt: daysAgo(30),
      },
    ]),

    organizations: [
      {
        id: ORG_IDS.acme,
        name: "Acme Foods",
        type: "brand",
        status: "active",
        membershipPolicy: "verified_domain",
        description: "Packaged foods brand working with regional brokerages.",
        createdAt: daysAgo(120),
        createdByUserId: USER_IDS.alice,
      },
      {
        id: ORG_IDS.abc,
        name: "ABC Brokerage",
        type: "brokerage",
        status: "active",
        membershipPolicy: "verified_domain",
        description: "Northeast food brokerage representing multiple brands.",
        createdAt: daysAgo(110),
        createdByUserId: USER_IDS.john,
      },
      {
        id: ORG_IDS.xyzBroker,
        name: "XYZ Brokerage",
        type: "brokerage",
        status: "active",
        membershipPolicy: "verified_domain",
        description: "Midwest brokerage firm.",
        createdAt: daysAgo(100),
        createdByUserId: USER_IDS.constance,
      },
      {
        id: ORG_IDS.westCoast,
        name: "West Coast Brokerage",
        type: "brokerage",
        status: "active",
        membershipPolicy: "verified_domain",
        description: "West coast brokerage seeking new brand partners.",
        createdAt: daysAgo(60),
        createdByUserId: USER_IDS.wendy,
      },
      {
        id: ORG_IDS.privateLabel,
        name: "XYZ Private Label",
        type: "brand",
        status: "active",
        membershipPolicy: "invite_only",
        description:
          "Private label brand with no members of its own, run by ABC Brokerage through a connection.",
        createdAt: daysAgo(70),
        createdByUserId: USER_IDS.constance,
      },
      {
        id: ORG_IDS.northwind,
        name: "Northwind Traders",
        type: "brand",
        status: "active",
        membershipPolicy: "verified_domain",
        description:
          "Specialty grocery brand, not yet working with a brokerage.",
        createdAt: daysAgo(55),
        createdByUserId: USER_IDS.nate,
      },
      {
        id: ORG_IDS.conflict,
        name: "Duplicate Test Organization",
        type: "brand",
        status: "active",
        membershipPolicy: "invite_only",
        description:
          "Has no modules yet, and owns conflicted.com to demonstrate a domain conflict.",
        createdAt: daysAgo(20),
        createdByUserId: USER_IDS.constance,
      },
    ],

    domains: [
      {
        id: "dom-acme",
        organizationId: ORG_IDS.acme,
        domain: "acmefoods.com",
        verified: true,
        verifiedAt: daysAgo(119),
        isPrimary: true,
        verificationToken: "caboodle-verification=acme-123456",
      },
      {
        id: "dom-abc",
        organizationId: ORG_IDS.abc,
        domain: "abc-brokerage.com",
        verified: true,
        verifiedAt: daysAgo(109),
        isPrimary: true,
        verificationToken: "caboodle-verification=abc-778812",
      },
      {
        id: "dom-xyz",
        organizationId: ORG_IDS.xyzBroker,
        domain: "xyzbrokerage.com",
        verified: true,
        verifiedAt: daysAgo(99),
        isPrimary: true,
        verificationToken: "caboodle-verification=xyz-334455",
      },
      {
        id: "dom-west",
        organizationId: ORG_IDS.westCoast,
        domain: "westcoastbrokerage.com",
        verified: true,
        verifiedAt: daysAgo(59),
        isPrimary: true,
        verificationToken: "caboodle-verification=west-902133",
      },
      {
        id: "dom-private",
        organizationId: ORG_IDS.privateLabel,
        domain: "private-label.example",
        verified: false,
        isPrimary: true,
        verificationToken: "caboodle-verification=private-551020",
      },
      {
        id: "dom-northwind",
        organizationId: ORG_IDS.northwind,
        domain: "northwind.example",
        verified: true,
        verifiedAt: daysAgo(54),
        isPrimary: true,
        verificationToken: "caboodle-verification=northwind-620914",
      },
      {
        id: "dom-conflict",
        organizationId: ORG_IDS.conflict,
        domain: "conflicted.com",
        verified: true,
        verifiedAt: daysAgo(19),
        isPrimary: true,
        verificationToken: "caboodle-verification=conflict-010203",
      },
    ],

    memberships: [
      // Acme Foods: a Brand with several members and no "Brand Owner" user.
      {
        id: "mem-alice-acme",
        userId: USER_IDS.alice,
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.brandAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(120),
      },
      {
        id: "mem-bob-acme",
        userId: USER_IDS.bob,
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.brandMember,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(96),
      },
      // ABC Brokerage: one admin and two brokers.
      {
        id: "mem-john-abc",
        userId: USER_IDS.john,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.brokerageAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(110),
      },
      {
        id: "mem-mike-abc",
        userId: USER_IDS.mike,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.broker,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(88),
      },
      {
        id: "mem-sarahlee-abc",
        userId: USER_IDS.sarahLee,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.broker,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(80),
      },
      {
        id: "mem-wendy-west",
        userId: USER_IDS.wendy,
        organizationId: ORG_IDS.westCoast,
        roleId: ROLE_IDS.brokerageAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(60),
      },
      {
        id: "mem-nate-northwind",
        userId: USER_IDS.nate,
        organizationId: ORG_IDS.northwind,
        roleId: ROLE_IDS.brandAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(55),
      },
      // One person, two organizations, external email domain in both. The two
      // memberships never merge: different contexts, different catalogs.
      {
        id: "mem-consultant-acme",
        userId: USER_IDS.consultant,
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.brandMember,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(30),
      },
      {
        id: "mem-consultant-abc",
        userId: USER_IDS.consultant,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.broker,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(24),
      },
    ],

    brandConnections: [
      {
        id: "conn-abc-acme",
        brokerageOrganizationId: ORG_IDS.abc,
        brandOrganizationId: ORG_IDS.acme,
        status: "active",
        regions: ["Northeast"],
        connectedByUserId: USER_IDS.constance,
        connectedAt: daysAgo(90),
      },
      {
        id: "conn-xyz-acme",
        brokerageOrganizationId: ORG_IDS.xyzBroker,
        brandOrganizationId: ORG_IDS.acme,
        status: "active",
        regions: ["Midwest"],
        connectedByUserId: USER_IDS.constance,
        connectedAt: daysAgo(75),
      },
      // A private-label Brand is just a Brand with no members, connected to
      // the Brokerage that runs it.
      {
        id: "conn-abc-private",
        brokerageOrganizationId: ORG_IDS.abc,
        brandOrganizationId: ORG_IDS.privateLabel,
        status: "active",
        connectedByUserId: USER_IDS.constance,
        connectedAt: daysAgo(70),
      },
      // Ended connections stay for history; their assignments were removed.
      {
        id: "conn-west-acme",
        brokerageOrganizationId: ORG_IDS.westCoast,
        brandOrganizationId: ORG_IDS.acme,
        status: "ended",
        regions: ["West"],
        connectedByUserId: USER_IDS.constance,
        connectedAt: daysAgo(58),
        endedByUserId: USER_IDS.constance,
        endedAt: daysAgo(12),
      },
    ],

    brandAccess: [
      // Brand members get their row with the membership.
      brandAccess(
        "ba-bob-acme",
        "mem-bob-acme",
        ORG_IDS.acme,
        {
          mode: "custom",
          // Bob works on accounts and reporting, and cannot delete anything.
          grants: grants("brand", {
            dashboard: ["view"],
            "banner-count-graph": ["view"],
            "categories-products-pricing": ["view"],
            retailers: ["view", "export"],
            contacts: ["view", "create", "update"],
            reports: ["view"],
            "retail-reports": ["view"],
            "sales-tracker": ["view", "export"],
            files: ["view", "create"],
          }),
        },
        USER_IDS.alice,
        96,
      ),
      brandAccess(
        "ba-consultant-acme",
        "mem-consultant-acme",
        ORG_IDS.acme,
        {
          mode: "custom",
          // The consultant only sees the reports they were brought in for.
          grants: grants("brand", {
            reports: ["view"],
            "monthly-report": ["view", "export"],
            "trade-spend-roll-up": ["view"],
          }),
        },
        USER_IDS.alice,
        30,
      ),
      // Mike: Acme at Full, Private Label restricted.
      brandAccess("ba-mike-acme", "mem-mike-abc", ORG_IDS.acme, { mode: "full" }, USER_IDS.john, 88),
      brandAccess(
        "ba-mike-private",
        "mem-mike-abc",
        ORG_IDS.privateLabel,
        {
          mode: "custom",
          grants: grants("brokerage", {
            "market-overview": ["view", "create", "update"],
            files: ["view"],
          }),
        },
        USER_IDS.john,
        70,
      ),
      // Sarah's Distributor APL grant is dormant: ABC doesn't have the module.
      // It comes back by itself if the Platform Admin enables it.
      brandAccess(
        "ba-sarahlee-acme",
        "mem-sarahlee-abc",
        ORG_IDS.acme,
        {
          mode: "custom",
          grants: grants("brokerage", {
            "market-overview": ["view"],
            "distributor-apl": ["view", "export"],
            files: ["view"],
          }),
        },
        USER_IDS.john,
        80,
      ),
      brandAccess(
        "ba-consultant-abc-acme",
        "mem-consultant-abc",
        ORG_IDS.acme,
        {
          mode: "custom",
          grants: grants("brokerage", { "market-overview": ["view"] }),
        },
        USER_IDS.john,
        24,
      ),
    ],

    invitations: [
      {
        id: "inv-david-acme",
        email: "david@acmefoods.com",
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.brandMember,
        invitedByUserId: USER_IDS.alice,
        status: "pending",
        token: "inv-token-david",
        createdAt: minutesAgo(10),
        expiresAt: daysFromNow(7),
      },
      {
        id: "inv-lisa-abc",
        email: "lisa@abc-brokerage.com",
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.broker,
        brandOrganizationIds: [ORG_IDS.acme],
        invitedByUserId: USER_IDS.john,
        status: "pending",
        token: "inv-token-lisa",
        createdAt: minutesAgo(15),
        expiresAt: daysFromNow(7),
      },
      {
        id: "inv-consultant-acme",
        email: "consultant@agency.com",
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.brandMember,
        invitedByUserId: USER_IDS.alice,
        status: "accepted",
        token: "inv-token-consultant",
        createdAt: daysAgo(31),
        expiresAt: daysAgo(24),
      },
    ],

    accessRequests: [
      {
        id: "req-sarah-acme",
        userId: USER_IDS.sarahJohnson,
        organizationId: ORG_IDS.acme,
        requestedRoleId: ROLE_IDS.brandMember,
        status: "pending",
        requestedAt: minutesAgo(40),
        message: "I just joined the Acme Foods marketing team.",
      },
    ],

    modules: createModuleCatalog(daysAgo(400)),

    // Module entitlements, set by the Platform Admin. Duplicate Test
    // Organization has none: a new organization starts with no modules.
    moduleAssignments: [
      ...enable(
        ORG_IDS.acme,
        "brand",
        allSeededModuleIds("brand")
          .map((id) => id.replace("mod-brand-", ""))
          .filter((slug) => slug !== "ask-caboodle"),
        118,
      ),
      ...enable(
        ORG_IDS.northwind,
        "brand",
        [
          "dashboard",
          "banner-count-graph",
          "categories-products-pricing",
          "distributors",
          "retailers",
          "contacts",
          "files",
          "reports",
          "retail-reports",
          "sales-tracker",
          "monthly-report",
        ],
        54,
      ),
      ...enable(
        ORG_IDS.privateLabel,
        "brand",
        ["categories-products-pricing", "retailers", "files", "reports", "sales-tracker"],
        70,
      ),
      ...enable(
        ORG_IDS.abc,
        "brokerage",
        [
          "market-overview",
          "category-review",
          "category-review-calendar",
          "promotional-management",
          "files",
        ],
        108,
      ),
      ...enable(
        ORG_IDS.xyzBroker,
        "brokerage",
        ["market-overview", "category-review", "files"],
        99,
      ),
      ...enable(ORG_IDS.westCoast, "brokerage", ["market-overview", "files"], 59),
    ],

    auditEvents: [
      {
        id: "audit-0",
        action: "organization.created",
        description: "John Carter created ABC Brokerage",
        actorUserId: USER_IDS.john,
        organizationId: ORG_IDS.abc,
        createdAt: minutesAgo(30),
      },
      {
        id: "audit-1",
        action: "connection.ended",
        description:
          "Constance Reed ended the connection between West Coast Brokerage and Acme Foods",
        actorUserId: USER_IDS.constance,
        organizationId: ORG_IDS.westCoast,
        createdAt: daysAgo(12),
      },
      {
        id: "audit-2",
        action: "domain.verified",
        description: "Acme Foods verified the domain acmefoods.com",
        actorUserId: USER_IDS.alice,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(50),
      },
      {
        id: "audit-3",
        action: "access_request.created",
        description: "Sarah Johnson requested access to Acme Foods",
        actorUserId: USER_IDS.sarahJohnson,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(40),
      },
      {
        id: "audit-4",
        action: "member.invited",
        description:
          "John Carter invited lisa@abc-brokerage.com to ABC Brokerage, assigned to Acme Foods",
        actorUserId: USER_IDS.john,
        organizationId: ORG_IDS.abc,
        createdAt: minutesAgo(15),
      },
      {
        id: "audit-5",
        action: "member.invited",
        description: "Alice Johnson invited david@acmefoods.com to Acme Foods",
        actorUserId: USER_IDS.alice,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(10),
      },
    ],
  };
}

/** Accounts offered as one-click sign-ins on the demo login screen. */
export const DEMO_ACCOUNTS = [
  {
    email: "constance@caboodle.com",
    label: "Platform Admin",
    hint: "Creates organizations, enables modules, connects Brands to Brokerages",
  },
  {
    email: "alice@acmefoods.com",
    label: "Brand Admin",
    hint: "Acme Foods: every module Acme has enabled",
  },
  {
    email: "bob@acmefoods.com",
    label: "Brand Member",
    hint: "Acme Foods, Custom access: 9 modules, no delete",
  },
  {
    email: "john@abc-brokerage.com",
    label: "Brokerage Admin",
    hint: "ABC Brokerage: full access to every connected Brand",
  },
  {
    email: "mike@abc-brokerage.com",
    label: "Broker",
    hint: "Acme Foods at Full, XYZ Private Label at Custom",
  },
  {
    email: "consultant@agency.com",
    label: "Consultant",
    hint: "External domain; Brand Member at Acme and Broker at ABC",
  },
] as const;
