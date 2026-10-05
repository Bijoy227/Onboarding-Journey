"use client";

import { useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/common/avatars";
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
import { Switch } from "@/components/ui/switch";
import { useDemo, useSession } from "@/lib/demo/demo-provider";
import { resetDemo, signOut } from "@/lib/services/auth-service";

/**
 * Profile menu. Also the fastest way to jump between demo perspectives, which
 * is the single most-used control during the walkthrough.
 */
export function UserMenu() {
  const { user, organization, role, isPlatformAdmin, isSupport, activeBrand } =
    useSession();
  const { devMode, setDevMode } = useDemo();
  const { isMobile } = useSidebar();
  const router = useRouter();

  if (!user) return null;

  const roleLabel = isSupport
    ? "Platform Admin · support"
    : isPlatformAdmin
      ? "Platform Admin"
      : (role?.name ?? "No role in this organization");

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
            <UserAvatar name={user.name} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--anchor-width) min-w-64"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* The label is a group label, so it has to live inside a group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <UserAvatar name={user.name} />
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <div className="space-y-1 px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Organization</span>
                <span className="truncate font-medium">
                  {organization?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Role</span>
                <span className="truncate font-medium">{roleLabel}</span>
              </div>
              {organization?.type === "brokerage" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="truncate font-medium">
                    {activeBrand?.brand.name ?? "—"}
                  </span>
                </div>
              ) : null}
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              closeOnClick={false}
              onClick={(event) => {
                event.preventDefault();
                setDevMode(!devMode);
              }}
              className="gap-2"
            >
              <SlidersHorizontal className="size-4" />
              <span className="flex-1">Demo mode</span>
              <Switch
                checked={devMode}
                onCheckedChange={setDevMode}
                aria-label="Toggle demo mode"
              />
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <Users className="size-4" />
              Switch demo user
            </DropdownMenuItem>

            {isPlatformAdmin ? (
              <DropdownMenuItem
                className="gap-2"
                onClick={() => {
                  resetDemo();
                  toast.success("Demo data restored");
                  router.push("/login");
                }}
              >
                <RotateCcw className="size-4" />
                Reset demo data
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="gap-2"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
