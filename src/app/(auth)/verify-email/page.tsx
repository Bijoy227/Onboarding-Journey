"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Inbox, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { OnboardingSteps } from "@/components/features/onboarding-steps";
import { OtpInput } from "@/components/features/otp-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/demo/demo-provider";
import {
  AuthError,
  VERIFICATION_CODE_LENGTH,
  discardUnverifiedAccount,
  sendEmailVerificationCode,
  verifyEmailCode,
} from "@/lib/services/auth-service";
import type { User } from "@/types";

/**
 * Step 2 of the onboarding journey: prove the email address is yours.
 *
 * Nothing is emailed. The "demo inbox" underneath stands in for the person's
 * mail client, and any six-digit code is accepted.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isSignedIn } = useSession();

  useEffect(() => {
    if (!isSignedIn) router.replace("/signup");
  }, [isSignedIn, router]);

  if (!user) return null;

  if (user.emailVerifiedAt) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <OnboardingSteps current="verify-email" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Your email is verified</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button onClick={() => router.push("/onboarding/discover")}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Keyed so the code and resend state reset if the demo user changes.
  return <VerifyEmailForm key={user.id} user={user} />;
}

/**
 * The code shown in the demo inbox. Derived rather than random so it is stable
 * across renders; the service accepts any six digits anyway.
 */
function demoCodeFor(userId: string, attempt: number): string {
  let hash = 7;
  for (const char of `${userId}:${attempt}`) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return String(100000 + (hash % 900000));
}

function VerifyEmailForm({ user }: { user: User }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const demoCode = demoCodeFor(user.id, attempt);

  async function verify(value: string) {
    setError(null);
    setPending(true);
    try {
      await verifyEmailCode(user.id, value);
      toast.success("Email verified", { description: user.email });
      router.push("/onboarding/discover");
    } catch (caught) {
      setError(
        caught instanceof AuthError
          ? caught.message
          : "Could not verify the code.",
      );
      setPending(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await sendEmailVerificationCode(user.id);
      setAttempt((value) => value + 1);
      setCode("");
      setError(null);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30_000);
      toast.success("We sent a new code", { description: user.email });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <OnboardingSteps current="verify-email" />

      <Card>
        <CardHeader className="text-center">
          <span className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            We sent a {VERIFICATION_CODE_LENGTH}-digit code to{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
            Enter it below to verify your address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void verify(code);
            }}
          >
            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (error) setError(null);
              }}
              onComplete={(complete) => void verify(complete)}
              length={VERIFICATION_CODE_LENGTH}
              disabled={pending}
              invalid={Boolean(error)}
              autoFocus
            />

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={pending || code.length !== VERIFICATION_CODE_LENGTH}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Verify email
            </Button>
          </form>

          <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
            <p>
              Didn&apos;t get it?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                disabled={resending || cooldown || pending}
                onClick={() => void resend()}
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
              {cooldown ? (
                <span className="block text-xs">
                  Code sent. You can ask for another in 30 seconds.
                </span>
              ) : null}
            </p>
            <p>
              Wrong address?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                disabled={pending}
                onClick={async () => {
                  await discardUnverifiedAccount(user.id);
                  router.push("/signup");
                }}
              >
                Use a different email
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-dashed bg-transparent ring-0">
        <CardContent className="space-y-3 py-4">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Inbox className="size-3.5" />
            Demo inbox · no email is actually sent
          </p>
          <div className="rounded-lg border bg-card p-3">
            <p className="truncate text-xs text-muted-foreground">
              Caboodle &lt;no-reply@caboodle.com&gt; → {user.email}
            </p>
            <p className="mt-1 text-sm font-medium">
              Your Caboodle verification code
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this code to verify your email:{" "}
              <span className="font-mono font-semibold tracking-widest text-foreground">
                {demoCode}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Any {VERIFICATION_CODE_LENGTH}-digit code works in the demo.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setCode(demoCode);
                void verify(demoCode);
              }}
            >
              Use this code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
