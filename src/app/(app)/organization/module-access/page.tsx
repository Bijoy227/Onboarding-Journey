"use client";

import { ArrowRight, CreditCard, KeyRound, ShieldCheck } from "lucide-react";

import { UserAvatar } from "@/components/common/avatars";
import { MembershipStatusBadge, RoleBadge } from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { pluralize } from "@/lib/format";
import { getModuleAccess } from "@/lib/permissions/modules";

export default function ModuleAccessPage() {
  return (
    <PermissionGuard permission="module.assign">
      <ModuleAccessView />
    </PermissionGuard>
  );
}

function ModuleAccessView() {
  const state = useAppState();
  const { organization, user, plan, entitledModules, can } = useSession();

  if (!organization) return null;

  if (!plan) {
    return (
      <>
        <PageHeader title="Module access" />
        <EmptyState
          icon={CreditCard}
          title="No modules to hand out yet"
          description={`${organization.name} needs a plan before members can be given modules.`}
          action={
            can("billing.manage") ? (
              <LinkButton href="/onboarding/plan">Choose a plan</LinkButton>
            ) : null
          }
        />
      </>
    );
  }

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );
  const topLevel = entitledModules.filter((entry) => !entry.parentId).length;

  return (
    <>
      <PageHeader
        title="Module access"
        description={`${organization.name}'s ${plan.name} plan includes ${pluralize(
          entitledModules.length,
          "module",
        )}. Decide which of them each member can use, and what they can do in each: view, create, edit, delete or export.`}
      />

      <Card>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <Step
            number={1}
            title="The plan"
            text="decides which modules the organization has."
          />
          <Step
            number={2}
            title="The role"
            text="Organization Admins get every module automatically."
          />
          <Step
            number={3}
            title="Module grants"
            text="decide what everyone else can use, action by action."
          />
        </CardContent>
      </Card>

      {memberships.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No members yet"
          description="Invite people first, then give them module access."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (item) => item.id === membership.userId,
                  );
                  const role = state.roles.find(
                    (item) => item.id === membership.roleId,
                  );
                  if (!member) return null;

                  const fullAccess =
                    role?.permissionIds.includes("module.full_access");
                  // Resolved exactly as the member will experience it.
                  const access = getModuleAccess(
                    state,
                    member.id,
                    organization.id,
                  );
                  const granted = entitledModules.filter(
                    (entry) => !entry.parentId && access[entry.id],
                  );

                  return (
                    <TableRow key={membership.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={member.name}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.name}
                              {member.id === user?.id ? (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RoleBadge name={role?.name ?? "—"} />
                          {membership.status !== "active" ? (
                            <MembershipStatusBadge status={membership.status} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fullAccess ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          >
                            <ShieldCheck className="size-3" />
                            Full access via role
                          </Badge>
                        ) : granted.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            No modules
                          </span>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-sm">
                              {granted.length} of {topLevel} modules
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {granted
                                .slice(0, 3)
                                .map((entry) => entry.name)
                                .join(", ")}
                              {granted.length > 3
                                ? ` +${granted.length - 3} more`
                                : ""}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {fullAccess ? null : (
                          <LinkButton
                            size="sm"
                            variant="ghost"
                            href={`/organization/module-access/${membership.id}`}
                          >
                            Edit
                            <ArrowRight className="size-3.5" />
                          </LinkButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {number}
      </span>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span> {text}
      </p>
    </div>
  );
}
