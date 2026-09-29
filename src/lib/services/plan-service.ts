import { createId, delay, demoStore } from "@/lib/mock/store";
import { normalizeModuleIds } from "@/lib/permissions/modules";
import { nameOf, recordEvent } from "@/lib/services/audit-service";
import type { OrganizationType, Plan } from "@/types";

/**
 * Plans are named bundles of catalog modules for one audience.
 *
 * Standard and Professional exist once per audience and are what onboarding
 * offers; they can be edited but not deleted. Anything else is a custom plan,
 * optionally private to a single organization.
 */

export class PlanError extends Error {}

export type PlanInput = {
  name: string;
  audience: OrganizationType;
  description: string;
  moduleIds: string[];
  /** null or undefined prices the plan as the sum of its modules. */
  fixedMonthlyPrice?: number | null;
  organizationId?: string | null;
};

export type PlanChanges = Partial<
  Pick<PlanInput, "name" | "description" | "moduleIds" | "fixedMonthlyPrice">
>;

function validateFixedPrice(
  price: number | null | undefined,
): number | undefined {
  if (price === null || price === undefined) return undefined;
  if (!Number.isFinite(price) || price < 0) {
    throw new PlanError(
      "Enter a bundle price of 0 or more, or price by module.",
    );
  }
  return Math.round(price * 100) / 100;
}

export async function createPlan(
  input: PlanInput,
  actorUserId: string,
): Promise<Plan> {
  await delay();

  const name = input.name.trim();
  if (!name) throw new PlanError("Give the plan a name.");

  const state = demoStore.getState();
  const moduleIds = normalizeModuleIds(state, input.audience, input.moduleIds);
  if (moduleIds.length === 0) {
    throw new PlanError("Pick at least one module for the plan.");
  }

  if (input.organizationId) {
    const organization = state.organizations.find(
      (org) => org.id === input.organizationId,
    );
    if (!organization) throw new PlanError("Organization not found.");
    if (organization.type !== input.audience) {
      throw new PlanError(
        `${organization.name} is a ${organization.type}, so it needs a ${organization.type} plan.`,
      );
    }
  }

  const fixedMonthlyPrice = validateFixedPrice(input.fixedMonthlyPrice);

  return demoStore.mutate((draft) => {
    const plan: Plan = {
      id: createId("plan"),
      name,
      audience: input.audience,
      tier: "custom",
      description: input.description.trim(),
      moduleIds,
      fixedMonthlyPrice,
      organizationId: input.organizationId ?? undefined,
      createdByUserId: actorUserId,
      createdAt: new Date().toISOString(),
    };

    draft.plans = [...draft.plans, plan];

    recordEvent(draft, {
      action: "plan.created",
      description: `${nameOf(draft, actorUserId)} created the custom plan ${plan.name}`,
      actorUserId,
      organizationId: plan.organizationId,
    });

    return plan;
  });
}

export async function updatePlan(
  planId: string,
  changes: PlanChanges,
  actorUserId: string,
): Promise<Plan> {
  await delay();

  const state = demoStore.getState();
  const existing = state.plans.find((plan) => plan.id === planId);
  if (!existing) throw new PlanError("Plan not found.");

  const next: Plan = { ...existing };

  if (changes.name !== undefined) {
    const name = changes.name.trim();
    if (!name) throw new PlanError("Give the plan a name.");
    next.name = name;
  }
  if (changes.description !== undefined) {
    next.description = changes.description.trim();
  }
  if (changes.moduleIds !== undefined) {
    const moduleIds = normalizeModuleIds(
      state,
      existing.audience,
      changes.moduleIds,
    );
    if (moduleIds.length === 0) {
      throw new PlanError("A plan needs at least one module.");
    }
    next.moduleIds = moduleIds;
  }
  if (changes.fixedMonthlyPrice !== undefined) {
    next.fixedMonthlyPrice = validateFixedPrice(changes.fixedMonthlyPrice);
  }

  return demoStore.mutate((draft) => {
    draft.plans = draft.plans.map((plan) => (plan.id === planId ? next : plan));

    recordEvent(draft, {
      action: "plan.updated",
      description: `${nameOf(draft, actorUserId)} updated the ${planLabel(
        draft.organizations,
        next,
      )} plan`,
      actorUserId,
      organizationId: next.organizationId,
    });

    return next;
  });
}

export async function deletePlan(
  planId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  const state = demoStore.getState();
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) throw new PlanError("Plan not found.");

  if (plan.tier !== "custom") {
    throw new PlanError(
      "Standard and Professional are offered during onboarding, so they can be edited but not deleted.",
    );
  }

  const inUse = state.subscriptions.filter(
    (subscription) =>
      subscription.planId === planId && subscription.status !== "canceled",
  );
  if (inUse.length > 0) {
    const names = inUse
      .map(
        (subscription) =>
          state.organizations.find(
            (org) => org.id === subscription.organizationId,
          )?.name,
      )
      .filter(Boolean)
      .join(", ");
    throw new PlanError(
      `${names} ${inUse.length === 1 ? "is" : "are"} on this plan. Move ${
        inUse.length === 1 ? "it" : "them"
      } to another plan first.`,
    );
  }

  demoStore.mutate((draft) => {
    draft.plans = draft.plans.filter((item) => item.id !== planId);
    recordEvent(draft, {
      action: "plan.deleted",
      description: `${nameOf(draft, actorUserId)} deleted the custom plan ${plan.name}`,
      actorUserId,
      organizationId: plan.organizationId,
    });
  });
}

/** "Brand Standard", "Brokerage Professional", or a custom plan's own name. */
export function planLabel(
  organizations: { id: string; name: string }[],
  plan: Plan,
): string {
  if (plan.tier === "custom") {
    const owner = organizations.find((org) => org.id === plan.organizationId);
    return owner && !plan.name.includes(owner.name)
      ? `${plan.name} (${owner.name})`
      : plan.name;
  }
  return `${plan.audience === "brand" ? "Brand" : "Brokerage"} ${plan.name}`;
}
