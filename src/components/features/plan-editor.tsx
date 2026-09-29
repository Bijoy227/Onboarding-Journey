"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { FieldSelect } from "@/components/common/field-select";
import { SegmentedControl } from "@/components/common/segmented-control";
import { BillingCycleToggle } from "@/components/features/billing-cycle-toggle";
import { ModulePicker } from "@/components/features/module-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  getModuleTree,
  getPlanSubscriberCount,
  normalizeModuleIds,
  sumModulePrices,
} from "@/lib/permissions/modules";
import {
  PlanError,
  createPlan,
  deletePlan,
  updatePlan,
} from "@/lib/services/plan-service";
import { assignPlan } from "@/lib/services/subscription-service";
import type { BillingCycle, OrganizationType, Plan } from "@/types";

type Pricing = "modules" | "bundle";

/**
 * Create or edit a plan. Platform Admin only.
 *
 * Editing changes the plan for every organization on it immediately, which
 * the summary calls out. A new custom plan can be private to one organization
 * and assigned to it in the same step.
 */
export function PlanEditor({
  plan,
  initialOrganizationId,
}: {
  plan?: Plan;
  initialOrganizationId?: string;
}) {
  const router = useRouter();
  const state = useAppState();
  const { user } = useSession();

  const initialOrg = state.organizations.find(
    (org) => org.id === (plan?.organizationId ?? initialOrganizationId),
  );

  const [name, setName] = useState(
    plan?.name ?? (initialOrg ? `${initialOrg.name} Custom` : ""),
  );
  const [description, setDescription] = useState(plan?.description ?? "");
  const [audience, setAudience] = useState<OrganizationType>(
    plan?.audience ?? initialOrg?.type ?? "brand",
  );
  const [organizationId, setOrganizationId] = useState<string>(
    initialOrg?.id ?? "",
  );
  const [moduleIds, setModuleIds] = useState<string[]>(plan?.moduleIds ?? []);
  const [pricing, setPricing] = useState<Pricing>(
    plan?.fixedMonthlyPrice !== undefined ? "bundle" : "modules",
  );
  const [bundlePrice, setBundlePrice] = useState(
    plan?.fixedMonthlyPrice !== undefined ? String(plan.fixedMonthlyPrice) : "",
  );
  const [assignNow, setAssignNow] = useState(Boolean(initialOrg));
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tree = getModuleTree(state, audience);
  const selected = normalizeModuleIds(state, audience, moduleIds);
  const listPrice = sumModulePrices(state, selected);
  const bundle = Number(bundlePrice);
  const effective =
    pricing === "bundle" && bundlePrice.trim() !== "" && Number.isFinite(bundle)
      ? bundle
      : listPrice;
  const subscribers = plan ? getPlanSubscriberCount(state, plan.id) : 0;
  const scopeOrg = state.organizations.find((org) => org.id === organizationId);
  const organizationsOfType = state.organizations.filter(
    (org) => org.type === audience,
  );

  async function save() {
    if (!user) return;
    setError(null);
    setSaving(true);

    const fixedMonthlyPrice =
      pricing === "bundle"
        ? bundlePrice.trim() === ""
          ? Number.NaN
          : bundle
        : null;

    try {
      if (plan) {
        await updatePlan(
          plan.id,
          { name, description, moduleIds: selected, fixedMonthlyPrice },
          user.id,
        );
        toast.success("Plan saved", {
          description:
            subscribers > 0
              ? `Applied to ${pluralize(subscribers, "organization")} on this plan.`
              : undefined,
        });
        router.push("/platform/plans");
      } else {
        const created = await createPlan(
          {
            name,
            description,
            audience,
            moduleIds: selected,
            fixedMonthlyPrice,
            organizationId: organizationId || null,
          },
          user.id,
        );
        if (scopeOrg && assignNow) {
          await assignPlan({
            organizationId: scopeOrg.id,
            planId: created.id,
            billingCycle: cycle,
            actorUserId: user.id,
          });
          toast.success("Custom plan created and assigned", {
            description: `${scopeOrg.name} is on ${created.name}.`,
          });
          router.push(`/platform/organizations/${scopeOrg.id}`);
        } else {
          toast.success("Custom plan created", { description: created.name });
          router.push("/platform/plans");
        }
      }
    } catch (caught) {
      setError(
        caught instanceof PlanError
          ? caught.message
          : "Could not save the plan.",
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!user || !plan) return;
    try {
      await deletePlan(plan.id, user.id);
      toast.success("Plan deleted");
      router.push("/platform/plans");
    } catch (caught) {
      toast.error(
        caught instanceof PlanError
          ? caught.message
          : "Could not delete the plan",
      );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Regional Brand Bundle"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
            </div>

            {plan ? null : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>For</Label>
                  <div>
                    <SegmentedControl
                      label="Organization type"
                      value={audience}
                      onChange={(next) => {
                        setAudience(next);
                        // Modules and the scoped organization are per type.
                        setModuleIds([]);
                        setOrganizationId("");
                      }}
                      disabled={Boolean(initialOrg)}
                      options={[
                        { value: "brand", label: "Brands" },
                        { value: "brokerage", label: "Brokerages" },
                      ]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-scope">Available to</Label>
                  <FieldSelect
                    id="plan-scope"
                    className="w-full"
                    value={organizationId || "any"}
                    onChange={(value) =>
                      setOrganizationId(value === "any" ? "" : value)
                    }
                    options={[
                      {
                        value: "any",
                        label: `Any ${audience === "brand" ? "brand" : "brokerage"}`,
                      },
                      ...organizationsOfType.map((org) => ({
                        value: org.id,
                        label: `Only ${org.name}`,
                      })),
                    ]}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>
              {audience === "brand" ? "Brand" : "Brokerage"} catalog. A
              sub-module only counts when its module is in the plan too.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModulePicker
              tree={tree}
              value={moduleIds}
              onChange={setModuleIds}
            />
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SegmentedControl
                label="Pricing"
                value={pricing}
                onChange={setPricing}
                options={[
                  { value: "modules", label: "By module" },
                  { value: "bundle", label: "Bundle price" },
                ]}
              />
              {pricing === "bundle" ? (
                <div className="space-y-2">
                  <Label htmlFor="plan-bundle">
                    Bundle price per month (USD)
                  </Label>
                  <Input
                    id="plan-bundle"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={bundlePrice}
                    onChange={(event) => setBundlePrice(event.target.value)}
                    placeholder={String(listPrice)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The plan costs the sum of its modules, and follows module
                  price changes automatically.
                </p>
              )}

              <Separator />

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Modules</dt>
                  <dd>{selected.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">List price</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(listPrice)}/mo
                  </dd>
                </div>
                {pricing === "bundle" && effective < listPrice ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Customer saves</dt>
                    <dd className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(listPrice - effective)}/mo
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 pt-1 font-medium">
                  <dt>Plan price</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(effective)}/mo
                  </dd>
                </div>
              </dl>

              {!plan && scopeOrg ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={assignNow}
                      onCheckedChange={(checked) =>
                        setAssignNow(Boolean(checked))
                      }
                      className="mt-0.5"
                    />
                    Put {scopeOrg.name} on this plan now
                  </label>
                  {assignNow ? (
                    <BillingCycleToggle value={cycle} onChange={setCycle} />
                  ) : null}
                </div>
              ) : null}

              {plan && subscribers > 0 ? (
                <Alert>
                  <TriangleAlert className="size-4" />
                  <AlertDescription>
                    {pluralize(
                      subscribers,
                      "organization is",
                      "organizations are",
                    )}{" "}
                    on this plan. Changes reach them, and their members, as soon
                    as you save.
                  </AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                className="w-full"
                onClick={() => void save()}
                disabled={saving || selected.length === 0}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {plan ? "Save plan" : "Create plan"}
              </Button>

              {plan?.tier === "custom" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Delete plan
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {plan?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Organizations can&apos;t be on a deleted plan, so a plan that is
              still in use has to be emptied first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              Delete plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
