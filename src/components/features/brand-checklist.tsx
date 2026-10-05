"use client";

import { OrganizationAvatar } from "@/components/common/avatars";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types";

/**
 * Tick the Brands someone works on. Only actively connected Brands are ever
 * offered: connecting a Brand is the Platform Admin's job, assigning people to
 * it is the Brokerage Admin's.
 */
export function BrandChecklist({
  brands,
  value,
  onChange,
  disabled,
  emptyText = "No Brands are connected to this Brokerage yet. Only the Platform Admin can connect one.",
}: {
  brands: Organization[];
  value: string[];
  onChange: (brandIds: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  if (brands.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  const selected = new Set(value);
  return (
    <div className="divide-y rounded-lg border">
      {brands.map((brand) => (
        <label
          key={brand.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 px-3 py-2",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Checkbox
            checked={selected.has(brand.id)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, brand.id]
                  : value.filter((id) => id !== brand.id),
              )
            }
          />
          <OrganizationAvatar organization={brand} className="size-6 text-[10px]" />
          <span className="flex-1 truncate text-sm">{brand.name}</span>
        </label>
      ))}
    </div>
  );
}
