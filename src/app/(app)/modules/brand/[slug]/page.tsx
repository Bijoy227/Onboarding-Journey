"use client";

import { use } from "react";

import { ModuleScreen } from "@/components/features/module-screen";

/** A Brand module opened from a Brokerage, on the active Brand. */
export default function BrandModulePage({
  params,
}: PageProps<"/modules/brand/[slug]">) {
  const { slug } = use(params);
  return <ModuleScreen slug={slug} catalog="brand" />;
}
