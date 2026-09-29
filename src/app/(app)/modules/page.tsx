"use client";

import Link from "next/link";
import { Blocks, CreditCard, Lock } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { ModuleAvatar, ModuleIcon } from "@/components/features/module-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatCurrency, pluralize } from "@/lib/format";
import {
  buildModuleTree,
  getModuleTree,
  type ModuleAccess,
  type ModuleNode,
} from "@/lib/permissions/modules";
import { cn } from "@/lib/utils";

/**
 * Every module in the organization's plan, and which of them this member can
 * open. Modules the plan lacks are listed underneath as what an upgrade adds.
 */
export default function ModulesPage() {
  const state = useAppState();
  const {
    organization,
    plan,
    pendingSubscription,
    entitledModules,
    moduleAccess,
    can,
    role,
  } = useSession();

  if (!organization) {
    return (
      <EmptyState
        icon={Blocks}
        title="Modules belong to an organization"
        description="Join or create an organization to use Caboodle modules."
      />
    );
  }

  if (!plan) {
    return (
      <>
        <PageHeader title="Modules" />
        <EmptyState
          icon={CreditCard}
          title={`${organization.name} has no plan yet`}
          description={
            can("billing.manage")
              ? "Choose a plan to switch modules on for your organization."
              : "Modules switch on once an Organization Admin chooses a plan."
          }
          action={
            can("billing.manage") ? (
              <LinkButton
                href={
                  pendingSubscription
                    ? "/onboarding/payment"
                    : "/onboarding/plan"
                }
              >
                {pendingSubscription ? "Finish checkout" : "Choose a plan"}
              </LinkButton>
            ) : null
          }
        />
      </>
    );
  }

  const tree = buildModuleTree(entitledModules);
  const entitledIds = new Set(entitledModules.map((entry) => entry.id));
  const usable = tree.filter((node) => moduleAccess[node.module.id]).length;
  const fullAccess = can("module.full_access");

  // What the plan doesn't include, for the upgrade section.
  const notInPlan = getModuleTree(state, organization.type).filter(
    (node) => !entitledIds.has(node.module.id),
  );

  return (
    <>
      <PageHeader
        title="Modules"
        description={
          <>
            {organization.name} is on the <strong>{plan.name}</strong> plan with{" "}
            {pluralize(tree.length, "module")}. You can open{" "}
            <strong>{usable}</strong> of them.{" "}
            {fullAccess
              ? `As ${role?.name ?? "an admin"} you have every action in every module.`
              : "What you can do in each is set by your Organization Admin."}
          </>
        }
        actions={
          can("module.assign") ? (
            <LinkButton
              size="sm"
              variant="outline"
              href="/organization/module-access"
            >
              Manage module access
            </LinkButton>
          ) : null
        }
      />

      <ModuleGrid nodes={tree} moduleAccess={moduleAccess} />

      {notInPlan.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Not in your plan</h2>
              <p className="text-sm text-muted-foreground">
                Available to{" "}
                {organization.type === "brand" ? "Brands" : "Brokerages"} on
                another plan.
              </p>
            </div>
            {can("billing.manage") ? (
              <LinkButton size="sm" variant="outline" href="/onboarding/plan">
                Change plan
              </LinkButton>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notInPlan.map(({ module: entry }) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-muted-foreground"
              >
                <ModuleIcon entry={entry} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.name}
                </span>
                <span className="text-xs tabular-nums">
                  {formatCurrency(entry.monthlyPrice)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModuleGrid({
  nodes,
  moduleAccess,
}: {
  nodes: ModuleNode[];
  moduleAccess: ModuleAccess;
}) {
  const groups = Array.from(
    new Set(nodes.map((node) => node.module.group ?? "Other")),
  );
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes
              .filter((node) => (node.module.group ?? "Other") === group)
              .map(({ module: entry, children }) => {
                const actions = moduleAccess[entry.id] ?? [];
                const openChildren = children.filter(
                  (child) => moduleAccess[child.id],
                ).length;
                const body = (
                  <Card
                    className={cn(
                      "h-full transition-colors",
                      actions.length > 0 ? "hover:bg-accent/50" : "opacity-70",
                    )}
                  >
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <ModuleAvatar
                          entry={entry}
                          className="size-9 rounded-lg"
                          iconClassName="size-4"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {entry.name}
                          </p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {entry.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                        {actions.length > 0 ? (
                          <ModuleActionBadges actions={actions} />
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Lock className="size-3.5" />
                            No access · ask an admin
                          </span>
                        )}
                        {children.length > 0 ? (
                          <Badge variant="outline" className="text-[10px]">
                            {openChildren}/{children.length} sub-modules
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
                return actions.length > 0 ? (
                  <Link key={entry.id} href={`/modules/${entry.slug}`}>
                    {body}
                  </Link>
                ) : (
                  <div key={entry.id}>{body}</div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
