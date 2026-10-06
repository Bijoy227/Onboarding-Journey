# 07. DataHub — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: DataHubController (68) + EntityResolutionController (12) + ExportController (4) + CredentialManagerController (5) + StoresController (8 active; 3 commented-out actions excluded, noted in §4.5) = 97 actions · BE project(s): Modules.DataHub (plus 2 report-sync handlers in Modules.DataUpload.Application and the reused `GetKeHEImportJobStatusRequest` from DataUpload)

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `MDA\…` = `caboodle\src\Modules\DataHub\Modules.DataHub.Application\…`
- `MDD\…` = `caboodle\src\Modules\DataHub\Modules.DataHub.Domain\…`
- `MDU\…` = `caboodle\src\Modules\DataUpload\Modules.DataUpload.Application\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- Controllers: `DHC` = `caboodle\src\Hosts\API\Controllers\Modules\DataHub\DataHubController.cs`, `ERC` = `…\EntityResolutionController.cs`, `EXC` = `…\ExportController.cs`, `CMC` = `…\CredentialManagerController.cs`, `STC` = `caboodle\src\Hosts\API\Controllers\Modules\CRM\StoresController.cs`
- `MHP-ER(A)` = `[MustHavePermission(CaboodleAction.A, CaboodleResource.EntityResolution, CaboodleModule.DataHub)]` — the only permission family used in this area
- `RM(...)` = `[RequireModule(...)]` per the template guard vocabulary.

## 1. What this area is

DataHub is the platform's data-plumbing and master-data tooling: unified-entity/alias resolution (canonical retailers, banners, stores), distributor data-sync runs driven by an internal crawler service, unmapped/mapped record triage dashboards (UNFI/KeHE sales rows), the global store list with geocoding/duplicate-cleanup/merge tooling, third-party portal credentials, and async export/import jobs. The user is the **Platform Admin**, working in the admin app (caboodle.admin pages `data-hub`, `data-sync`, `unmapped-data(-dashboard)`, `mapped-data(-dashboard)`, `store-list-tools`, `entity-resolution`, `credential-manager`, `brand-data-cleanup`). Exactly two endpoints are consumed from caboodle.web workspaces: `POST /stores/store-list/search` (store lookup inside the broker Market Overview form and the dual-audience Category Review form) and `GET /export/{jobId}/status` (brand monthly-report export polling) — see §7. Data lives in the `DataHub` schema (`UnifiedEntities`, `UnifiedEntityAliases`, `AliasAuditTrail`, `AliasMatchAttempts`, `DataSyncRuns`, `UnmappedKeHeRecords`, `UnmappedUNFIRecords`, `UnmappedRecordResolutionAudits`, `MappingSuggestions`, `StoreListEntries`, `StoreMergeHistories`, `AddressReferences`, `DistributorUpcMappings`, `ThirdPartyCredentials`, `ExportJobs`, `ImportJobs`, `BrandDataCleanupJobs`), with writes reaching into `DataUpload.KeHeMappedRecords` / `UNFIMappedRecords` / `DistributorSalesRecords` when records are promoted or repaired.

**Claim-set legend applied once for the whole workbook:** the three seeded claims here — `Permissions.DataHub.EntityResolution.View` / `.Upsert` / `.Update` (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:157-159`) — exist only in the ADMIN set. The Broker and SubBroker sets filter to `Module == CaboodleModule.Broker` (`CaboodlePermissions.cs:203-221`), and brand roles have no claims seeded at all. So **every `MHP-ER` row below is ADMIN-only in practice**; the cell says "MHP-ER(x)" without repeating this.

## 2. Data ownership

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `DataHub.UnifiedEntities` / `UnifiedEntityAliases` / `AliasAuditTrail` / `AliasMatchAttempts` | Platform | None | Global canonical registry; no brand column (`MDD\EntityResolution\UnifiedEntity.cs`). Aliases carry `SuggestedBy`/`ReviewedBy` user ids only |
| `DataHub.DataSyncRuns` | Platform | None | `BrandID` (not null, `MDD\SyncMechanism\DataSyncRun.cs:13`) says *whose* distributor data was pulled — an ops filter, not tenancy; brands never read these rows |
| `DataHub.UnmappedKeHeRecords` / `UnmappedUNFIRecords` | Platform (staging over brand-sourced rows) | None | `BrandId` + `DataSyncRunId` (`MDD\SyncMechanism\UnmappedRecordBase.cs:13-14`); raw sales rows awaiting resolution. Promoted results land in `DataUpload` mapped tables, which are Brand-owned and belong to the DataUpload workbook |
| `DataHub.UnmappedRecordResolutionAudits` / `MappingSuggestions` | Platform | None | Resolution audit trail (`ProcessedBy`) and scored suggestions |
| `DataHub.StoreListEntries` / `StoreMergeHistories` / `AddressReferences` | Platform | None | Global store directory + merge history + geocode cache. `StoreListEntry` has no brand column — it is master data shared by every tenant's reports and forms |
| `DataHub.DistributorUpcMappings` | Platform | None | UPC→product registry; rows are `BrandId`-keyed (`MDD\UpcMapping\DistributorUpcMapping.cs:13`) because UPC meaning is brand-specific, but only platform tooling writes/reads it |
| `DataHub.ThirdPartyCredentials` | Platform | None | Encrypted UNFI/KeHE portal credentials per (BrandID, Provider) (`MDD\CredentialManager\Credential.cs:8`); `PasswordCipher` at rest, but the detail read **decrypts** (§5 do-not-reproduce 7) |
| `DataHub.ExportJobs` | User-scoped / brand-scoped hybrid | None, but fix the `Guid.Empty` overlap (§5-8) | `BrandID` + `CreatedBy` (`MDD\Export\ExportJob.cs:8`). App jobs stamp the header brand (`MDA\Export\Requests\StartExportRequest.cs:53-65`); admin jobs stamp `BrandID = Guid.Empty` (`StartAdminExportRequest.cs:63`). Status reads match on `BrandID`, not `CreatedBy` |
| `DataHub.ImportJobs` | Same hybrid | None, same overlap | Store-list imports stamp `BrandID = Guid.Empty` (`MDA\StoreList\Requests\UploadChunkForStoreListImportRequest.cs:75-92`); DataUpload brand imports stamp the brand id |
| `DataHub.BrandDataCleanupJobs` | Platform | None | Destructive per-brand purge jobs; `Confirm` flag required (`MDA\BrandDataCleanup\Validators\ClearBrandDataRequestValidator.cs:24-26`) |

