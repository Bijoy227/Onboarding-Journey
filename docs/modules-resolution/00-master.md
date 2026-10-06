# 00. Existing Modules Resolution — master

Status: proposed · 2026-10-06 · BE develop @ `07f8fa01` · web @ `956295e4` · admin develop

This series is the per-module execution detail for the IAM migration's module-facing phases — `caboodle-be-iam-implementation-plan.md` Phase 1.3 (scoping columns), Phase 4.2 (an authorization attribute on every endpoint), Phase 4.4 (retiring the legacy access helpers), and Phase 5 (retirements). The target model is `caboodle-access-architecture.md`. Nothing here changes what any module *does* — only how access to it is decided and scoped.

## 1. The documents

| File | Role |
|---|---|
| `_template.md` | Workbook structure + shared vocabulary: target guards, action mapping, ownership taxonomy, parity rule, guard conventions |
| `_inventory.md` | Source of truth: all 45 controllers / 678 actions with today's guards; the 51-module catalog; FE route→module maps |
| `01…11-*.md` | One workbook per area (index below). Each: data ownership → endpoint matrix → parity notes → code changes → FE impact → tests → open questions |

## 2. Coverage

| # | Workbook | Controllers | Actions | Open Qs |
|---|---|---|---|---|
| 01 | Broker workspace | Brokers, BrandReport, MarketOverviews, PromotionalManagementNotes | 111 | 7 |
| 02 | Trade spend | TradeSpends | 48 | 7 |
| 03 | Trade spend sandbox | TradeSpendsSandbox | 26 | 5 |
| 04 | Product spec | ProductSpecs, PriceLists, Categories | 33 | 5 |
| 05 | CRM master data | Banners, Contacts, DistributionCenter, Distributors, Pipelines, Regions, Retailers | 92 | 6 |
| 06 | Data sources | DataMappings, DistributorSalesReports, KeHE, MasterDataUpload, SPINS, UNFI | 122 | 5 |
| 07 | DataHub | DataHub, EntityResolution, Export, CredentialManager, Stores | 97 | 6 |
| 08 | Files | Directory, Files, Share | 31 | 4 |
| 09 | Reports & dashboard | Reports, Dashboard | 13 | 3 |
| 10 | Brands & identity legacy | Brands, SubUsers, Users, Auth, Roles, Profile, Registration, SnsEmailWebhook | 70 | 5 |
| 11 | Platform ops | Admin, Configurations, FileKeyBackfill, SoftDeletePurge | 29 | 6 |
| | **Total** | | **672** | **59** |

672 = 678 inventoried actions minus IntelligenceChatController's 6 (deliberately excluded — §6).

## 3. Cross-cutting findings

### 3.1 New security items (additions to the IAM plan's Phase 0 backlog)

The workbooks confirmed and extended the IAM plan §6 list. These are exploitable **today**, independent of the migration:

| Severity | Finding | Workbook |
|---|---|---|
| Critical | Files area: unscoped directory tree/download reads (presigned URL for ANY file id); unscoped recursive **hard delete** of directories incl. S3 objects; dead `@BrandID` filters in delete/move SQL | 08 §5 |
| Critical | Product-spec force-delete: cross-tenant hard-delete cascade (reaches `Broker.DistributorAPLs` globally by UPC), string-interpolated SQL, non-transactional — live web-FE surface | 04 §5 |
| High | `DELETE category-reviews` hard-deletes arbitrary ids with no check; DistributorAPL upsert/delete have no ownership check | 01 §5 |
| High | KeHE/UNFI/SPINS `DELETE` endpoints run filterable (or filterless) `DELETE FROM` over sales tables, available to any brand-connected caller | 06 §5, Q5 |
| High | `forecast-data-export` is fail-open (BrandID from body, unvalidated, no header); interpolated `ILIKE` filters in 4 report handlers | 09 |
| High | `GET credentials/{id}` returns the **decrypted** password | 07 Q4 |
| High | Four `[AllowAnonymous]` DataHub machine endpoints need a machine identity / signed-webhook pattern | 07 Q3 |
| Medium | Global catalog rows writable from brand screens (05 Q1); SNS webhook signature verification to confirm (10) | 05, 10 |

Recommendation: fold this table into IAM plan Phase 0.3/0.4 as a second tranche. Many fixes are independent of the new model (scope by brand, parameterize SQL, add the missing ownership checks) and can ship immediately.

### 3.2 Module-catalog changes proposed

- **New:** Broker `brand-report` under `category-review-group` (01 Q1 — Brand Report has no slug at all today); a module (or platform disposition) for distribution centers (05 Q2); optional SPINS children (06 Q1).
- **Dependency fixes:** broker `category-review` → `distributors` Required (05 Q3); promo-form lookups currently gate on data-owner slugs (05 Q4).
- **Riding decisions:** `/retail-apl` stays on `distributor-apl` (01); `/product-report` stays on the `enhanced-reporting` parent (09 Q2).
- `Modules.AvailableActions` (IAM plan Phase 1.2) should encode view/export-only modules found here so Full never over-grants.

