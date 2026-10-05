"use client";

import { useState } from "react";
import { Globe, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { DomainStatusBadge } from "@/components/common/badges";
import { PermissionGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { DomainVerificationPanel } from "@/components/features/domain-verification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import { formatDate } from "@/lib/format";
import { DomainError, addDomain, removeDomain } from "@/lib/services/domain-service";

export default function DomainsPage() {
  return (
    <PermissionGuard permission="domain.view">
      <DomainsView />
    </PermissionGuard>
  );
}

function DomainsView() {
  const state = useAppState();
  const { organization, user, can } = useSession();
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!organization || !user) return null;

  const domains = state.domains.filter(
    (domain) => domain.organizationId === organization.id,
  );

  return (
    <>
      <PageHeader
        title="Domains"
        description="Verified domains let people discover this organization from their work email, and drive the membership policy."
        actions={
          can("domain.manage") ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add domain
            </Button>
          ) : null
        }
      />

      {domains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No domains yet"
          description="Add a domain so colleagues can find this organization from their work email."
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardContent className="space-y-4 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-sm">{domain.domain}</span>
                  {domain.isPrimary ? (
                    <Badge variant="secondary">Primary</Badge>
                  ) : null}
                  <DomainStatusBadge verified={domain.verified} />
                  <div className="ml-auto flex items-center gap-2">
                    {domain.verified && domain.verifiedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Verified {formatDate(domain.verifiedAt)}
                      </span>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpanded(expanded === domain.id ? null : domain.id)
                      }
                    >
                      {expanded === domain.id
                        ? "Hide details"
                        : "View verification details"}
                    </Button>
                    {can("domain.manage") && !domain.isPrimary ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await removeDomain(domain.id, user.id);
                            toast.success("Domain removed");
                          } catch (caught) {
                            toast.error(
                              caught instanceof DomainError
                                ? caught.message
                                : "Could not remove the domain",
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                {expanded === domain.id ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    {can("domain.manage") ? (
                      <DomainVerificationPanel
                        domain={domain}
                        organizationName={organization.name}
                        actorUserId={user.id}
                      />
                    ) : (
                      <Alert>
                        <AlertDescription>
                          Only an admin can run domain
                          verification.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Why domain verification exists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Domain verification establishes that the organization controls the
            domain. It can then be used to improve organization discovery and
            membership controls.
          </p>
          <p>
            It does <strong className="text-foreground">not</strong> mean only
            users with this domain can ever belong to the organization. External
            collaborators can still be invited explicitly.
          </p>
        </CardContent>
      </Card>

      <AddDomainDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        organizationId={organization.id}
        actorUserId={user.id}
      />
    </>
  );
}

function AddDomainDialog({
  open,
  onOpenChange,
  organizationId,
  actorUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  actorUserId: string;
}) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await addDomain({ organizationId, domain, actorUserId });
      toast.success("Domain added", {
        description: "It starts unverified until the DNS record is confirmed.",
      });
      setDomain("");
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof DomainError
          ? caught.message
          : "Could not add the domain.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add domain</DialogTitle>
          <DialogDescription>
            Claim another email domain for this organization.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-domain-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.acmefoods.com"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              required
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-domain-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
