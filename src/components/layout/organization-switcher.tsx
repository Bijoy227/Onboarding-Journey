"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LifeBuoy, LogOut, Plus } from "lucide-react";

import { OrganizationAvatar } from "@/components/common/avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/demo/demo-provider";
import { switchOrganization } from "@/lib/services/auth-service";

/**
 * The organization switcher.
 *
 * Switching here changes the workspace (the OrganizationID header), and with
 * it the effective membership, role, permissions, Brands and modules. It is
 * the clearest demonstration that a user is not an organization: the same
 * person can be a Brand Member in one and a Broker in another, and the two
 * never merge.
 */
export function OrganizationSwitcher() {
  const { organization, organizations, isPlatformAdmin, isSupport } =
    useSession();
  const { isMobile } = useSidebar();
  const router = useRouter();

  if (!organization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() =>
              router.push(
                isPlatformAdmin
                  ? "/platform/organizations"
                  : "/onboarding/create-organization",
              )
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {isPlatformAdmin ? (
                <LifeBuoy className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
            </span>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">
                {isPlatformAdmin ? "Caboodle Platform" : "No organization"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {isPlatformAdmin ? "Platform administration" : "Create one to begin"}
              </span>
            </div>
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
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent"
              />
            }
          >
            <OrganizationAvatar organization={organization} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{organization.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {organization.type === "brand" ? "Brand" : "Brokerage"}
                {isSupport ? " · support access" : ""}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-60"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {organizations.length > 0 ? (
              /* The label is a group label, so it has to live inside a group. */
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Your organizations
                </DropdownMenuLabel>

                {organizations.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="gap-2 p-2"
                    onClick={() => {
                      switchOrganization(item.id);
                      router.push("/dashboard");
                    }}
                  >
                    <OrganizationAvatar
                      organization={item}
                      className="size-6 text-[10px]"
                    />
                    <div className="grid flex-1 leading-tight">
                      <span className="truncate text-sm">{item.name}</span>
                      <span className="truncate text-xs text-muted-foreground capitalize">
                        {item.status === "suspended"
                          ? `${item.type} · suspended`
                          : item.type}
                      </span>
                    </div>
                    {item.id === organization.id ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : null}

            {isSupport ? (
              <>
                {organizations.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => {
                    switchOrganization(null);
                    router.push(`/platform/organizations/${organization.id}`);
                  }}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <LogOut className="size-3.5" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Leave support access
                  </span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={() => router.push("/onboarding/create-organization")}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-3.5" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Create organization
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
