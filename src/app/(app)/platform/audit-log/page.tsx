"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { FieldSelect } from "@/components/common/field-select";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { PageHeader } from "@/components/common/states";
import { ActivityFeed } from "@/components/features/activity-feed";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppState } from "@/lib/demo/demo-provider";
import { resetDemo } from "@/lib/services/auth-service";

export default function AuditLogPage() {
  return (
    <PlatformAdminGuard>
      <AuditLogView />
    </PlatformAdminGuard>
  );
}

function AuditLogView() {
  const state = useAppState();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("all");
  const [resetOpen, setResetOpen] = useState(false);

  const events =
    organizationId === "all"
      ? state.auditEvents
      : state.auditEvents.filter(
          (event) => event.organizationId === organizationId,
        );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Identity and access events across the platform. Not exhaustive: it exists to show that these events are trackable in this model."
        actions={
          <FieldSelect
            options={[
              { value: "all", label: "All organizations" },
              ...state.organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              })),
            ]}
            value={organizationId}
            onChange={setOrganizationId}
          />
        }
      />

      <Card>
        <CardContent className="py-5">
          <ActivityFeed events={events} />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Demo controls</CardTitle>
          <CardDescription>
            Restore the original demo organizations, users, memberships,
            invitations and relationships. Useful between walkthroughs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the original demo organizations, users,
              memberships, invitations and relationships, and sign you out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemo();
                toast.success("Demo data restored");
                router.push("/login");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
