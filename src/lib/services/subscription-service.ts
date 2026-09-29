import { createId, delay, demoStore } from "@/lib/mock/store";
import {
  getPlanMonthlyPrice,
  normalizeModuleIds,
  priceForCycle,
} from "@/lib/permissions/modules";
import { nameOf, orgNameOf, recordEvent } from "@/lib/services/audit-service";
import { planLabel } from "@/lib/services/plan-service";
import type {
  AppState,
  BillingCycle,
  Invoice,
  PaymentMethod,
  Plan,
  Subscription,
} from "@/types";

/**
 * Subscriptions tie an organization to a plan.
 *
 * Self-service: onboarding picks a plan (the subscription is `incomplete`),
 * then payment activates it. Platform Admins can also put an organization on
 * any plan directly, with no payment step.
 *
 * No money moves anywhere: payment is simulated end to end.
 */

export class SubscriptionError extends Error {}

export type CardDetails = {
  number: string;
  holderName: string;
  /** MM/YY */
  expiry: string;
  cvc: string;
};

/** Ending a card number in 0002 simulates a decline, like Stripe's test cards. */
export const DECLINED_CARD_SUFFIX = "0002";

function periodEnd(from: Date, cycle: BillingCycle): string {
  const end = new Date(from);
  if (cycle === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

function requirePlanFor(
  state: AppState,
  organizationId: string,
  planId: string,
): Plan {
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  if (!organization) throw new SubscriptionError("Organization not found.");

  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) throw new SubscriptionError("Plan not found.");
  if (plan.audience !== organization.type) {
    throw new SubscriptionError(
      `${organization.name} is a ${organization.type}, so it needs a ${organization.type} plan.`,
    );
  }
  if (plan.organizationId && plan.organizationId !== organizationId) {
    throw new SubscriptionError(
      "That custom plan belongs to another organization.",
    );
  }
  return plan;
}

/**
 * Onboarding's plan step. Either picks an existing plan or builds a custom one
 * from the selected modules, and leaves an `incomplete` subscription waiting
 * for payment.
 */
export async function choosePlan(input: {
  organizationId: string;
  actorUserId: string;
  billingCycle: BillingCycle;
  planId?: string;
  customModuleIds?: string[];
}): Promise<Subscription> {
  await delay();

  const state = demoStore.getState();
  const organization = state.organizations.find(
    (org) => org.id === input.organizationId,
  );
  if (!organization) throw new SubscriptionError("Organization not found.");

  let customModuleIds: string[] | undefined;
  if (input.planId) {
    requirePlanFor(state, input.organizationId, input.planId);
  } else {
    customModuleIds = normalizeModuleIds(
      state,
      organization.type,
      input.customModuleIds ?? [],
    );
    if (customModuleIds.length === 0) {
      throw new SubscriptionError(
        "Pick at least one module for your custom plan.",
      );
    }
  }

  return demoStore.mutate((draft) => {
    let planId = input.planId;

    if (customModuleIds) {
      // Going back and changing the selection edits the same draft plan
      // rather than leaving a trail of abandoned custom plans behind.
      const paidFor = new Set(
        draft.subscriptions
          .filter((subscription) => subscription.status === "active")
          .map((subscription) => subscription.planId),
      );
      const reusable = draft.plans.find(
        (plan) =>
          plan.tier === "custom" &&
          plan.organizationId === organization.id &&
          plan.createdByUserId === input.actorUserId &&
          !paidFor.has(plan.id),
      );

      if (reusable) {
        planId = reusable.id;
        draft.plans = draft.plans.map((plan) =>
          plan.id === reusable.id
            ? { ...plan, moduleIds: customModuleIds }
            : plan,
        );
      } else {
        const plan: Plan = {
          id: createId("plan"),
          name: `${organization.name} Custom`,
          audience: organization.type,
          tier: "custom",
          description: `Built module by module by ${nameOf(
            draft,
            input.actorUserId,
          )} during onboarding.`,
          moduleIds: customModuleIds,
          organizationId: organization.id,
          createdByUserId: input.actorUserId,
          createdAt: new Date().toISOString(),
        };
        planId = plan.id;
        draft.plans = [...draft.plans, plan];
      }
    }

    const subscription: Subscription = {
      id: createId("sub"),
      organizationId: organization.id,
      planId: planId!,
      status: "incomplete",
      billingCycle: input.billingCycle,
      source: "self_service",
      createdByUserId: input.actorUserId,
      createdAt: new Date().toISOString(),
    };

    draft.subscriptions = [
      ...draft.subscriptions.filter(
        (item) =>
          !(
            item.organizationId === organization.id &&
            item.status === "incomplete"
          ),
      ),
      subscription,
    ];

    const plan = draft.plans.find((item) => item.id === subscription.planId)!;
    recordEvent(draft, {
      action: "subscription.plan_selected",
      description: `${nameOf(draft, input.actorUserId)} chose the ${planLabel(
        draft.organizations,
        plan,
      )} plan for ${organization.name}`,
      actorUserId: input.actorUserId,
      organizationId: organization.id,
    });

    return subscription;
  });
}

function detectCardBrand(digits: string): string {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (digits.startsWith("6")) return "Discover";
  return "Card";
}

function validateCard(card: CardDetails): PaymentMethod {
  const digits = card.number.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    throw new SubscriptionError("Enter a valid card number.");
  }

  const holderName = card.holderName.trim();
  if (!holderName) throw new SubscriptionError("Enter the name on the card.");

  const expiry = card.expiry.match(/^\s*(\d{1,2})\s*\/\s*(\d{2})\s*$/);
  const expMonth = expiry ? Number(expiry[1]) : 0;
  const expYear = expiry ? 2000 + Number(expiry[2]) : 0;
  if (!expiry || expMonth < 1 || expMonth > 12) {
    throw new SubscriptionError("Enter the expiry date as MM/YY.");
  }
  // A card is valid through the last day of its expiry month.
  if (new Date(expYear, expMonth, 1).getTime() <= Date.now()) {
    throw new SubscriptionError("This card has expired.");
  }

  if (!/^\d{3,4}$/.test(card.cvc.trim())) {
    throw new SubscriptionError("Enter the 3 or 4 digit security code.");
  }

  if (digits.endsWith(DECLINED_CARD_SUFFIX)) {
    throw new SubscriptionError(
      "Your card was declined. Try another card, for example 4242 4242 4242 4242.",
    );
  }

  return {
    brand: detectCardBrand(digits),
    last4: digits.slice(-4),
    expMonth,
    expYear,
    holderName,
  };
}

