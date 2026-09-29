"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationTypeBadge } from "@/components/common/badges";
import { BillingCycleToggle } from "@/components/features/billing-cycle-toggle";
import { ModulePicker } from "@/components/features/module-picker";
import { OnboardingSteps } from "@/components/features/onboarding-steps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { useVerifiedUser } from "@/lib/demo/use-verified-user";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  ANNUAL_MONTHS_CHARGED,
  buildModuleTree,
  getModuleTree,
  getPlanListPrice,
  getPlanMonthlyPrice,
  getTierPlan,
  normalizeModuleIds,
  priceForCycle,
  sumModulePrices,
} from "@/lib/permissions/modules";
import {
  SubscriptionError,
  choosePlan,
} from "@/lib/services/subscription-service";
import { cn } from "@/lib/utils";
import type {
  AppState,
  BillingCycle,
  Organization,
  Plan,
  Subscription,
  User,
} from "@/types";

type Choice = "standard" | "professional" | "custom";

/**
 * Step 6 of the onboarding journey: choose what the organization subscribes
 * to. Brands and Brokerages see different plans, because they have different
 * module catalogs.
 *
 * Also reached from Billing to change an existing plan; then only the plan
 * and payment steps apply.
 */
export default function PlanPage() {
  const user = useVerifiedUser();
  const { organization, can, subscription, pendingSubscription } = useSession();

  if (!user) return null;

  if (!organization) {
    return (
      <Blocked
        title="Create your organization first"
        description="A plan belongs to an organization, not to a person."
        href="/onboarding/create-organization"
        action="Create an organization"
      />
    );
  }

  if (!can("billing.manage")) {
    return (
      <Blocked
        title="Only an Organization Admin can choose the plan"
        description={`Your role in ${organization.name} doesn't include billing.`}
        href="/dashboard"
        action="Back to dashboard"
      />
    );
  }

  return (
    <PlanChooser
      // Remount when the organization or the pending checkout changes, so the
      // initial selection is always derived from the latest state.
      key={`${organization.id}:${pendingSubscription?.id ?? "none"}`}
      user={user}
      organization={organization}
      current={subscription}
      pending={pendingSubscription}
    />
  );
}

function initialChoice(state: AppState, planId: string | undefined): Choice {
  const plan = state.plans.find((item) => item.id === planId);
  return plan?.tier ?? "standard";
}

function PlanChooser({
  user,
  organization,
  current,
  pending,
}: {
  user: User;
  organization: Organization;
  current: Subscription | undefined;
  pending: Subscription | undefined;
}) {
  const router = useRouter();
  const state = useAppState();

  const standard = getTierPlan(state, organization.type, "standard");
  const professional = getTierPlan(state, organization.type, "professional");
  const tree = getModuleTree(state, organization.type);
  const isChange = Boolean(current);

  // Start from what was picked last time: the unpaid checkout if there is
  // one, otherwise the plan the organization is on today.
  const startingPlan = state.plans.find(
    (plan) => plan.id === (pending ?? current)?.planId,
  );

  const [choice, setChoice] = useState<Choice>(() =>
    initialChoice(state, startingPlan?.id),
  );
  const [cycle, setCycle] = useState<BillingCycle>(
    (pending ?? current)?.billingCycle ?? "monthly",
  );
  const [customIds, setCustomIds] = useState<string[]>(() =>
    startingPlan?.tier === "custom"
      ? startingPlan.moduleIds
      : (standard?.moduleIds ?? []),
  );
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCustom = normalizeModuleIds(
    state,
    organization.type,
    customIds,
  );
  const customMonthly = sumModulePrices(state, normalizedCustom);

  const selectedPlan =
    choice === "standard"
      ? standard
      : choice === "professional"
        ? professional
        : undefined;
  const selectedMonthly = selectedPlan
    ? getPlanMonthlyPrice(state, selectedPlan)
    : customMonthly;

  const currentPlan = state.plans.find((plan) => plan.id === current?.planId);
  const unchanged =
    Boolean(currentPlan) &&
    current?.billingCycle === cycle &&
    (selectedPlan
      ? selectedPlan.id === currentPlan?.id
      : currentPlan?.tier === "custom" &&
        sameIds(currentPlan.moduleIds, normalizedCustom));

  async function submit() {
    setError(null);
    setPendingSubmit(true);
    try {
      await choosePlan({
        organizationId: organization.id,
        actorUserId: user.id,
        billingCycle: cycle,
        planId: selectedPlan?.id,
        customModuleIds: selectedPlan ? undefined : normalizedCustom,
      });
      router.push("/onboarding/payment");
    } catch (caught) {
      setError(
        caught instanceof SubscriptionError
          ? caught.message
          : "Could not save the plan.",
      );
      setPendingSubmit(false);
    }
  }

  return (
    <div className="space-y-6">
      <OnboardingSteps
        current="plan"
        steps={isChange ? ["plan", "payment"] : undefined}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {isChange ? "Change your plan" : "Choose a plan"} for{" "}
              {organization.name}
            </h1>
            <OrganizationTypeBadge type={organization.type} />
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {organization.type === "brand" ? "Brand" : "Brokerage"} plans
            include {organization.type === "brand" ? "brand" : "brokerage"}{" "}
            modules only. Your plan decides which modules the organization has;
            you then decide which members can use each one.
          </p>
        </div>
        <BillingCycleToggle value={cycle} onChange={setCycle} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {standard ? (
          <PlanOption
            state={state}
            plan={standard}
            cycle={cycle}
            selected={choice === "standard"}
            current={currentPlan?.id === standard.id}
            onSelect={() => setChoice("standard")}
          />
        ) : null}
        {professional ? (
          <PlanOption
            state={state}
            plan={professional}
            cycle={cycle}
            selected={choice === "professional"}
            current={currentPlan?.id === professional.id}
            highlight
            onSelect={() => setChoice("professional")}
          />
        ) : null}
        <CustomOption
          selected={choice === "custom"}
          current={currentPlan?.tier === "custom"}
          monthly={customMonthly}
          moduleCount={normalizedCustom.length}
          cycle={cycle}
          onSelect={() => setChoice("custom")}
        />
      </div>

      {choice === "custom" ? (
        <Card>
          <CardHeader>
            <CardTitle>Build your custom plan</CardTitle>
            <CardDescription>
              Pay only for the modules you pick. Each module and sub-module has
              its own monthly price.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              {standard ? (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setCustomIds(standard.moduleIds)}
                >
                  Start from Standard
                </Button>
              ) : null}
              {professional ? (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setCustomIds(professional.moduleIds)}
                >
                  Start from Professional
                </Button>
              ) : null}
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  setCustomIds(
                    tree.flatMap((node) => [
                      node.module.id,
                      ...node.children.map((child) => child.id),
                    ]),
                  )
                }
              >
                Everything
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setCustomIds([])}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ModulePicker
              tree={tree}
              value={customIds}
              onChange={setCustomIds}
            />
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {selectedPlan ? selectedPlan.name : "Custom plan"} ·{" "}
                {pluralize(
                  selectedPlan
                    ? normalizeModuleIds(
                        state,
                        organization.type,
                        selectedPlan.moduleIds,
                      ).length
                    : normalizedCustom.length,
                  "module",
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(priceForCycle(selectedMonthly, cycle))}{" "}
                {cycle === "annual" ? "per year" : "per month"}
                {unchanged ? " · this is your current plan" : ""}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <LinkButton
                variant="ghost"
                href={isChange ? "/organization/billing" : "/dashboard"}
              >
                {isChange ? "Cancel" : "Decide later"}
              </LinkButton>
              <Button
                onClick={() => void submit()}
                disabled={
                  pendingSubmit ||
                  unchanged ||
                  (choice === "custom" && normalizedCustom.length === 0)
                }
              >
                {pendingSubmit ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Continue to payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function PriceTag({
  monthly,
  cycle,
}: {
  monthly: number;
  cycle: BillingCycle;
}) {
  return (
    <div>
      <p className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(priceForCycle(monthly, cycle))}
        </span>
        <span className="text-sm text-muted-foreground">
          /{cycle === "annual" ? "year" : "month"}
        </span>
      </p>
      <p className="h-4 text-xs text-muted-foreground">
        {cycle === "annual"
          ? `${formatCurrency(Math.round((monthly * ANNUAL_MONTHS_CHARGED) / 12))}/month, billed yearly`
          : ""}
      </p>
    </div>
  );
}

function OptionShell({
  selected,
  highlight,
  onSelect,
  children,
}: {
  selected: boolean;
  highlight?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-full flex-col gap-4 rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent/50",
        highlight && "border-primary/40",
        selected && "border-primary bg-accent/40 ring-3 ring-primary/15",
      )}
    >
      {children}
    </button>
  );
}

