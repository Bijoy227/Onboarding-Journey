"use client";

import { Globe } from "lucide-react";
import { toast } from "sonner";

import { DomainStatusBadge } from "@/components/common/badges";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/format";
import { unverifyDomain, verifyDomain } from "@/lib/services/domain-service";

export default function PlatformDomainsPage() {
  return (
    <PlatformAdminGuard>
      <DomainsView />
    </PlatformAdminGuard>
  );
}

function DomainsView() {
  const state = useAppState();
  const { user } = useSession();

  if (!user) return null;

  /** Domains claimed by more than one organization, which need intervention. */
  const duplicates = new Set(
    state.domains
      .map((domain) => domain.domain.toLowerCase())
      .filter(
        (domain, index, all) => all.indexOf(domain) !== index,
      ),
  );

  return (
    <>
      <PageHeader
        title="Domain verification"
        description="Verify or reset any organization's domain. Useful for support cases and for demonstrating both states side by side."
      />

      {duplicates.size > 0 ? (
        <Alert>
          <AlertDescription>
            {duplicates.size} domain(s) are claimed by more than one
            organization. Domain ownership is a controlled resource, so these
            would need to be resolved before both could use them.
          </AlertDescription>
        </Alert>
      ) : null}

      {state.domains.length === 0 ? (
        <EmptyState icon={Globe} title="No domains" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.domains.map((domain) => {
                  const organization = state.organizations.find(
                    (org) => org.id === domain.organizationId,
                  );

                  return (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {domain.domain}
                          </span>
                          {domain.isPrimary ? (
                            <Badge variant="secondary">Primary</Badge>
                          ) : null}
                        </div>
                        {domain.verifiedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Verified {formatDate(domain.verifiedAt)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{organization?.name}</span>
                      </TableCell>
                      <TableCell>
                        <DomainStatusBadge verified={domain.verified} />
                      </TableCell>
                      <TableCell className="text-right">
                        {domain.verified ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await unverifyDomain(domain.id, user.id);
                              toast.success("Verification reset");
                            }}
                          >
                            Reset
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await verifyDomain(domain.id, user.id);
                              toast.success("Domain verified");
                            }}
                          >
                            Verify
                          </Button>
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
