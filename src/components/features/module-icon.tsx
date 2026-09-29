import { createElement } from "react";
import Image from "next/image";
import {
  BarChart3,
  Blocks,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Contact,
  FileSpreadsheet,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  Megaphone,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlatformModule } from "@/types";

type Icon = React.ComponentType<{ className?: string }>;

const ICON_BY_SLUG: Record<string, Icon> = {
  dashboard: LayoutDashboard,
  "categories-products-pricing": Package,
  distributors: Truck,
  retailers: Store,
  regions: MapIcon,
  contacts: Contact,
  pipelines: Workflow,
  "promotion-planning": Megaphone,
  files: FolderOpen,
  reports: BarChart3,
  "ask-caboodle": Bot,
  "market-overview": Gauge,
  "category-review": ClipboardCheck,
  "promotional-management": CalendarDays,
  "distributor-apl": ListChecks,
  "retail-apl": ShoppingCart,
};

/** Icon for a catalog entry. Modules added by a Platform Admin get a default. */
export function moduleIcon(
  entry: Pick<PlatformModule, "slug" | "parentId">,
): Icon {
  return (
    ICON_BY_SLUG[entry.slug] ?? (entry.parentId ? FileSpreadsheet : Blocks)
  );
}

type ModuleVisual = Pick<PlatformModule, "slug" | "parentId" | "imageUrl">;

/**
 * The module's image when a Platform Admin uploaded one, otherwise its icon.
 * `className` sizes either, e.g. "size-4".
 */
export function ModuleIcon({
  entry,
  className,
}: {
  entry: ModuleVisual;
  className?: string;
}) {
  if (entry.imageUrl) {
    return (
      <Image
        src={entry.imageUrl}
        alt=""
        width={64}
        height={64}
        // A data URL from the browser: there is nothing to optimize.
        unoptimized
        className={cn("shrink-0 rounded-sm object-cover", className)}
      />
    );
  }
  // createElement, because the icon is looked up from a static map rather
  // than being a component defined during render.
  return createElement(moduleIcon(entry), { className });
}

/**
 * A module's tile: the image fills it, or the icon sits in the middle.
 * `className` sets the tile (size, radius, colours), `iconClassName` the icon.
 */
export function ModuleAvatar({
  entry,
  className,
  iconClassName = "size-3.5",
}: {
  entry: ModuleVisual;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {entry.imageUrl ? (
        <Image
          src={entry.imageUrl}
          alt=""
          fill
          sizes="64px"
          unoptimized
          className="object-cover"
        />
      ) : (
        createElement(moduleIcon(entry), { className: iconClassName })
      )}
    </span>
  );
}
