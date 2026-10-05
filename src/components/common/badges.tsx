import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { BrandAccessKind } from "@/lib/permissions/access";
import { cn } from "@/lib/utils";
import type {
  AccessRequestStatus,
  BrandConnectionStatus,
  InvitationStatus,
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@/types";

/**
 * One consistent vocabulary of status colours across the whole prototype, so
 * "Pending" always looks the same whether it is a domain, an invitation, a
 * membership or a connection.
 */
type Tone = "positive" | "pending" | "negative" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  positive:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  pending:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  negative: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASS[tone], className)}>
      {children}
    </Badge>
  );
}

export function DomainStatusBadge({ verified }: { verified: boolean }) {
  return (
    <ToneBadge tone={verified ? "positive" : "pending"}>
      {verified ? "Verified" : "Unverified"}
    </ToneBadge>
  );
}

export function OrganizationStatusBadge({
  status,
}: {
  status: OrganizationStatus;
}) {
  return (
    <ToneBadge tone={status === "active" ? "positive" : "negative"}>
      {status === "active" ? "Active" : "Suspended"}
    </ToneBadge>
  );
}

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const tone: Tone =
    status === "active"
      ? "positive"
      : status === "suspended"
        ? "negative"
        : "neutral";
  const label =
    status === "active"
      ? "Active"
      : status === "suspended"
        ? "Suspended"
        : "Removed";
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const tone: Tone =
    status === "accepted"
      ? "positive"
      : status === "pending"
        ? "pending"
        : "neutral";
  const label =
    status.charAt(0).toUpperCase() + status.slice(1);
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

export function AccessRequestStatusBadge({
  status,
}: {
  status: AccessRequestStatus;
}) {
  const tone: Tone =
    status === "approved"
      ? "positive"
      : status === "pending"
        ? "pending"
        : "negative";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

export function ConnectionStatusBadge({
  status,
}: {
  status: BrandConnectionStatus;
}) {
  const tone: Tone =
    status === "active" ? "positive" : status === "suspended" ? "pending" : "neutral";
  const label =
    status === "active" ? "Connected" : status === "suspended" ? "Suspended" : "Ended";
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

/**
 * How someone reaches a Brand: derived from an admin role or support access,
 * or a Brand Access row that is Full or Custom.
 */
export function BrandAccessBadge({ kind }: { kind: BrandAccessKind }) {
  if (kind === "custom") {
    return (
      <Badge
        variant="outline"
        className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
      >
        Custom
      </Badge>
    );
  }
  return (
    <ToneBadge tone="positive">
      {kind === "full" ? null : <ShieldCheck className="size-3" />}
      {kind === "admin" ? "Full via role" : kind === "support" ? "Support" : "Full"}
    </ToneBadge>
  );
}

/** Brand vs Brokerage. Deliberately visually distinct, since the difference
 * between the two organization types is the heart of the demo. */
export function OrganizationTypeBadge({ type }: { type: OrganizationType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        type === "brand"
          ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
          : "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
      )}
    >
      {type === "brand" ? "Brand" : "Brokerage"}
    </Badge>
  );
}

export function RoleBadge({ name }: { name: string }) {
  return <Badge variant="secondary">{name}</Badge>;
}