No table in this area is Brokerage-owned; **no `BrokerageOrganizationID` work (plan 1.3/invariant 11) applies here**. The only Brand-owned tables this area touches (`DataUpload.*MappedRecords`, `DistributorSalesRecords`) are touched by platform jobs, not by tenant requests.

## 3. Module catalog mapping

**No catalog slug covers DataHub in either audience.** Section B's 36 Brand + 15 Broker modules contain nothing named datahub / entity-resolution / store-list / credentials — by design: this is the platform-admin tooling the architecture doc explicitly keeps on the existing mechanism ("The existing Admin permissions (DataHub, Configuration, SoftDeletePurge and so on) stay", arch §4.1). The default target for this area is therefore `[MustHavePermission]` with the existing `Permissions.DataHub.EntityResolution.*` claims — the job of this workbook is to make that explicit on the ~39 actions that today have no attribute at all.

**Gaps — the minority of endpoints that workspaces actually consume:**

- `POST /stores/store-list/search` — called by caboodle.web from the broker Market Overview create form **and** the Category Review form, which is mounted in both the broker (`/category-review`) and brand (`/[brandID]/category-review-brand`) workspaces (§7). Three different modules across two audiences reach it; one `[RequireModule]` attribute can name only one slug per audience. Proposal (Q1): explicit `[Authorize]`, justified as a read-only global store-directory lookup over platform master data.
- `POST /export/start` + `GET /export/{jobId}/status` — the brand workspace's generic async-export pair (`[BrandIDHeader]`). The module that applies depends on `ModuleType` in the payload/job (KeHEExport→`kehe`, UNFIExport→`unfi`, SPINSExport→`spins`, MonthlyReportExport→`monthly-report`, DistributorSalesReportExport→`distributor-sales-report`), so no static slug works: handler `Demand(slugFor(ModuleType), …)` with an `[Authorize]` floor (Q2). `StoreListExport` is also in the brand-side supported list (`MDA\Export\Requests\StartExportRequest.cs:20-28`) although it is platform data with its own `admin/start` route — Q2 proposes removing it from the brand list.
- `POST /export/admin/start` + `GET /export/admin/{jobId}/status` — platform-only by design (admin store-list export; status poller for *every* DataHub admin job), today completely unguarded → `MHP-ER`.
- The four `[AllowAnonymous]` endpoints (`import/unified/retailer`, `import/unified/store`, `validate-mapping-status`, `health/crawler`) have no workspace consumer and no FE consumer at all (neither web nor admin repo references them) — they are ops/machine surfaces. Proposal (Q3): re-gate with `MHP-ER` now; introduce an authenticated machine identity (API key / service account) only if an external automated caller is confirmed. Security items, cross-ref IAM plan §6 ("Anonymous DataHub import endpoints — DataHubController.cs:37-58, 110-114, 805-808") and the Phase 0.3 leak-closure class.

Action mapping nuance: this area's claims come as a trio (View/Upsert/Update) rather than per-CRUD, so proposed additions use `View` for reads and export-starts and `Upsert` for writes/job-triggers, matching the 54 actions already guarded that way. A finer split is Q5. `Execute`-class platform ops (sync triggers, backfills, repairs) stay `[MustHavePermission]` per arch §4.3 ("Execute … only guards Platform operations, which stay `[MustHavePermission]`").

## 4. Endpoint authorization matrix

"—" in Today's guard = no attribute (global `RequireAuthorization()` only). **No handler in Modules.DataHub.Application checks roles or scopes the caller** — the only in-handler access checks in the whole area are the two job brand-match checks called out below (grep over `MDA` for `IsInRole|RoleConstants` returns nothing; `GetBrandID`/`ThrowForbidden` appear only in `GetExportJobStatusRequest.cs`, `GetDataHubSourceStatusQuery.cs` and the seed commands). Unguarded rows are therefore open to **any authenticated user of any tenant**, taking arbitrary `brandId`(s) in query/body.

