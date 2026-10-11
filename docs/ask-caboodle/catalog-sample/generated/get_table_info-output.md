# What the model receives from `get_table_info(["DataUpload.DistributorSalesRecords"])`

The tool renders the YAML into compact text (YAML provenance and profile internals are dropped; rules, joins and metrics that touch the table are attached). This is the exact shape the model reads:

---

```
TABLE "DataUpload"."DistributorSalesRecords"   [brand-scoped · module: distributor-sales-report]
Actual monthly SHIPMENTS of the brand's products from KeHE/UNFI distribution centers to stores.
One row = brand × distributor (Source) × store × distribution center × UPC × month.
Data: 2024-01 → 2026-09 for this brand · UNFI + KeHE        ← from profiler (illustrative)

SEMANTICS
- Shipments (distributor → store), not consumer purchases. Say "shipped".
- Monthly only; "ReportDate" = 1st of month. No promotion flag.
- Rows that failed retailer/store/UPC mapping are excluded; totals may be below the raw file.

COLUMNS
BrandID uuid ............ owning brand — ALWAYS filter
Source int .............. 1 = UNFI, 2 = KeHE
ReportDate timestamp .... 1st of the month; filter half-open ranges
RetailerName text ....... chain name after mapping (text, not id)
Banner text ............. banner name (text); joins CRM.Banners."BannerName" case-insensitively
CustomerName text ....... the STORE, not a person
StoreListEntryId uuid? .. DataHub.StoreListEntries.ID when matched
AddressLine1/2, City, State, PostalCode text .. store address
Region text ............. distributor territory (not CRM.Regions)
Channel text ............ KeHE channel (e.g. Natural)
DistributionCenter text . shipping warehouse (text)
UPC text ................ product UPC — group products by this
ProductDescription text . product name (catalog name when mapped)
Category, SubCategory ... product taxonomy
CasesShipped numeric? ... cases; KeHE = units ÷ pack (rounded)
Units int? .............. eaches; use COALESCE("Units", "CasesShipped" * "Pack")
Pack int? ............... units per case
SalesDollars numeric? ... distributor-cost dollars (not retail)
Is*Ignored, Raw*, ResolutionNotes .. mapping diagnostics — do not filter, do not report

JOINS
→ CRM.Banners        LOWER(TRIM(b."BannerName")) = LOWER(TRIM(dsr."Banner"))   [text join; unmatched rows drop]
→ CRM.Retailers      LOWER(TRIM(r."CorporateName")) = LOWER(TRIM(dsr."RetailerName"))   [UNVERIFIED — prefer filtering RetailerName directly]
→ DataHub.StoreListEntries  dsr."StoreListEntryId" = s."ID"   [optional]
→ Products           via ask.v_product_upc (normalized UPC) — never raw string equality
PATH sales_to_distributor: dsr → Banners → DistributorBanners (same BrandID) → Distributors
  (for KeHE vs UNFI just use "Source")

RULES
- Always "Deleted" = FALSE AND "BrandID" = @brand_id.
- Never infer promo vs non-promo here → TradeSpend.BrandApprovedMonthlyReport / get_promotion_performance.
- Velocity → ask.v_velocity_upc_month. POD has 3 app definitions (by product / chain / store) — say which.
- "Stores carrying X" = COUNT(DISTINCT "CustomerName") in the period.
- State the months covered; a distributor's latest month may not be uploaded yet.

EXAMPLE (verified)
Q: Total cases and dollars shipped by distributor last quarter
SELECT CASE dsr."Source" WHEN 1 THEN 'UNFI' WHEN 2 THEN 'KeHE' END AS distributor,
       SUM(dsr."CasesShipped") AS cases_shipped, ROUND(SUM(dsr."SalesDollars")) AS sales_dollars
FROM "DataUpload"."DistributorSalesRecords" dsr
WHERE dsr."Deleted" = FALSE AND dsr."BrandID" = @brand_id
  AND dsr."ReportDate" >= @quarter_start AND dsr."ReportDate" < @quarter_end
GROUP BY dsr."Source" ORDER BY cases_shipped DESC LIMIT 10
```

---

Roughly 900 tokens. A typical question fetches 2–3 such entries, so the model reads ~2–3 K tokens of schema instead of the whole ~100–150 K catalog.
