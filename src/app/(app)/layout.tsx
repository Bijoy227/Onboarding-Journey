"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { PermissionPanel } from "@/components/layout/permission-panel";
import { LoadingScreen } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useDemo, useSession } from "@/lib/demo/demo-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OrganizationBreadcrumb } from "@/components/layout/breadcrumb";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { hydrated } = useDemo();
  const { isSignedIn, user, isSupport } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const emailVerified = Boolean(user?.emailVerifiedAt);

  useEffect(() => {
    if (!hydrated) return;
    if (!isSignedIn) router.replace("/login");
    // An account that never entered its email code can't use the app yet.
    else if (!emailVerified) router.replace("/verify-email");
  }, [hydrated, isSignedIn, emailVerified, router]);

  if (!hydrated) return <LoadingScreen label="Loading Caboodle" />;
  if (!isSignedIn) return <LoadingScreen label="Redirecting to sign in" />;
  if (!emailVerified) {
    return <LoadingScreen label="Redirecting to email verification" />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <OrganizationBreadcrumb pathname={pathname} />
          <div className="ml-auto flex items-center gap-1">
            {isSupport ? (
              <Badge
                variant="outline"
                className="mr-1 border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                title="The Platform Admin is inside this organization. Every change is written to the audit log."
              >
                <LifeBuoy className="size-3" />
                Support access · audited
              </Badge>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </SidebarInset>
      <PermissionPanel />
    </SidebarProvider>
  );
}
