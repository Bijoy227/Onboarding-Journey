import { createId, delay, demoStore } from "@/lib/mock/store";
import { adminRoleId } from "@/lib/permissions/permissions";
import { nameOf, recordEvent } from "@/lib/services/audit-service";
import type {
  MembershipPolicy,
  Organization,
  OrganizationDomain,
  OrganizationType,
} from "@/types";

export class OrganizationError extends Error {}

/** Extracts the email domain, e.g. alice@acmefoods.com -> acmefoods.com */
export function domainFromEmail(email: string): string {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

export type DiscoveryResult =
  | { kind: "found"; organization: Organization; domain: OrganizationDomain }
  | { kind: "none"; domain: string }
  | { kind: "invalid" };

/**
 * Organization discovery.
 *
 * Given a work email, look for an organization that has already claimed the
 * email's domain. This is what removes the need for Constance to create every
 * customer organization by hand.
 */
export async function discoverOrganizationByEmail(
  email: string,
): Promise<DiscoveryResult> {
  await delay();
  return discoverOrganizationByEmailSync(email);
}

export function discoverOrganizationByEmailSync(email: string): DiscoveryResult {
  const domain = domainFromEmail(email);
  if (!domain) return { kind: "invalid" };

  const state = demoStore.getState();
  const match = state.domains.find(
    (candidate) => candidate.domain.toLowerCase() === domain,
  );
  if (!match) return { kind: "none", domain };

  const organization = state.organizations.find(
    (org) => org.id === match.organizationId,
  );
  if (!organization) return { kind: "none", domain };

  return { kind: "found", organization, domain: match };
}

/** Is this domain already claimed by an organization other than `exceptOrgId`? */
export function findDomainOwner(
  domain: string,
  exceptOrganizationId?: string,
): Organization | undefined {
  const normalized = domain.trim().toLowerCase();
  const state = demoStore.getState();
  const claimed = state.domains.find(
    (candidate) =>
      candidate.domain.toLowerCase() === normalized &&
      candidate.organizationId !== exceptOrganizationId,
  );
  if (!claimed) return undefined;
  return state.organizations.find((org) => org.id === claimed.organizationId);
}

/**
 * Creates an organization. Two paths lead here:
 *
 * - Self-service: a person creates the organization for their own work email
 *   domain and becomes its first admin (Brand Admin or Brokerage Admin). No
 *   "Brand Owner" or "Broker user" is asked for, because the organization is
 *   not represented by a user.
 * - The Platform Admin (flow F1): the organization starts with no members, and
 *   the first admin is invited separately.
 *
 * Either way it starts with no modules until the Platform Admin enables some
 * (decision D4).
 */
export async function createOrganization(input: {
  name: string;
  type: OrganizationType;
  /** Primary email domain, added unverified. Required for self-service. */
  domain?: string;
  description?: string;
  membershipPolicy?: MembershipPolicy;
  actorUserId: string;
  /** Self-service: the person creating it becomes its first admin. */
  creatorJoinsAsAdmin?: boolean;
}): Promise<Organization> {
  await delay();

  const name = input.name.trim();
  const domain = input.domain?.trim().toLowerCase() ?? "";

  if (!name) throw new OrganizationError("Give the organization a name.");
  if (input.creatorJoinsAsAdmin && !domain) {
    throw new OrganizationError("A work email domain is required.");
  }
  if (domain && !domain.includes(".")) {
    throw new OrganizationError("Enter a valid domain, for example acmefoods.com.");
  }

  const owner = domain ? findDomainOwner(domain) : undefined;
  if (owner) {
    throw new OrganizationError(
      `${domain} is already associated with ${owner.name}. You cannot claim this domain until ownership is resolved.`,
    );
  }

  return demoStore.mutate((draft) => {
    const organization: Organization = {
      id: createId("org"),
      name,
      type: input.type,
      status: "active",
      membershipPolicy: input.membershipPolicy ?? "verified_domain",
      description: input.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
    };

    draft.organizations = [...draft.organizations, organization];

    if (domain) {
      const organizationDomain: OrganizationDomain = {
        id: createId("dom"),
        organizationId: organization.id,
        domain,
        verified: false,
        isPrimary: true,
        verificationToken: `caboodle-verification=${domain.split(".")[0]}-${Math.floor(
          100000 + Math.random() * 899999,
        )}`,
      };
      draft.domains = [...draft.domains, organizationDomain];
    }

    if (input.creatorJoinsAsAdmin) {
      draft.memberships = [
        ...draft.memberships,
        {
          id: createId("mem"),
          userId: input.actorUserId,
          organizationId: organization.id,
          roleId: adminRoleId(organization.type),
          status: "active",
          source: "created",
          createdAt: new Date().toISOString(),
        },
      ];
    }

    recordEvent(draft, {
      action: "organization.created",
      description: `${nameOf(draft, input.actorUserId)} created the ${
        organization.type === "brand" ? "Brand" : "Brokerage"
      } ${organization.name}`,
      actorUserId: input.actorUserId,
      organizationId: organization.id,
    });

    return organization;
  });
}

export async function updateOrganization(
  organizationId: string,
  changes: Partial<Pick<Organization, "name" | "description" | "membershipPolicy">>,
  actorUserId: string,
): Promise<Organization> {
  await delay();

  return demoStore.mutate((draft) => {
    let updated: Organization | undefined;
    draft.organizations = draft.organizations.map((org) => {
      if (org.id !== organizationId) return org;
      updated = { ...org, ...changes };
      return updated;
    });

    if (!updated) throw new OrganizationError("Organization not found.");

    recordEvent(draft, {
      action: "organization.updated",
      description: `${nameOf(draft, actorUserId)} updated ${updated.name} settings`,
      actorUserId,
      organizationId,
    });

    return updated;
  });
}

/** Platform Admin action: suspend or restore a customer organization. */
export async function setOrganizationStatus(
  organizationId: string,
  status: Organization["status"],
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    draft.organizations = draft.organizations.map((org) =>
      org.id === organizationId ? { ...org, status } : org,
    );
    const org = draft.organizations.find((item) => item.id === organizationId);
    recordEvent(draft, {
      action: status === "suspended" ? "organization.suspended" : "organization.restored",
      description: `${nameOf(draft, actorUserId)} ${
        status === "suspended" ? "suspended" : "restored"
      } ${org?.name ?? "an organization"}`,
      actorUserId,
      organizationId,
    });
  });
}

/** Organizations the user holds an active membership in. */
export function getOrganizationsForUser(userId: string): Organization[] {
  const state = demoStore.getState();
  const organizationIds = state.memberships
    .filter(
      (membership) =>
        membership.userId === userId && membership.status === "active",
    )
    .map((membership) => membership.organizationId);

  return state.organizations.filter((org) => organizationIds.includes(org.id));
}

export function getOrganization(organizationId: string): Organization | undefined {
  return demoStore
    .getState()
    .organizations.find((org) => org.id === organizationId);
}

export function getOrganizations(): Organization[] {
  return demoStore.getState().organizations;
}
