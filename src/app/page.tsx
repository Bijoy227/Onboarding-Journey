"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/common/states";
import { useDemo, useSession } from "@/lib/demo/demo-provider";

export default function RootPage() {
  const { hydrated } = useDemo();
  const { isSignedIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(isSignedIn ? "/dashboard" : "/login");
  }, [hydrated, isSignedIn, router]);

  return <LoadingScreen label="Starting Caboodle" />;
}
