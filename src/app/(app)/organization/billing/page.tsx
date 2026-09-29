"use client";

import { useState } from "react";
import { CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";

import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { PlanModuleList } from "@/components/features/plan-module-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, formatDate, pluralize } from "@/lib/format";
import {
  getPlanListPrice,
  getPlanMonthlyPrice,
  priceForCycle,
} from "@/lib/permissions/modules";
import { cancelSubscription } from "@/lib/services/subscription-service";
import type { Invoice } from "@/types";

export default function BillingPage() {
  return (
    <PermissionGuard permission="billing.view">
      <BillingView />
    </PermissionGuard>
  );
}

function BillingView() {
  const state = useAppState();
  const {
    organization,
    user,
    subscription,
    plan,
    pendingSubscription,
    entitledModules,
    can,
  } = useSession();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!organization || !user) return null;

  const invoices = state.invoices.filter(
    (invoice) => invoice.organizationId === organization.id,
  );
  const pendingPlan = state.plans.find(
    (item) => item.id === pendingSubscription?.planId,
  );

  const pendingAlert =
    pendingSubscription && pendingPlan && can("billing.manage") ? (
      <Alert>
        <CreditCard className="size-4" />
        <AlertTitle>Checkout not finished</AlertTitle>
        <AlertDescription>
          <p>
            You chose the {pendingPlan.name} plan but haven&apos;t paid for it
            yet{subscription ? ", so your current plan is still active" : ""}.
          </p>
          <LinkButton size="sm" className="mt-2" href="/onboarding/payment">
            Finish checkout
          </LinkButton>
        </AlertDescription>
      </Alert>
    ) : null;

  if (!subscription || !plan) {
    return (
      <>
        <PageHeader
          title="Billing"
          description={`The plan decides which modules ${organization.name} has.`}
        />
        {pendingAlert}
        <EmptyState
          icon={CreditCard}
          title="No plan yet"
          description={
            can("billing.manage")
              ? "Choose a plan to switch modules on for the organization."
              : "An Organization Admin needs to choose a plan."
          }
          action={
            can("billing.manage") && !pendingSubscription ? (
              <LinkButton href="/onboarding/plan">Choose a plan</LinkButton>
            ) : null
          }
        />
        <InvoiceTable invoices={invoices} />
      </>
    );
  }

  const monthly = getPlanMonthlyPrice(state, plan);
  const listPrice = getPlanListPrice(state, plan);
  const amount = priceForCycle(monthly, subscription.billingCycle);

  return (
    <>
      <PageHeader
        title="Billing"
        description={`The plan decides which modules ${organization.name} has. Who can use each module is set under Module access.`}
        actions={
          can("billing.manage") ? (
            <LinkButton size="sm" href="/onboarding/plan">
              Change plan
            </LinkButton>
          ) : null
        }
      />

      {pendingAlert}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {plan.name}
              <Badge variant="secondary" className="capitalize">
                {plan.tier}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                Active
              </Badge>
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold tabular-nums">
                  {formatCurrency(amount)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{subscription.billingCycle === "annual" ? "year" : "month"}
                  </span>
                </p>
                {listPrice > monthly ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Saving {formatCurrency(listPrice - monthly)}/month against
                    list prices
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Priced module by module
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Started</dt>
                <dd>
                  {subscription.startedAt
                    ? formatDate(subscription.startedAt)
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Renews</dt>
                <dd>
                  {subscription.currentPeriodEnd
                    ? formatDate(subscription.currentPeriodEnd)
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Set up</dt>
                <dd>
                  {subscription.source === "platform_admin"
                    ? "By Caboodle"
                    : "Self-service"}
                </dd>
              </dl>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Included · {pluralize(entitledModules.length, "module")}
              </p>
              <div className="rounded-lg border p-3">
                <PlanModuleList modules={entitledModules} />
              </div>
            </div>

            {can("billing.manage") ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                Cancel subscription
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription.paymentMethod ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex h-8 w-12 items-center justify-center rounded-md bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                    {subscription.paymentMethod.brand}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm">
                      •••• {subscription.paymentMethod.last4}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {subscription.paymentMethod.holderName} · expires{" "}
                      {String(subscription.paymentMethod.expMonth).padStart(
                        2,
                        "0",
                      )}
                      /{String(subscription.paymentMethod.expYear).slice(-2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No card on file. Caboodle invoices this organization directly.
                </p>
              )}
            </CardContent>
          </Card>

          <InvoiceTable invoices={invoices} />
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel the {plan.name} plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Every module switches off for {organization.name} straight away,
              for every member. Module grants are kept, so choosing a plan again
              restores them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await cancelSubscription(subscription.id, user.id);
                toast.success("Subscription canceled");
              }}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent className={invoices.length ? "p-0" : undefined}>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" className="py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-4">
                    <p className="font-mono text-xs">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invoice.issuedAt)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <p className="text-sm tabular-nums">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Paid
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
