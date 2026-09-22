"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { UserAvatar } from "@/components/common/avatars";
import { RoleBadge } from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/demo/demo-provider";

export default function PlatformUsersPage() {
  return (
    <PlatformAdminGuard>
      <UsersView />
    </PlatformAdminGuard>
  );
}

function UsersView() {
  const state = useAppState();
  const [query, setQuery] = useState("");

  const users = state.users.filter(
    (user) =>
      !query ||
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Every Caboodle account. A user is an independent identity: their access comes from memberships, not from being a Brand or a Brokerage."
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users match" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Memberships</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const memberships = state.memberships.filter(
                    (membership) =>
                      membership.userId === user.id &&
                      membership.status !== "removed",
                  );

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Link
                          href={`/platform/users/${user.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <UserAvatar
                            name={user.name}
                            className="size-7 text-[10px]"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium hover:underline">
                                {user.name}
                              </p>
                              {user.isPlatformAdmin ? (
                                <Badge variant="secondary">Platform Admin</Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {memberships.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No memberships
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {memberships.map((membership) => {
                              const organization = state.organizations.find(
                                (org) => org.id === membership.organizationId,
                              );
                              const role = state.roles.find(
                                (item) => item.id === membership.roleId,
                              );
                              return (
                                <span
                                  key={membership.id}
                                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                                >
                                  <span className="font-medium">
                                    {organization?.name}
                                  </span>
                                  <RoleBadge name={role?.name ?? "—"} />
                                </span>
                              );
                            })}
                          </div>
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