### 4.1 DataHubController — `/api/v1/datahub` (68)
File: `DHC`. 37 actions carry `MHP-ER`, 27 carry nothing, 4 are `[AllowAnonymous]` (matches arch §8-13: "DataHub (27 of 68)"). Request DTOs for the mapping/dimension rows are declared in the controller file itself (`DHC:1020-1163`) — §6 cleanup.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST import/unified/retailer | ImportUnifiedRetailersRequest | **[AllowAnonymous]** (`DHC:40`); handler bulk-writes UnifiedEntities/Aliases, stamps `CreatedBy` from the (anonymous ⇒ empty) current user (`MDA\EntityResolution\Import\ImportUnifiedRetailersRequest.cs:42-52`) | `MHP-ER(Upsert)` (platform); machine identity if an automated caller is confirmed *(Q3)* | **Security item** — unauthenticated master-data write. No FE caller (web or admin). IAM plan §6 + 0.3. §5 DNR-5 |
| POST import/unified/store | ImportUnifiedStoresRequest | **[AllowAnonymous]** (`DHC:51`); same pattern (`…\ImportUnifiedStoresRequest.cs`) | `MHP-ER(Upsert)` *(Q3)* | Security item. §5 DNR-5 |
| POST import/mapping-data | ImportMappingDataRequest | —; CSV import of retailer/store mappings, no checks (`MDA\EntityResolution\Import\ImportMappingDataRequest.cs:40`) | `MHP-ER(Upsert)` | Fail-open write today. §5 DNR-1 |
| POST sync | ExecuteDataSyncRequest | —; takes an **arbitrary `BrandID` in the body**, creates a DataSyncRun and enqueues the crawler job, no checks (`MDA\SyncMechanism\Requests\ExecuteDataSyncRequest.cs:39-59`) | `MHP-ER(Upsert)` | Any signed-in user can trigger a crawl of any brand's portal today. §5 DNR-1 |
| POST map-existing-data | MapExistingDataRequest | —; remaps all raw KeHE/UNFI rows for **all brands** (`MDA\SyncMechanism\Requests\MapExistingDataRequest.cs:14`) | `MHP-ER(Upsert)` | §5 DNR-1 |
| POST report-sync/product-name-category | SyncMappedProductNameAndCategoryRequest | —; cross-module write into mapped tables (`MDU\Requests\Report Sync\SyncMappedProductNameAndCategoryRequest.cs:21`) | `MHP-ER(Upsert)` | Handler lives in Modules.DataUpload.Application. §5 DNR-1 |
| POST report-sync/distributor-sales-records | SyncDistributorSalesRecordsRequest | —; **deletes all `DistributorSalesRecords` and repopulates** (`MDU\Requests\Report Sync\SyncDistributorSalesRecordsRequest.cs:23`; op summary `DHC:103`) | `MHP-ER(Upsert)` | Most destructive unguarded action in the area. §5 DNR-1 |
| POST health/crawler | CheckCrawlerServiceAvailabilityRequest | **[AllowAnonymous]** (`DHC:113`); proxies `GET http://webcrawler:8000/api/v1/health` (`MDA\SyncMechanism\Requests\CheckCrawlerServiceAvailabilityRequest.cs:15,32`) | `MHP-ER(View)`; API-key machine identity if an external monitor needs it *(Q3)* | Security item — unauthenticated internal-service probe. Fixed URL (no SSRF), but free DoS/noise. §5 DNR-5 |
| GET sync/dashboard | GetSyncDashboardRequest | MHP-ER(View) (`DHC:127`) | keep `[MustHavePermission]` (platform) | |
| GET sync-runs | GetDataSyncRunsRequest | —; arbitrary `brandId` filter, no scoping (`MDA\SyncMechanism\Requests\GetDataSyncRunsRequest.cs`) | `MHP-ER(View)` | §5 DNR-1 |
| GET sync-runs/{id:guid} | GetDataSyncRunByIdRequest | —; by id, no scoping | `MHP-ER(View)` | §5 DNR-1 |
| GET unmapped/dashboard | GetUnmappedDashboardRequest | —; arbitrary `brandId` | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/records | GetUnmappedRecordsRequest | —; brand ids travel in the body, no scoping (`MDA\SyncMechanism\Requests\GetUnmappedRecordsRequest.cs`) | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/records/export | StartUnmappedRecordsExportRequest | —; queues an admin CSV export (`MDA\Export\Requests\StartUnmappedRecordsExportRequest.cs`); op doc says "for admin", no BrandID header (`DHC:216-218`) | `MHP-ER(View)` | Export-start of an admin grid = read; View per §3 nuance. §5 DNR-1 |
| POST unmapped/filter-options | GetUnmappedFilterOptionsRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/unfi/records-by-status | GetUnmappedUNFIRecordsByStatusRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| GET unmapped/unfi/record | GetUnmappedUNFIRecordByIdRequest | —; by id | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/kehe/records-by-status | GetUnmappedKeHeRecordsByStatusRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| GET unmapped/kehe/record | GetUnmappedKeHeRecordByIdRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/retailers | GetUnmappedRetailersRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| GET unmapped/retailer-suggestions | GetRetailerMappingSuggestionsRequest | MHP-ER(View) (`DHC:296`) | keep | |
| POST unmapped/customers | GetUnmappedCustomersRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/upcs | GetUnmappedUpcsRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST unmapped/overall-status | BulkUpdateUnmappedOverallStatusCommand | —; bulk status write over filter-matched rows (`MDA\SyncMechanism\Commands\BulkUpdateUnmappedOverallStatusCommand.cs`) | `MHP-ER(Upsert)` | Unguarded write. §5 DNR-1 |
| POST unmapped/resolve | ResolveUnmappedRecordsCommand | —; system-wide re-resolution, promotes rows to mapped tables (`MDA\SyncMechanism\Commands\ResolveUnmappedRecordCommand.cs`) | `MHP-ER(Upsert)` | Unguarded write. §5 DNR-1 |
| GET unmapped/audits | GetResolutionAuditsRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST mapped/filter-options | GetMappedRecordsFilterOptionsRequest | — | `MHP-ER(View)` | §5 DNR-1 |
| POST mapped/kehe | GetKeHeMappedRecordsRequest | —; body brand filters, no scoping (`MDA\MappedRecords\Requests\GetKeHeMappedRecordsRequest.cs`) | `MHP-ER(View)` | Cross-tenant sales data readable by any user today. §5 DNR-1 |
| POST mapped/unfi | GetUNFIMappedRecordsRequest | —; same | `MHP-ER(View)` | §5 DNR-1 |
| POST mapped/kehe/export | StartKeHeMappedRecordsExportRequest | —; queues admin export (`MDA\Export\Requests\StartKeHeMappedRecordsExportRequest.cs`) | `MHP-ER(View)` | §5 DNR-1 |
| POST mapped/unfi/export | StartUNFIMappedRecordsExportRequest | —; same | `MHP-ER(View)` | §5 DNR-1 |
| GET mapped/upcs | GetMappedUpcsRequest | —; arbitrary `brandId` (`MDA\UpcMapping\Requests\GetMappedUpcsRequest.cs`) | `MHP-ER(View)` | §5 DNR-1 |
| GET summary | GetDataHubAdminSummaryQuery | MHP-ER(View) (`DHC:471`) | keep | |
| GET sources | GetDataHubSourceStatusQuery | MHP-ER(View) (`DHC:485`); falls back to the `BrandID` header when no `brandId` query param (`MDA\AdminDashboard\Queries\GetDataHubSourceStatusQuery.cs:58-67`) | keep | Header fallback is harmless (admin sends none); drop at Phase 4.4 (§6) |
| POST mapped-dashboard/summary | GetMappedDashboardSummaryQuery | MHP-ER(View) (`DHC:499`) | keep | |
| POST mapped-dashboard/trends | GetMappedDashboardTrendsQuery | MHP-ER(View) (`DHC:513`) | keep | |
| POST mapped-dashboard/quality | GetMappedDashboardQualityQuery | MHP-ER(View) (`DHC:527`) | keep | |
| POST mapped-dashboard/records/overview | GetMappedRecordsOverviewQuery | MHP-ER(View) (`DHC:541`) | keep | |
| POST mapped-dashboard/records/data-quality | GetMappedRecordsDataQualityQuery | MHP-ER(View) (`DHC:554`) | keep | |
| POST mapped-dashboard/records/business-metrics | GetMappedRecordsBusinessMetricsQuery | MHP-ER(View) (`DHC:567`) | keep | |
| POST mapped-dashboard/records/breakdowns | GetMappedRecordsBreakdownsQuery | MHP-ER(View) (`DHC:580`) | keep | |
| POST mapped-dashboard/records/trends | GetMappedRecordsTrendsQuery | MHP-ER(View) (`DHC:593`) | keep | |
| POST mapping/unmapped | GetUnmappedEntitiesQuery | MHP-ER(View) (`DHC:610`); body DTO declared in controller (`DHC:1022-1029`) | keep | |
| POST mapping/unmapped/bulk-map | BulkMapUnmappedValuesCommand | MHP-ER(Upsert) (`DHC:626`) | keep | |
| POST unmapped/dimension-status-by-value | UpdateUnmappedDimensionStatusByValueCommand | MHP-ER(Upsert) (`DHC:645`) | keep | |
| POST unmapped/resolve-retailer-by-value | BulkResolveUnmappedRetailerByValueCommand | MHP-ER(Upsert) (`DHC:677`) | keep | |
| POST unmapped/resolve-store-by-value | BulkResolveUnmappedStoreByValueCommand | MHP-ER(Upsert) (`DHC:694`) | keep | |
| POST unmapped/resolve-upc-by-value | BulkResolveUnmappedUpcByValueCommand | MHP-ER(Upsert) (`DHC:711`) | keep | |
| POST unmapped/re-resolve-retailer-by-value | BulkReResolveUnmappedRetailerByValueCommand | MHP-ER(Upsert) (`DHC:731`) | keep | |
| POST unmapped/re-resolve-store-by-value | BulkReResolveUnmappedStoreByValueCommand | MHP-ER(Upsert) (`DHC:747`) | keep | |
| POST unmapped/re-resolve-upc-by-value | BulkReResolveUnmappedUpcByValueCommand | MHP-ER(Upsert) (`DHC:763`) | keep | |
| GET unmapped/product-suggestions | GetUpcProductSuggestionsRequest | MHP-ER(View) (`DHC:782`) | keep | |
| POST validate-mapping-status | ValidateUnmappedRecordsMappingRequest | **[AllowAnonymous]** (`DHC:807`); full-table batch revalidation + bulk updates over `DataHub.UnmappedKeHeRecords` (`MDA\SyncMechanism\Requests\ValidateUnmappedRecordsMappingRequest.cs:33-53`) | `MHP-ER(Upsert)`; machine identity / Hangfire schedule if automated *(Q3)* | **Security item** — unauthenticated heavy write. §5 DNR-5 |
| POST admin/geocode-store-list | GeocodeStoreListBackfillRequest | MHP-ER(Upsert) (`DHC:842`) | keep | Queued job; status via `GET /export/admin/{jobId}/status` — the §4.3 fail-open leaks these jobs' progress today |
| POST admin/store-list/backfill-entry-ids | StartStoreListEntryIdBackfillRequest | MHP-ER(Upsert) (`DHC:854`) | keep | |
| POST admin/store-list/duplicate-cleanup | StartStoreListDuplicateCleanupRequest | MHP-ER(Upsert) (`DHC:866`) | keep | dryRun defaults true (`DHC:868-870`) |
| POST admin/store-list/merge | MergeStoreListEntriesRequest | MHP-ER(Upsert) (`DHC:878`) | keep | |
| GET admin/store-list/merge/history | GetStoreMergeHistoryRequest | MHP-ER(View) (`DHC:890`) | keep | |
| POST admin/store-list/merge/history/{id:guid}/undo | UndoStoreMergeRequest | MHP-ER(Upsert) (`DHC:902`) | keep | |
| POST admin/geocode-address | GeocodeAddressRequest | MHP-ER(View) (`DHC:914`); calls the Google Geocoding API on cache miss | keep | View-guarding a billable external call is acceptable: it is a lookup; noted for Q5's finer split |
| POST admin/store-list/nearby-stores | CheckNearbyStoresRequest | MHP-ER(View) (`DHC:926`) | keep | |
| GET admin/store-list/regions | GetRegionsForRetailerBannerRequest | MHP-ER(View) (`DHC:938`); reads CRM.RetailerRegions | keep | |
| POST admin/backfill-store-mapping | UnmappedStoreBackfillRequest | MHP-ER(Upsert) (`DHC:950`) | keep | |
| POST admin/backfill-retailer-matching | RetailerMatchingBackfillRequest | MHP-ER(Upsert) (`DHC:962`) | keep | |
| POST admin/backfill-unmapped-overall-status | BackfillUnmappedOverallStatusRequest | MHP-ER(Upsert) (`DHC:974`) | keep | |
| POST admin/repair-confidential-mapped-data | ConfidentialMappedDataRepairRequest | MHP-ER(Upsert) (`DHC:986`) | keep | Writes into DataUpload mapped/DSR tables |
| POST admin/clear-brand-data | ClearBrandDataRequest | MHP-ER(Upsert) (`DHC:998`); hard-deletes brand-scoped data modules, requires `Confirm = true` (`MDA\BrandDataCleanup\Validators\ClearBrandDataRequestValidator.cs:24-26`) | keep | Most destructive guarded action; candidate for a dedicated claim under Q5 |
| GET admin/clear-brand-data/{jobId:guid}/status | GetBrandDataCleanupJobStatusRequest | MHP-ER(View) (`DHC:1010`) | keep | |

