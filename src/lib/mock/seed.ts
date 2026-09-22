import { ROLE_IDS, ROLES } from "@/lib/permissions/permissions";
import type { AppState } from "@/types";

/**
 * Seed data for the demo.
 *
 * Timestamps are expressed relative to the moment the demo data is created, so
 * the activity feed always reads sensibly no matter when the prototype is
 * opened.
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

/** Builds a fresh copy of the demo database. Called on first load and on reset. */
export function createSeedState(): AppState {
  return {
    roles: ROLES.map((role) => ({ ...role })),

    users: [
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
    ],

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
          "Private label brand with no direct members, managed entirely by ABC Brokerage.",
        createdAt: daysAgo(70),
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
          "Exists only to demonstrate the domain conflict path when claiming conflicted.com.",
        createdAt: daysAgo(20),
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
        roleId: ROLE_IDS.organizationAdmin,
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
      // ABC Brokerage: one admin and multiple Broker-role users.
      {
        id: "mem-john-abc",
        userId: USER_IDS.john,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.organizationAdmin,
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
        roleId: ROLE_IDS.organizationAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(60),
      },
      {
        id: "mem-nate-northwind",
        userId: USER_IDS.nate,
        organizationId: ORG_IDS.northwind,
        roleId: ROLE_IDS.organizationAdmin,
        status: "active",
        source: "created",
        createdAt: daysAgo(55),
      },
      // One user, two organizations, external email domain in both.
      {
        id: "mem-consultant-acme",
        userId: USER_IDS.consultant,
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.externalCollaborator,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(30),
      },
      {
        id: "mem-consultant-abc",
        userId: USER_IDS.consultant,
        organizationId: ORG_IDS.abc,
        roleId: ROLE_IDS.externalCollaborator,
        status: "active",
        source: "invitation",
        createdAt: daysAgo(24),
      },
    ],

    relationships: [
      {
        id: "rel-abc-acme",
        sourceOrganizationId: ORG_IDS.abc,
        targetOrganizationId: ORG_IDS.acme,
        type: "brokerage_represents_brand",
        status: "active",
        regions: ["Northeast"],
        requestedByUserId: USER_IDS.john,
        approvedByUserId: USER_IDS.alice,
        createdAt: daysAgo(90),
      },
      {
        id: "rel-xyz-acme",
        sourceOrganizationId: ORG_IDS.xyzBroker,
        targetOrganizationId: ORG_IDS.acme,
        type: "brokerage_represents_brand",
        status: "active",
        regions: ["Midwest"],
        requestedByUserId: USER_IDS.john,
        approvedByUserId: USER_IDS.alice,
        createdAt: daysAgo(75),
      },
      // A Brand that exists with zero direct members, managed by a Brokerage.
      {
        id: "rel-abc-private",
        sourceOrganizationId: ORG_IDS.abc,
        targetOrganizationId: ORG_IDS.privateLabel,
        type: "brokerage_manages_brand",
        status: "active",
        requestedByUserId: USER_IDS.john,
        approvedByUserId: USER_IDS.john,
        createdAt: daysAgo(70),
      },
      // Waiting for Alice to approve: demonstrates the inbound request queue.
      {
        id: "rel-west-acme",
        sourceOrganizationId: ORG_IDS.westCoast,
        targetOrganizationId: ORG_IDS.acme,
        type: "brokerage_represents_brand",
        status: "pending",
        regions: ["West"],
        requestedByUserId: USER_IDS.wendy,
        createdAt: minutesAgo(25),
      },
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
        id: "inv-consultant-acme",
        email: "consultant@agency.com",
        organizationId: ORG_IDS.acme,
        roleId: ROLE_IDS.externalCollaborator,
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

    auditEvents: [
      {
        id: "audit-1",
        action: "organization.created",
        description: "John Carter created ABC Brokerage",
        actorUserId: USER_IDS.john,
        organizationId: ORG_IDS.abc,
        createdAt: minutesAgo(30),
      },
      {
        id: "audit-2",
        action: "domain.verified",
        description: "Acme Foods verified the domain acmefoods.com",
        actorUserId: USER_IDS.alice,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(20),
      },
      {
        id: "audit-3",
        action: "member.invited",
        description: "Alice Johnson invited david@acmefoods.com to Acme Foods",
        actorUserId: USER_IDS.alice,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(10),
      },
      {
        id: "audit-4",
        action: "relationship.requested",
        description:
          "Wendy Cole requested a relationship between West Coast Brokerage and Acme Foods",
        actorUserId: USER_IDS.wendy,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(25),
      },
      {
        id: "audit-5",
        action: "access_request.created",
        description: "Sarah Johnson requested access to Acme Foods",
        actorUserId: USER_IDS.sarahJohnson,
        organizationId: ORG_IDS.acme,
        createdAt: minutesAgo(40),
      },
    ],
  };
}

/** Accounts offered as one-click sign-ins on the demo login screen. */
export const DEMO_ACCOUNTS = [
  {
    email: "constance@caboodle.com",
    label: "Platform Admin",
    hint: "Administers the Caboodle platform itself",
  },
  {
    email: "alice@acmefoods.com",
    label: "Brand Admin",
    hint: "Organization Admin at Acme Foods",
  },
  {
    email: "bob@acmefoods.com",
    label: "Brand Member",
    hint: "Limited permissions inside Acme Foods",
  },
  {
    email: "john@abc-brokerage.com",
    label: "Brokerage Admin",
    hint: "Organization Admin at ABC Brokerage",
  },
  {
    email: "mike@abc-brokerage.com",
    label: "Broker",
    hint: "Broker inside ABC Brokerage",
  },
  {
    email: "consultant@agency.com",
    label: "External Collaborator",
    hint: "External domain, member of two organizations",
  },
] as const;
