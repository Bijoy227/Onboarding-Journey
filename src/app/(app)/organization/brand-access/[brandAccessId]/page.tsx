"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Link2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar, UserAvatar } from "@/components/common/avatars";
import { BrandAccessBadge, RoleBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import { SegmentedControl } from "@/components/common/segmented-control";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ModuleActionBadges } from "@/components/features/module-action-badges";
import { ModuleAvatar } from "@/components/features/module-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import {
  getAvailableModules,
  getReachableBrands,
} from "@/lib/permissions/access";
import {
  MODULE_ACTIONS,
  buildModuleTree,
  normalizeActions,
  normalizeGrants,
  type ModuleAccess,
} from "@/lib/permissions/modules";
import { getRole } from "@/lib/permissions/permissions";
import {
  BrandAccessError,
  setBrandAccessModules,
} from "@/lib/services/brand-access-service";
import { cn } from "@/lib/utils";
import type {
  AccessMode,
  BrandAccess,
  ModuleAction,
  Organization,
  PlatformModule,
  User,
} from "@/types";

export default function BrandAccessEditorPage({
  params,
}: PageProps<"/organization/brand-access/[brandAccessId]">) {
  const { brandAccessId } = use(params);
  return (
    <PermissionGuard permission="access.manage">
      <BrandAccessEditor brandAccessId={brandAccessId} />
    </PermissionGuard>
  );
}

function BrandAccessEditor({ brandAccessId }: { brandAccessId: string }) {
  const state = useAppState();
  const { organization } = useSession();

  const row = state.brandAccess.find(
    (item) => item.id === brandAccessId && !item.deletedAt,
  );
  const membership = state.memberships.find(
    (item) =>
      item.id === row?.membershipId &&
      item.organizationId === organization?.id &&
      item.status !== "removed",
  );
  const member = state.users.find((item) => item.id === membership?.userId);
  const brand = state.organizations.find(
    (org) => org.id === row?.brandOrganizationId,
  );

  const back = (
    <LinkButton
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit"
      href={
        membership
          ? `/organization/brand-access#member-${membership.id}`
          : "/organization/brand-access"
      }
    >
      <ArrowLeft className="size-4" />
      Brand access
    </LinkButton>
  );

  if (!organization || !row || !membership || !member || !brand) {
    return (
      <>
        {back}
        <EmptyState
          title="Assignment not found"
          description="The person may have left, been made an admin, or the Brand's connection may have ended."
        />
      </>
    );
  }

  const connected =
    organization.type === "brand" ||
    getReachableBrands(state, organization).some((item) => item.id === brand.id);

  return (
    <>
      {back}
      {/* Keyed so the draft resets if the saved row changes underneath. */}
      <Editor
        key={`${row.id}:${row.accessMode}:${JSON.stringify(row.grants)}`}
        row={row}
        member={member}
        brand={brand}
        roleName={getRole(state, membership.roleId)?.name ?? "—"}
        connected={connected}
      />
    </>
  );
}

function toAccess(grants: BrandAccess["grants"]): ModuleAccess {
  return Object.fromEntries(
    grants.map((grant) => [grant.moduleId, grant.actions]),
  );
}

/** Stable form for comparing drafts: sorted keys, normalized actions. */
function stable(mode: AccessMode, access: ModuleAccess): string {
  if (mode === "full") return "full";
  return JSON.stringify(
    Object.keys(access)
      .sort()
      .map((id) => [id, normalizeActions(access[id])]),
  );
}

