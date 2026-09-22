"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";

import { LoadingScreen } from "@/components/common/states";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useDemo } from "@/lib/demo/demo-provider";

/** Shell for the signed-out journey: sign in, sign up, onboarding, invitations. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const { hydrated } = useDemo();

  if (!hydrated) return <LoadingScreen label="Loading Caboodle" />;

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </span>
          Caboodle
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-5xl">{children}</div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        Frontend prototype — organizations, memberships, roles and permissions.
        No real accounts, emails or DNS lookups are involved.
      </footer>
    </div>
  );
}
