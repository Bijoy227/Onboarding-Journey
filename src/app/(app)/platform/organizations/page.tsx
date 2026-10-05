"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  DomainStatusBadge,
  OrganizationStatusBadge,
  OrganizationTypeBadge,
} from "@/components/common/badges";
import { FieldSelect } from "@/components/common/field-select";
import { PlatformAdminGuard } from "@/components/common/permission-guard";
import { EmptyState, PageHeader } from "@/components/common/states";
import { CreateOrganizationDialog } from "@/components/features/create-organization-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/demo/demo-provider";
import { getEnabledModules } from "@/lib/permissions/modules";
import { getConnectionsForOrganization } from "@/lib/services/connection-service";

export default function PlatformOrganizationsPage() {
  return (
    <PlatformAdminGuard>
      <OrganizationsView />
    </PlatformAdminGuard>
  );
}

function OrganizationsView() {
  const state = useAppState();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState("all");
  const [creating, setCreating] = useState(false);

  const rows = state.organizations
    .map((organization) => {
      const domains = state.domains.filter(
        (domain) => domain.organizationId === organization.id,
      );
      const primary = domains.find((domain) => domain.isPrimary) ?? domains[0];
      const memberCount = state.memberships.filter(
        (membership) =>
          membership.organizationId === organization.id &&
          membership.status === "active",
      ).length;
      const moduleCount = getEnabledModules(state, organization.id).length;
      const connectionCount = getConnectionsForOrganization(
        state,
        organization.id,
      ).filter((connection) => connection.status === "active").length;

      return { organization, primary, memberCount, moduleCount, connectionCount };
    })
    .filter(({ organization, primary }) => {
      if (query && !organization.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (type !== "all" && organization.type !== type) return false;
      if (status !== "all" && organization.status !== status) return false;
      if (verification === "verified" && !primary?.verified) return false;
      if (verification === "unverified" && primary?.verified) return false;
      return true;
    });

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Every Brand and Brokerage on the platform. Customers create their own through self-service; you can also set one up here. Only the Platform Admin enables modules and connects Brands to Brokerages."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Create organization
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search organizations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <FieldSelect
          className="w-full"
          options={[
            { value: "all", label: "All types" },
            { value: "brand", label: "Brand" },
            { value: "brokerage", label: "Brokerage" },
          ]}
          value={type}
          onChange={setType}
        />
        <FieldSelect
          className="w-full"
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
          value={status}
          onChange={setStatus}
        />
        <FieldSelect
          className="w-full"
          options={[
            { value: "all", label: "Any verification" },
            { value: "verified", label: "Verified domain" },
            { value: "unverified", label: "Unverified domain" },
          ]}
          value={verification}
          onChange={setVerification}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations match"
          description="Adjust the filters to see more."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Modules
                  </TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Connections
                  </TableHead>
                  <TableHead className="text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ organization, primary, memberCount, moduleCount, connectionCount }) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <Link
                        href={`/platform/organizations/${organization.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <OrganizationAvatar
                          organization={organization}
                          className="size-7 text-[10px]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium hover:underline">
                            {organization.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <OrganizationTypeBadge type={organization.type} />
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {primary ? (
                        <div className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs">
                            {primary.domain}
                          </span>
                          <DomainStatusBadge verified={primary.verified} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No domain
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OrganizationStatusBadge status={organization.status} />
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <span
                        className={
                          moduleCount === 0
                            ? "text-sm text-amber-700 dark:text-amber-400"
                            : "text-sm"
                        }
                      >
                        {moduleCount === 0 ? "None" : moduleCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <span className="text-sm">{connectionCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm">{memberCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CreateOrganizationDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