function nextInvoiceNumber(invoices: Invoice[]): number {
  return (
    invoices.reduce((max, invoice) => {
      const value = Number(invoice.number.replace(/\D/g, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 1000) + 1
  );
}

/** Makes the new subscription the organization's only active one. */
function cancelOtherActive(
  draft: AppState,
  organizationId: string,
  keepSubscriptionId: string,
): void {
  const now = new Date().toISOString();
  draft.subscriptions = draft.subscriptions.map((item) =>
    item.organizationId === organizationId &&
    item.status === "active" &&
    item.id !== keepSubscriptionId
      ? { ...item, status: "canceled" as const, canceledAt: now }
      : item,
  );
}

/** The simulated payment. Activates the subscription and issues an invoice. */
export async function completePayment(input: {
  subscriptionId: string;
  actorUserId: string;
  card: CardDetails;
}): Promise<{ subscription: Subscription; invoice: Invoice }> {
  await delay(1400);

  const paymentMethod = validateCard(input.card);

  return demoStore.mutate((draft) => {
    const pending = draft.subscriptions.find(
      (item) => item.id === input.subscriptionId,
    );
    if (!pending || pending.status !== "incomplete") {
      throw new SubscriptionError(
        "This checkout is no longer open. Choose a plan again.",
      );
    }
    const plan = draft.plans.find((item) => item.id === pending.planId);
    if (!plan) throw new SubscriptionError("The chosen plan no longer exists.");

    const now = new Date();
    const subscription: Subscription = {
      ...pending,
      status: "active",
      paymentMethod,
      startedAt: now.toISOString(),
      currentPeriodEnd: periodEnd(now, pending.billingCycle),
    };

    cancelOtherActive(draft, pending.organizationId, pending.id);
    draft.subscriptions = draft.subscriptions.map((item) =>
      item.id === pending.id ? subscription : item,
    );

    const number = nextInvoiceNumber(draft.invoices);
    const invoice: Invoice = {
      id: createId("invoice"),
      number: `INV-${number}`,
      organizationId: pending.organizationId,
      subscriptionId: pending.id,
      description: `${plan.name} · ${pending.billingCycle}`,
      amount: priceForCycle(
        getPlanMonthlyPrice(draft, plan),
        pending.billingCycle,
      ),
      status: "paid",
      issuedAt: now.toISOString(),
    };
    draft.invoices = [invoice, ...draft.invoices];

    recordEvent(draft, {
      action: "subscription.activated",
      description: `${nameOf(draft, input.actorUserId)} paid for the ${planLabel(
        draft.organizations,
        plan,
      )} plan for ${orgNameOf(draft, pending.organizationId)}`,
      actorUserId: input.actorUserId,
      organizationId: pending.organizationId,
    });

    return { subscription, invoice };
  });
}

/**
 * Platform Admin: put an organization on any plan for its type, effective
 * immediately and with no payment step. A card already on file carries over.
 */
export async function assignPlan(input: {
  organizationId: string;
  planId: string;
  billingCycle: BillingCycle;
  actorUserId: string;
}): Promise<Subscription> {
  await delay();

  const plan = requirePlanFor(
    demoStore.getState(),
    input.organizationId,
    input.planId,
  );

  return demoStore.mutate((draft) => {
    const current = draft.subscriptions.find(
      (item) =>
        item.organizationId === input.organizationId &&
        item.status === "active",
    );

    // Same plan: only the billing cycle can have changed.
    if (current && current.planId === plan.id) {
      const updated: Subscription = {
        ...current,
        billingCycle: input.billingCycle,
      };
      draft.subscriptions = draft.subscriptions.map((item) =>
        item.id === current.id ? updated : item,
      );
      recordEvent(draft, {
        action: "subscription.updated",
        description: `${nameOf(draft, input.actorUserId)} switched ${orgNameOf(
          draft,
          input.organizationId,
        )} to ${input.billingCycle} billing`,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
      });
      return updated;
    }

    const now = new Date();
    const subscription: Subscription = {
      id: createId("sub"),
      organizationId: input.organizationId,
      planId: plan.id,
      status: "active",
      billingCycle: input.billingCycle,
      source: "platform_admin",
      paymentMethod: current?.paymentMethod,
      createdByUserId: input.actorUserId,
      createdAt: now.toISOString(),
      startedAt: now.toISOString(),
      currentPeriodEnd: periodEnd(now, input.billingCycle),
    };

    cancelOtherActive(draft, input.organizationId, subscription.id);
    draft.subscriptions = [
      ...draft.subscriptions.filter(
        (item) =>
          !(
            item.organizationId === input.organizationId &&
            item.status === "incomplete"
          ),
      ),
      subscription,
    ];

    recordEvent(draft, {
      action: "subscription.assigned",
      description: `${nameOf(draft, input.actorUserId)} put ${orgNameOf(
        draft,
        input.organizationId,
      )} on the ${planLabel(draft.organizations, plan)} plan`,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
    });

    return subscription;
  });
}

/** Ends the subscription now. The organization keeps no modules without one. */
export async function cancelSubscription(
  subscriptionId: string,
  actorUserId: string,
): Promise<void> {
  await delay();

  demoStore.mutate((draft) => {
    const subscription = draft.subscriptions.find(
      (item) => item.id === subscriptionId,
    );
    if (!subscription) throw new SubscriptionError("Subscription not found.");

    draft.subscriptions = draft.subscriptions.map((item) =>
      item.id === subscriptionId
        ? {
            ...item,
            status: "canceled" as const,
            canceledAt: new Date().toISOString(),
          }
        : item,
    );

    recordEvent(draft, {
      action: "subscription.canceled",
      description: `${nameOf(draft, actorUserId)} canceled the subscription for ${orgNameOf(
        draft,
        subscription.organizationId,
      )}`,
      actorUserId,
      organizationId: subscription.organizationId,
    });
  });
}
