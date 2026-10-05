"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { OrganizationAvatar } from "@/components/common/avatars";
import { ConnectionStatusBadge } from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate, pluralize } from "@/lib/format";
import {
  ConnectionError,
  connectBrand,
  endConnection,
  getConnectableOrganizations,
  setConnectionStatus,
} from "@/lib/services/connection-service";
import { cn } from "@/lib/utils";
import type { AppState, BrandConnection, Organization } from "@/types";

/**
 * Connect a Brand to a Brokerage (flow F2). Platform Admin only. The
 * connection is active at once: there is no request or approval, and the
 * Brokerage Admin can use the Brand straight away.
 */
export function ConnectDialog({
  open,
  onOpenChange,
  fixedOrganization,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select one side, e.g. from an organization's detail page. */
  fixedOrganization?: Organization;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <ConnectForm
            fixedOrganization={fixedOrganization}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ConnectForm({
  fixedOrganization,
  onDone,
}: {
  fixedOrganization?: Organization;
  onDone: () => void;
}) {
  const state = useAppState();
  const { user } = useSession();
  const brokerages = state.organizations.filter((org) => org.type === "brokerage");
  const [brokerageId, setBrokerageId] = useState<string | null>(
    fixedOrganization?.type === "brokerage" ? fixedOrganization.id : null,
  );
  const [brandId, setBrandId] = useState<string | null>(
    fixedOrganization?.type === "brand" ? fixedOrganization.id : null,
  );
  const [regions, setRegions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const brokerage = state.organizations.find((org) => org.id === brokerageId);
  const brand = state.organizations.find((org) => org.id === brandId);
  const brandOptions = brokerage
    ? getConnectableOrganizations(state, brokerage)
    : state.organizations.filter((org) => org.type === "brand");
  const brokerageOptions = brand
    ? getConnectableOrganizations(state, brand)
    : brokerages;

  async function submit() {
    if (!user || !brokerageId || !brandId) return;
    setPending(true);
    setError(null);
    try {
      await connectBrand({
        brokerageOrganizationId: brokerageId,
        brandOrganizationId: brandId,
        regions: regions.split(","),
        actorUserId: user.id,
      });
      toast.success(`${brand?.name} connected to ${brokerage?.name}`, {
        description: `${brokerage?.name}'s admins have full access to it now. Brokers get it once they're assigned.`,
      });
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ConnectionError
          ? caught.message
          : "Could not connect the organizations.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {fixedOrganization?.type === "brokerage"
            ? `Connect a Brand to ${fixedOrganization.name}`
            : fixedOrganization
              ? `Connect ${fixedOrganization.name} to a Brokerage`
              : "Connect a Brand to a Brokerage"}
        </DialogTitle>
        <DialogDescription>
          Takes effect immediately. A connection only makes the Brand
          assignable inside the Brokerage; it holds no permissions itself.
        </DialogDescription>
      </DialogHeader>

      <form
        id="connect-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="connect-brokerage">Brokerage</Label>
          <FieldSelect
            id="connect-brokerage"
            className="w-full"
            value={brokerageId}
            onChange={setBrokerageId}
            disabled={fixedOrganization?.type === "brokerage" || pending}
            placeholder="Select a Brokerage"
            options={(fixedOrganization?.type === "brokerage"
              ? [fixedOrganization]
              : brokerageOptions
            ).map((org) => ({ value: org.id, label: org.name }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="connect-brand">Brand</Label>
          <FieldSelect
            id="connect-brand"
            className="w-full"
            value={brandId}
            onChange={setBrandId}
            disabled={fixedOrganization?.type === "brand" || pending}
            placeholder="Select a Brand"
            options={(fixedOrganization?.type === "brand"
              ? [fixedOrganization]
              : brandOptions
            ).map((org) => ({ value: org.id, label: org.name }))}
          />
          {fixedOrganization && brandOptions.length === 0 && brokerageOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Already connected to everything it can be.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="connect-regions">Regions (optional)</Label>
          <Input
            id="connect-regions"
            value={regions}
            onChange={(event) => setRegions(event.target.value)}
            placeholder="Northeast, Mid-Atlantic"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Metadata only: regions don&apos;t restrict any data.
          </p>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="connect-form"
          disabled={pending || !brokerageId || !brandId}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Connect
        </Button>
      </DialogFooter>
    </>
  );
}

/** Brand Access rows that ending this connection would remove. */
function assignmentsOn(state: AppState, connection: BrandConnection): number {
  const membershipIds = new Set(
    state.memberships
      .filter(
        (membership) =>
          membership.organizationId === connection.brokerageOrganizationId,
      )
      .map((membership) => membership.id),
  );
  return state.brandAccess.filter(
    (row) =>
      !row.deletedAt &&
      row.brandOrganizationId === connection.brandOrganizationId &&
      membershipIds.has(row.membershipId),
  ).length;
}

/**
 * Connections with the Platform Admin's controls: suspend pauses access and
 * keeps assignments, resume restores them, end removes them.
 */
export function ConnectionList({
  connections,
  emptyText = "No connections.",
}: {
  connections: BrandConnection[];
  emptyText?: string;
}) {
  const state = useAppState();
  const { user } = useSession();
  const [ending, setEnding] = useState<BrandConnection | null>(null);

  if (connections.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  async function onStatus(
    connection: BrandConnection,
    status: "active" | "suspended",
  ) {
    if (!user) return;
    try {
      await setConnectionStatus(connection.id, status, user.id);
      toast.success(
        status === "suspended" ? "Connection suspended" : "Connection resumed",
        {
          description:
            status === "suspended"
              ? "Every user at the Brokerage lost this Brand at once. Assignments are kept."
              : "Assignments are back exactly as they were.",
        },
      );
    } catch (caught) {
      toast.error(
        caught instanceof ConnectionError
          ? caught.message
          : "Could not update the connection",
      );
    }
  }

  async function onEnd(connection: BrandConnection) {
    if (!user) return;
    try {
      const removed = await endConnection(connection.id, user.id);
      toast.success("Connection ended", {
        description:
          removed > 0
            ? `${pluralize(removed, "brand assignment")} removed. Reconnecting later starts with none.`
            : "Reconnecting later starts with no assignments.",
      });
    } catch {
      toast.error("Could not end the connection");
    } finally {
      setEnding(null);
    }
  }

  const endingBrokerage = state.organizations.find(
    (org) => org.id === ending?.brokerageOrganizationId,
  );
  const endingBrand = state.organizations.find(
    (org) => org.id === ending?.brandOrganizationId,
  );

  return (
    <>
      <ul className="space-y-2">
        {connections.map((connection) => {
          const brokerage = state.organizations.find(
            (org) => org.id === connection.brokerageOrganizationId,
          );
          const brand = state.organizations.find(
            (org) => org.id === connection.brandOrganizationId,
          );
          if (!brokerage || !brand) return null;
          const assignments = assignmentsOn(state, connection);

          return (
            <li
              key={connection.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center",
                connection.status === "ended" && "opacity-70",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <OrgLink organization={brokerage} />
                <ArrowLeftRight className="size-3.5 shrink-0 text-muted-foreground" />
                <OrgLink organization={brand} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {connection.regions?.length
                    ? connection.regions.join(", ")
                    : "No region"}
                </span>
                <span>·</span>
                <span>
                  {connection.status === "ended" && connection.endedAt
                    ? `ended ${formatDate(connection.endedAt)}`
                    : `${pluralize(assignments, "assignment")} · since ${formatDate(connection.connectedAt)}`}
                </span>
                <ConnectionStatusBadge status={connection.status} />
                {connection.status !== "ended" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Connection actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {connection.status === "active" ? (
                        <DropdownMenuItem
                          onClick={() => void onStatus(connection, "suspended")}
                        >
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => void onStatus(connection, "active")}
                        >
                          Resume
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setEnding(connection)}
                      >
                        End connection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={ending !== null}
        onOpenChange={(open) => {
          if (!open) setEnding(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this connection?</AlertDialogTitle>
            <AlertDialogDescription>
              {endingBrokerage?.name} loses {endingBrand?.name} for everyone,
              and{" "}
              {ending
                ? pluralize(assignmentsOn(state, ending), "brand assignment")
                : "its assignments"}{" "}
              {ending && assignmentsOn(state, ending) === 1 ? "is" : "are"}{" "}
              removed (kept in history). Reconnecting later starts with no
              assignments. To pause access and keep assignments, suspend
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ending) void onEnd(ending);
              }}
            >
              End connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OrgLink({ organization }: { organization: Organization }) {
  return (
    <Link
      href={`/platform/organizations/${organization.id}`}
      className="flex min-w-0 items-center gap-2 hover:underline"
    >
      <OrganizationAvatar
        organization={organization}
        className="size-6 shrink-0 text-[10px]"
      />
      <span className="truncate text-sm font-medium">{organization.name}</span>
    </Link>
  );
}
