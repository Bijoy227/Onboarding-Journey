import type { ModuleAction, OrganizationType, PlatformModule } from "@/types";

/**
 * The seeded module catalog.
 *
 * Taken from UI_MODULES_FOR_PLANS.md, which lists what caboodle.web shows today
 * for Brands and for Brokers. Only entries the UI actually gates on get their
 * own catalog row, so every slug here is one the real UI checks. Tabs, screens
 * and reports that sit inside a module without a check of their own are kept
 * as its `features`.
 *
 * Product Spec, Retailers, Distributors, Regions, Approved Promotions and
 * Trade Spend Sandbox are Brand modules only. Someone at a Brokerage working
 * on a Brand gets the Brokerage's own modules plus that Brand's enabled
 * modules, so Market Overview reads the Brand's Product Specs, Regions,
 * Retailers and Distributors.
 *
 * Left out on purpose:
 * - Catalog slugs the UI never reads (promotional-calendar,
 *   data-upload-reporting, ai, category-review-report, item-ranking-report,
 *   stores-insight-report, promotional-management-notes,
 *   promotional-management-events, category-review-group). Turning them on or
 *   off would change nothing on screen.
 * - Screens that exist but are hidden (Promoted Case Sales Analysis, APL Report,
 *   APL Activity).
 * - The Broker dashboard and the Brand profile, which are always on.
 */

type CatalogEntry = {
  slug: string;
  name: string;
  description: string;
  group?: string;
  route?: string;
  features?: string[];
  /** Defaults to every action. */
  actions?: ModuleAction[];
  children?: CatalogEntry[];
};

export const ALL_ACTIONS: ModuleAction[] = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
];
const VIEW_ONLY: ModuleAction[] = ["view"];
const VIEW_EXPORT: ModuleAction[] = ["view", "export"];