### 4.2 EntityResolutionController — `/api/v1/entityresolution` (12)
File: `ERC`. Fully guarded; the admin entity-resolution screens are its only consumer. Note the guard split actually in use: View for reads **and** `rules/apply`, Upsert for create/attach/merge/seed, Update for the two mutations.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET dashboard | GetEntitiesDashboardQuery | MHP-ER(View) (`ERC:13`) | keep `[MustHavePermission]` (platform) | |
| POST entities/search | GetUnifiedEntitiesRequest | MHP-ER(View) (`ERC:24`) | keep | |
| POST suggestions | GetEntitySummeryListRequest | MHP-ER(View) (`ERC:35`) | keep | |
| POST rules/apply | ApplyRulesRequest | MHP-ER(**View**) (`ERC:46`) — a rule-application **write** guarded with View | `MHP-ER(Upsert)` | View-guards-a-write; same family as the CredentialManager anomaly. §5 DNR-4 |
| GET entities/{entityId:guid} | GetUnifiedEntityDetailsQuery | MHP-ER(View) (`ERC:57`) | keep | |
| POST entities | CreateUnifiedEntityCommand | MHP-ER(Upsert) (`ERC:68`) | keep | |
| PUT entities/{entityId:guid} | UpdateUnifiedEntityCommand | MHP-ER(Update) (`ERC:79`) | keep | Name changes propagate to mapped reports in background |
| POST entities/{entityId:guid}/aliases | AddUnifiedEntityAliasCommand | MHP-ER(Upsert) (`ERC:90`) | keep | |
| PUT aliases/{aliasId:guid}/status | ChangeAliasStatusCommand | MHP-ER(Update) (`ERC:106`) | keep | |
| POST entities/merge | MergeUnifiedEntitiesCommand | MHP-ER(Upsert) (`ERC:117`) | keep | |
| POST entities/seed/kehe-retailers | SeedKeHeRetailersCommand | MHP-ER(Upsert) (`ERC:128`); `BrandId ?? GetBrandID()` fallback (`MDA\EntityResolution\Commands\SeedKeHeRetailersCommand.cs:80`) | keep | Header fallback dropped at Phase 4.4 (§6) |
| POST entities/seed/kehe-customers | SeedKeHeCustomersCommand | MHP-ER(Upsert) (`ERC:139`); same fallback (`SeedKeHeCustomersCommand.cs:82`) | keep | |

