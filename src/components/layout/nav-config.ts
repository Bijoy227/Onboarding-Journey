import {
  Building2,
  ClipboardList,
  Globe,
  GitCompareArrows,
  LayoutDashboard,
  Link2,
  Mail,
  Network,
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
};

/**
 * The application navigation.
 *
 * Deliberately limited to identity, organizations, access, roles, permissions
 * and relationships. Caboodle business modules (CRM, trade spend, product
 * specs) are out of scope for this prototype.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
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
