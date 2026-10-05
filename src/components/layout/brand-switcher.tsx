"use client";

import { Check, ChevronsUpDown, Tag } from "lucide-react";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/demo/demo-provider";
import { ACCESS_KIND_LABEL } from "@/lib/permissions/access";
import { switchBrand } from "@/lib/services/auth-service";

/**
 * The brand switcher.
 *
 * Every piece of business data belongs to a Brand, so the active Brand (the
 * BrandID header) decides which module map drives the menu. In a Brand
 * workspace it is always the organization itself, so the switcher only
 * appears inside a Brokerage.
 */
export function BrandSwitcher() {
  const { organization, brands, activeBrand } = useSession();
  const { isMobile } = useSidebar();

  if (organization?.type !== "brokerage") return null;

  if (!activeBrand) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled className="opacity-100">
            <Tag className="size-4 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">
              No brands assigned
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                tooltip={`Brand: ${activeBrand.brand.name}`}
                className="data-[popup-open]:bg-sidebar-accent"
              />
            }
          >
            <Tag className="size-4 text-muted-foreground" />
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-[11px] text-muted-foreground">
                Brand
              </span>
              <span className="truncate text-sm font-medium">
                {activeBrand.brand.name}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-64"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Brands you work on in {organization.name}
              </DropdownMenuLabel>
              {brands.map((entry) => (
                <DropdownMenuItem
                  key={entry.brand.id}
                  className="gap-2 p-2"
                  onClick={() => switchBrand(entry.brand.id)}
                >
                  <OrganizationAvatar
                    organization={entry.brand}
                    className="size-6 text-[10px]"
                  />
                  <span className="grid flex-1 leading-tight">
                    <span className="truncate text-sm">{entry.brand.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {ACCESS_KIND_LABEL[entry.kind]} ·{" "}
                      {Object.keys(entry.modules).length} modules
                    </span>
                  </span>
                  {entry.brand.id === activeBrand.brand.id ? (
                    <Check className="size-4 shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
