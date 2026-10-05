"use client";

import { use } from "react";

import { ModuleScreen } from "@/components/features/module-screen";

/** The workspace's own modules: a Brand's in a Brand, a Brokerage's in a Brokerage. */
export default function ModulePage({ params }: PageProps<"/modules/[slug]">) {
  const { slug } = use(params);
  return <ModuleScreen slug={slug} />;
}
