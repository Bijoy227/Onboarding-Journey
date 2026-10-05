"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BrandChecklist } from "@/components/features/brand-checklist";
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
import {
  getBrandAccessRows,
  getReachableBrands,
} from "@/lib/permissions/access";
import {
  BrandAccessError,
  setMemberBrands,
} from "@/lib/services/brand-access-service";
import type { Membership } from "@/types";

/**
 * Sets the full list of Brands a Broker works on (flow F3). New Brands start
 * at Full; unticking a Brand removes that assignment.
 */
export function AssignBrandsDialog({
  membership,
  onOpenChange,
}: {
  membership: Membership | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={membership !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {membership ? (
          <AssignBrandsForm
            key={membership.id}
            membership={membership}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AssignBrandsForm({
  membership,
  onDone,
}: {
  membership: Membership;
  onDone: () => void;
}) {
  const state = useAppState();
  const { user } = useSession();
  const organization = state.organizations.find(
    (org) => org.id === membership.organizationId,
  );
  const member = state.users.find((item) => item.id === membership.userId);
  const connected = organization ? getReachableBrands(state, organization) : [];
  const connectedIds = new Set(connected.map((brand) => brand.id));

  const [brandIds, setBrandIds] = useState<string[]>(() =>
    getBrandAccessRows(state, membership.id)
      .map((row) => row.brandOrganizationId)
      .filter((id) => connectedIds.has(id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      await setMemberBrands(membership.id, brandIds, user.id);
      toast.success("Brands updated", {
        description: `${member?.name} works on ${brandIds.length} ${
          brandIds.length === 1 ? "Brand" : "Brands"
        }. New assignments start at Full access.`,
      });
      onDone();
    } catch (caught) {
      setError(
        caught instanceof BrandAccessError
          ? caught.message
          : "Could not update the Brands.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Brands for {member?.name}</DialogTitle>
        <DialogDescription>
          Choose the connected Brands {member?.name} works on in{" "}
          {organization?.name}. A new Brand starts with every module{" "}
          {organization?.name} has enabled; restrict it afterwards if needed.
        </DialogDescription>
      </DialogHeader>

      <BrandChecklist
        brands={connected}
        value={brandIds}
        onChange={setBrandIds}
        disabled={pending}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save brands
        </Button>
      </DialogFooter>
    </>
  );
}
