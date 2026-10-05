"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SegmentedControl } from "@/components/common/segmented-control";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/demo/demo-provider";
import {
  OrganizationError,
  createOrganization,
} from "@/lib/services/organization-service";
import type { OrganizationType } from "@/types";

/**
 * The Platform Admin creates an organization (flow F1). It starts with no
 * members and no modules; both are set up from its detail page next.
 */
export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? <CreateForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { user } = useSession();
  const [type, setType] = useState<OrganizationType>("brand");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const organization = await createOrganization({
        name,
        type,
        domain,
        description,
        actorUserId: user.id,
      });
      toast.success(`${organization.name} created`, {
        description: "Next: enable its modules and invite its first admin.",
      });
      onDone();
      router.push(`/platform/organizations/${organization.id}`);
    } catch (caught) {
      setError(
        caught instanceof OrganizationError
          ? caught.message
          : "Could not create the organization.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create organization</DialogTitle>
        <DialogDescription>
          A Brand or a Brokerage. The type can&apos;t change later. It starts
          with no members and no modules.
        </DialogDescription>
      </DialogHeader>

      <form
        id="create-organization-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <SegmentedControl
          label="Organization type"
          value={type}
          onChange={setType}
          disabled={pending}
          options={[
            { value: "brand", label: "Brand" },
            { value: "brokerage", label: "Brokerage" },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="org-name">Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={type === "brand" ? "Fresh Fields Foods" : "Summit Brokerage"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-domain">Email domain (optional)</Label>
          <Input
            id="org-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="freshfields.com"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Added unverified. Try conflicted.com to see a domain conflict.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-description">Description (optional)</Label>
          <Textarea
            id="org-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
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
        <Button type="submit" form="create-organization-form" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create
        </Button>
      </DialogFooter>
    </>
  );
}
