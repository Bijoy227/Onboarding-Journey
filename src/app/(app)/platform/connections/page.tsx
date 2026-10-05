"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FieldSelect } from "@/components/common/field-select";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import {
  ConnectDialog,
  ConnectionList,
} from "@/components/features/connection-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/lib/demo/demo-provider";

export default function PlatformConnectionsPage() {
  return (
    <PlatformAdminGuard>
      <ConnectionsView />
    </PlatformAdminGuard>
  );
}

function ConnectionsView() {
  const state = useAppState();
  const [status, setStatus] = useState("open");
  const [connecting, setConnecting] = useState(false);

  const connections = state.brandConnections
    .filter((connection) =>
      status === "open"
        ? connection.status !== "ended"
        : status === "all"
          ? true
          : connection.status === status,
    )
    .sort(
      (a, b) =>
        Number(a.status === "ended") - Number(b.status === "ended") ||
        b.connectedAt.localeCompare(a.connectedAt),
    );

  return (
    <>
      <PageHeader
        title="Connections"
        description="Which Brokerages work with which Brands. Only the Platform Admin connects, suspends and ends them; there is no request or approval. A Brand can be connected to many Brokerages and a Brokerage to many Brands."
        actions={
          <Button size="sm" onClick={() => setConnecting(true)}>
            <Plus className="size-4" />
            Connect
          </Button>
        }
      />

      <div className="flex justify-end">
        <FieldSelect
          className="w-48"
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: "Active and suspended" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "ended", label: "Ended" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <Card>
        <CardContent>
          <ConnectionList
            connections={connections}
            emptyText="No connections match."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Active:</span> the
            Brokerage Admin has full access to the Brand at once, and can assign
            brokers to it.
          </p>
          <p>
            <span className="font-medium text-foreground">Suspended:</span>{" "}
            everyone at the Brokerage loses the Brand immediately. Assignments
            are kept, and resuming restores them unchanged.
          </p>
          <p>
            <span className="font-medium text-foreground">Ended:</span>{" "}
            assignments are removed (kept in history). Reconnecting later
            starts with none.
          </p>
        </CardContent>
      </Card>

      <ConnectDialog open={connecting} onOpenChange={setConnecting} />
    </>
  );
}
