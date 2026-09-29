import type { OrganizationType, PlatformModule } from "@/types";

/**
 * The seeded module catalog.
 *
 * Taken from UI_MODULES_FOR_PLANS.md, which lists what caboodle.web shows today
 * for Brands and for Brokers. Only entries the UI actually gates on get their
 * own catalog row, so every slug here is one the real UI checks. Tabs, screens
 * and reports that sit inside a module without a check of their own are kept
 * as its `features`.
 *
 * Left out on purpose:
 * - Catalog slugs the UI never reads (product-spec, promotional-calendar,
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
  monthlyPrice: number;
  children?: CatalogEntry[];
};

const BRAND_CATALOG: CatalogEntry[] = [
  {
    slug: "dashboard",
    name: "Home",
    description: "The brand's landing dashboard.",
    group: "Home",
    route: "/{brandID}/dashboard",
    monthlyPrice: 29,
    children: [
      {
        slug: "banner-count-graph",
        name: "Banner Count for Item Status",
        description: "Dashboard widget counting banners by item status.",
        group: "Dashboard widgets",
        monthlyPrice: 15,
      },
      {
        slug: "trade-spend-roll-up-report",
        name: "Trade Spend Roll Up widget",
        description: "Dashboard widget summarising trade spend across banners.",
        group: "Dashboard widgets",
        monthlyPrice: 19,
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
    monthlyPrice: 79,
  },
  {
    slug: "distributors",
    name: "Distributors",
    description: "The distributors the brand sells through, and their banners.",
    group: "CRM",
    route: "/{brandID}/distributors",
    features: ["Distributor detail", "Distributor banners"],
    monthlyPrice: 39,
  },
  {
    slug: "retailers",
    name: "Retailers",
    description: "Retail accounts and their banners.",
    group: "CRM",
    route: "/{brandID}/retailers",
    features: ["My Retailers (tab)", "All Retailers (tab)", "Retailer Banners"],
    monthlyPrice: 49,
  },
  {
    slug: "regions",
    name: "Regions",
    description: "Sales regions used to organize accounts and brokers.",
    group: "CRM",
    route: "/{brandID}/regions",
    monthlyPrice: 19,
  },
  {
    slug: "contacts",
    name: "Contacts",
    description: "People at retailers, distributors and brokerages.",
    group: "CRM",
    route: "/{brandID}/contacts",
    monthlyPrice: 29,
  },
  {
    slug: "pipelines",
    name: "Pipeline",
    description: "Track opportunities and the tasks behind them.",
    group: "CRM",
    route: "/{brandID}/pipeline",
    features: ["Task detail"],
    monthlyPrice: 39,
  },
  {
    slug: "promotion-planning",
    name: "Promotional Planning",
    description:
      "Plan promotions and model trade spend before committing to it.",
    group: "Promotional Planning",
    monthlyPrice: 49,
    children: [
      {
        slug: "approved-promotions",
        name: "Approved Promotions",
        description: "Promotions that have been agreed and are ready to run.",
        route: "/{brandID}/promo-planning",
        features: ["List", "Create", "Detail"],
        monthlyPrice: 49,
      },
      {
        slug: "trade-spend-sandbox",
        name: "Trade Spend Sandbox",
        description: "Try out promotion scenarios without committing spend.",
        route: "/{brandID}/trade-spend-sandbox",
        features: ["List", "Create", "Detail"],
        monthlyPrice: 59,
      },
      {
        slug: "promotional-calendar-view",
        name: "Promotional Calendar",
        description: "Every promotion on one calendar.",
        group: "Promotional Calendar",
        route: "/{brandID}/promotional-calendar",
        monthlyPrice: 29,
      },
      {
        slug: "promotional-calendar-notes",
        name: "Promotional Calendar Notes",
        description: "Notes kept alongside the promotional calendar.",
        group: "Promotional Calendar",
        route: "/{brandID}/promotional-notes",
        monthlyPrice: 9,
      },
    ],
  },
  {
    slug: "files",
    name: "Files",
    description: "Upload and share documents with the team.",
    group: "Files",
    route: "/{brandID}/file-upload",
    monthlyPrice: 19,
  },
  {
    slug: "reports",
    name: "Reports",
    description:
      "The reports hub. Each report tile below is its own sub-module.",
    group: "Reports",
    route: "/{brandID}/report",
    monthlyPrice: 29,
    children: [
      {
        slug: "broker-market-activities",
        name: "Broker Market Activities",
        description: "What the brand's brokers are doing in market.",
        group: "Reports",
        route: "/{brandID}/brand-market-overview-report",
        monthlyPrice: 29,
      },
      {
        slug: "category-review",
        name: "Category Review Report",
        description: "Upcoming and past category reviews.",
        group: "Reports",
        route: "/{brandID}/category-review-brand",
        features: ["Category Review (tab)"],
        monthlyPrice: 39,
      },
      {
        slug: "category-review-calendar",
        name: "Category Review Calendar",
        description: "Category reviews on a calendar.",
        group: "Reports",
        route: "/{brandID}/category-review-calendar-brand",
        monthlyPrice: 15,
      },
      {
        slug: "retail-reports",
        name: "Retail Reports",
        description: "Product and activity reporting by retailer.",
        group: "Reports",
        route: "/{brandID}/retail-report",
        features: ["Products (tab)", "Activities (tab)"],
        monthlyPrice: 39,
      },
      {
        slug: "sales-tracker",
        name: "Sales Tracker",
        description: "Track sales against goals.",
        group: "Reports",
        route: "/{brandID}/sales-tracker",
        monthlyPrice: 29,
      },
      {
        slug: "trade-spend-roll-up",
        name: "Trade Spend Roll Up",
        description: "Trade spend rolled up by banner.",
        group: "Enhanced Reporting",
        route: "/{brandID}/banner-report",
        monthlyPrice: 49,
      },
      {
        slug: "monthly-report",
        name: "Monthly Report",
        description: "The month in one report.",
        group: "Enhanced Reporting",
        route: "/{brandID}/monthly-report",
        monthlyPrice: 29,
      },
      {
        slug: "spins",
        name: "SPINS",
        description: "Reporting on uploaded SPINS data.",
        group: "Data Upload Reporting",
        route: "/{brandID}/spins",
        features: [
          "Item Ranking Report: Monthly Report chart, Item Ranking Report, Brand Ranking Report",
          "Stores Insight Report: Void Report, Bump Chart, Banner Weekly Unit Sales",
        ],
        monthlyPrice: 79,
      },
      {
        slug: "kehe",
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
        monthlyPrice: 59,
      },
      {
        slug: "unfi",
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
        monthlyPrice: 59,
      },
      {
        slug: "distributor-sales-report",
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
        monthlyPrice: 49,
      },
    ],
  },
  {
    slug: "ask-caboodle",
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
    monthlyPrice: 99,
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
    monthlyPrice: 59,
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
    monthlyPrice: 49,
    children: [
      {
        slug: "category-review-calendar",
        name: "Category Review Calendar",
        description: "Category reviews on a calendar.",
        route: "/category-review-calendar",
        monthlyPrice: 15,
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
    monthlyPrice: 79,
  },
  {
    slug: "distributor-apl",
    name: "Distributor APL",
    description: "Approved product lists by distributor.",
    group: "Strategy",
    route: "/distributor-apl",
    monthlyPrice: 39,
  },
  {
    slug: "retail-apl",
    name: "Brand Retail Item Status",
    description:
      "Item status by retailer for each brand. Today the UI checks the distributor-apl slug here, because retail-apl is commented out.",
    group: "Strategy",
    route: "/retail-apl",
    monthlyPrice: 39,
  },
  {
    slug: "files",
    name: "Files",
    description: "The brokerage's shared file repository.",
    group: "Files",
    route: "/file-repository",
    monthlyPrice: 19,
  },
];

/**
 * Stable id for a seeded module. The same slug exists on both sides (files,
 * category-review, ...) with a different id, so the audience is part of it.
 */