### 4.3 ExportController — `/api/v1/export` (4)
File: `EXC`. The generic async-export pair for the brand workspace plus its admin twin. None of the four has any authorization attribute.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST start | StartExportRequest | — attribute; `[BrandIDHeader]` (`EXC:11`) so `BrandValidationMiddleware` validates brand membership when the header is present; handler stamps `BrandID = GetBrandID()` + `CreatedBy` and enqueues (`MDA\Export\Requests\StartExportRequest.cs:44-69`); **no module check**, and a missing header silently stamps `Guid.Empty` | `[Authorize]` floor + handler `_access.Demand(slugFor(request.ModuleType), Export)` over the map {KeHEExport→`kehe`, UNFIExport→`unfi`, SPINSExport→`spins`, MonthlyReportExport→`monthly-report`, DistributorSalesReportExport→`distributor-sales-report`}; reject `StoreListExport` here *(Q2)* | Brand workspace endpoint. `StoreListExport` in the brand-side supported set (`StartExportRequest.cs:20-28`) lets a brand user queue a platform store-list export — move to admin/start only. Headerless `Guid.Empty` stamp → §5 DNR-8 |
| GET {jobId}/status | GetExportJobStatusRequest | — attribute; `[BrandIDHeader]` (`EXC:22`); handler 403s when `exportJob.BrandID != GetBrandID()` (`MDA\Export\Requests\GetExportJobStatusRequest.cs:35-47`) — but a **headerless** caller has `GetBrandID() == Guid.Empty` and therefore passes for every admin job (`BrandID = Guid.Empty`), presigned download URL included | `[Authorize]` floor + keep the brand-match + handler `Demand(slugFor(job.ModuleType), View)`; admin-stamped jobs (`Guid.Empty`) must 404/403 on this route *(Q2)* | Consumed by the brand monthly-report export polling (§7). The `Guid.Empty` overlap is §5 DNR-8 |
| POST admin/start | StartAdminExportRequest | —; any authenticated user queues an admin StoreListExport (`MDA\Export\Requests\StartAdminExportRequest.cs:41-74`) | `MHP-ER(View)` (platform) | Fail-open. §5 DNR-3 |
| GET admin/{jobId}/status | GetAdminExportJobStatusRequest | —; **no ownership or permission check of any kind** — any authenticated user polls any admin job by id and receives the presigned download URL; also surfaces progress/results of every DataHub admin job type (`MDA\Export\Requests\GetAdminExportJobStatusRequest.cs:34-145`) | `MHP-ER(View)` (platform) | Fail-open data leak (store-list CSVs, cleanup/merge reports). §5 DNR-2 |

### 4.4 CredentialManagerController — `/api/v1/credentialmanager` (5)
File: `CMC`. All five actions — including create, update and delete — are gated with `CaboodleAction.View` (the inventory Section D anomaly). No live privilege impact today because the claims are ADMIN-only anyway, but the asymmetry bites the moment any support role is granted View; fix at Phase 4.2 and **do not reproduce** in the comparator.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET credentials | GetCredentialsRequest | MHP-ER(View) (`CMC:11`) | keep `[MustHavePermission]` (platform) | List view; passwords not included |
| GET credentials/{id:guid} | GetCredentialByIdRequest | MHP-ER(View) (`CMC:33`); **returns the decrypted password** in the payload (`MDA\CredentialManager\Requests\GetCredentialByIdRequest.cs:35,66`; DTO comment `…\DTOs\CredentialDTOs.cs:18`) | `MHP-ER(Upsert)` for the detail read, or mask + audited reveal endpoint *(Q4)* | Plaintext-credential read behind a View claim. §5 DNR-7 |
| POST credentials | CreateCredentialRequest | MHP-ER(**View**) (`CMC:45`) — create guarded with View; handler encrypts and stores (`MDA\CredentialManager\Requests\CreateCredentialRequest.cs:40-57`) | `MHP-ER(Upsert)` | View-guards-a-write. §5 DNR-4 |
| PUT credentials/{id:guid} | UpdateCredentialRequest | MHP-ER(**View**) (`CMC:56`) | `MHP-ER(Upsert)` | §5 DNR-4 |
| DELETE credentials/{id:guid} | DeleteCredentialRequest | MHP-ER(**View**) (`CMC:76`) | `MHP-ER(Upsert)` (the claim trio has no Delete; Q5 would add one) | §5 DNR-4 |

