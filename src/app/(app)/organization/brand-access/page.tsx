"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Blocks, KeyRound } from "lucide-react";

import { UserAvatar } from "@/components/common/avatars";
import {
  BrandAccessBadge,
  MembershipStatusBadge,
  RoleBadge,
} from "@/components/common/badges";
import { LinkButton } from "@/components/common/link-button";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { AssignBrandsDialog } from "@/components/features/assign-brands-dialog";
import { Button } from "@/components/ui/button";
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
import {
  getReachableBrands,
  resolveMembershipBrands,
  type ResolvedBrand,
} from "@/lib/permissions/access";
import { getRole } from "@/lib/permissions/permissions";
import type { Membership } from "@/types";

export default function BrandAccessPage() {
  return (
    <PermissionGuard permission="access.manage">
      <BrandAccessView />
    </PermissionGuard>
  );
}

function BrandAccessView() {
  const state = useAppState();
  const { organization, user, enabledModules } = useSession();
  const [assigning, setAssigning] = useState<Membership | null>(null);

  if (!organization) return null;
  const isBrokerage = organization.type === "brokerage";
  const connected = isBrokerage ? getReachableBrands(state, organization) : [];

  const memberships = state.memberships.filter(
    (membership) =>
      membership.organizationId === organization.id &&
      membership.status !== "removed",
  );

  return (
    <>
      <PageHeader
        title="Brand access"
        description={
          isBrokerage
            ? `Which connected Brands each person works on, and what they can do on each one. ${organization.name} has ${pluralize(
                enabledModules.length,
                "module",
              )} of its own and ${pluralize(connected.length, "connected Brand")}; each Brand adds the modules it has enabled.`
            : `What each member can do on ${organization.name}'s data. ${organization.name} has ${pluralize(
                enabledModules.length,
                "module",
              )} enabled.`
        }
      />

      <Card>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <Step
            number={1}
            title="Enabled modules"
            text={
              isBrokerage
                ? "are set by the Platform Admin: the Brokerage's own, plus each Brand's own on that Brand. Nobody here can go above them."
                : "are set by the Platform Admin. Nobody here can go above them."
            }
          />
          <Step
            number={2}
            title="Admins"
            text={
              isBrokerage
                ? "get every enabled module on every connected Brand, from the role."
                : "get every enabled module, from the role."
            }
          />
          <Step
            number={3}
            title="Everyone else"
            text={
              isBrokerage
                ? "works on the Brands assigned here, each Full or Custom."
                : "has one Brand Access: Full, or a custom list of modules."
            }
          />
        </CardContent>
      </Card>

      {!isBrokerage && enabledModules.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="No modules enabled yet"
          description={`The Platform Admin hasn't enabled any modules for ${organization.name}, so there is nothing to hand out. Full access will pick them up automatically once they are.`}
        />
      ) : null}

      {memberships.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No members yet"
          description="Invite people first, then decide what they can do."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead>{isBrokerage ? "Brands" : "Access"}</TableHead>
                  <TableHead className="w-10 pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => {
                  const member = state.users.find(
                    (item) => item.id === membership.userId,
                  );
                  const role = getRole(state, membership.roleId);
                  if (!member) return null;
                  const brands = resolveMembershipBrands(state, membership);

                  return (
                    <TableRow
                      key={membership.id}
                      id={`member-${membership.id}`}
                      className="scroll-mt-20 target:bg-accent/60"
                    >
                      <TableCell className="pl-4 align-top">
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
                      <TableCell className="hidden align-top sm:table-cell">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RoleBadge name={role?.name ?? "—"} />
                          {membership.status !== "active" ? (
                            <MembershipStatusBadge status={membership.status} />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {role?.hasFullBrandAccess ? (
                          <div className="space-y-1">
                            <BrandAccessBadge kind="admin" />
                            <p className="text-xs text-muted-foreground">
                              {isBrokerage
                                ? `Every connected Brand (${connected.length}), worked out from the role.`
                                : "Every enabled module, worked out from the role."}
                            </p>
                          </div>
                        ) : brands.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {isBrokerage ? "No brands assigned" : "No access"}
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {brands.map((entry) => (
                              <BrandAccessLink
                                key={entry.brand.id}
                                entry={entry}
                                showBrand={isBrokerage}
                                enabledCount={entry.available.length}
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right align-top">
                        {isBrokerage && !role?.hasFullBrandAccess ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAssigning(membership)}
                          >
                            Assign brands
                          </Button>
                        ) : !isBrokerage && brands[0]?.brandAccess ? (
                          <LinkButton
                            size="sm"
                            variant="ghost"
                            href={`/organization/brand-access/${brands[0].brandAccess.id}`}
                          >
                            Edit
                            <ArrowRight className="size-3.5" />
                          </LinkButton>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AssignBrandsDialog
        membership={assigning}
        onOpenChange={(open) => {
          if (!open) setAssigning(null);
        }}
      />
    </>
  );
}

function BrandAccessLink({
  entry,
  showBrand,
  enabledCount,
}: {
  entry: ResolvedBrand;
  showBrand: boolean;
  enabledCount: number;
}) {
  const granted = Object.keys(entry.modules).length;
  const body = (
    <>
      {showBrand ? (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {entry.brand.name}
        </span>
      ) : null}
      <BrandAccessBadge kind={entry.kind} />
      <span className="text-xs text-muted-foreground">
        {entry.kind === "full"
          ? "every enabled module"
          : `${granted} of ${enabledCount} modules`}
      </span>
    </>
  );

  if (!entry.brandAccess) {
    return <div className="flex items-center gap-2">{body}</div>;
  }
  return (
    <Link
      href={`/organization/brand-access/${entry.brandAccess.id}`}
      className="flex max-w-md items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-accent"
    >
      {body}
      <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
    </Link>
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
