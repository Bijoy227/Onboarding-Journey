"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  Lock,
  Minus,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar } from "@/components/common/avatars";
import { BrandAccessBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { ModuleAvatar, ModuleIcon } from "@/components/features/module-icon";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { relativeTime } from "@/lib/format";
import { ACCESS_KIND_LABEL } from "@/lib/permissions/access";
import {
  MODULE_ACTIONS,
  findModuleBySlug,
  moduleHref,
} from "@/lib/permissions/modules";
import { cn } from "@/lib/utils";
import type { ModuleAction, PlatformModule } from "@/types";

/**
 * One business module.
 *
 * The page itself is deliberately plain: the point is that every action on it
 * is checked against the person's access on the active Brand. A button you
 * can't use is shown locked, so the permission is visible rather than
 * silently missing; an action the module doesn't have isn't shown at all.
 *
 * In a Brokerage, the Brokerage's own modules open at /modules/{slug} and the
 * active Brand's modules at /modules/brand/{slug}, since the same slug can
 * exist in both catalogs.
 */
export function ModuleScreen({
  slug,
  catalog,
}: {
  slug: string;
  /** "brand" for a Brand module opened from a Brokerage. */
  catalog?: "brand";
}) {
  const state = useAppState();
  const { organization, moduleAccess, enabledModules, availableModules, activeBrand } =
    useSession();

  if (!organization) {
    return (
      <EmptyState
        title="Modules belong to an organization"
        description="Switch to an organization to open its modules."
      />
    );
  }

  const entry = findModuleBySlug(
    state,
    catalog ?? organization.type,
    decodeURIComponent(slug),
  );

  if (!entry) {
    return (
      <EmptyState
        title="Module not found"
        description={`There is no ${catalog ?? organization.type} module at this address. It may have been removed from the catalog.`}
        action={
          <LinkButton variant="outline" href="/modules">
            All modules
          </LinkButton>
        }
      />
    );
  }

  // The organization's own modules come from its own entitlement; a Brand
  // module opened from a Brokerage comes from the Brand being worked on.
  const ownModule = entry.audience === organization.type;
  if (ownModule && !enabledModules.some((item) => item.id === entry.id)) {
    return (
      <LockedModule
        entry={entry}
        title={`${entry.name} isn't enabled for ${organization.name}`}
        description={`Modules are enabled per organization by the Platform Admin, and nobody in ${organization.name} can go above that, admins included.`}
      />
    );
  }

  if (!activeBrand) {
    return (
      <LockedModule
        entry={entry}
        icon={Tag}
        title="You aren't assigned to a Brand yet"
        description={`Data is always reached through a Brand. Ask a ${organization.name} admin to assign you to a connected Brand.`}
      />
    );
  }

  if (!availableModules.some((item) => item.id === entry.id)) {
    return (
      <LockedModule
        entry={entry}
        title={`${activeBrand.brand.name} doesn't have ${entry.name} enabled`}
        description={`Brand modules come from the Brand being worked on, and the Platform Admin enables them for each Brand. Switch to another Brand, or ask Caboodle to enable it for ${activeBrand.brand.name}.`}
      />
    );
  }

  const actions = moduleAccess[entry.id] ?? [];
  if (!actions.includes("view")) {
    return (
      <LockedModule
        entry={entry}
        title={`You don't have access to ${entry.name} on ${activeBrand.brand.name}`}
        description={`${entry.name} is available on ${activeBrand.brand.name}, but your Custom access there doesn't include it. An admin can grant it under Brand access.`}
      />
    );
  }

  // Remount per module and Brand so the sample records reset when either changes.
  return (
    <ModuleWorkspace
      key={`${entry.id}:${activeBrand.brand.id}`}
      entry={entry}
      actions={actions}
    />
  );
}

function LockedModule({
  entry,
  title,
  description,
  action,
  icon: Icon = Lock,
}: {
  entry: PlatformModule;
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="relative">
          <ModuleAvatar
            entry={entry}
            className="size-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
            iconClassName="size-5"
          />
          <Icon className="absolute -right-1 -bottom-1 size-4 rounded-full bg-background p-0.5 text-amber-600 dark:text-amber-400" />
        </span>
        <div className="space-y-1.5">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="pt-1 font-mono text-xs text-muted-foreground">
            Module: {entry.slug}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {action}
          <LinkButton variant="outline" href="/modules">
            All modules
          </LinkButton>
        </div>
      </CardContent>
    </Card>
  );
}

type SampleRecord = {
  id: string;
  name: string;
  owner: string;
  updatedAt: string;
};

/** Four placeholder rows, updated over the last couple of weeks. */
function sampleRecords(
  entry: PlatformModule,
  owners: string[],
): SampleRecord[] {
  const now = Date.now();
  return [1, 2, 3, 4].map((index) => ({
    id: `${entry.id}-${index}`,
    name: `${entry.name} item ${index}`,
    owner: owners[(index - 1) % Math.max(owners.length, 1)] ?? "—",
    updatedAt: new Date(now - index * index * 86_400_000).toISOString(),
  }));
}

function ModuleWorkspace({
  entry,
  actions,
}: {
  entry: PlatformModule;
  actions: ModuleAction[];
}) {
  const state = useAppState();
  const { organization, user, role, moduleAccess, availableModules, activeBrand, brands } =
    useSession();
  const enabledIds = new Set(availableModules.map((item) => item.id));
  const isBrokerage = organization?.type === "brokerage";

  const owners = state.memberships
    .filter(
      (membership) =>
        membership.organizationId === organization?.id &&
        membership.status === "active",
    )
    .map(
      (membership) =>
        state.users.find((item) => item.id === membership.userId)?.name ?? "",
    )
    .filter(Boolean);

  const [records, setRecords] = useState<SampleRecord[]>(() =>
    sampleRecords(entry, owners),
  );
  const [created, setCreated] = useState(0);

  const allowed = (action: ModuleAction) => actions.includes(action);
  const supports = (action: ModuleAction) =>
    entry.availableActions.includes(action);
  const parent = entry.parentId
    ? state.modules.find((item) => item.id === entry.parentId)
    : undefined;
  const children = state.modules
    .filter((item) => item.parentId === entry.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function addRecord() {
    const next = created + 1;
    setCreated(next);
    setRecords((current) => [
      {
        id: `${entry.id}-new-${next}`,
        name: `New ${entry.name} item ${next}`,
        owner: user?.name ?? "You",
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    toast.success("Record created", {
      description: "Sample data only: it resets when you leave the page.",
    });
  }

  return (
    <>
      {parent ? (
        <LinkButton
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          href={moduleHref(parent, organization?.type)}
        >
          <ArrowLeft className="size-4" />
          {parent.name}
        </LinkButton>
      ) : null}

      <div className="flex items-start gap-3">
        <ModuleAvatar
          entry={entry}
          className="size-10 rounded-lg"
          iconClassName="size-5"
        />
        <PageHeader
          className="min-w-0 flex-1"
          title={entry.name}
          description={
            isBrokerage && activeBrand
              ? `${entry.description} Working on ${activeBrand.brand.name}.`
              : entry.description
          }
          actions={
            <>
              <ActionButton
                action="import"
                hidden={!supports("import")}
                allowed={allowed("import")}
                onClick={() =>
                  toast.success("Import started", {
                    description: "Demo only: no file is read.",
                  })
                }
              >
                <Upload className="size-4" />
                Import
              </ActionButton>
              <ActionButton
                action="export"
                hidden={!supports("export")}
                allowed={allowed("export")}
                onClick={() =>
                  toast.success(`Exported ${records.length} records`, {
                    description: "Demo only: no file is downloaded.",
                  })
                }
              >
                <Download className="size-4" />
                Export
              </ActionButton>
              <ActionButton
                action="create"
                hidden={!supports("create")}
                allowed={allowed("create")}
                variant="default"
                onClick={addRecord}
              >
                <Plus className="size-4" />
                New
              </ActionButton>
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Records</CardTitle>
              <CardDescription>
                Placeholder data
                {activeBrand ? ` for ${activeBrand.brand.name}` : ""}. The real{" "}
                {entry.name} screens live in caboodle.web
                {entry.route ? ` at ${entry.route}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Owner
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Updated
                    </TableHead>
                    <TableHead className="w-24 pr-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="pl-4 font-medium">
                          {record.name}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {record.owner}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {relativeTime(record.updatedAt)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <ActionButton
                              action="update"
                              hidden={!supports("update")}
                              allowed={allowed("update")}
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setRecords((current) =>
                                  current.map((item) =>
                                    item.id === record.id
                                      ? {
                                          ...item,
                                          owner: user?.name ?? item.owner,
                                          updatedAt: new Date().toISOString(),
                                        }
                                      : item,
                                  ),
                                );
                                toast.success("Record updated");
                              }}
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">Edit</span>
                            </ActionButton>
                            <ActionButton
                              action="delete"
                              hidden={!supports("delete")}
                              allowed={allowed("delete")}
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setRecords((current) =>
                                  current.filter(
                                    (item) => item.id !== record.id,
                                  ),
                                );
                                toast.success("Record deleted");
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Delete</span>
                            </ActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {children.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Sub-modules</CardTitle>
                <CardDescription>
                  Each one is enabled for the organization and granted separately.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {children.map((child) => {
                  const childActions = moduleAccess[child.id];
                  const body = (
                    <div
                      className={cn(
                        "flex h-full items-center gap-3 rounded-lg border p-3",
                        childActions
                          ? "transition-colors hover:bg-accent"
                          : "text-muted-foreground",
                      )}
                    >
                      <ModuleIcon entry={child} className="size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {child.name}
                        </p>
                        {child.group ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {child.group}
                          </p>
                        ) : null}
                      </div>
                      {childActions ? null : (
                        <span className="flex shrink-0 items-center gap-1 text-xs">
                          <Lock className="size-3.5" />
                          {enabledIds.has(child.id)
                            ? "No access"
                            : "Not enabled"}
                        </span>
                      )}
                    </div>
                  );
                  return childActions ? (
                    <Link key={child.id} href={moduleHref(child, organization?.type)}>
                      {body}
                    </Link>
                  ) : (
                    <div key={child.id}>{body}</div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                Your access
                {activeBrand ? <BrandAccessBadge kind={activeBrand.kind} /> : null}
              </CardTitle>
              <CardDescription>
                {activeBrand?.kind === "admin"
                    ? `Every action, because your role (${role?.name}) has full brand access.`
                    : activeBrand?.kind === "support"
                      ? "Every action, through audited support access."
                      : activeBrand?.kind === "full"
                        ? `Full access on ${activeBrand.brand.name}: everything ${organization?.name} has enabled.`
                        : `Custom access on ${activeBrand?.brand.name}, set by an admin.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {MODULE_ACTIONS.map((action) => {
                  const granted = allowed(action.id);
                  const available = supports(action.id);
                  return (
                    <li
                      key={action.id}
                      className={cn(
                        "flex items-start gap-2 text-sm",
                        !granted && "text-muted-foreground",
                      )}
                    >
                      {granted ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : available ? (
                        <Lock className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0" />
                      )}
                      <span>
                        <span className="font-medium">{action.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {available
                            ? action.description
                            : "Not something this module does."}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {isBrokerage && brands.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Across your brands</CardTitle>
                <CardDescription>
                  A screen that spans brands only gets the Brands where you
                  have {entry.name}. Access is set per Brand.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-lg border">
                  {brands.map((item) => {
                    const brandActions = item.modules[entry.id];
                    const onBrand = item.available.some(
                      (module) => module.id === entry.id,
                    );
                    return (
                      <li
                        key={item.brand.id}
                        className={cn(
                          "space-y-1.5 px-3 py-2",
                          !brandActions && "text-muted-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <OrganizationAvatar
                            organization={item.brand}
                            className="size-6 text-[10px]"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {item.brand.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {ACCESS_KIND_LABEL[item.kind]}
                          </span>
                        </div>
                        <div className="pl-8.5">
                          {brandActions ? (
                            <ModuleActionBadges actions={brandActions} />
                          ) : (
                            <span className="flex items-center gap-1 text-xs">
                              <Lock className="size-3.5" />
                              {onBrand ? "Not granted" : "Not enabled on this Brand"}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>About this module</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd className="truncate font-mono text-xs">{entry.slug}</dd>
                </div>
                {entry.group ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {entry.parentId ? "Section" : "Menu group"}
                    </dt>
                    <dd className="truncate">{entry.group}</dd>
                  </div>
                ) : null}
                {entry.route ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Route today</dt>
                    <dd className="truncate font-mono text-xs">
                      {entry.route}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {entry.features.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Inside this module
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {entry.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="h-auto whitespace-normal text-left"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * A toolbar or row action that is locked when the person lacks the action,
 * and absent when the module doesn't have it at all.
 */
function ActionButton({
  action,
  allowed,
  hidden,
  onClick,
  children,
  variant = "outline",
  size = "sm",
}: {
  action: ModuleAction;
  allowed: boolean;
  hidden?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "icon-sm";
}) {
  if (hidden) return null;
  if (allowed) {
    return (
      <Button variant={variant} size={size} onClick={onClick}>
        {children}
      </Button>
    );
  }

  const label =
    MODULE_ACTIONS.find((item) => item.id === action)?.label ?? action;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex cursor-not-allowed"
            aria-label={`${label}: not permitted`}
          />
        }
      >
        <Button
          variant={variant}
          size={size}
          disabled
          className="pointer-events-none"
        >
          {size === "icon-sm" ? <Lock className="size-3.5" /> : children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        You don&apos;t have the {label.toLowerCase()} permission in this module
      </TooltipContent>
    </Tooltip>
  );
}
