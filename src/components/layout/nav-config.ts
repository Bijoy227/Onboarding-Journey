import {
  Blocks,
  Building2,
  ClipboardList,
  CreditCard,
  Globe,
  GitCompareArrows,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Mail,
  Network,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UserCheck,
  Workflow,
} from "lucide-react";

import type { PermissionId } from "@/types";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden from the sidebar when the current membership lacks this. */
  permission?: PermissionId;
  /** Which pending queue drives the count bubble, if any. */
  badge?: "accessRequests" | "relationshipRequests" | "invitations";
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
  /** Only rendered for Caboodle platform administrators. */
  platformAdmin?: boolean;
  /**
   * The subscribed modules the member can use are listed after `items`. They
   * come from the plan and the member's grants, so they can't be static.
   */
  modules?: boolean;
};

/**
 * The application navigation.
 *
 * Identity, organizations, access and relationships are static. Business
 * modules (CRM, trade spend, product specs, ...) are listed per member, from
 * the organization's plan and that member's module grants.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Modules",
    modules: true,
    items: [{ title: "All modules", href: "/modules", icon: LayoutGrid }],
  },
  {
    label: "Organization",
    items: [
      {
        title: "Overview",
        href: "/organization",
        icon: Building2,
        permission: "organization.view",
      },
      {
        title: "Members",
        href: "/organization/members",
        icon: Users,
        permission: "member.view",
      },
      {
        title: "Roles",
        href: "/organization/roles",
        icon: ShieldCheck,
        permission: "role.view",
      },
      {
        title: "Domains",
        href: "/organization/domains",
        icon: Globe,
        permission: "domain.view",
      },
      {
        title: "Module access",
        href: "/organization/module-access",
        icon: KeyRound,
        permission: "module.assign",
      },
      {
        title: "Billing",
        href: "/organization/billing",
        icon: CreditCard,
        permission: "billing.view",
      },
      {
        title: "Settings",
        href: "/organization/settings",
        icon: Settings,
        permission: "organization.update",
      },
    ],
  },
  {
    label: "Relationships",
    items: [
      {
        title: "Connected organizations",
        href: "/relationships",
        icon: Link2,
        permission: "relationship.view",
      },
      {
        title: "Requests",
        href: "/relationships/requests",
        icon: GitCompareArrows,
        permission: "relationship.view",
        badge: "relationshipRequests",
      },
      {
        title: "Find organizations",
        href: "/relationships/find",
        icon: Search,
        permission: "relationship.request",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Invitations",
        href: "/administration/invitations",
        icon: Mail,
        permission: "member.invite",
        badge: "invitations",
      },
      {
        title: "Access requests",
        href: "/administration/access-requests",
        icon: UserCheck,
        permission: "member.approve",
        badge: "accessRequests",
      },
    ],
  },
  {
    label: "Platform admin",
    platformAdmin: true,
    items: [
      { title: "Organizations", href: "/platform/organizations", icon: Building2 },
      { title: "Users", href: "/platform/users", icon: Users },
      { title: "Relationships", href: "/platform/relationships", icon: Network },
      {
        title: "Access requests",
        href: "/platform/access-requests",
        icon: ClipboardList,
      },
      { title: "Invitations", href: "/platform/invitations", icon: Mail },
      { title: "Domain verification", href: "/platform/domains", icon: Globe },
      { title: "Modules", href: "/platform/modules", icon: Blocks },
      { title: "Plans", href: "/platform/plans", icon: Layers },
      { title: "Subscriptions", href: "/platform/subscriptions", icon: Receipt },
      { title: "Audit log", href: "/platform/audit-log", icon: ScrollText },
    ],
  },
  {
    label: "Learn",
    items: [
      { title: "How access works", href: "/how-it-works", icon: Workflow },
      { title: "Old vs new model", href: "/model-comparison", icon: GitCompareArrows },
    ],
  },
];
