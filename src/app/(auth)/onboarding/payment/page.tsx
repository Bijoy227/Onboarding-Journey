"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { OnboardingSteps } from "@/components/features/onboarding-steps";
import { PlanModuleList } from "@/components/features/plan-module-list";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { useVerifiedUser } from "@/lib/demo/use-verified-user";
import { formatCurrency, formatDate, pluralize } from "@/lib/format";
import {
  getPlanListPrice,
  getPlanMonthlyPrice,
  normalizeModuleIds,
  priceForCycle,
} from "@/lib/permissions/modules";
import {
  DECLINED_CARD_SUFFIX,
  SubscriptionError,
  completePayment,
} from "@/lib/services/subscription-service";
import type {
  BillingCycle,
  Invoice,
  Organization,
  Subscription,
  User,
} from "@/types";

/**
 * Step 7 of the onboarding journey: pay for the plan.
 *
 * A dummy checkout. The card is checked for shape only, nothing is charged,
 * and a card number ending in 0002 is declined so the failure path can be
 * shown too.
 */
export default function PaymentPage() {
  const user = useVerifiedUser();
  const { organization, can } = useSession();

  if (!user) return null;

  if (!organization || !can("billing.manage")) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Nothing to pay for here</CardTitle>
            <CardDescription>
              Only an Organization Admin can pay for an organization&apos;s
              plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton className="w-full" href="/dashboard">
              Back to dashboard
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Keyed by organization only: the success screen must survive the pending
  // checkout disappearing once it has been paid.
  return (
    <Checkout key={organization.id} user={user} organization={organization} />
  );
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

function renewsOn(cycle: BillingCycle): string {
  const date = new Date();
  if (cycle === "annual") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return formatDate(date.toISOString());
}

function Checkout({
  user,
  organization,
}: {
  user: User;
  organization: Organization;
}) {
  const router = useRouter();
  const state = useAppState();
  const {
    pendingSubscription,
    subscription: current,
    plan: currentPlan,
  } = useSession();

  const [number, setNumber] = useState("");
  const [holderName, setHolderName] = useState(user.name);
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{
    subscription: Subscription;
    invoice: Invoice;
  } | null>(null);
  // Captured on arrival: once payment succeeds the new plan becomes current.
  const [changingPlan] = useState(() => Boolean(current));

  if (paid) {
    return (
      <PaymentSuccess
        organization={organization}
        subscription={paid.subscription}
        invoice={paid.invoice}
        firstPlan={!changingPlan}
      />
    );
  }

  const checkout = pendingSubscription;
  const plan = state.plans.find((item) => item.id === checkout?.planId);

  if (!checkout || !plan) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <OnboardingSteps current="payment" />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Choose a plan first</CardTitle>
            <CardDescription>
              There is no plan waiting for payment for {organization.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton className="w-full" href="/onboarding/plan">
              Choose a plan
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthly = getPlanMonthlyPrice(state, plan);
  const listPrice = getPlanListPrice(state, plan);
  const total = priceForCycle(monthly, checkout.billingCycle);
  const listTotal = priceForCycle(listPrice, checkout.billingCycle);
  const moduleIds = normalizeModuleIds(state, plan.audience, plan.moduleIds);
  const modules = state.modules.filter((entry) => moduleIds.includes(entry.id));

  async function pay() {
    if (!checkout) return;
    setError(null);
    setProcessing(true);
    try {
      const result = await completePayment({
        subscriptionId: checkout.id,
        actorUserId: user.id,
        card: { number, holderName, expiry, cvc },
      });
      setPaid(result);
      toast.success("Payment successful", {
        description: `${organization.name} is on the ${plan!.name} plan.`,
      });
    } catch (caught) {
      setError(
        caught instanceof SubscriptionError
          ? caught.message
          : "The payment could not be completed.",
      );
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <OnboardingSteps
        current="payment"
        steps={changingPlan ? ["plan", "payment"] : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="size-5 text-muted-foreground" />
              Payment details
            </CardTitle>
            <CardDescription>
              Demo checkout. No card is charged and nothing leaves your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void pay();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="card-number">Card number</Label>
                <Input
                  id="card-number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={number}
                  onChange={(event) =>
                    setNumber(formatCardNumber(event.target.value))
                  }
                  disabled={processing}
                  required
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-name">Name on card</Label>
                <Input
                  id="card-name"
                  autoComplete="cc-name"
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  disabled={processing}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">Expiry</Label>
                  <Input
                    id="card-expiry"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(event) =>
                      setExpiry(formatExpiry(event.target.value))
                    }
                    disabled={processing}
                    required
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-cvc">Security code</Label>
                  <Input
                    id="card-cvc"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    value={cvc}
                    onChange={(event) =>
                      setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    disabled={processing}
                    required
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Billing email</Label>
                <Input value={user.email} readOnly className="bg-muted/50" />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing payment…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Pay {formatCurrency(total)}
                  </>
                )}
              </Button>

              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <p>
                  Use{" "}
                  <span className="font-mono text-foreground">
                    4242 4242 4242 4242
                  </span>{" "}
                  with any future expiry and any CVC. A number ending in{" "}
                  <span className="font-mono text-foreground">
                    {DECLINED_CARD_SUFFIX}
                  </span>{" "}
                  is declined.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="mt-2"
                  disabled={processing}
                  onClick={() => {
                    setNumber("4242 4242 4242 4242");
                    setExpiry("12/30");
                    setCvc("123");
                    if (!holderName.trim()) setHolderName(user.name);
                    setError(null);
                  }}
                >
                  Fill test card
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>{organization.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {plan.name}
                  <Badge variant="secondary" className="capitalize">
                    {plan.tier}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {pluralize(moduleIds.length, "module")} · billed{" "}
                  {checkout.billingCycle === "annual" ? "yearly" : "monthly"}
                </p>
              </div>
              <LinkButton variant="ghost" size="sm" href="/onboarding/plan">
                Change
              </LinkButton>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
              <PlanModuleList modules={modules} dense />
            </div>

            <dl className="space-y-1.5 text-sm">
              {listTotal > total ? (
                <>
                  <SummaryRow
                    label="Modules at list price"
                    value={formatCurrency(listTotal)}
                  />
                  <SummaryRow
                    label="Plan discount"
                    value={`−${formatCurrency(listTotal - total)}`}
                    positive
                  />
                </>
              ) : null}
              {checkout.billingCycle === "annual" ? (
                <SummaryRow
                  label="Annual billing"
                  value={`${formatCurrency(monthly)} × 10 months`}
                />
              ) : null}
            </dl>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Due today</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Renews on {renewsOn(checkout.billingCycle)} for{" "}
              {formatCurrency(total)}.
              {current && currentPlan
                ? ` Replaces your current ${currentPlan.name} plan as soon as this payment goes through.`
                : ""}
            </p>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Simulated payment. No real processor is involved.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/onboarding/plan")}
        >
          Back to plans
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          positive
            ? "tabular-nums text-emerald-700 dark:text-emerald-400"
            : "tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function PaymentSuccess({
  organization,
  subscription,
  invoice,
  firstPlan,
}: {
  organization: Organization;
  subscription: Subscription;
  invoice: Invoice;
  firstPlan: boolean;
}) {
  const state = useAppState();
  const plan = state.plans.find((item) => item.id === subscription.planId);
  const moduleIds = plan
    ? normalizeModuleIds(state, plan.audience, plan.moduleIds)
    : [];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="text-xl font-semibold">
              {firstPlan ? "You're all set" : "Plan changed"}
            </p>
            <p className="text-sm text-muted-foreground">
              {organization.name} is on the {plan?.name ?? "new"} plan with{" "}
              {pluralize(moduleIds.length, "module")}.
            </p>
          </div>

          <dl className="w-full divide-y rounded-lg border text-left text-sm">
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Invoice</dt>
              <dd className="font-mono text-xs">{invoice.number}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(invoice.amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">Card</dt>
              <dd>
                {subscription.paymentMethod?.brand} ••••{" "}
                {subscription.paymentMethod?.last4}
              </dd>
            </div>
            {subscription.currentPeriodEnd ? (
              <div className="flex items-center justify-between gap-4 px-3 py-2">
                <dt className="text-muted-foreground">Renews</dt>
                <dd>{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex w-full flex-col gap-2">
            <LinkButton className="w-full" href="/dashboard">
              Go to {organization.name}
            </LinkButton>
            <div className="grid gap-2 sm:grid-cols-2">
              <LinkButton variant="outline" href="/organization/members">
                <UserPlus className="size-4" />
                Invite your team
              </LinkButton>
              <LinkButton variant="outline" href="/organization/module-access">
                <ShieldCheck className="size-4" />
                Assign module access
              </LinkButton>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        As Organization Admin you can use every module in the plan. Everyone
        else gets only the modules and actions you grant them.
      </p>
    </div>
  );
}