function Editor({
  row,
  member,
  brand,
  roleName,
  connected,
}: {
  row: BrandAccess;
  member: User;
  brand: Organization;
  roleName: string;
  connected: boolean;
}) {
  const router = useRouter();
  const state = useAppState();
  const { organization, user } = useSession();
  // What can be used on this Brand: the organization's own modules, plus the
  // Brand's own when the organization is a Brokerage.
  const enabledModules = organization
    ? getAvailableModules(state, organization.id, brand.id)
    : [];
  const sections = [
    {
      key: "own",
      title: organization?.name ?? "",
      tree: buildModuleTree(
        enabledModules.filter((module) => module.audience === organization?.type),
      ),
    },
    {
      key: "brand",
      title: `From ${brand.name}`,
      tree: buildModuleTree(
        enabledModules.filter((module) => module.audience !== organization?.type),
      ),
    },
  ].filter((section) => section.tree.length > 0);
  const enabledIds = new Set(enabledModules.map((module) => module.id));
  const byId = new Map(state.modules.map((module) => [module.id, module]));

  const savedGrants = toAccess(normalizeGrants(row.grants, enabledModules));
  const dormant = row.grants.filter((grant) => !enabledIds.has(grant.moduleId));

  const [mode, setMode] = useState<AccessMode>(row.accessMode);
  const [draft, setDraft] = useState<ModuleAccess>(savedGrants);
  const [saving, setSaving] = useState(false);

  const dirty = stable(mode, draft) !== stable(row.accessMode, savedGrants);
  const grantedCount = enabledModules.filter((entry) => draft[entry.id]).length;
  const isBrokerage = organization?.type === "brokerage";

  function chooseMode(next: AccessMode) {
    if (next === mode) return;
    // Restricting starts from everything, so "restrict" really means unticking.
    if (next === "custom" && row.accessMode === "full" && Object.keys(draft).length === 0) {
      setDraft(
        Object.fromEntries(
          enabledModules.map((entry) => [entry.id, entry.availableActions]),
        ),
      );
    }
    setMode(next);
  }

  function setAccess(entry: PlatformModule, on: boolean) {
    setDraft((current) => {
      const next = { ...current };
      if (on) {
        next[entry.id] = next[entry.id] ?? ["view"];
        // A sub-module is only reachable through its module.
        if (entry.parentId && !next[entry.parentId])
          next[entry.parentId] = ["view"];
      } else {
        delete next[entry.id];
        for (const child of enabledModules) {
          if (child.parentId === entry.id) delete next[child.id];
        }
      }
      return next;
    });
  }

  function toggleAction(entry: PlatformModule, action: ModuleAction) {
    setDraft((current) => {
      const actions = current[entry.id] ?? [];
      const nextActions = actions.includes(action)
        ? actions.filter((item) => item !== action)
        : [...actions, action];
      return { ...current, [entry.id]: normalizeActions(nextActions) };
    });
  }

  function applyToAll(actions: ModuleAction[] | null) {
    const next: ModuleAccess = {};
    if (actions) {
      for (const entry of enabledModules) {
        next[entry.id] = entry.availableActions.filter((action) =>
          actions.includes(action),
        );
      }
    }
    setDraft(next);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await setBrandAccessModules(
        row.id,
        {
          mode,
          grants: Object.entries(draft).map(([moduleId, actions]) => ({
            moduleId,
            actions,
          })),
        },
        user.id,
      );
      toast.success(mode === "full" ? "Full access restored" : "Access saved", {
        description:
          mode === "full"
            ? `${member.name} has every module available on ${brand.name}, including modules enabled later.`
            : `${member.name} has ${pluralize(grantedCount, "module")} on ${brand.name}.`,
      });
      router.push(`/organization/brand-access#member-${row.membershipId}`);
    } catch (caught) {
      toast.error(
        caught instanceof BrandAccessError
          ? caught.message
          : "Could not save the access",
      );
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={
          isBrokerage
            ? `${member.name} on ${brand.name}`
            : `Module access for ${member.name}`
        }
        description={
          isBrokerage
            ? `What ${member.name} may do on ${brand.name}'s data, using ${organization?.name}'s own modules plus the ones ${brand.name} has enabled. Each Brand is set separately.`
            : `What ${member.name} may do on ${brand.name}'s data. Applies to this membership only; in any other organization they belong to, access is set separately.`
        }
        actions={
          <div className="flex items-center gap-2">
            <UserAvatar name={member.name} className="size-7 text-[10px]" />
            <RoleBadge name={roleName} />
            {isBrokerage ? (
              <OrganizationAvatar organization={brand} className="size-7 text-[10px]" />
            ) : null}
          </div>
        }
      />

      {!connected ? (
        <Alert>
          <Link2 className="size-4" />
          <AlertDescription>
            The connection between {organization?.name} and {brand.name} is
            suspended. This assignment is kept and takes effect again when the
            Platform Admin resumes it.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Access mode</p>
            <p className="text-xs text-muted-foreground">
              {mode === "full"
                ? `Full follows whatever is available on ${brand.name}, including modules the Platform Admin enables later.`
                : "Custom is an explicit list. It never gains modules on its own."}
            </p>
          </div>
          <SegmentedControl
            label="Access mode"
            value={mode}
            onChange={chooseMode}
            options={[
              { value: "full", label: "Full" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </CardContent>
      </Card>

      {dormant.length > 0 && mode === "custom" ? (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            {pluralize(dormant.length, "saved grant")} for{" "}
            {dormant
              .map((grant) => byId.get(grant.moduleId)?.name ?? "a removed module")
              .join(", ")}{" "}
            {dormant.length === 1 ? "is" : "are"} dormant: {organization?.name}{" "}
            doesn&apos;t have {dormant.length === 1 ? "that module" : "those modules"}{" "}
            enabled. Dormant grants come back if it is enabled again, but saving
            this page removes them.
          </AlertDescription>
        </Alert>
      ) : null}

      {mode === "full" ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <BrandAccessBadge kind="full" />
              <p className="text-sm text-muted-foreground">
                {pluralize(enabledModules.length, "module")}, every action each
                one supports.
              </p>
            </div>
            {enabledModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing is enabled yet. Full access picks modules up as soon as
                the Platform Admin enables them.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {enabledModules.map((entry) => (
                  <li
                    key={entry.id}
                    className={cn(
                      "flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center",
                      entry.parentId && "sm:pl-10",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 truncate",
                        entry.parentId ? "text-xs" : "text-sm font-medium",
                      )}
                    >
                      {entry.name}
                    </span>
                    <ModuleActionBadges actions={entry.availableActions} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Quick set:</span>
            <Button size="xs" variant="outline" onClick={() => applyToAll(["view"])}>
              View everything
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => applyToAll(["view", "create", "update", "import", "export"])}
            >
              Everything except delete
            </Button>
            <Button size="xs" variant="ghost" onClick={() => applyToAll(null)}>
              Clear all
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              onClick={() => chooseMode("full")}
            >
              <RotateCcw className="size-3.5" />
              Reset to full access
            </Button>
          </div>

          {sections.map((section) => (
          <div key={section.key} className="space-y-3">
            {sections.length > 1 ? (
              <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h2>
            ) : null}
            {section.tree.map(({ module: entry, children }) => (
              <Card key={entry.id} className="gap-0 py-0">
                <GrantRow
                  entry={entry}
                  actions={draft[entry.id]}
                  onAccessChange={(on) => setAccess(entry, on)}
                  onToggleAction={(action) => toggleAction(entry, action)}
                />
                {children.length > 0 ? (
                  <div className="divide-y border-t bg-muted/30">
                    {children.map((child) => (
                      <GrantRow
                        key={child.id}
                        entry={child}
                        actions={draft[child.id]}
                        onAccessChange={(on) => setAccess(child, on)}
                        onToggleAction={(action) => toggleAction(child, action)}
                        child
                      />
                    ))}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
          ))}
        </>
      )}

      <div className="sticky bottom-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm">
              <span className="font-medium">
                {mode === "full"
                  ? "Full access"
                  : `${grantedCount} of ${enabledModules.length}`}
              </span>{" "}
              <span className="text-muted-foreground">
                {mode === "full"
                  ? `to everything available on ${brand.name}`
                  : "modules and sub-modules granted"}
                {dirty ? " · unsaved changes" : ""}
              </span>
            </p>
            <div className="flex gap-2">
              <LinkButton
                variant="ghost"
                href={`/organization/brand-access#member-${row.membershipId}`}
              >
                Cancel
              </LinkButton>
              <Button onClick={() => void save()} disabled={!dirty || saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function GrantRow({
  entry,
  actions,
  onAccessChange,
  onToggleAction,
  child,
}: {
  entry: PlatformModule;
  actions: ModuleAction[] | undefined;
  onAccessChange: (on: boolean) => void;
  onToggleAction: (action: ModuleAction) => void;
  child?: boolean;
}) {
  const on = Boolean(actions);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 sm:flex-row sm:items-center",
        child && "sm:pl-10",
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <Switch
          checked={on}
          onCheckedChange={(checked) => onAccessChange(Boolean(checked))}
          aria-label={`Access to ${entry.name}`}
        />
        {child ? null : <ModuleAvatar entry={entry} />}
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-medium",
              child ? "text-xs" : "text-sm",
              !on && "text-muted-foreground",
            )}
          >
            {entry.name}
          </span>
          {!child ? (
            <span className="block truncate text-xs text-muted-foreground">
              {entry.description}
            </span>
          ) : null}
        </span>
      </label>

      <div
        className="flex flex-wrap gap-1 pl-12 sm:pl-0"
        role="group"
        aria-label={`Actions in ${entry.name}`}
      >
        {MODULE_ACTIONS.filter((action) =>
          entry.availableActions.includes(action.id),
        ).map((action) => {
          const pressed = actions?.includes(action.id) ?? false;
          // View comes with access itself, so it isn't toggled on its own.
          const locked = !on || action.id === "view";
          return (
            <button
              key={action.id}
              type="button"
              aria-pressed={pressed}
              disabled={locked}
              title={action.description}
              onClick={() => onToggleAction(action.id)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                pressed
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent",
                locked && "cursor-default",
                !on && !pressed && "opacity-40",
                !on && pressed && "opacity-60",
              )}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