### 4.5 StoresController — `/api/v1/stores` (8 active)
File: `STC` — lives in the CRM controller folder but every active action is DataHub-backed (store list master data). A block comment at `STC:11-60` holds the retired CRM Stores region — `GET` (GetAsync list), `GET {id:guid}` (GetAsync), `POST` (UpsertAsync with `MHP(Create, Stores, Store)`) — **inactive, excluded from counts**; the seeded `Permissions.Store.Stores.View/.Create` claims (`CaboodlePermissions.cs:153-154`) guard nothing live. The caboodle.web `StoreService.upsertStores` still points at that retired `POST /stores` (zero callers, §7).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST store-list/filter-options | GetStoreListFilterOptionsRequest | —; global facet lookup (`MDA\StoreList\Requests\GetStoreListFilterOptionsRequest.cs`) | `MHP-ER(View)` (platform) | Admin-app only (web builds its own facet values). §5 DNR-6 |
| POST store-list/search | GetStoreListRequest | —; paginated global store directory, name-based filters, no tenant scoping (`MDA\StoreList\Requests\GetStoreListRequest.cs`) | `[Authorize]` — explicit, justified: read-only platform master data consumed by brand and broker forms across three modules *(Q1)* | The one genuine workspace endpoint in this controller (§7). Keep response contract stable (web parses `StoreListEntryDto`; `emptyBannerOnly`+`banners` is a 400 the web pre-empts) |
| GET store-list/{id:guid} | GetStoreListEntryByIdRequest | — | `MHP-ER(View)` | Admin-app only. §5 DNR-6 |
| POST store-list | CreateStoreListEntryRequest | —; creates master-data rows (`MDA\StoreList\Requests\CreateStoreListEntryRequest.cs`) | `MHP-ER(Upsert)` | Unguarded master-data write. §5 DNR-6 |
| PUT store-list/{id:guid} | UpdateStoreListEntryRequest | —; propagates identity changes into mapped/DSR rows (`MDA\StoreList\Requests\UpdateStoreListEntryRequest.cs`, `StoreListEntryPropagationService`) | `MHP-ER(Upsert)` | §5 DNR-6 |
| POST store-list/delete | DeleteStoreListEntriesRequest | —; soft-deletes with referenced-row skip (`MDA\StoreList\Requests\DeleteStoreListEntriesRequest.cs`) | `MHP-ER(Upsert)` (no Delete claim in the trio — Q5) | §5 DNR-6 |
| POST store-list/import/chunk | UploadChunkForStoreListImportRequest | —; creates/continues an ImportJob with `BrandID = Guid.Empty` (`MDA\StoreList\Requests\UploadChunkForStoreListImportRequest.cs:75-92`); continuation only 404-checks the job — no owner check (`:94-103`) | `MHP-ER(Upsert)` | Anyone can also append chunks to someone else's pending job today. §5 DNR-6 |
| GET store-list/import/{jobId:guid}/status | GetKeHEImportJobStatusRequest (reused from DataUpload) | —; brand-match check `importJob.BrandID != GetBrandID()` → 403 (`MDU\Requests\KeHE\ImportExport\GetKeHEImportJobStatusRequest.cs:38-51`): store-list jobs carry `Guid.Empty`, so the poll works **only headerless** and 403s if any `BrandID` header is sent | `MHP-ER(View)` | Header-absence as the de-facto admin check — replace with the platform claim, not header semantics. §5 DNR-9 |

## 5. Parity notes

**What each mechanism actually allows/denies today:**

- **Claim seeding is the only real gate.** The 54 `MHP-ER` actions are ADMIN-only in practice: `Permissions.DataHub.EntityResolution.View/Upsert/Update` are seeded into the full set only (`CaboodlePermissions.cs:157-159`), the Broker/SubBroker sets filter them out (`:203-221`), brand roles have nothing. Within ADMIN the View-vs-Upsert distinction is cosmetic — ADMIN holds all three — which is how the View-on-writes anomalies (CredentialManager, `rules/apply`) have survived unnoticed.
- **No per-feature access helper, no handler role checks.** Unlike the Broker area, Modules.DataHub.Application contains zero `IsInRole`/role-constant usage. The only in-handler access checks are two job brand-matches: `GetExportJobStatusRequest.cs:44-47` (`exportJob.BrandID != GetBrandID()` → 403) and the reused `GetKeHEImportJobStatusRequest.cs:48-51`. Everything else trusts the request completely — the 39 unguarded actions (27 DataHub + 4 Export + 8 Stores) are reachable by any authenticated user of any tenant with arbitrary `brandId` parameters.
- **`BrandValidationMiddleware` touches only `POST /export/start` and `GET /export/{jobId}/status`** (the two `[BrandIDHeader]` actions): with a header present it validates brand membership (ADMIN bypasses); with no header it does nothing, and `ICurrentUser.GetBrandID()` stays `Guid.Empty` (`BB\Infrastructure\Auth\CurrentUser.cs:10,20,59`, set from the header in `CurrentUserMiddleware.cs:19-23`). That empty value doubles as the admin-job marker — the root of DNR-8/9.
- **Resolver must-match list** (comparator, plan 2.5): small here. (1) `POST /stores/store-list/search` must remain reachable by every brand and broker persona that can open the Market Overview or Category Review forms — the target `[Authorize]` reproduces today exactly. (2) `GET /export/{jobId}/status` with a valid brand header must keep returning the caller's brand's jobs (monthly-report polling). (3) Every ADMIN call anywhere in the area must keep succeeding.

**Do-not-reproduce list** (intentional comparator differences, one line each):

