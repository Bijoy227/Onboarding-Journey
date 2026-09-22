"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LinkButton } from "@/components/common/link-button";
import { OrganizationAvatar, UserAvatar } from "@/components/common/avatars";
import {
  MembershipStatusBadge,
  OrganizationTypeBadge,
  RoleBadge,
} from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/lib/demo/demo-provider";
import { formatDate } from "@/lib/format";

export default function PlatformUserDetailPage({
  params,
}: PageProps<"/platform/users/[userId]">) {
  const { userId } = use(params);
  return (
    <PlatformAdminGuard>
      <UserDetail userId={userId} />
    </PlatformAdminGuard>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const state = useAppState();
  const user = state.users.find((candidate) => candidate.id === userId);

  if (!user) {
    return (
      <EmptyState
        title="User not found"
        action={
          <LinkButton variant="outline" href="/platform/users">
            Back to users
          </LinkButton>
        }
      />
    );
  }

  const memberships = state.memberships.filter(
    (membership) =>
      membership.userId === user.id && membership.status !== "removed",
  );
  const events = state.auditEvents.filter(
    (event) => event.actorUserId === user.id,
  );

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="-ml-2 w-fit" href="/platform/users">
        <ArrowLeft className="size-4" />
        All users
      </LinkButton>

      <PageHeader title={user.name} description={user.email} />

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <UserAvatar name={user.name} className="size-12 text-base" />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {user.status}
              </Badge>
              {user.isPlatformAdmin ? (
                <Badge variant="secondary">Platform Admin</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Account created {formatDate(user.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memberships</CardTitle>
          <CardDescription>
            One identity can hold memberships in several organizations, with a
            different role in each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <EmptyState
              title="No memberships"
              description="This account is not a member of any organization yet."
            />
          ) : (
            <ul className="space-y-2">
              {memberships.map((membership) => {
                const organization = state.organizations.find(
                  (org) => org.id === membership.organizationId,
                );
                const role = state.roles.find(
                  (item) => item.id === membership.roleId,
                );
                if (!organization) return null;
                return (
                  <li
                    key={membership.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
                  >
                    <OrganizationAvatar
                      organization={organization}
                      className="size-8"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/platform/organizations/${organization.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {organization.name}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        Joined via {membership.source.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrganizationTypeBadge type={organization.type} />
                      <RoleBadge name={role?.name ?? "—"} />
                      <MembershipStatusBadge status={membership.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={events} emptyLabel="No recorded activity" />
        </CardContent>
      </Card>
    </>
  );
}
