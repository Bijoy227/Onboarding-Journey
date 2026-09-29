"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/avatars";
import { RoleBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ModuleAvatar } from "@/components/features/module-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import {
  ALL_MODULE_ACTIONS,
  MODULE_ACTIONS,
  buildModuleTree,
  normalizeActions,
  normalizeGrants,
  type ModuleAccess,
} from "@/lib/permissions/modules";
import {
  ModuleAccessError,
  setMemberModuleGrants,
} from "@/lib/services/module-access-service";
import { cn } from "@/lib/utils";
import type { Membership, ModuleAction, PlatformModule, User } from "@/types";

export default function MemberModuleAccessPage({
  params,
}: PageProps<"/organization/module-access/[membershipId]">) {
  const { membershipId } = use(params);
  return (
    <PermissionGuard permission="module.assign">
      <MemberModuleAccess membershipId={membershipId} />
    </PermissionGuard>
  );
}

function MemberModuleAccess({ membershipId }: { membershipId: string }) {
  const state = useAppState();
  const { organization } = useSession();

  const membership = state.memberships.find(
    (item) =>
      item.id === membershipId &&
      item.organizationId === organization?.id &&
      item.status !== "removed",
  );
  const member = state.users.find((item) => item.id === membership?.userId);
  const role = state.roles.find((item) => item.id === membership?.roleId);

  if (!organization || !membership || !member) {
    return (
      <EmptyState
        title="Member not found"
        description="They may have left the organization, or belong to a different one."
        action={
          <LinkButton variant="outline" href="/organization/module-access">
            Back to module access
          </LinkButton>
        }
      />
    );
  }

  const back = (
    <LinkButton
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit"
      href="/organization/module-access"
    >
      <ArrowLeft className="size-4" />
      Module access
    </LinkButton>
  );

  if (role?.permissionIds.includes("module.full_access")) {
    return (
      <>
        {back}
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </span>
            <div className="space-y-1.5">
              <p className="font-medium">
                {member.name} already has every module
              </p>
              <p className="text-sm text-muted-foreground">
                Their role, {role.name}, grants full module access. To limit
                what they can do, give them a different role on the Members page
                first.
              </p>
            </div>
            <LinkButton variant="outline" href="/organization/members">
              Go to Members
            </LinkButton>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {back}
      {/* Keyed so the draft resets if the saved grants change underneath. */}
      <GrantEditor
        key={`${membership.id}:${JSON.stringify(membership.moduleGrants ?? [])}`}
        membership={membership}
        member={member}
        roleName={role?.name ?? "—"}
      />
    </>
  );
}

function toAccess(grants: { moduleId: string; actions: ModuleAction[] }[]) {
  const access: ModuleAccess = {};
  for (const grant of grants) access[grant.moduleId] = grant.actions;
  return access;
}

function GrantEditor({
  membership,
  member,
  roleName,
}: {
  membership: Membership;
  member: User;
  roleName: string;
}) {
  const router = useRouter();
  const { organization, user, entitledModules } = useSession();
  const tree = buildModuleTree(entitledModules);

  const saved = toAccess(
    normalizeGrants(membership.moduleGrants ?? [], entitledModules),
  );
  const [draft, setDraft] = useState<ModuleAccess>(saved);
  const [saving, setSaving] = useState(false);

  const dirty =
    JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(saved));
  const grantedCount = entitledModules.filter(
    (entry) => draft[entry.id],
  ).length;

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
        for (const child of entitledModules) {
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
    if (actions)
      for (const entry of entitledModules) next[entry.id] = [...actions];
    setDraft(next);
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await setMemberModuleGrants(
        membership.id,
        Object.entries(draft).map(([moduleId, actions]) => ({
          moduleId,
          actions,
        })),
        user.id,
      );
      toast.success("Module access saved", {
        description: `${member.name} now has ${pluralize(grantedCount, "module")}.`,
      });
      router.push("/organization/module-access");
    } catch (caught) {
      toast.error(
        caught instanceof ModuleAccessError
          ? caught.message
          : "Could not save module access",
      );
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`Module access for ${member.name}`}
        description={`Applies to ${member.name}'s membership in ${organization?.name} only. In any other organization they belong to, access is set separately.`}
        actions={
          <div className="flex items-center gap-2">
            <UserAvatar name={member.name} className="size-7 text-[10px]" />
            <RoleBadge name={roleName} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick set:</span>
        <Button
          size="xs"
          variant="outline"
          onClick={() => applyToAll(["view"])}
        >
          View everything
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => applyToAll(["view", "create", "edit", "export"])}
        >
          Everything except delete
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => applyToAll(ALL_MODULE_ACTIONS)}
        >
          Everything
        </Button>
        <Button size="xs" variant="ghost" onClick={() => applyToAll(null)}>
          Clear all
        </Button>
      </div>

      <div className="space-y-3">
        {tree.map(({ module: entry, children }) => (
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

      <div className="sticky bottom-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm">
              <span className="font-medium">
                {grantedCount} of {entitledModules.length}
              </span>{" "}
              <span className="text-muted-foreground">
                modules and sub-modules granted
                {dirty ? " · unsaved changes" : ""}
              </span>
            </p>
            <div className="flex gap-2">
              <LinkButton variant="ghost" href="/organization/module-access">
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

/** Stable form for comparing drafts: sorted keys, normalized actions. */
function normalize(access: ModuleAccess): [string, ModuleAction[]][] {
  return Object.keys(access)
    .sort()
    .map((id) => [id, normalizeActions(access[id])]);
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
        {MODULE_ACTIONS.map((action) => {
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
                !on && "opacity-40",
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