1. **27 unguarded DataHubController actions** — any signed-in user can read any tenant's raw/mapped sales rows and trigger destructive ops (`POST sync` crawls any brand's portal, `report-sync/distributor-sales-records` deletes and repopulates `DistributorSalesRecords`, `unmapped/resolve` and `overall-status` bulk-write); fail-open, closed by `MHP-ER`.
2. `GET /export/admin/{jobId}/status` has no check at all — presigned download URLs and job reports for every admin export/merge/cleanup job leak to any authenticated user (`GetAdminExportJobStatusRequest.cs:34-145`); fail-open.
3. `POST /export/admin/start` lets any user queue platform store-list exports (`StartAdminExportRequest.cs:41-74`); fail-open.
4. **CredentialManager writes (POST/PUT/DELETE) and `POST entityresolution/rules/apply` are guarded with `CaboodleAction.View`** (`CMC:45,56,76`; `ERC:46`) — View-guards-a-write (inventory Section D anomaly); target uses Upsert; comparator whitelists the asymmetry.
5. **Four `[AllowAnonymous]` data endpoints** (`DHC:40,51,113,807`) — unauthenticated master-data writes, a bulk revalidation write, and an internal-service probe; re-gated per Q3; post-change an unauthenticated call gets 401 by design.
6. **StoresController store-list CRUD/import unguarded** — platform master-data writes (create/update/delete/import) open to any user; closed by `MHP-ER(Upsert)`; chunk-continuation additionally lacked a job-owner check (`UploadChunkForStoreListImportRequest.cs:94-103`).
7. `GET /credentialmanager/credentials/{id}` returns the **decrypted** third-party portal password (`GetCredentialByIdRequest.cs:66`) behind a View claim; Q4 tightens; comparator whitelists the response-shape change if masking is chosen.
8. **`Guid.Empty` doubles as "admin job"** in ExportJobs/ImportJobs: a headerless caller passes the brand-match on `GET /export/{jobId}/status` for every admin job, and `POST /export/start` without a header stamps `Guid.Empty`, minting a brand job indistinguishable from an admin one (`StartExportRequest.cs:53-65`, `GetExportJobStatusRequest.cs:35-47`); target separates the admin route (platform claim) from the app route (brand required) instead of overloading the empty GUID.
9. Store-list import status works **only when no `BrandID` header is sent** (brand-match against `Guid.Empty`, `GetKeHEImportJobStatusRequest.cs:48-51`) — header absence is not an authorization mechanism; replaced by the platform claim.

## 6. Code changes beyond attributes

- **No query re-scoping.** No table here gains `BrokerageOrganizationID`; no `BrandBrokers`-derived allowlists exist in this area. The Phase 4.2 work is almost purely attribute application (37 + 12 + 5 rows keep, ~39 rows gain a guard, 4 anonymous rows change class).
- **Demand() call sites (new):** `StartExportRequestHandler` and `GetExportJobStatusRequestHandler` gain the ModuleType→slug map + `_access.Demand(slug, Export/View)` (Q2); remove `StoreListExport` from `SupportedExportTypes` (`StartExportRequest.cs:20-28`). If Q1 resolves to a module guard instead of `[Authorize]`, `GetStoreListRequest` gains a Demand too.
- **Job-identity separation (DNR-8/9):** give admin jobs an explicit marker (e.g. `IsAdminJob` or a dedicated ModuleType check) instead of `BrandID == Guid.Empty`; make `GET /export/{jobId}/status` 404 admin jobs and `GET /export/admin/{jobId}/status` 404 brand jobs; add the missing owner check on import-chunk continuation (`UploadChunkForStoreListImportRequest.cs:94-103`).
- **Machine identity (Q3):** if an external automated caller is confirmed for the anonymous four, add an API-key authentication handler (secret from the env store per plan 0.5, requests audited via the Phase 2.6 `IIamAuditService`); otherwise plain `MHP-ER` and the ops runbook calls them with an admin token. Either way the `[AllowAnonymous]` attributes go.
- **BrandID-header edge cases:** the two `[BrandIDHeader]` export actions keep requiring the header in the brand workspace (post-IAM: `BrandID == organization id`, arch §6.1); the header fallbacks inside platform handlers — `GetDataHubSourceStatusQuery.cs:58-67`, `SeedKeHeRetailersCommand.cs:80`, `SeedKeHeCustomersCommand.cs:82` — become dead once admin traffic is confirmed headerless; delete them at Phase 4.4 rather than port them.
- **Host-file DTO cleanup:** the nine request-body DTOs declared in `DHC:1020-1163` (`GetUnmappedEntitiesRequest`, `BulkMapUnmappedRequest`, the six by-value bodies, `UpdateUnmappedDimensionStatusByValueRequestBody`) move to Modules.DataHub.Application (inventory Section D note) — mechanical, do it with the attribute PR.
- **Claims/seeder:** nothing new strictly required — the EntityResolution trio covers every proposed `MHP-ER`. Q5's optional split (separate `StoreList`, `Credentials`, `SyncOps` resources, plus Delete/Export actions) would touch `CaboodleResource`, `_all` and the ADMIN seeding only. The orphaned `Permissions.Store.Stores.View/.Create` claims (`CaboodlePermissions.cs:153-154`, guarding only the commented-out CRM region) are deleted when the dead region is (§4.5).
- **Helpers/files to delete:** none — this area never had access helpers; `BrandValidationMiddleware` retirement (owned by other workbooks) costs this area nothing except the two export rows, which gain their guards in the same deploy.
- **Transactions:** job rows are saved, then Hangfire enqueues (`StartExportRequest.cs:67-69` et al.) — a crash in between orphans a Pending row; pre-existing, acceptable. Merge/undo and cleanup jobs manage their own snapshots (`StoreMergeHistory`, dryRun defaults). The `BrandDataCleanup` hard-deletes are gated by `Confirm` + the status endpoint; no change.

## 7. FE impact (Phase 5)

Web (caboodle.web, develop @ 956295e4) touches exactly two live endpoints in this area — everything else is **admin-app territory**:

- `POST /api/v1/stores/store-list/search` via `StoreService.getAllStores` (`src/service/store.service.ts:26-34`) ← `useStores` (`src/hooks/stores.ts:11-57`) ← **AddMarketOverview.tsx:120** (broker Market Overview create form, route `/market-overview` gated on `market-overview`) and **AddOrEditCategoryReview.tsx** (mounted by `CategoryOverviewTable`, which serves both the broker `/category-review` route and the brand `/[brandID]/category-review-brand` route — `src/app/(broker)/(category-review)/category-review/page.tsx`, `src/app/(brand)/[brandID]/(report)/(category-review)/category-review-brand/page.tsx`). The endpoint itself is route-gated only indirectly; after enforcement it must stay reachable for those personas (Q1) or both create forms break. The web pre-empts the `emptyBannerOnly`+`banners` 400 client-side (`stores.ts:41-46` comment) — contract to preserve.
- `GET /api/v1/Export/{jobId}/status` polled by the **brand monthly-report export** flow (`src/components/monthly-report/monthlyReport.service.ts:186`); the start call goes through `POST tradespends/monthly-report/export/start` (TradeSpend controller, which mounts this same `StartExportRequest` — that row belongs to the trade-spend workbook, but the Q2 Demand map must cover `MonthlyReportExport` for both mounts). Needs the `BrandID` header; 403-never-401 on failures (plan §5-2).
- Dead reference: `StoreService.upsertStores` still points at the retired `POST /api/v1/stores` (`store.service.ts:70-80`, zero callers) — delete with the dead BE region.