### 3.3 Ownership & scoping sign-offs (beyond invariant 11's four tables)

| Table(s) | Workbook verdict | Needs sign-off |
|---|---|---|
| `MarketOverviews`, `CategoryReviews`, `CategoryReviewCalenders`, `BrandReports` | `BrokerageOrganizationID` per invariant 11, backfill from creator's membership | — (already in plan 1.3) |
| `Broker.DistributorAPLs` | Brokerage-owned de facto, **no tenant column** — add `BrokerageOrganizationID` | 01 Q7 |
| `BrandReportEmailLogs`, `CategoryReviewEmailLoggers` | widen per-user reads to per-brokerage | 01 Q6 |
| `PromoTabs` + files-area broker rows | **No new column** — `BrokerID`/`UserId` already equals the future org id (§10.1 id-reuse) | 08 Q2 (verify no sub-broker-stamped rows) |
| TradeSpendSandbox tables (all 5) | **Brand-owned** (BrandID-keyed, shared brand+brokerage workspace) — contrary to intuition | 03 Q1 |
| Trade spend, product spec, CRM, data-source tables | Brand-owned, no change | — |

### 3.4 Retirements and duplicates

Superseded-by-IAM rows are concentrated in workbook 10 (brand/broker assignment endpoints → `BrandConnections`/`BrandAccess`/`MembersController`, per architecture §10.1). Duplicates/one-shots to retire: duplicate sandbox event-status route (03 Q3), `GET promos-at-a-glance/events/filters` (02 Q7), admin vs pipelines `dealstages` pair (11 Q6, 05 Q5), FE-orphaned identity endpoints incl. anonymous `check-by-email` (10 Q5).

## 4. Decision rollup

**Pending platform decisions this series leans on:** D1 (broker catalog — tagged on nearly every dual-audience row; the single biggest dependency), D6 (brokerage privacy → §3.3 columns), D9 (trade spend entitlement — 02/03/09), D2 (members start Full — 04 Q2, 08 Q1), D5 (cross-org visibility — 10 Q4), D7 (self-service — 10 Q1), N11 (5-action flags — everywhere), N12 (IsActive overload — 11 Q5).

**Of the 59 workbook questions, the ones that genuinely need the Platform Admin / product** (the rest have safe engineering defaults written inline): brand-report module creation (01 Q1); per-brokerage vs global Brand-Report status options (01 Q2); PromoTab owner-only destructive ops mapping (01 Q3); sandbox shared-with-brand confirmation (03 Q1); brokers keeping master-data writes (04 Q3); Private repository semantics (08 Q1); share-link expiry policy (08 Q3); broker lock-out acceptance on data sources (06 Q3); DataHub machine identity (07 Q3); brand-profile editing rights after cut-over (10 Q1); backfill-all target set (11 Q5). Suggestion: walk these in the same sign-off meeting as D1–D9/N1–N12.

## 5. Execution order (feeds IAM plan Phase 4.2/4.4)

1. **Can ship early — before the resolver exists** (pure `[MustHavePermission]` work on the existing mechanism): workbook 11, workbook 07, and the MHP rows of 05/06/10. This is also where most §3.1 security fixes live → bundle with IAM Phase 0.
2. **After the resolver lands (IAM Phase 2), behind the enforcement flag:** 04 → 05 → 06 → 02 → 03 → 09 (brand-owned areas, mostly attribute + Demand work), then 08 (needs real scoping rewrites), then 01 last (largest matrix, D6 columns, three helpers retired).
3. **Workbook 10 rides IAM Phase 3** (its rows are mostly supersessions by the new controllers).
4. Each workbook ≈ 1–2 PRs; its §5 lists are the spec for the comparator tests (IAM plan Phase 2.5, run offline against the local production copy); its §8 is the PR checklist. The Phase 4.3 reflection test's baseline shrinks workbook by workbook.

## 6. Intelligence module (excluded)

The Intelligence module is **deliberately out of scope**: most of its implementation will be replaced by the Ask Caboodle rebuild (agentic AI flow), which will be designed natively on the new IAM rails (`[RequireModule]`, org entitlement, brand scoping) in its own plan. Interim handling only: IntelligenceChatController's 6 actions go into the Phase 4.3 reflection-test baseline (or get one controller-level interim guard). Do not write migration code for this module.

## 7. Caveats

- Everything is **proposed** — matrices become final when D1/D9/N11 and the §4 platform questions are signed.
- Workbooks are pinned to `develop @ 07f8fa01`. New endpoints merged after that commit must be added to `_inventory.md` and the owning workbook (the reflection test will catch stragglers at enforcement time).
- Target-guard cells assume the IAM plan's attribute names (`RequireModule`/`RequireOrgPermission`); if the junior dev's implementation names them differently, the cells map 1:1 regardless.
