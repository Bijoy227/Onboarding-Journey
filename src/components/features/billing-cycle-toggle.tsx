"use client";

import { SegmentedControl } from "@/components/common/segmented-control";
import { ANNUAL_MONTHS_CHARGED } from "@/lib/permissions/modules";
import type { BillingCycle } from "@/types";

export function BillingCycleToggle({
  value,
  onChange,
  disabled,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedControl
      label="Billing cycle"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: "monthly", label: "Monthly" },
        {
          value: "annual",
          label: (
            <>
              Annual
              <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                {12 - ANNUAL_MONTHS_CHARGED} months free
              </span>
            </>
          ),
        },
      ]}
    />
  );
}