export function moduleId(audience: OrganizationType, slug: string): string {
  return `mod-${audience}-${slug}`;
}

function flatten(
  audience: OrganizationType,
  entries: CatalogEntry[],
  createdAt: string,
): PlatformModule[] {
  const rows: PlatformModule[] = [];

  entries.forEach((entry, index) => {
    const parentId = moduleId(audience, entry.slug);
    rows.push({
      id: parentId,
      audience,
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      group: entry.group,
      route: entry.route,
      features: entry.features ?? [],
      monthlyPrice: entry.monthlyPrice,
      sortOrder: index,
      createdAt,
    });

    entry.children?.forEach((child, childIndex) => {
      rows.push({
        id: moduleId(audience, child.slug),
        audience,
        slug: child.slug,
        name: child.name,
        description: child.description,
        parentId,
        group: child.group,
        route: child.route,
        features: child.features ?? [],
        monthlyPrice: child.monthlyPrice,
        sortOrder: childIndex,
        createdAt,
      });
    });
  });

  return rows;
}

export function createModuleCatalog(createdAt: string): PlatformModule[] {
  return [
    ...flatten("brand", BRAND_CATALOG, createdAt),
    ...flatten("brokerage", BROKERAGE_CATALOG, createdAt),
  ];
}

/** Every seeded module id for an audience, for the "everything" plans. */
export function allSeededModuleIds(audience: OrganizationType): string[] {
  const entries = audience === "brand" ? BRAND_CATALOG : BROKERAGE_CATALOG;
  return entries.flatMap((entry) => [
    moduleId(audience, entry.slug),
    ...(entry.children ?? []).map((child) => moduleId(audience, child.slug)),
  ]);
}
