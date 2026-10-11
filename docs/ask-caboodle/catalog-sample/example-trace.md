# Example trace — two questions through the loop

Numbers in answers are **illustrative**; SQL and catalog lookups are what the agent would actually produce from this sample.

## Question 1 — answered with SQL

> **User (brand admin, Brand X):** "How many cases did we ship to Sprouts through KeHE in Q2, by month?"
> *(user message also carries: today = 2026-10-10)*

**Turn 1 — the model reads the cached prompt** (glossary + table index) and plans: "Sprouts" is an entity; shipments → `DistributorSalesRecords`; KeHE → `Source = 2`; Q2 → calendar Q2 2026 per `date_semantics.quarters` (must say so). It calls two tools in parallel:

```
search_entity(name: "Sprouts", types: ["Retailer", "Banner"])
get_table_info(tables: ["DataUpload.DistributorSalesRecords"])
```

**Tool results**

```
search_entity →
  1. Retailer  "Sprouts Farmers Market"   match: trigram 0.71   context: 1 banner
  2. Banner    "Sprouts Farmers Market"   match: trigram 0.71   retailer: Sprouts Farmers Market, doors 440
get_table_info → (the rendered entry in generated/get_table_info-output.md)
```

**Turn 2 — the model writes SQL**, using what the entry told it: `RetailerName` is text (filter it directly; the Retailers join is unverified), `ReportDate` half-open range, `Deleted` + `BrandID` always, `Source = 2` for KeHE, say "shipped".

```sql
SELECT TO_CHAR(dsr."ReportDate", 'Mon YYYY') AS month,
       SUM(dsr."CasesShipped")               AS cases_shipped,
       COUNT(DISTINCT dsr."CustomerName")     AS stores_shipped_to
FROM "DataUpload"."DistributorSalesRecords" dsr
WHERE dsr."Deleted" = FALSE
  AND dsr."BrandID" = @brand_id
  AND dsr."Source" = 2
  AND LOWER(TRIM(dsr."RetailerName")) = LOWER('Sprouts Farmers Market')
  AND dsr."ReportDate" >= '2026-04-01' AND dsr."ReportDate" < '2026-07-01'
GROUP BY dsr."ReportDate"
ORDER BY dsr."ReportDate"
LIMIT 12
```

If this had returned zero rows (e.g. KeHE stores the chain as "SPROUTS"), the empty result would go back to the model, which would retry with `ILIKE '%sprouts%'` and report the spelling it found — and that finding becomes one catalog sentence.

**Turn 3 — answer** (presentation contract: period, scope, source, disambiguation):

> Brand X shipped **4,210 cases** to Sprouts Farmers Market through KeHE in Q2 2026 (calendar quarter, Apr–Jun):
>
> | Month | Cases shipped | Stores shipped to |
> |---|---:|---:|
> | Apr 2026 | 1,320 | 402 |
> | May 2026 | 1,465 | 409 |
> | Jun 2026 | 1,425 | 405 |
>
> *Source: KeHE distributor shipments (distributor → store), Distributor Sales data, 3 months. "Sprouts" matched to the retailer Sprouts Farmers Market. Quarters are calendar quarters.*
>
> Suggestions: *Compare with UNFI* · *Same period last year* · *Top 5 products at Sprouts*

## Question 2 — the catalog routes it away from SQL

> **User:** "Did our spring promotions at Sprouts beat plan?"

The table index marks promotion tables "PLANS; never compute promo $/cases in SQL", and `join-paths.yaml → actual_vs_plan` says there is no event-to-shipment join. So the model does **not** try to join `PromotionalEvents` to `DistributorSalesRecords`. It calls:

```
get_table_info(tables: ["TradeSpend.BrandApprovedMonthlyReport"])
```

…learns the `Type` enum (2 = Planned Promo Case, 3 = Actual Case, 7 = Planned Case Total, 8 = Variance %) and the caveats, then:

```sql
SELECT r."Type", r."March", r."April", r."May", r."LastRefreshedAt"
FROM "TradeSpend"."BrandApprovedMonthlyReport" r
WHERE r."Deleted" = FALSE
  AND r."BrandID" = @brand_id
  AND r."Year" = 2026
  AND LOWER(TRIM(r."Retailer")) = LOWER('Sprouts Farmers Market')
  AND r."Type" IN (3, 7, 8)
LIMIT 50
```

and, if the user wants the promo-only split per event, `get_promotion_performance([...promo ids at Sprouts...], brandId)` — the same calculator the screens use.

**Answer** names the source ("Monthly Report, last refreshed 2026-10-08"), compares Actual Case vs Planned Case Total for Mar–May, and adds the honest caveat from the catalog: actuals are monthly shipments matched to plans by banner/product name, so this is plan vs shipments for the months the promotions ran, not a measured promotion lift.
