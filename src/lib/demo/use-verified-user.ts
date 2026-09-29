"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/demo/demo-provider";
import type { User } from "@/types";

/**
 * Gate for every step after email verification.
 *
 * Signed out goes to sign up; signed in with an unverified email goes back to
 * the code screen. Returns the user only once their email is verified, so a
 * page can render nothing until then.
 */
export function useVerifiedUser(): User | null {
  const router = useRouter();
  const { user } = useSession();
  const verified = Boolean(user?.emailVerifiedAt);

  useEffect(() => {
    if (!user) router.replace("/signup");
    else if (!verified) router.replace("/verify-email");
  }, [user, verified, router]);

  return user && verified ? user : null;
}
