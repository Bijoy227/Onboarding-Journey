"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";

import { PermissionGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
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
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  getAssignableRoles,
} from "@/lib/permissions/permissions";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";

export default function RolesPage() {
  return (
    <PermissionGuard permission="role.view">
      <RolesView />
    </PermissionGuard>
  );
}

function RolesView() {
  const state = useAppState();
  const { organization, role: myRole } = useSession();
  const roles = organization ? getAssignableRoles(state, organization.type) : [];
  const [selectedId, setSelectedId] = useState<string | null>(
    roles[0]?.id ?? null,
  );

  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a named collection of permissions. Roles attach to memberships, so the same person can hold different roles in different organizations."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-2">
          {roles.map((role) => {
            const holders = state.memberships.filter(
              (membership) =>
                membership.organizationId === organization?.id &&
                membership.roleId === role.id &&
                membership.status === "active",
            ).length;

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedId(role.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors hover:bg-accent",
                  selected?.id === role.id && "border-primary bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{role.name}</p>
                  {myRole?.id === role.id ? (
                    <Badge variant="secondary">Your role</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pluralize(role.permissionIds.length, "permission")} ·{" "}
                  {pluralize(holders, "member")}
                </p>
              </button>
            );
          })}
        </div>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <CardDescription>{selected.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {PERMISSION_GROUPS.map((group) => {
                const permissions = PERMISSIONS.filter(
                  (permission) => permission.group === group,
                );
                return (
                  <div key={group} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </p>
                    <ul className="space-y-1.5">
                      {permissions.map((permission) => {
                        const granted = selected.permissionIds.includes(
                          permission.id,
                        );
                        return (
                          <li
                            key={permission.id}
                            className={cn(
                              "flex items-start gap-2 text-sm",
                              !granted && "text-muted-foreground",
                            )}
                          >
                            {granted ? (
                              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Minus className="mt-0.5 size-4 shrink-0" />
                            )}
                            <span className="flex-1">
                              {permission.name}
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {permission.id}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
          <CardDescription>
            Every role in this organization, side by side.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Permission</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="text-center">
                      {role.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-mono text-xs">
                      {permission.id}
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={role.id} className="text-center">
                        {role.permissionIds.includes(permission.id) ? (
                          <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="mx-auto size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
