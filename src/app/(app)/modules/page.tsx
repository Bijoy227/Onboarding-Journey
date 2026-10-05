"use client";

import Link from "next/link";
import { Blocks, Lock, Tag } from "lucide-react";

import { BrandAccessBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { ModuleAvatar, ModuleIcon } from "@/components/features/module-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import {
  buildModuleTree,
  getModuleTree,
  moduleHref,
  type ModuleAccess,
  type ModuleNode,
} from "@/lib/permissions/modules";
import type { OrganizationType } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Every module the organization has enabled, and which of them this person
 * can open on the active Brand. In a Brokerage the Brand's own enabled modules
 * follow, since they flow through to the people working on it. Catalog
 * modules that aren't enabled are listed underneath.
 */
export default function ModulesPage() {
  const state = useAppState();
  const {
    organization,
    enabledModules,
    availableModules,
    moduleAccess,
    activeBrand,
    can,
  } = useSession();

  if (!organization) {
    return (
      <EmptyState
        icon={Blocks}
        title="Modules belong to an organization"
        description="Join an organization to use Caboodle modules."
      />
    );
  }

  if (organization.type === "brand" && enabledModules.length === 0) {
    return (
      <>
        <PageHeader title="Modules" />
        <EmptyState
          icon={Blocks}
          title={`${organization.name} has no modules yet`}
          description="The Platform Admin enables modules for each organization. Until then there is nothing to open."
        />
      </>
    );
  }

  if (!activeBrand) {
    return (
      <>
        <PageHeader title="Modules" />
        <EmptyState
          icon={Tag}
          title="You aren't assigned to a Brand yet"
          description={`All data belongs to a Brand. Ask a ${organization.name} admin to assign you to one of the Brands connected to ${organization.name}.`}
        />
      </>
    );
  }

  const isBrokerage = organization.type === "brokerage";
  const availableIds = new Set(availableModules.map((entry) => entry.id));
  const tree = buildModuleTree(
    availableModules.filter((entry) => entry.audience === organization.type),
  );
  const brandTree = buildModuleTree(
    availableModules.filter((entry) => entry.audience !== organization.type),
  );
  const usable = [...tree, ...brandTree].filter(
    (node) => moduleAccess[node.module.id],
  ).length;

  const notEnabled = getModuleTree(state, organization.type).filter(
    (node) => !availableIds.has(node.module.id),
  );
  const notOnBrand = isBrokerage
    ? getModuleTree(state, "brand").filter(
        (node) => !availableIds.has(node.module.id),
      )
    : [];

  const accessSentence =
    activeBrand.kind === "admin"
      ? "As an admin you have every action in every enabled module."
      : activeBrand.kind === "support"
        ? "Support access gives every action; it is audited."
        : activeBrand.kind === "full"
          ? "Your access is Full: everything enabled, including modules added later."
          : "Your access is Custom: an admin chose these modules for you.";

  return (
    <>
      <PageHeader
        title="Modules"
        description={
          <>
            {organization.name} has {pluralize(tree.length, "module")} enabled.
            {isBrokerage ? (
              <>
                {" "}
                <strong>{activeBrand.brand.name}</strong> adds{" "}
                {pluralize(brandTree.length, "module")} of its own. On it you
                can open <strong>{usable}</strong>.
              </>
            ) : (
              <>
                {" "}
                You can open <strong>{usable}</strong> of them.
              </>
            )}{" "}
            {accessSentence}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <BrandAccessBadge kind={activeBrand.kind} />
            {can("access.manage") ? (
              <LinkButton
                size="sm"
                variant="outline"
                href="/organization/brand-access"
              >
                Manage brand access
              </LinkButton>
            ) : null}
          </div>
        }
      />

      <ModuleGrid
        nodes={tree}
        moduleAccess={moduleAccess}
        workspaceType={organization.type}
      />

      {isBrokerage ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">
              From {activeBrand.brand.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Modules {activeBrand.brand.name} has enabled flow through to
              everyone working on it. They change when you switch Brand.
            </p>
          </div>
          {brandTree.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              {activeBrand.brand.name} has no modules enabled yet.
            </p>
          ) : (
            <ModuleGrid
              nodes={brandTree}
              moduleAccess={moduleAccess}
                    workspaceType={organization.type}
            />
          )}
        </div>
      ) : null}

      <NotEnabled
        title={`Not enabled for ${organization.name}`}
        description={`In the ${isBrokerage ? "Brokerage" : "Brand"} catalog. Only the Platform Admin can enable modules for an organization.`}
        nodes={notEnabled}
      />
      <NotEnabled
        title={`Not enabled for ${activeBrand.brand.name}`}
        description={`In the Brand catalog. The Platform Admin enables these per Brand.`}
        nodes={notOnBrand}
      />
    </>
  );
}

function NotEnabled({
  title,
  description,
  nodes,
}: {
  title: string;
  description: string;
  nodes: ModuleNode[];
}) {
  return (
    <>
      {nodes.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map(({ module: entry }) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-muted-foreground"
              >
                <ModuleIcon entry={entry} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.name}
                </span>
                <Lock className="size-3.5 shrink-0" />
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
  workspaceType,
}: {
  nodes: ModuleNode[];
  moduleAccess: ModuleAccess;
  workspaceType: OrganizationType;
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
                  <Link key={entry.id} href={moduleHref(entry, workspaceType)}>
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
