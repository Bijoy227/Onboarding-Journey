import { createId, delay, demoStore } from "@/lib/mock/store";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import { findDomainOwner } from "@/lib/services/organization-service";
import type { OrganizationDomain } from "@/types";

export class DomainError extends Error {}

export async function addDomain(input: {
  organizationId: string;
  domain: string;
  actorUserId: string;
}): Promise<OrganizationDomain> {
  await delay();

  const domain = input.domain.trim().toLowerCase();
  if (!domain || !domain.includes(".")) {
    throw new DomainError("Enter a valid domain, for example acmefoods.com.");
  }

  const owner = findDomainOwner(domain, input.organizationId);
  if (owner) {
    throw new DomainError(
      `${domain} is already associated with ${owner.name}. You cannot claim this domain until ownership is resolved.`,
    );
  }

  const alreadyAdded = demoStore
    .getState()
    .domains.some(
      (candidate) =>
        candidate.organizationId === input.organizationId &&
        candidate.domain.toLowerCase() === domain,
    );
  if (alreadyAdded) {
    throw new DomainError("That domain is already on this organization.");
  }

  return demoStore.mutate((draft) => {
    const hasPrimary = draft.domains.some(
      (candidate) =>
        candidate.organizationId === input.organizationId && candidate.isPrimary,
    );

    const created: OrganizationDomain = {
      id: createId("dom"),
      organizationId: input.organizationId,
      domain,
      verified: false,
      isPrimary: !hasPrimary,
      verificationToken: `caboodle-verification=${domain.split(".")[0]}-${Math.floor(
        100000 + Math.random() * 899999,
      )}`,
    };

    draft.domains = [...draft.domains, created];

    recordEvent(draft, {
      action: "domain.added",
      description: `${nameOf(draft, input.actorUserId)} added the domain ${domain} to ${orgNameOf(
        draft,
        input.organizationId,
      )}`,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
    });

    return created;
  });
}

/**
 * Simulated DNS verification.
 *
 * A real implementation would look up the TXT record. Here, confirming is
 * enough, which keeps the prototype free of external dependencies while still
 * showing both the unverified and verified states.
 */
export async function verifyDomain(
  domainId: string,
  actorUserId: string,
): Promise<void> {
  await delay(700);

  demoStore.mutate((draft) => {
    const domain = draft.domains.find((item) => item.id === domainId);
    if (!domain) throw new DomainError("Domain not found.");

    draft.domains = draft.domains.map((item) =>
      item.id === domainId
        ? { ...item, verified: true, verifiedAt: new Date().toISOString() }
        : item,
    );

    recordEvent(draft, {
      action: "domain.verified",
      description: `${orgNameOf(draft, domain.organizationId)} verified the domain ${domain.domain}`,
      actorUserId,
      organizationId: domain.organizationId,
    });
  });
}

export async function unverifyDomain(
  domainId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const domain = draft.domains.find((item) => item.id === domainId);
    if (!domain) throw new DomainError("Domain not found.");

    draft.domains = draft.domains.map((item) =>
      item.id === domainId
        ? { ...item, verified: false, verifiedAt: undefined }
        : item,
    );

    recordEvent(draft, {
      action: "domain.unverified",
      description: `${nameOf(draft, actorUserId)} reset verification for ${domain.domain}`,
      actorUserId,
      organizationId: domain.organizationId,
    });
  });
}

export async function removeDomain(
  domainId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const domain = draft.domains.find((item) => item.id === domainId);
    if (!domain) throw new DomainError("Domain not found.");
    if (domain.isPrimary) {
      throw new DomainError("The primary domain cannot be removed.");
    }

    draft.domains = draft.domains.filter((item) => item.id !== domainId);

    recordEvent(draft, {
      action: "domain.removed",
      description: `${nameOf(draft, actorUserId)} removed the domain ${domain.domain}`,
      actorUserId,
      organizationId: domain.organizationId,
    });
  });
}

export function getDomains(organizationId: string): OrganizationDomain[] {
  return demoStore
    .getState()
    .domains.filter((domain) => domain.organizationId === organizationId);
}

export function getAllDomains(): OrganizationDomain[] {
  return demoStore.getState().domains;
}
