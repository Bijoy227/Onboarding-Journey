"use client";

import { ArrowDown, Check, X } from "lucide-react";

import { PageHeader } from "@/components/common/states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Side-by-side comparison of the current concept and the proposed one. */
export default function ModelComparisonPage() {
  return (
    <>
      <PageHeader
        title="Old model vs new model"
        description="The change is small to describe and large in consequence: a Brand or a Brokerage stops being represented by a user, and becomes an organization in its own right."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-red-500/25">
          <CardHeader>
            <CardTitle className="text-base">Current concept</CardTitle>
            <CardDescription>
              The business entity is expressed through a user account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Node label="Brand" muted />
              <Arrow />
              <Node label="Brand Owner User" />
              <Arrow />
              <Node label="Brand Sub Users" />
            </div>
            <div className="space-y-1.5">
              <Node label="Brand" muted />
              <Arrow />
              <Node label="BrandBroker" />
              <Arrow />
              <Node label="Broker User" />
              <Arrow />
              <Node label="ParentBroker" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/25">
          <CardHeader>
            <CardTitle className="text-base">Proposed concept</CardTitle>
            <CardDescription>
              The business entity is an organization. People join it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Node label="User" />
              <Arrow />
              <Node label="Membership" />
              <Arrow />
              <Node label="Organization" />
              <Arrow />
              <Node label="Role" />
              <Arrow />
              <Node label="Permissions" />
            </div>
            <div className="space-y-1.5">
              <Node label="Brand Organization" muted />
              <Arrow bidirectional />
              <Node label="Brokerage Organization" muted />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Problems with the old model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                "A Brand is represented through its users.",
                "A Brokerage is represented through a single user.",
                "Only one effective Brand Owner exists.",
                "Supporting multiple Broker users is difficult.",
                "Supporting multiple Brokerages per Brand is difficult.",
                "Private Brands require awkward exceptions.",
                "Caboodle staff must create every business entity by hand.",
                "User onboarding and organization creation are coupled.",
                "Domain ownership is never established.",
                "Roles and organizations are tightly coupled.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <X className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              What the new model makes possible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                "Multiple administrators per organization.",
                "Multiple brokers inside one brokerage.",
                "Multiple brokerages per brand.",
                "Private and managed brands with no brand owner.",
                "Organization discovery from a work email domain.",
                "Domain verification as proof of ownership.",
                "Self-service onboarding for customers.",
                "Admin approval workflows for joining.",
                "A clear, inspectable permission model.",
                "Platform administration separated from customer administration.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Why this matters beyond today
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Getting the identity foundation right first means plans, module
            entitlements, billing, SSO, SCIM, custom roles and teams can all be
            added later without redesigning who a customer is or how they get
            access. None of those are built here — the point is that they would
            not require starting over.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function Node({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <div
      className={
        muted
          ? "rounded-lg border border-dashed px-3 py-2 text-center text-sm text-muted-foreground"
          : "rounded-lg border bg-card px-3 py-2 text-center text-sm font-medium"
      }
    >
      {label}
    </div>
  );
}

function Arrow({ bidirectional }: { bidirectional?: boolean }) {
  return (
    <div
      className="flex items-center justify-center gap-1 text-muted-foreground"
      aria-hidden
    >
      {bidirectional ? (
        <>
          <ArrowDown className="size-3.5 rotate-180" />
          <ArrowDown className="size-3.5" />
        </>
      ) : (
        <ArrowDown className="size-3.5" />
      )}
    </div>
  );
}
