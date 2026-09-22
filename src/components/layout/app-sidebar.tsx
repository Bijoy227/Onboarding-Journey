"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS, type NavItem } from "@/components/layout/nav-config";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAppState, useSession } from "@/lib/demo/demo-provider";

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/organization") return pathname === "/organization";
  if (href === "/relationships") return pathname === "/relationships";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const state = useAppState();
  const { organization, can, isPlatformAdmin } = useSession();

  const pendingCounts = {
    accessRequests: organization
      ? state.accessRequests.filter(
          (request) =>
            request.organizationId === organization.id &&
            request.status === "pending",
        ).length
      : 0,
    relationshipRequests: organization
      ? state.relationships.filter(
          (relationship) =>
            relationship.targetOrganizationId === organization.id &&
            relationship.status === "pending",
        ).length
      : 0,
    invitations: organization
      ? state.invitations.filter(
          (invitation) =>
            invitation.organizationId === organization.id &&
            invitation.status === "pending",
        ).length
      : 0,
  };

  /**
   * Nav items are filtered by the same permission check the pages enforce, so
   * the sidebar always reflects the current membership's role.
   */
  const visibleItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.permission) return true;
      if (!organization) return false;
      return can(item.permission);
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          if (group.platformAdmin && !isPlatformAdmin) return null;

          const items = group.platformAdmin
            ? group.items
            : visibleItems(group.items);
          if (items.length === 0) return null;

          return (
            <SidebarGroup key={group.label ?? "root"}>
              {group.label ? (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const count = item.badge ? pendingCounts[item.badge] : 0;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActiveHref(pathname, item.href)}
                          tooltip={item.title}
                          render={<Link href={item.href} />}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        {count > 0 ? (
                          <SidebarMenuBadge>{count}</SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mx-0" />
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
