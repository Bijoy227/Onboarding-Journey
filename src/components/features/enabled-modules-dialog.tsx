"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ModulePicker } from "@/components/features/module-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { getEnabledModules, getModuleTree } from "@/lib/permissions/modules";
import {
  EntitlementError,
  setEnabledModules,
} from "@/lib/services/entitlement-service";
import type { Organization } from "@/types";

/**
 * The Platform Admin enables modules for one organization. This replaces plans
 * and billing: the list is the ceiling for everyone inside the organization.
 */
export function EnabledModulesDialog({
  organization,
  onOpenChange,
}: {
  organization: Organization | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={organization !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {organization ? (
          <EnabledModulesForm
            key={organization.id}
            organization={organization}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EnabledModulesForm({
  organization,
  onDone,
}: {
  organization: Organization;
  onDone: () => void;
}) {
  const state = useAppState();
  const { user } = useSession();
  const tree = getModuleTree(state, organization.type);
  const [selected, setSelected] = useState<string[]>(() =>
    getEnabledModules(state, organization.id).map((module) => module.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const result = await setEnabledModules(organization.id, selected, user.id);
      toast.success("Modules updated", {
        description:
          result.enabled.length + result.disabled.length === 0
            ? "Nothing changed."
            : `Takes effect at once for everyone in ${organization.name}.`,
      });
      onDone();
    } catch (caught) {
      setError(
        caught instanceof EntitlementError
          ? caught.message
          : "Could not save the modules.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enabled modules for {organization.name}</DialogTitle>
        <DialogDescription>
          The {organization.type === "brand" ? "Brand" : "Brokerage"} catalog.{" "}
          {organization.type === "brand"
            ? `These apply to ${organization.name}'s members and flow through to everyone at a connected brokerage who works on ${organization.name}.`
            : `These are ${organization.name}'s own tools. On each connected Brand its people also get that Brand's enabled modules.`}{" "}
          Full access picks up changes immediately; Custom grants for a module
          you disable stay dormant until it is enabled again.
        </DialogDescription>
      </DialogHeader>

      <ModulePicker
        tree={tree}
        value={selected}
        onChange={setSelected}
        disabled={pending}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="sticky -bottom-4 z-10 bg-popover!">
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save {selected.length} {selected.length === 1 ? "module" : "modules"}
        </Button>
      </DialogFooter>
    </>
  );
}