function PlanOption({
  state,
  plan,
  cycle,
  selected,
  current,
  highlight,
  onSelect,
}: {
  state: AppState;
  plan: Plan;
  cycle: BillingCycle;
  selected: boolean;
  current: boolean;
  highlight?: boolean;
  onSelect: () => void;
}) {
  const monthly = getPlanMonthlyPrice(state, plan);
  const listPrice = getPlanListPrice(state, plan);
  const ids = normalizeModuleIds(state, plan.audience, plan.moduleIds);
  const tree = buildModuleTree(
    state.modules.filter((entry) => ids.includes(entry.id)),
  );
  const shown = tree.slice(0, 7);

  return (
    <OptionShell selected={selected} highlight={highlight} onSelect={onSelect}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{plan.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {highlight ? (
            <Badge>
              <Sparkles className="size-3" />
              Popular
            </Badge>
          ) : null}
          {current ? <Badge variant="secondary">Current</Badge> : null}
        </div>
      </div>

      <PriceTag monthly={monthly} cycle={cycle} />

      {listPrice > monthly ? (
        <p className="-mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          Saves {formatCurrency(listPrice - monthly)}/month against buying these
          modules one by one
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {shown.map(({ module: entry, children }) => (
          <li key={entry.id} className="flex items-start gap-2 text-xs">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {entry.name}
              {children.length > 0 ? (
                <span className="text-muted-foreground">
                  {" "}
                  + {pluralize(children.length, "sub-module")}
                </span>
              ) : null}
            </span>
          </li>
        ))}
        {tree.length > shown.length ? (
          <li className="pl-5.5 text-xs text-muted-foreground">
            + {tree.length - shown.length} more modules
          </li>
        ) : null}
      </ul>
    </OptionShell>
  );
}

function CustomOption({
  selected,
  current,
  monthly,
  moduleCount,
  cycle,
  onSelect,
}: {
  selected: boolean;
  current: boolean;
  monthly: number;
  moduleCount: number;
  cycle: BillingCycle;
  onSelect: () => void;
}) {
  return (
    <OptionShell selected={selected} onSelect={onSelect}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Custom</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Build your own plan from individual modules and sub-modules, priced
            one by one.
          </p>
        </div>
        {current ? <Badge variant="secondary">Current</Badge> : null}
      </div>

      <PriceTag monthly={monthly} cycle={cycle} />

      <p className="text-xs text-muted-foreground">
        {selected
          ? `${pluralize(moduleCount, "module")} selected below.`
          : "Pick exactly the modules you need."}
      </p>
    </OptionShell>
  );
}

function Blocked({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkButton className="w-full" href={href}>
            {action}
          </LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}