Admin app (caboodle.admin, not caboodle.web): pages `data-hub`, `data-sync`, `unmapped-data(-dashboard)`, `mapped-data(-dashboard)`, `store-list-tools`, `entity-resolution`, `credential-manager`, `brand-data-cleanup`, `mapped-upcs` call `datahub/*`, `entityresolution/*`, `credentialmanager/*`, `stores/store-list/*` (full CRUD + filter-options + search) and `export/admin/*`. The admin FE is unaffected by enforcement (ADMIN holds all claims) and migrates per IAM plan Phase 5. No endpoint in this area feeds `GET /brands/me` or the future `/me/access`; the module-assignment backfill and `ALLOW_ALL_WHEN_NO_MODULES` flip don't interact with this workbook.

Neither FE calls the four anonymous endpoints — re-gating them breaks no UI.

## 8. Test checklist

- **Reflection test (plan 4.3):** all 97 active actions carry exactly one of `[MustHavePermission]` / `[Authorize]` / `[RequireModule]` / `[AllowAnonymous]`; the 3 commented-out Stores actions and the 2 commented-out MasterDataUpload actions stay outside the baseline; baseline shrinks only. Post-Q3, zero `[AllowAnonymous]` remain in this area.
- **Matrix tests:** ADMIN passes every `MHP-ER` row; BROKER, BROKERSUBUSER, brand owner and brand sub-user get 403 on every `MHP-ER` row (claims absent); any authenticated persona passes `store-list/search`; brand personas pass `export/start`+`status` only with a valid header and (post-Q2) the matching module+Export/View action; `StoreListExport` through the brand route is rejected.
- **Comparator (plan 2.5):** the ~39 newly guarded rows will newly 403 for non-admin users — all whitelisted under §5 DNR 1–6. Before the flip, watch the shadow log for *unexpected legitimate* non-admin traffic on them (especially `datahub/sync-runs`, the unmapped dashboards and `stores/store-list/filter-options`) — any hit means an unknown consumer and a scope correction, not a whitelist entry.
- **Anonymous four:** unauthenticated call → 401 post-change (intentional difference); machine-identity caller (if built) passes and is audited; `CreatedBy` on `import/unified/*` rows is never `Guid.Empty` again.
- **Job isolation:** brand A cannot poll brand B's export job (brand-match kept); a headerless caller can no longer read admin jobs through `GET /export/{jobId}/status` (DNR-8 closed); `GET /export/admin/{jobId}/status` requires the platform claim and 404s brand jobs; import-chunk continuation rejects a non-owner.
- **Credential endpoints:** writes require Upsert (DNR-4 closed); the detail read's password exposure follows the Q4 decision, with an audit event per reveal if masking+reveal is chosen.
- **Contract tests:** `store-list/search` request/response shape unchanged (web's `StoreListEntryDto` mirror, name-based filters, the `emptyBannerOnly` 400); `ExportJobStatusDto` unchanged for monthly-report polling; 403-never-401 everywhere (IAM plan §5-2).

## 9. Open questions

1. **Q1 — Guard for `POST /stores/store-list/search`.** Consumed by three modules across both audiences (broker `market-overview`, broker + brand `category-review`); one `[RequireModule]` attribute cannot name two broker slugs. Recommendation: explicit `[Authorize]`, justified as a read-only global store-directory lookup over platform master data (no tenant rows, no write path). Alternative if product wants it module-bound: a tiny `store-directory` lookup module as a Required dependency of the three consumers — catalog churn for little security gain; not recommended.
2. **Q2 — ExportController brand pair.** Adopt the handler `Demand(slugFor(ModuleType))` map (start→`Export`, status→`View`) with an `[Authorize]` floor, and remove `StoreListExport` from the brand-side `SupportedExportTypes` (`StartExportRequest.cs:20-28`) so platform exports go only through `admin/start`. Also applies to the TradeSpend mount of `StartExportRequest` (monthly-report). Recommendation: yes to both; needs sign-off because it slightly narrows today's (fail-open) behavior.
3. **Q3 — Machine identity for the four `[AllowAnonymous]` endpoints.** No FE calls them; callers are ops (UNFI seeding CSVs) and possibly an external scheduler/monitor (validate-mapping-status, health/crawler). Recommendation: re-gate all four with `MHP-ER` now (ops use an admin token); build the API-key/service-account identity (audited, secret per plan 0.5) only if a confirmed automated caller exists; `validate-mapping-status` is a better fit as a scheduled Hangfire job than an endpoint. Security items — coordinate with IAM plan §6 and Phase 0.3/0.4.
4. **Q4 — Decrypted password on `GET credentials/{id}`.** The admin UI prefills the edit form with it. Recommendation: mask in the detail response and add an explicit audited `POST credentials/{id}/reveal` (platform claim), or at minimum raise the detail read to `MHP-ER(Upsert)` and write an audit event per read. Needs Platform-Admin input on the UI trade-off.
5. **Q5 — One `EntityResolution` resource guards ~90 platform actions** spanning entity resolution, sync ops, store-list master data, credentials and brand-data purges, with only View/Upsert/Update actions (writes and deletes collapse into Upsert). Recommendation: keep the trio through cut-over for parity and comparator simplicity; split into finer resources (e.g. `StoreList`, `Credentials`, `SyncOps`, plus proper Delete) only when a non-admin platform role (support) is introduced — ties into plan N7's custom-roles deferral.
6. **Q6 — Should brands ever see their own DataHub status** (sync runs, unmapped counts for their brand)? Nothing exposes it today and no catalog module exists; the mapped *results* already reach brands through the DataUpload reporting modules. Recommendation: out of scope for the resolution; if product asks, it becomes a new Brand-audience module with brand-scoped queries — none of this workbook's platform targets would change.
