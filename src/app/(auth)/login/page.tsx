"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/common/avatars";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemo, useSession } from "@/lib/demo/demo-provider";
import { DEMO_ACCOUNTS } from "@/lib/mock/seed";
import { AuthError, signIn } from "@/lib/services/auth-service";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, state } = useDemo();
  const { isSignedIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (hydrated && isSignedIn) router.replace("/dashboard");
  }, [hydrated, isSignedIn, router]);

  async function submit(withEmail?: string) {
    setError(null);
    setPending(true);
    try {
      await signIn(withEmail ?? email);
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof AuthError
          ? caught.message
          : "Something went wrong signing in.",
      );
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
      <Card className="lg:self-center">
        <CardHeader>
          <CardTitle className="text-xl">Welcome to Caboodle</CardTitle>
          <CardDescription>Sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Any password works in the demo"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to Caboodle?{" "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Demo accounts</h2>
          <p className="text-sm text-muted-foreground">
            Each account sees the same application through a different
            membership, role and permission set. Pick one to jump straight in.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const user = state.users.find(
              (candidate) =>
                candidate.email.toLowerCase() === account.email.toLowerCase(),
            );

            return (
              <button
                key={account.email}
                type="button"
                disabled={pending}
                onClick={() => {
                  setEmail(account.email);
                  void submit(account.email);
                }}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
              >
                <UserAvatar name={user?.name ?? account.label} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{account.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {account.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {account.hint}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
