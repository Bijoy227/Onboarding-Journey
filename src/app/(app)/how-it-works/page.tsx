"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  Building2,
  Globe,
  IdCard,
  KeyRound,
  ShieldCheck,
  Store,
  UserCheck,
} from "lucide-react";

import { PageHeader } from "@/components/common/states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The explainer used during the client demo.
 *
 * Written in business language on purpose: the customer should never need to
 * know the words RBAC, membership table or DNS TXT record to follow it.
 */
export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How Caboodle access works"
        description="Three ideas explain the whole model: people join organizations, organizations connect to each other, and verified domains make joining self-service."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            1. Access flows through a membership
          </CardTitle>
          <CardDescription>
            A person is never a Brand or a Brokerage. They belong to one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-xs space-y-2">
            <ChainNode
              icon={IdCard}
              title="User"
              subtitle="Alice Johnson"
              tone="blue"
            />
            <Connector />
            <ChainNode
              icon={UserCheck}
              title="Membership"
              subtitle="Links a person to one organization"
              tone="violet"
            />
            <Connector />
            <ChainNode
              icon={Building2}
              title="Organization"
              subtitle="Acme Foods"
              tone="emerald"
            />
            <Connector />
            <ChainNode
              icon={ShieldCheck}
              title="Role"
              subtitle="Organization Admin"
              tone="amber"
            />
            <Connector />
            <ChainNode
              icon={KeyRound}
              title="Permissions"
              subtitle="What they can actually do"
              tone="rose"
            />
          </div>

          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-muted-foreground">
            The same person can hold a different role in a different
            organization. Switching organization switches everything below it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            2. Organizations connect to each other
          </CardTitle>
          <CardDescription>
            A relationship is between two businesses, not between two people.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Pill icon={Store} label="Brand" sublabel="Acme Foods" tone="blue" />
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ArrowLeftRight className="size-5" />
              <span className="text-xs">Relationship</span>
            </div>
            <Pill
              icon={Building2}
              label="Brokerage"
              sublabel="ABC Brokerage"
              tone="violet"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Fact title="Many to many">
              One Brand can work with several Brokerages, and one Brokerage with
              several Brands.
            </Fact>
            <Fact title="Approved by both">
              One side requests, the other approves. Neither can add itself.
            </Fact>
            <Fact title="Managed brands">
              A Brokerage can run a private Brand that has no members of its own.
            </Fact>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3. Verified domains make joining self-service
          </CardTitle>
          <CardDescription>
            This is what removes the need for Caboodle staff to create every
            customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-sm space-y-2">
            <ChainNode
              icon={Building2}
              title="Organization"
              subtitle="Acme Foods"
              tone="emerald"
            />
            <Connector />
            <ChainNode
              icon={Globe}
              title="Verified domain"
              subtitle="acmefoods.com"
              tone="blue"
            />
            <Connector />
            <ChainNode
              icon={UserCheck}
              title="Discovery"
              subtitle="A new signup at that domain finds the organization"
              tone="violet"
            />
            <Connector />
            <ChainNode
              icon={ShieldCheck}
              title="Request access or be invited"
              subtitle="An admin approves, and a membership is created"
              tone="amber"
            />
          </div>

          <div className="mt-6 rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">
              Verification is not a wall around the organization
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              It proves the organization controls the domain, which makes
              discovery safe. People outside the domain — consultants, agencies,
              brokers — can still be invited explicitly, and that invitation is
              just as valid a way in.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const TONES = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  violet:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  emerald:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
} as const;

function ChainNode({
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          TONES[tone],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <ArrowDown className="size-4 text-muted-foreground" />
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
  sublabel,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="flex w-full max-w-56 items-center gap-3 rounded-xl border bg-card p-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border",
          TONES[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{sublabel}</p>
      </div>
    </div>
  );
}

function Fact({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