const BRAND_CATALOG: CatalogEntry[] = [
  {
    slug: "dashboard",
    actions: VIEW_ONLY,
    name: "Home",
    description: "The brand's landing dashboard.",
    group: "Home",
    route: "/{brandID}/dashboard",
    children: [
      {
        slug: "banner-count-graph",
        actions: VIEW_ONLY,
        name: "Banner Count for Item Status",
        description: "Dashboard widget counting banners by item status.",
        group: "Dashboard widgets",
      },
      {
        slug: "trade-spend-roll-up-report",
        actions: VIEW_ONLY,
        name: "Trade Spend Roll Up widget",
        description: "Dashboard widget summarising trade spend across banners.",
        group: "Dashboard widgets",
      },
    ],
  },
  {
    slug: "categories-products-pricing",
    name: "Product Specs",
    description: "Categories, products and pricing in one place.",
    group: "Management",
    route: "/{brandID}/products",
    features: ["Categories", "Products (list, add, edit, detail)", "Pricing"],
  },
  {
    slug: "distributors",
    name: "Distributors",
    description: "The distributors the brand sells through, and their banners.",
    group: "CRM",
    route: "/{brandID}/distributors",
    features: ["Distributor detail", "Distributor banners"],
  },
  {
    slug: "retailers",
    name: "Retailers",
    description: "Retail accounts and their banners.",
    group: "CRM",
    route: "/{brandID}/retailers",
    features: ["My Retailers (tab)", "All Retailers (tab)", "Retailer Banners"],
  },
  {
    slug: "regions",
    name: "Regions",
    description: "Sales regions used to organize accounts and brokers.",
    group: "CRM",
    route: "/{brandID}/regions",
  },
  {
    slug: "contacts",
    name: "Contacts",
    description: "People at retailers, distributors and brokerages.",
    group: "CRM",
    route: "/{brandID}/contacts",
  },
  {
    slug: "pipelines",
    name: "Pipeline",
    description: "Track opportunities and the tasks behind them.",
    group: "CRM",
    route: "/{brandID}/pipeline",
    features: ["Task detail"],
  },
  {
    slug: "promotion-planning",
    name: "Promotional Planning",
    description:
      "Plan promotions and model trade spend before committing to it.",
    group: "Promotional Planning",
    children: [
      {
        slug: "approved-promotions",
        name: "Approved Promotions",
        description: "Promotions that have been agreed and are ready to run.",
        route: "/{brandID}/promo-planning",
        features: ["List", "Create", "Detail"],
      },
      {
        slug: "trade-spend-sandbox",
        name: "Trade Spend Sandbox",
        description: "Try out promotion scenarios without committing spend.",
        route: "/{brandID}/trade-spend-sandbox",
        features: ["List", "Create", "Detail"],
      },
      {
        slug: "promotional-calendar-view",
        actions: VIEW_EXPORT,
        name: "Promotional Calendar",
        description: "Every promotion on one calendar.",
        group: "Promotional Calendar",
        route: "/{brandID}/promotional-calendar",
      },
      {
        slug: "promotional-calendar-notes",
        name: "Promotional Calendar Notes",
        description: "Notes kept alongside the promotional calendar.",
        group: "Promotional Calendar",
        route: "/{brandID}/promotional-notes",
      },
    ],
  },
  {
    slug: "files",
    name: "Files",
    description: "Upload and share documents with the team.",
    group: "Files",
    route: "/{brandID}/file-upload",
  },
  {
    slug: "reports",
    actions: VIEW_EXPORT,
    name: "Reports",
    description:
      "The reports hub. Each report tile below is its own sub-module.",
    group: "Reports",
    route: "/{brandID}/report",
    children: [
      {
        slug: "broker-market-activities",
        actions: VIEW_EXPORT,
        name: "Broker Market Activities",
        description: "What the brand's brokers are doing in market.",
        group: "Reports",
        route: "/{brandID}/brand-market-overview-report",
      },
      {
        slug: "category-review",
        actions: VIEW_EXPORT,
        name: "Category Review Report",
        description: "Upcoming and past category reviews.",
        group: "Reports",
        route: "/{brandID}/category-review-brand",
        features: ["Category Review (tab)"],
      },
      {
        slug: "category-review-calendar",
        actions: VIEW_EXPORT,
        name: "Category Review Calendar",
        description: "Category reviews on a calendar.",
        group: "Reports",
        route: "/{brandID}/category-review-calendar-brand",
      },
      {
        slug: "retail-reports",
        actions: VIEW_EXPORT,
        name: "Retail Reports",
        description: "Product and activity reporting by retailer.",
        group: "Reports",
        route: "/{brandID}/retail-report",
        features: ["Products (tab)", "Activities (tab)"],
      },
      {
        slug: "sales-tracker",
        actions: VIEW_EXPORT,
        name: "Sales Tracker",
        description: "Track sales against goals.",
        group: "Reports",
        route: "/{brandID}/sales-tracker",
      },
      {
        slug: "trade-spend-roll-up",
        actions: VIEW_EXPORT,
        name: "Trade Spend Roll Up",
        description: "Trade spend rolled up by banner.",
        group: "Enhanced Reporting",
        route: "/{brandID}/banner-report",
      },
      {
        slug: "monthly-report",
        actions: VIEW_EXPORT,
        name: "Monthly Report",
        description: "The month in one report.",
        group: "Enhanced Reporting",
        route: "/{brandID}/monthly-report",
      },
      {
        slug: "spins",
        actions: VIEW_EXPORT,
        name: "SPINS",
        description: "Reporting on uploaded SPINS data.",
        group: "Data Upload Reporting",
        route: "/{brandID}/spins",
        features: [
          "Item Ranking Report: Monthly Report chart, Item Ranking Report, Brand Ranking Report",
          "Stores Insight Report: Void Report, Bump Chart, Banner Weekly Unit Sales",
        ],
      },
      {
        slug: "kehe",
        actions: VIEW_EXPORT,
        name: "KeHE",
        description: "Reporting on uploaded KeHE distributor data.",
        group: "Data Upload Reporting",
        route: "/{brandID}/kehe",
        features: [
          "Charts",
          "KeHE Units Sold per DC Report",
          "Sales by Product",
          "Sales by Chain",
          "Sales by Store",
          "Sales Details",
          "Sales by State",
          "Sales by City",
          "Warehouse Report",
          "Velocity Report",
          "Store Void Report",
        ],
      },
      {
        slug: "unfi",
        actions: VIEW_EXPORT,
        name: "UNFI",
        description: "Reporting on uploaded UNFI distributor data.",
        group: "Data Upload Reporting",
        route: "/{brandID}/unfi",
        features: [
          "Charts",
          "Case Sales by DC",
          "Sales by Product",
          "Sales by Chain",
          "Sales by Store",
          "Sales Details",
          "Sales by State",
          "Sales by City",
          "Warehouse Report",
          "Velocity Report",
          "Store Void Report",
        ],
      },
      {
        slug: "distributor-sales-report",
        actions: VIEW_EXPORT,
        name: "Distributor Sales Report",
        description: "Reporting on uploaded data from other distributors.",
        group: "Data Upload Reporting",
        route: "/{brandID}/distributor-sales-report",
        features: [
          "Chart",
          "DC Cases Sold Report",
          "Sales by Product",
          "Sales by Chain",
          "Sales by Store",
          "Sales Details",
          "Sales by State",
          "Sales by City",
          "Warehouse Report",
          "Velocity Report",
          "Store Void Report",
        ],
      },
    ],
  },
  {
    slug: "ask-caboodle",
    actions: VIEW_ONLY,
    name: "Ask Caboodle (AI)",
    description:
      "Ask questions about your data in plain language. Not in the menu today: it is reached from the Home dashboard search box, which is hidden in Production.",
    group: "AI",
    route: "/{brandID}/ask-caboodle",
    features: [
      "Search box on the Home dashboard",
      "Ask Caboodle page",
      "AI dashboard (/{brandID}/dashboard-ai)",
    ],
  },
];

