"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  Blocks,
  Building2,
  Check,
  Globe,
  IdCard,
  KeyRound,
  ShieldCheck,
  Store,
  Tag,
  UserCheck,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/common/states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * The explainer used during the client demo, following
 * docs/caboodle-access-architecture.md.
 *
 * Written in business language on purpose: the customer should never need to
 * know the words RBAC, membership table or DNS TXT record to follow it.
 */
export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How Caboodle access works"
        description="Platform Admin → Organizations → Brands → Users → Module access → Permissions. People join organizations; the Platform Admin connects Brands to Brokerages and decides which modules each organization has; admins decide what each person can do on each Brand."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            1. Access flows through a membership
          </CardTitle>
          <CardDescription>
            A person is never a Brand or a Brokerage. They belong to one, with
            one role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-xs space-y-2">
            <ChainNode icon={IdCard} title="User" subtitle="Mike Smith" tone="blue" />
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
              subtitle="ABC Brokerage"
              tone="emerald"
            />
            <Connector />
            <ChainNode
              icon={ShieldCheck}
              title="Role"
              subtitle="Brand Admin, Brand Member, Brokerage Admin, Broker, or a custom role the Platform Admin created"
              tone="amber"
            />
            <Connector />
            <ChainNode
              icon={KeyRound}
              title="Organization permissions"
              subtitle="What they may administer: members, invitations, brand assignments. Never data."
              tone="rose"
            />
          </div>

          <p className="mx-auto mt-6 max-w-lg text-center text-sm text-muted-foreground">
            The same person can hold a different role in a different
            organization, and the two never merge. Switching organization
            switches everything below it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            2. The Platform Admin connects Brands to Brokerages
          </CardTitle>
          <CardDescription>
            A connection is between two businesses, not two people, and nobody
            has to request or approve it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Pill icon={Store} label="Brand" sublabel="Acme Foods" tone="blue" />
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ArrowLeftRight className="size-5" />
              <span className="text-xs">Connection</span>
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
            <Fact title="Platform Admin only">
              Connecting, suspending and ending are platform actions. The
              Brokerage Admin gets every connected Brand at once, and assigns
              brokers to it.
            </Fact>
            <Fact title="Private label">
              A private-label Brand is simply a Brand with no members of its
              own, connected to the Brokerage that runs it.
            </Fact>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3. Data is always reached through a Brand
          </CardTitle>
          <CardDescription>
            A Brand member works on their own Brand. A broker works on the
            Brands they are assigned to, each one set separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mx-auto max-w-md space-y-2">
            <ChainNode
              icon={UserCheck}
              title="Mike's membership"
              subtitle="Broker at ABC Brokerage"
              tone="violet"
            />
            <Connector />
            <div className="grid gap-2 sm:grid-cols-2">
              <ChainNode
                icon={Tag}
                title="Brand Access → Acme Foods"
                subtitle="Full: ABC's modules plus Acme's own, every action"
                tone="emerald"
              />
              <ChainNode
                icon={Tag}
                title="Brand Access → XYZ Private Label"
                subtitle="Custom: Market Overview (view, create, update), Files (view)"
                tone="blue"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact title="Brand modules flow through">
              On a Brand, a broker gets the Brokerage&apos;s own tools plus every
              module that Brand has enabled. Full follows both, including
              modules enabled later, and is where everyone starts.
            </Fact>
            <Fact title="Custom never grows by itself">
              A custom list only changes when an admin edits it. Reset to full
              access at any time.
            </Fact>
            <Fact title="Admins are always full">
              Admin access is worked out from the role and the active
              connections, so a newly connected Brand is there immediately. It
              can&apos;t be restricted: use the member role instead.
            </Fact>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            4. Effective access = what the organization has ∩ what the person
            was given
          </CardTitle>
          <CardDescription>
            Worked out on the server for every request, never stored in the
            login token, so changes take effect at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-sm space-y-2">
            <ChainNode
              icon={Building2}
              title="Enabled modules"
              subtitle="Set per organization by the Platform Admin. On a Brand, a Brokerage's own plus the Brand's. The ceiling."
              tone="emerald"
            />
            <Connector />
            <ChainNode
              icon={ShieldCheck}
              title="Role"
              subtitle="Full brand access: everything available, on every Brand it reaches"
              tone="amber"
            />
            <Connector />
            <ChainNode
              icon={Tag}
              title="Brand Access"
              subtitle="Everyone else: Full or Custom, per Brand"
              tone="blue"
            />
            <Connector />
            <ChainNode
              icon={Blocks}
              title="Module actions"
              subtitle="View, create, update, delete, import, export"
              tone="violet"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Fact title="No modules until enabled">
              A new organization has nothing switched on until the Platform
              Admin enables modules. There are no plans or payments.
            </Fact>
            <Fact title="Disabling stops it for everyone">
              Admins included, at once. Custom grants for it stay dormant and
              come back if it is enabled again.
            </Fact>
            <Fact title="Only what a module supports">
              A report that is view and export only never offers create,
              update, delete or import, and Full access never grants them.
            </Fact>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worked example: what Mike can do</CardTitle>
          <CardDescription>
            ABC has Market Overview, Category Review, Promotional Management
            and Files enabled; on each Brand it also gets that Brand&apos;s own
            modules. ABC is connected to Acme Foods and XYZ Private Label, not
            to Northwind.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Mike asks for</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="pr-4">Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXAMPLE.map((row) => (
                  <TableRow key={row.ask}>
                    <TableCell className="pl-4 text-sm">{row.ask}</TableCell>
                    <TableCell>
                      {row.allowed ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                          <Check className="size-4" />
                          {row.result ?? "Allowed"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400">
                          <X className="size-4" />
                          Denied
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-sm whitespace-normal text-muted-foreground">
                      {row.why}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            5. Verified domains make onboarding self-service
          </CardTitle>
          <CardDescription>
            This is what removes the need for Caboodle staff to create every
            customer: people create their organization from their work email
            domain, or find and join one that already exists.
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
              discovery safe. People outside the domain (consultants, agencies)
              can still be invited explicitly, and that invitation is just as
              valid a way in.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const EXAMPLE: {
  ask: string;
  allowed: boolean;
  result?: string;
  why: string;
}[] = [
  {
    ask: "Promotional Management, Acme Foods, update",
    allowed: true,
    why: "Acme is Full, and ABC has the module.",
  },
  {
    ask: "Promotional Management, XYZ Private Label, view",
    allowed: false,
    why: "Custom, and the module isn't granted.",
  },
  {
    ask: "Market Overview, XYZ Private Label, delete",
    allowed: false,
    why: "The grant has view, create and update only.",
  },
  {
    ask: "Files, XYZ Private Label, view",
    allowed: true,
    why: "Granted.",
  },
  {
    ask: "Anything for Northwind Traders",
    allowed: false,
    why: "Not connected to ABC, so it can't be assigned.",
  },
  {
    ask: "Promotional Management across all brands",
    allowed: true,
    result: "Acme Foods only",
    why: "A cross-brand screen only gets the Brands where he has that module and action.",
  },
  {
    ask: "Invite a colleague",
    allowed: false,
    why: "The Broker role doesn't have member.invite.",
  },
];

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
