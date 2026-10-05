import {
  Blocks,
  Building2,
  Cable,
  ClipboardList,
  Globe,
  GitCompareArrows,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Mail,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UserCheck,
  Workflow,
} from "lucide-react";

import type { OrganizationType, PermissionId } from "@/types";

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden from the sidebar when the current membership lacks this. */
  permission?: PermissionId;
  /** Only shown in workspaces of this organization type. */
  organizationType?: OrganizationType;
  /** Which pending queue drives the count bubble, if any. */
  badge?: "accessRequests" | "invitations";
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
  /** Only rendered for Caboodle platform administrators. */
  platformAdmin?: boolean;
  /**
   * The modules the person can use on the active Brand are listed after
   * `items`. They come from the organization's enabled modules and the
   * person's role or Brand Access, so they can't be static.
   */
  modules?: boolean;
};

/**
 * The application navigation.
 *
 * Identity, organizations, connections and access are static. Business
 * modules (CRM, trade spend, product specs, ...) are listed per person and
 * per Brand, from the active Brand's module map.
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
        permission: "organization.view",
      },
      {
        title: "Brands",
        href: "/connections",
        icon: Link2,
        permission: "connection.view",
        organizationType: "brokerage",
      },
      {
        title: "Brokerages",
        href: "/connections",
        icon: Link2,
        permission: "connection.view",
        organizationType: "brand",
      },
      {
        title: "Brand access",
        href: "/organization/brand-access",
        icon: KeyRound,
        permission: "access.manage",
      },
      {
        title: "Domains",
        href: "/organization/domains",
        icon: Globe,
        permission: "domain.view",
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
      { title: "Connections", href: "/platform/connections", icon: Cable },
      { title: "Modules", href: "/platform/modules", icon: Blocks },
      { title: "Roles", href: "/platform/roles", icon: ShieldCheck },
      { title: "Users", href: "/platform/users", icon: Users },
      {
        title: "Access requests",
        href: "/platform/access-requests",
        icon: ClipboardList,
      },
      { title: "Invitations", href: "/platform/invitations", icon: Mail },
      { title: "Domain verification", href: "/platform/domains", icon: Globe },
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