const BROKERAGE_CATALOG: CatalogEntry[] = [
  {
    slug: "market-overview",
    name: "Market Overview",
    description: "What is happening in market, account by account.",
    group: "Management",
    route: "/market-overview",
    features: ["Details", "Report (/market-overview-report)"],
  },
  {
    slug: "category-review",
    name: "Category Review",
    description: "Prepare for and track category reviews with retailers.",
    group: "Management",
    route: "/category-review",
    features: [
      "Category Review (tab)",
      "Brand Report, opened from “Go to Brand Report” (checks the broker role, not a module)",
    ],
    children: [
      {
        slug: "category-review-calendar",
        name: "Category Review Calendar",
        description: "Category reviews on a calendar.",
        route: "/category-review-calendar",
      },
    ],
  },
  {
    slug: "promotional-management",
    name: "Promotional Management",
    description: "Promotions across every brand the brokerage represents.",
    group: "Strategy",
    route: "/promotional-management",
    features: ["Promo events calendar", "Notes"],
  },
  {
    slug: "distributor-apl",
    name: "Distributor APL",
    description: "Approved product lists by distributor.",
    group: "Strategy",
    route: "/distributor-apl",
  },
  {
    slug: "retail-apl",
    actions: VIEW_EXPORT,
    name: "Brand Retail Item Status",
    description:
      "Item status by retailer for each brand. Today the UI checks the distributor-apl slug here, because retail-apl is commented out.",
    group: "Strategy",
    route: "/retail-apl",
  },
  {
    slug: "files",
    name: "Files",
    description: "The brokerage's shared file repository.",
    group: "Files",
    route: "/file-repository",
  },
];

/**
 * Stable id for a seeded module. The same slug exists on both sides (files,
 * category-review, ...) with a different id, so the audience is part of it.
 */
export function moduleId(audience: OrganizationType, slug: string): string {
  return `mod-${audience}-${slug}`;
}

function toRow(
  audience: OrganizationType,
  entry: CatalogEntry,
  sortOrder: number,
  createdAt: string,
  parentId?: string,
): PlatformModule {
  return {
    id: moduleId(audience, entry.slug),
    audience,
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    parentId,
    group: entry.group,
    route: entry.route,
    features: entry.features ?? [],
    availableActions: entry.actions ?? ALL_ACTIONS,
    sortOrder,
    createdAt,
  };
}

function flatten(
  audience: OrganizationType,
  entries: CatalogEntry[],
  createdAt: string,
): PlatformModule[] {
  return entries.flatMap((entry, index) => {
    const parent = toRow(audience, entry, index, createdAt);
    return [
      parent,
      ...(entry.children ?? []).map((child, childIndex) =>
        toRow(audience, child, childIndex, createdAt, parent.id),
      ),
    ];
  });
}

export function createModuleCatalog(createdAt: string): PlatformModule[] {
  return [
    ...flatten("brand", BRAND_CATALOG, createdAt),
    ...flatten("brokerage", BROKERAGE_CATALOG, createdAt),
  ];
}

/** Every seeded module id for an audience. */
export function allSeededModuleIds(audience: OrganizationType): string[] {
  const entries = audience === "brand" ? BRAND_CATALOG : BROKERAGE_CATALOG;
  return entries.flatMap((entry) => [
    moduleId(audience, entry.slug),
    ...(entry.children ?? []).map((child) => moduleId(audience, child.slug)),
  ]);
}
