"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModuleIcon } from "@/components/features/module-icon";
import { BrandSwitcher } from "@/components/layout/brand-switcher";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAppState, useSession } from "@/lib/demo/demo-provider";
import {
  buildModuleTree,
  moduleHref,
  type ModuleNode,
} from "@/lib/permissions/modules";
import type { OrganizationType } from "@/types";

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/organization") return pathname === "/organization";
  if (href === "/modules") return pathname === "/modules";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const state = useAppState();
  const {
    organization,
    can,
    isPlatformAdmin,
    availableModules,
    moduleAccess,
    activeBrand,
  } = useSession();

  /**
   * Only modules this person can open on the active Brand. In a Brokerage the
   * Brokerage's own tools come first, then the Brand's modules, listed under
   * the Brand's name.
   */
  const usable = availableModules.filter((entry) => moduleAccess[entry.id]);
  const moduleTree = buildModuleTree(
    usable.filter((entry) => entry.audience === organization?.type),
  );
  const brandModuleTree = buildModuleTree(
    usable.filter((entry) => entry.audience !== organization?.type),
  );

  const pendingCounts = {
    accessRequests: organization
      ? state.accessRequests.filter(
          (request) =>
            request.organizationId === organization.id &&
            request.status === "pending",
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
      if (item.organizationType && item.organizationType !== organization?.type)
        return false;
      if (!item.permission) return true;
      if (!organization) return false;
      return can(item.permission);
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher />
        <BrandSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          if (group.platformAdmin && !isPlatformAdmin) return null;
          if (group.modules && !organization) return null;

          const items = group.platformAdmin
            ? group.items
            : visibleItems(group.items);
          if (items.length === 0) return null;

          const brandGroup =
            group.modules && brandModuleTree.length > 0 && activeBrand ? (
              <SidebarGroup key="brand-modules">
                <SidebarGroupLabel>{activeBrand.brand.name}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <ModuleTreeItems
                      tree={brandModuleTree}
                      pathname={pathname}
                      workspaceType={organization?.type}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null;

          return [
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
                  {group.modules ? (
                    <ModuleTreeItems
                      tree={moduleTree}
                      pathname={pathname}
                      workspaceType={organization?.type}
                    />
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>,
            brandGroup,
          ];
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

/** Modules and, while inside one, its sub-modules. */
function ModuleTreeItems({
  tree,
  pathname,
  workspaceType,
}: {
  tree: ModuleNode[];
  pathname: string;
  workspaceType: OrganizationType | undefined;
}) {
  return tree.map(({ module: entry, children }) => {
    const href = moduleHref(entry, workspaceType);
    // Sub-modules unfold only while you're inside the module.
    const open =
      pathname === href ||
      children.some((child) => pathname === moduleHref(child, workspaceType));
    return (
      <SidebarMenuItem key={entry.id}>
        <SidebarMenuButton
          isActive={pathname === href}
          tooltip={entry.name}
          render={<Link href={href} />}
        >
          <ModuleIcon entry={entry} className="size-4" />
          <span>{entry.name}</span>
        </SidebarMenuButton>
        {open && children.length > 0 ? (
          <SidebarMenuSub>
            {children.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  isActive={pathname === moduleHref(child, workspaceType)}
                  render={<Link href={moduleHref(child, workspaceType)} />}
                >
                  <span>{child.name}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    );
  });
}
