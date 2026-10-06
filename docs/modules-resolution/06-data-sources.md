# 06. Data sources — resolution workbook
Status: proposed · 2026-10-06 · BE develop @ 07f8fa01
Scope: DataMappingsController (8) + DistributorSalesReportsController (18) + KeHEController (22) + MasterDataUploadController (33) + SPINSController (19) + UNFIController (22) = 122 actions · BE project(s): Modules.DataUpload (import jobs persisted via Modules.DataHub.Domain `ImportJob`; master import/export logic in Modules.Shared.Infrastructure `MasterDataUploadService`)

Path shorthand (backend repo root `D:\Fork\Caboodle BE Repository\caboodle.backend`):
- `MDA\…` = `caboodle\src\Modules\DataUpload\Modules.DataUpload.Application\…`
- `MSI\…` = `caboodle\src\Modules\Shared\Modules.Shared.Infrastructure\…`
- `BB\…` = `caboodle\src\BuildingBlocks\…`
- `MHP(A, R, M)` = `[MustHavePermission(CaboodleAction.A, CaboodleResource.R, CaboodleModule.M)]`
- `RM(...)` = `[RequireModule(...)]` per the template guard vocabulary.

## 1. What this area is

Distributor sales-data ingest and reporting for the **brand workspace**: KeHE, UNFI and SPINS file uploads with their report suites, the unified Distributor Sales Report (chunked KeHE/UNFI imports + reports over synced records), plus two **platform** surfaces used by the admin app — master data upload (bulk CSV import/export of distributors, retailers, banners, products, master KeHE/UNFI records, …) and Data Mappings (raw provider values → catalog entity ids). Primary users are brand owners/sub-users; there is no broker FE surface for any of it (caboodle.web's broker workspace makes zero calls into these controllers). Data lives in the `DataUpload` schema (`KeHeRecords`, `UnfiRecords`, `SPINSItemsRanking`, `SPINSStoresInsight`, `DistributorSalesRecords`, `KeHeMappedRecords`/`UNFIMappedRecords`, `DataMappings`), with chunked-import jobs in the DataHub `ImportJobs` table.

## 2. Data ownership

| Table | Ownership class | Scoping change needed | Notes |
|---|---|---|---|
| `DataUpload.KeHeRecords` | Brand-owned | **None** — every read/write/delete is parameterized on `BrandID = _currentUser.GetBrandID()` (e.g. `MDA\Requests\KeHE\CRUD\GetKeHeRecordsRequest.cs:50,81`) | `BrandID` not null + `CreatedBy`. `DELETE /kehe` is a **hard** `DELETE FROM` (`DeleteKeHeRecordsRequest.cs:37-48`). Master import also writes here with `BrandID` taken per CSV row (platform path, below) |
| `DataUpload.UnfiRecords` | Brand-owned | None — same pattern (`MDA\Requests\UNFI\CRUD\GetUnfiRecordsRequest.cs:53,98`) | Hard delete too (`DeleteUnfiRecordsRequest.cs:33-40`) |
| `DataUpload.SPINSItemsRanking` / `SPINSStoresInsight` | Brand-owned | None (`GetItemRankingReportRequest.cs:86`, `GetStoresInsightFiltersRequest.cs:73`) | Hard deletes (`DeleteItemsRankingDataRequest.cs:36-45`, `DeleteStoresInsightDataRequest.cs:35-41`) |
| `DataUpload.SpinsRecords` (entity `Spins`) | Brand-owned (legacy) | None — no active endpoint reads or writes it | 2023-era table; entity still in `Modules.DataUpload.Domain\SPINS\SPINS.cs`, zero SQL references in Requests |
| `DataUpload.DistributorSalesRecords` | Brand-owned | None (`MDA\Requests\DistributorSalesRecords\Reports\GetSalesByProductReportRequest.cs:84`) | Fed by the DSR chunked import (providers KEHE/UNFI) and by DataHub report-sync; carries `StoreListEntryId` into `DataHub.StoreListEntries`. Each DSR import replaces that month's synced rows (`MSI\Services\Import\ImportJobService.cs:450-467,574-591`) |
| `DataUpload.KeHeMappedRecords` / `UNFIMappedRecords` | Brand-owned | None | Written by DataHub mapping sync (DataHub workbook); read in this area only by UNFI filter-options (`GetUNFIFilterOptionsRequest.cs:91`) |
| `DataUpload.DataMappings` | Platform | None | **No tenant column** (`Modules.DataUpload.Domain\Mapping\DataMapping.cs`): `EntityName` → nullable `EntityID` per `Provider`/`FileCategory`, validated against CRM/catalog tables (`UpsertDataMappingRequest.cs:114-175`). Admin-app config data |
| `ImportJobs` (DataHub, `Modules.DataHub.Domain\Import\ImportJob.cs:8-9`) | Brand-owned (satellite) | None — ownership is a **`BrandID` match**, not `CreatedBy` (contrast with Broker-area export jobs) | Chunk create stamps `BrandID` + `CreatedBy` (`UploadChunkForKeHEImportRequest.cs:88-107`); status/start 403 on brand mismatch (`GetKeHEImportJobStatusRequest.cs:37-50`, `StartDistributorReportFileImportRequest.cs:56-67`) |

Master import of “master keHes/unfis” writes into the same `KeHeRecords`/`UnfiRecords` tables with `BrandID` parsed from each CSV row (`MSI\Mapping\EntityMapping.cs:196`, `MSI\Services\MasterDataUpload\MasterDataUploadService.cs:1306-1346`) — a deliberate cross-brand platform write; master exports read **all brands unscoped** (`MasterDataUploadService.cs:2901-2926`).

## 3. Module catalog mapping

Brand audience (Section B): `data-upload-reporting` (parent, no FE route) → children `spins` (route `/spins`; its own children `item-ranking-report` and `stores-insight-report` have no routes — the nested pages gate on `spins`), `kehe` (`/kehe`), `unfi` (`/unfi`), `distributor-sales-report` (`/distributor-sales-report`). None of the four carries a dependency seed.

Broker audience: **none of these slugs exist.** The Broker data-source copies at sort 100–105 (`product-spec`, `regions`, `retailers`, `distributors`, `approved-promotions`, `trade-spend-sandbox`) are dependency anchors only and do not cover sales-data ingest. Every brand-data row below therefore names only the `brand:` audience — under D1 (Brokerage catalog applies) a broker workspace can never call these endpoints, which matches the FE (zero broker-side calls) but **tightens** today's behavior (§5).

**Gaps / platform surfaces:**
- **DataMappingsController** — admin-app config screen; no plausible slug. Keep `[MustHavePermission]` (platform). Today all eight actions, including the GETs, export and DELETE, are guarded with the single seeded `Create` claim (`BB\Core\Shared\Authorization\CaboodlePermissions.cs:156`) — Q4.
- **MasterDataUploadController** — admin-app bulk import/export + sample files; platform, keep `[MustHavePermission]` (claims at `CaboodlePermissions.cs:127-128`). Cross-reference: BrandsController `POST import` / `GET export` reuse the same `MasterDataUpload` permission (workbook for Brands).
- `POST /distributorsalesreports/velocity-per-store-for-promotion` is consumed by the **trade-spend promo-create screen**, not the DSR report page — slug choice = Q2.
- SPINS child modules `item-ranking-report` / `stores-insight-report` exist in the catalog but gate nothing in the FE — endpoint-level granularity = Q1.

## 4. Endpoint authorization matrix

Action mapping per template (§4.3). Every KeHE/UNFI/SPINS/DSR action is attribute-free today (`[BrandIDHeader]` is Swagger-only — `BB\Infrastructure\OpenApi\BrandIdHeaderAttribute.cs`); the only guards are the global `RequireAuthorization` plus `BrandValidationMiddleware` + handler `GetBrandID()` scoping (§5). "—" in Today's guard = no attribute. All brand-data rows: tag **D1** (brand-audience-only attribute drops today's incidental broker access).

### 4.1 DataMappingsController — `/api/v1/datamappings` (8)
File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\DataMappingsController.cs`. Every action carries MHP(**Create**, DataUpload, DataUpload) — ADMIN-only in practice: the Broker/SubBroker claim sets contain only `CaboodleModule.Broker` permissions (`CaboodlePermissions.cs:202-222`; seeding `BB\Infrastructure\Persistence\Initialization\ApplicationDbSeeder.cs:52-58`), so brand and broker roles hold no DataUpload claims. Handlers in `MDA\Requests\Mapping\`.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | GetDataMappingsRequest | MHP(Create, DataUpload, DataUpload); global query, no tenant filter (`CRUD\GetDataMappingsRequest.cs:102-117`) | keep `[MustHavePermission]` (platform) | Read guarded with Create — Q4 |
| GET {id} | GetDataMappingRequest | MHP(Create, …); global by id (`CRUD\GetDataMappingRequest.cs:52-59`) | keep `[MustHavePermission]` | Q4 |
| POST | UpsertDataMappingRequest | MHP(Create, …); upsert, `EntityID` validated against the target catalog table per `FileCategory` (`CRUD\UpsertDataMappingRequest.cs:59-112,114-175`) | keep `[MustHavePermission]` | Platform upsert — no handler `Demand()` needed (not module-gated) |
| DELETE | DeleteDataMappingsRequest | MHP(Create, …); soft-delete by ids, no ownership concept (`CRUD\DeleteDataMappingsRequest.cs:42-47`) | keep `[MustHavePermission]` | Delete guarded with Create — Q4 |
| POST import | DataMappingsImportRequst *(sic)* | MHP(Create, …); bulk insert, `EntityID`s validated for existence (`ImportExport\DataMappingsImportRequst.cs:62-157`) | keep `[MustHavePermission]` | |
| GET export/sample-file | ExportDataMappingSampleFileRequest | MHP(Create, …); static CSV, no data | keep `[MustHavePermission]` | |
| GET export | ExportDataMappingsRequest | MHP(Create, …); global export (`ImportExport\ExportDataMappingsRequest.cs:104-139`) | keep `[MustHavePermission]` | Export guarded with Create — Q4 |
| GET filter-data | GetDataMappingFiltersRequest | MHP(Create, …); global distinct values (`Filter\GetDataMappingFiltersRequest.cs:39-48`) | keep `[MustHavePermission]` | |

### 4.2 DistributorSalesReportsController — `/api/v1/distributorsalesreports` (18)
File: `…\DataUpload\DistributorSalesReportsController.cs`. All actions `[BrandIDHeader]`, no attribute. Handlers in `MDA\Requests\DistributorSalesRecords\`; every query filters `dsr."BrandID" = @BrandID` with `@BrandID = GetBrandID()`.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST filter-data | GetDistributorSalesRecordsFilterOptionsRequest | —; brand-scoped distinct values (`Filters\GetDistributorSalesRecordsFilterOptionsRequest.cs:92-97`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-by-product | GetSalesByProductReportRequest | —; brand-scoped (`Reports\GetSalesByProductReportRequest.cs:39,84`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-by-chain | GetSalesByChainReportRequest | —; brand-scoped (`…:64`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-by-store | GetSalesByStoreReportRequest | —; brand-scoped (`…:65`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-by-city | GetSalesByCityReportRequest | —; brand-scoped (`…:59`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-by-state | GetSalesByStateReportRequest | —; brand-scoped (`…:53`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST sales-details | GetSalesDetailsReportRequest | —; brand-scoped (`…:66`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST total-dollar-and-cases | GetTotalDollarAndCasesReportRequest | —; brand-scoped (`Reports\GetTotalDollarAndCasesRequest.cs:56`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST velocity-per-store | GetVelocityPerStoreReportRequest | —; brand-scoped (`…:64`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST velocity-per-store-for-promotion | GetVelocityPerStoreReportForPromotionRequest | —; brand-scoped (`Reports\GetVelocityPerStoreReportForPromotionRequest.cs:30,110-144`) | `RM(brand: "distributor-sales-report", View)` *(Q2)* | Called by the promo-create screen (approved-promotions flow), not the DSR page. D1, Q2 |
| POST dc-report | GetDcReportRequest | —; brand-scoped (`…:47`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST store-void-report | GetStoreVoidReportRequest | —; brand-scoped (`…:50`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST warehouse-report | GetWarehouseReportRequest | —; brand-scoped (`…:33`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST retail-sales-report | GetRetailSalesReportRequest | —; brand-scoped (`…:41-45`) | `RM(brand: "distributor-sales-report", View)` | D1 |
| POST export-report | ExportDistributorSalesReportByTypeRequest | —; brand-scoped (`ImportExport\ExportDistributorSalesReportByTypeRequest.cs:74,145`) | `RM(brand: "distributor-sales-report", Export)` | D1 |
| POST import/chunk | UploadChunkForDistributorReportFileImportRequest | —; job created with `BrandID`+`CreatedBy`; later chunks 404 on brand mismatch, 403 on wrong `ModuleType` (`ImportExport\UploadChunkForDistributorReportFileImportRequest.cs:79-110`) | `RM(brand: "distributor-sales-report", Create)` | Import → Create. D1 |
| POST import/start | StartDistributorReportFileImportRequest | —; provider restricted to KEHE/UNFI (`…:32-34`); job `BrandID` must match (`…:56-67`); enqueues with the captured brandId (`…:98`) | `RM(brand: "distributor-sales-report", Create)` | D1 |
| GET import/{jobId:guid}/status | GetDistributorReportImportJobStatusRequest | —; brand match + `ModuleType` check → 403 (`ImportExport\GetDistributorReportImportJobStatusRequest.cs:35-51`) | `RM(brand: "distributor-sales-report", View)` | Keep BrandID job ownership. D1 |

### 4.3 KeHEController — `/api/v1/kehe` (22)
File: `…\DataUpload\KeHeController.cs` (class `KeHEController`). All `[BrandIDHeader]`, no attribute. Handlers in `MDA\Requests\KeHE\`; reports share `MDA\Helper\KeHEReportsQueryHelper.cs` (`"BrandID" = @BrandID`, `:28-31`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST | ImportKeHERequest | —; rows stamped `BrandID = GetBrandID()` + `CreatedBy` (`ImportExport\ImportKeHERequest.cs:63-77`) | `RM(brand: "kehe", Create)` | Legacy ≤30MB path. D1 |
| POST import/chunk | UploadChunkForKeHEImportRequest | —; job `BrandID` stamp + brand-mismatch 404 (`ImportExport\UploadChunkForKeHEImportRequest.cs:88-114`); enqueued as `ModuleType.KeHEExport` (misnomer, `:98,171`) | `RM(brand: "kehe", Create)` | D1 |
| GET import/{jobId}/status | GetKeHEImportJobStatusRequest | —; brand match → 403, **no `ModuleType` check** (`ImportExport\GetKeHEImportJobStatusRequest.cs:37-50`); same request reused by StoresController store-list imports | `RM(brand: "kehe", View)` | Cross-module job polling possible within a brand — §5 note. D1 |
| GET export | ExportKeHERecordsRequest | —; brand-scoped (`ImportExport\ExportKeHERecordsRequest.cs:66`) | `RM(brand: "kehe", Export)` | D1 |
| POST export-report | ExportKeHEReportByTypeRequest | —; brand-scoped (`ImportExport\ExportKeHEReportByTypeRequest.cs:66`) | `RM(brand: "kehe", Export)` | D1 |
| GET format | ExportKeHESampleFileRequest | —; static empty CSV, no data (`ImportExport\ExportKeHESampleFileRequest.cs:16-18`) | `RM(brand: "kehe", View)` | Sample file for the import dialog; View (no data leaves the tenant) |
| GET | GetKeHeRecordsRequest | —; brand-scoped (`CRUD\GetKeHeRecordsRequest.cs:50,81`) | `RM(brand: "kehe", View)` | D1 |
| GET total-dollar-and-cases-shiped | GetTotalDollarAndCasesRequest | —; brand-scoped (`SalesReport\GetTotalDollarAndCasesRequest.cs:57`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-by-product | GetSalesByProductRequest | —; brand-scoped (`SalesReport\GetSalesByProductRequest.cs:49`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-by-retailer | GetSalesByRetailerRequest | —; brand-scoped (`…:49`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-by-store | GetSalesByStoreRequest | —; brand-scoped (`…:49`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-by-state | GetSalesByStateRequest | —; brand-scoped (`…:47`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-by-city | GetSalesByCityRequest | —; brand-scoped (`…:54`) | `RM(brand: "kehe", View)` | D1 |
| GET sales-details | GetSalesDetailsRequest | —; brand-scoped (`…:51`) | `RM(brand: "kehe", View)` | D1 |
| GET dc-report | GetKeHEDCReportRequest (file `GetKeHeDcReportRequest.cs:46`) | —; brand-scoped | `RM(brand: "kehe", View)` | D1 |
| GET sales-report | GetKeHeSalesReportRequest | —; brand-scoped (`…:47`) | `RM(brand: "kehe", View)` | D1 |
| GET warehouse-report | GetKeHEWarehouseReportRequest | —; brand-scoped (`…:43`) | `RM(brand: "kehe", View)` | D1 |
| GET store-void-report | GetStoreVoidReportRequest (KeHE) | —; brand-scoped (`SalesReport\GetStoreVoidReportRequest.cs:44`) | `RM(brand: "kehe", View)` | D1 |
| GET velocity-report | GetVelocityPerStoreReportRequest (KeHE) | —; brand-scoped (`SalesReport\GetVelocityPerStoreReportRequest.cs:49`) | `RM(brand: "kehe", View)` | D1 |
| GET filter-criteria-data | GetKeHeFiltersDataRequest | —; brand-scoped (`CRUD\GetKeHeFiltersDataRequest.cs:33`) | `RM(brand: "kehe", View)` | D1 |
| POST filter-data | GetKeheFilterOptionsRequest | —; brand-scoped; `PropertyName` allowlisted before interpolation (`CRUD\GetKeheFilterOptionsRequest.cs:55-70,76`) | `RM(brand: "kehe", View)` | D1 |
| DELETE | DeleteKeHeRecordsRequest | —; **hard** `DELETE FROM … WHERE "BrandID" = @brandID` + optional filters (`CRUD\DeleteKeHeRecordsRequest.cs:37-48`); no narrower check — filterless call wipes the brand's table | `RM(brand: "kehe", Delete)` | D1, Q5 |

### 4.4 MasterDataUploadController — `/api/v1/masterdataupload` (33)
File: `…\DataUpload\MasterDataUploadController.cs`. Every active action carries MHP(**Import**, MasterDataUpload, DataUpload) (16 imports) or MHP(**Export**, …) (17 exports incl. `sample-file`) — ADMIN-only in practice (same claim-set argument as §4.1). Admin-app surface; keep `[MustHavePermission]` on all rows, so they are listed compactly. Platform rows — no D-tags.

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST distributors / sub-distributors / retailers / contacts / banners / bannerskus / categories / price-list / productspecs / distributor-dc / retailer-regions / regions / stores / distribution-centers (14 rows) | DistributorsImportRequest, SubDistributorsImportRequest, RetailersImportRequest, ContactsImportRequest, BannersImportRequest, BannerSkusImportRequest, CategoryImportRequest, PriceListImportRequest, ProductSpecImportRequest, DistributorDcImportRequest, RetailerRegionImportRequest, RegionImportRequest, StoreImportRequest, DistributionCenterImportRequest | MHP(Import, MasterDataUpload, DataUpload) — ADMIN-only in practice (`CaboodlePermissions.cs:128,202-222`); handlers in `MSI\Services\MasterDataUpload\MasterDataUploadService.cs` resolve brands by **name match** per CSV row (e.g. `:760,779`) | keep `[MustHavePermission]` (platform) | Cross-brand platform writes into CRM/ProductSpec tables |
| POST keHes | ImportMasterKeHeRecordsRequest | MHP(Import, …); `BrandID` parsed from each CSV row (`EntityMapping.cs:196`; `MasterDataUploadService.cs:1306-1325`) | keep `[MustHavePermission]` | Writes the same `KeHeRecords` table as §4.3 |
| POST unfis | ImportMasterUnfiRecordsRequest | MHP(Import, …); same per-row `BrandID` (`MasterDataUploadService.cs:1327-1346`) | keep `[MustHavePermission]` | |
| GET contacts / distributors / retailers / productspecs / keHes / unfis / regions / distribution-centers / stores / banners/export (10 rows) | ContactsExportRequest, DistributorExportRequest, RetailersExportRequest, ProductSpectExportRequest, ExportMasterKeHeRecordsRequest, ExportMasterUnfiRecordsRequest, RegionExportRequest, DistributionCenterExportRequest, StoreExportRequest, BannersExportRequest | MHP(Export, MasterDataUpload, DataUpload) — ADMIN-only; master KeHE/UNFI exports are **unscoped across all brands** (`MasterDataUploadService.cs:2901-2926`; `sortingOrder` interpolated into SQL) | keep `[MustHavePermission]` | |
| POST categories/export / price-list/export / sub-distributors/export / bannerskus/export / distributor-dc/export / retailer-regions/export (6 rows) | CategoryExportRequest, PriceListExportRequest, SubDistributorExportRequest, BannerSkusExportRequest, DistributorDcExportRequest, RetailerRegionExportRequest | MHP(Export, …) — ADMIN-only | keep `[MustHavePermission]` | |
| GET sample-file | ExportSampleFileRequest | MHP(Export, …); static sample per `FileCategory` | keep `[MustHavePermission]` | |

Commented-out block (controller lines 200–220, inactive — excluded from counts, do not annotate): `POST banner-reatiler` (ImportBannerRetailerAsync → BannerRatilerMergeExportRequest) and `POST crm` (ImportCRMDataAsync → CRMMasterDataUploadRequest). If ever revived they are platform imports → `[MustHavePermission]`.

### 4.5 SPINSController — `/api/v1/spins` (19)
File: `…\DataUpload\SPINSController.cs`. All `[BrandIDHeader]`, no attribute. Handlers in `MDA\Requests\SPINS\`. All rows gate on the parent slug `spins` (child-slug granularity = Q1).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| POST import-items-ranking | ImportSPINSItemsRankingRecordsRequest | —; rows stamped `BrandID = GetBrandID()` (`ImportExport\ItemsRanking\ImportSPINSItemsRankingRecordsRequest.cs:58,255`) | `RM(brand: "spins", Create)` | D1, Q1 |
| POST import-stores-insight | ImportSPINSStoresInsightRecordsRequest | —; brand stamp (`ImportExport\StoresInsight\ImportSPINSStoresInsightRecordsRequest.cs:60`) | `RM(brand: "spins", Create)` | Legacy small-file path. D1, Q1 |
| POST import-stores-insight/chunk | UploadChunkForSPINSStoresInsightImportRequest | —; job `BrandID` stamp + brand-mismatch 404, `ModuleType.SPINSExport` (`…:88-112,171`) | `RM(brand: "spins", Create)` | D1 |
| GET import-stores-insight/{jobId:guid}/status | GetSPINSStoresInsightImportJobStatusRequest | —; job brand match → 403 (`…\GetSPINSStoresInsightImportJobStatusRequest.cs:38-48`) | `RM(brand: "spins", View)` | Keep BrandID job ownership. D1 |
| GET banner/product | GetProductFilteredByBannerRequest | —; brand-scoped lookup (`Filter\StoresInsight\GetProductFilteredByBannerRequest.cs:61`) | `RM(brand: "spins", View)` | Stores-insight filter feed. D1 |
| GET export-items-ranking | ExportItemsRankingReportRequest | —; brand-scoped (`ImportExport\ItemsRanking\ExportItemsRankingReportRequest.cs:41`) | `RM(brand: "spins", Export)` | D1 |
| GET export-stores-ingiht *(sic)* | ExportStoresInsightReportRequest | —; brand-scoped (`ImportExport\StoresInsight\ExportStoresInsightReportRequest.cs:38`) | `RM(brand: "spins", Export)` | D1 |
| GET format/{isItemsRanking} | ExportSPINSSampleFileRequest | —; static sample, no data (`ImportExport\Sample File\ExportSPINSSampleFileRequest.cs`) | `RM(brand: "spins", View)` | Serves both report families |
| GET time-periods-report | ItemsRankingTimePeriodsReportRequest | —; brand-scoped (`Report\ItemsRanking\ItemsRankingTimePeriodsReportRequest.cs:39`) | `RM(brand: "spins", View)` | D1, Q1 |
| GET item-ranking-report | GetItemRankingReportRequest | —; brand-scoped (`…\GetItemRankingReportRequest.cs:41,86`) | `RM(brand: "spins", View)` | D1, Q1 |
| GET brand-ranking-report | GetBrandRankingReportRequest | —; brand-scoped (`…\GetBrandRankingReportRequest.cs:43`) | `RM(brand: "spins", View)` | D1, Q1 |
| POST void-report | GetVoidReportRequest | —; brand-scoped (`Report\StoresInsight\GetVoidReportRequest.cs:51`) | `RM(brand: "spins", View)` | D1, Q1 |
| POST banner-weekly-unit-sales | RetailerWeeklyUnitSalesReportRequest | —; brand-scoped (`…\RetailerWeeklyUnitSalesReportRequest.cs:59`) | `RM(brand: "spins", View)` | D1, Q1 |
| POST bump-chart | GetBumpChartReportRequest | —; brand-scoped (`…\GetBumpChartReportRequest.cs:33`) | `RM(brand: "spins", View)` | D1, Q1 |
| POST items-ranking-filter-data | GetItemsRankingFiltersRequest | —; brand-scoped (`Filter\ItemsRankingFilters\GetItemsRankingFiltersRequest.cs:82`) | `RM(brand: "spins", View)` | D1 |
| POST stores-insight-filter-data | GetStoresInsightFiltersRequest | —; brand-scoped (`Filter\StoresInsight\GetStoresInsightFiltersRequest.cs:73`) | `RM(brand: "spins", View)` | D1 |
| GET items-ranking-numeric-filters-data | GetMinMaxFilterValuesRequest | —; brand-scoped (`Filter\ItemsRankingFilters\GetMinMaxFilterValuesRequest.cs:40`) | `RM(brand: "spins", View)` | D1 |
| DELETE items-ranking | DeleteItemsRankingDataRequest | —; hard delete, brand-scoped (`CRUD\DeleteItemsRankingDataRequest.cs:36-45`) | `RM(brand: "spins", Delete)` | D1, Q5 |
| DELETE stores-insight | DeleteStoresInsightDataRequest | —; hard delete, brand-scoped (`CRUD\DeleteStoresInsightDataRequest.cs:35-41`) | `RM(brand: "spins", Delete)` | D1, Q5 |

### 4.6 UNFIController — `/api/v1/unfi` (22)
File: `…\DataUpload\UNFIController.cs`. All `[BrandIDHeader]`, no attribute. Handlers in `MDA\Requests\UNFI\`; reports share `MDA\Helper\UNFIReportsQueryHelper.cs` (`ur."BrandID" = @BrandID`, `:16-19`).

| Verb + route | Request / handler | Today's guard | Target guard | Notes / tags |
|---|---|---|---|---|
| GET | GetUnfiRecordsRequest | —; brand-scoped (`CRUD\GetUnfiRecordsRequest.cs:53,98`) | `RM(brand: "unfi", View)` | D1 |
| GET filter-criteria-data | GetUNFIFiltersDataRequest (file `GetUnfiFiltersDataRequest.cs:36`) | —; brand-scoped | `RM(brand: "unfi", View)` | D1 |
| POST filter-data | GetUNFIFilterOptionsRequest | —; brand-scoped over `UNFIMappedRecords`; `PropertyName` allowlisted (`Filters\GetUNFIFilterOptionsRequest.cs:65,74,91`) | `RM(brand: "unfi", View)` | Reads the DataHub-mapped table. D1 |
| GET format | ExportUNFISampleFileRequest | —; static sample, no data | `RM(brand: "unfi", View)` | |
| GET export | ExportUNFIRecordsRequest | —; brand-scoped (`ImportExport\ExportUNFIRecordsRequest.cs:58`) | `RM(brand: "unfi", Export)` | D1 |
| GET total-dollar-and-cases-shiped *(sic)* | GetUNFITotalDollarAndCasesRequest (file `GetTotalDollarAndCasesRequest.cs:46`) | —; brand-scoped | `RM(brand: "unfi", View)` | D1 |
| GET dc-report | GetUNFIDCReportRequest | —; brand-scoped (`Reports\GetUNFIDCReportRequest.cs:36`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-report | GetUNFIRetailSalesReportRequest | —; brand-scoped (`…:38`) | `RM(brand: "unfi", View)` | D1 |
| GET warehouse-report | GetWarehouseReportRequest (UNFI) | —; brand-scoped (`Reports\GetWarehouseReportRequest.cs:33`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-by-product-report | GetSalesByProductReportRequest (UNFI) | —; brand-scoped (`Reports\GetSalesByProductReportRequest.cs:39`) | `RM(brand: "unfi", View)` | D1 |
| GET velocity-report | GetUNFIVelocityPerStoreReportRequest | —; brand-scoped (`…:41`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-by-chain-report | GetSalesByChainReportRequest (UNFI) | —; brand-scoped (`Reports\GetSalesByChainReportRequest.cs:39`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-by-city-report | GetSalesByCityReportRequest (UNFI) | —; brand-scoped (`…:39`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-by-store-report | GetSalesByStoreReportRequest (UNFI) | —; brand-scoped (`…:39`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-by-state-report | GetSalesByStateReportRequest (UNFI) | —; brand-scoped (`…:41`) | `RM(brand: "unfi", View)` | D1 |
| GET sales-details-report | GetSalesDetailsReportRequest (UNFI) | —; brand-scoped (`…:39`) | `RM(brand: "unfi", View)` | D1 |
| GET store-void-report | GetUNFIStoreVoidReportRequest (file `GetStoreVoidReportRequest.cs:33`) | —; brand-scoped | `RM(brand: "unfi", View)` | D1 |
| POST export-report | ExportUNFIReportByTypeRequest | —; brand-scoped (`ImportExport\ExportUNFIReportByTypeRequest.cs:59`) | `RM(brand: "unfi", Export)` | D1 |
| POST | ImportUNFIRecordsRequest | —; rows stamped `BrandID = GetBrandID()` (`ImportExport\ImportUNFIRecordsRequest.cs:64,124`) | `RM(brand: "unfi", Create)` | Legacy small-file path. D1 |
| POST import/chunk | UploadChunkForUNFIImportRequest | —; job `BrandID` stamp + brand-mismatch 404, `ModuleType.UNFIExport` (`…:88-112,171`) | `RM(brand: "unfi", Create)` | D1 |
| GET import/{jobId:guid}/status | GetUNFIImportJobStatusRequest | —; job brand match → 403 (`…:38-48`) | `RM(brand: "unfi", View)` | D1 |
| DELETE | DeleteUnfiRecordsRequest | —; hard delete, brand-scoped (`CRUD\DeleteUnfiRecordsRequest.cs:33-40`) | `RM(brand: "unfi", Delete)` | D1, Q5 |

## 5. Parity notes

**What each mechanism actually allows/denies today:**

- **No endpoint-level check exists on the 81 brand-data actions** (KeHE 22 + UNFI 22 + SPINS 19 + DSR 18): no attribute, so the global `MapControllers().RequireAuthorization()` is the whole gate (architecture §8-13 names all four controllers). Module membership is enforced nowhere server-side; FE route gating is the only module control.
- **`BrandValidationMiddleware` is the only tenant gate** (`BB\Infrastructure\Middleware\BrandValidationMiddleware.cs`): runs only when a `BrandID` header is present (`:37-38`); ADMIN bypasses (`:48-49`); **brokers and sub-brokers pass for any brand in their own `BrandBrokers` rows** (`:85-95`); brand owners via `Brands.UserID` (`:97-104`); brand sub-users via `BrandSubUsers` (`:106-112`); otherwise 403 (`:60-63`). Consequence: **any broker connected to a brand for any purpose can today read, import, export and hard-delete that brand's KeHE/UNFI/SPINS/DSR data** by sending the brand's header — no module, claim or FE surface required.
- **Handler scoping** is uniform: `CurrentUserMiddleware` parses the header into `CurrentUser` (`BB\Infrastructure\Auth\CurrentUserMiddleware.cs:18-22`); `GetBrandID()` returns `Guid.Empty` when the header is missing/unparseable (`BB\Infrastructure\Auth\CurrentUser.cs:10,20`); every query/write parameterizes that value. Missing header ⇒ middleware never runs, reads return empty sets, **imports stamp rows under brand `Guid.Empty`** and deletes delete nothing.
- **Claim sets** (`CaboodlePermissions.cs:202-222`, seeded `ApplicationDbSeeder.cs:52-58`): `Admin` = all; `Broker`/`SubBroker` = `CaboodleModule.Broker` only. So every MHP row in §4.1/§4.4 (`CaboodleModule.DataUpload`) is **ADMIN-only in practice**; brand roles hold no claims at all.
- **Import-job ownership** is a `BrandID` equality check (403 on mismatch), not `CreatedBy` — any user of the same brand can poll or resume another user's job. DSR status/start additionally check `ModuleType`; the KeHE status handler does not (`GetKeHEImportJobStatusRequest.cs:37-50`), and StoresController's store-list import reuses that same request, so same-brand jobs are pollable across modules.

**Resolver must-match list** (comparator, Phase 2.5): for brand owners/sub-users, `[RequireModule(brand: slug)]` against the active brand must equal today's middleware outcome whenever the org has the module (owner via `Brands.UserID` → `brand-admin` membership; sub-user via `BrandSubUsers` → `brand-member` + Full BrandAccess, plan §10.1). ADMIN keeps full reach through the support context (audited). Import-job BrandID ownership checks are kept verbatim.

**Do-not-reproduce list** (intentional comparator differences, one line each):

1. **Connected-broker access to brand sales data** (middleware brand-level pass): with brand-audience-only attributes and the D1 broker-catalog rule, broker workspaces get 403 on all 81 actions — intentional tightening; no broker FE calls exist, so nothing visible breaks (whitelist any broker-persona disagreement).
2. **Missing-header behavior**: today silent empty reads, `Guid.Empty`-stamped import rows, no-op deletes; target 403 (no active brand ⇒ `[RequireModule]` fails). Comparator expects 403-not-200; add a Phase 0-style data pre-check for existing `BrandID = '00000000-…'` orphan rows.
3. `BrandValidationMiddleware` invalid-GUID header writes a 400 body with HTTP 200 (`:66-72`) — reproduce the 400, not the 200 (shared bug, also listed in workbook 01).
4. **Filterless `DELETE /kehe`, `/unfi`, `/spins/*`** hard-delete the brand's entire table for any authenticated brand-connected caller with no permission check — the module `Delete` action is the floor; whether hard delete itself survives is Q5 (behavior kept for parity, flagged).
5. DataMappings guards every verb — reads, export, delete — with the single `Create` claim; keep for parity (platform), flag the action-semantics mismatch (Q4) so the comparator whitelists any future claim split.
6. KeHE import-job status omits the `ModuleType` check that its DSR twin has — port the DSR check when annotating rather than reproducing the omission (same-brand only, low risk; whitelist the new 403).

## 6. Code changes beyond attributes

- **No schema changes.** Every business table in scope is `BrandID`-keyed or platform; nothing here is in IAM plan 1.3's `BrokerageOrganizationID` list, and import jobs stay brand-keyed. (The invariant-11 column work does not touch this area.)
- **Queries stay as-is**: the `[RequireModule(brand:)]` attribute validates module + active brand before the handler runs; handlers keep `GetBrandID()` filters as the row-level guarantee. No `_access.BrandsWith(...)` allowlists needed — no cross-brand endpoint exists in this area.
- **Demand() call sites: none.** The only Upsert (`UpsertDataMappingRequest`) stays platform `[MustHavePermission]`, outside the module system.
- **Deploy ordering**: these 81 actions are exactly the case called out in workbook 01 §6 — the `BrandID` header check is their **only** guard, so `[RequireModule]` must land in the same deploy that retires `BrandValidationMiddleware` (plan 4.4), or the area is briefly open to any authenticated user.
- **BrandID-header edge cases**: all rows are single-brand; a missing or stale header must produce 403 under the new model (no cross-brand mode here). The FE always sends the header from the brand workspace, but plan §5-6 notes persisted stale headers — comparator persona needed.
- **Keep**: import-job `BrandID` ownership checks and the enqueue pattern (`ExecuteImportAsync(jobId, brandId, userId, moduleType)` — brand captured at enqueue, `MSI\Services\Import\ImportJobService.cs:97-130`). Add the missing `ModuleType` check to `GetKeHEImportJobStatusRequest` (§5-6).
- **Adjacent hygiene (not access, log as debt)**: interpolated IN-lists sanitized only by `ReplaceSingleQuote` (`DeleteKeHeRecordsRequest.cs:59-120` and siblings); `sortingOrder` interpolated in master exports (`MasterDataUploadService.cs:2907-2911`); hard deletes bypass the SoftDeletePurge trail (Q5); `ModuleType.KeHEExport` misnomer for import jobs (`UploadChunkForKeHEImportRequest.cs:98`).
- **Nothing to delete** in this area at Phase 4.4 beyond the shared middleware (owned by workbook 01's list); no per-module access helpers exist here.

## 7. FE impact (Phase 5)

Web (caboodle.web, develop @ 956295e4), per `_inventory.md` Section C:

- Routes (all brand workspace, `BRAND_ROUTE_MODULES`): `/[brandID]/kehe` → `kehe`, `/unfi` → `unfi`, `/spins` (+ nested `/spins/item-ranking-report`, `/spins/stores-insight-report`) → `spins`, `/distributor-sales-report` → `distributor-sales-report` (`src/constants/moduleConstants.ts:58,136`). Pages under `src/app/(brand)/[brandID]/(data upload)/…`.
- Entry is the `/report` hub, not the nav: tiles wrapped in `ModuleGate` for `spins`/`kehe`/`unfi`/`distributorSalesReport` (`src/app/(brand)/[brandID]/(report)/report/page.tsx:90-136`); the dashboard's SPINS shortcut is commented out (`dashboard/page.tsx:92`).
- Services: `src/service/dataUpload.service.ts` (every KeHE/UNFI/SPINS read/export/delete call), `src/service/distributorSalesReport.service.ts` (`BASE_PATH = /api/v1/distributorsalesreports`, all 18), `src/service/chunked-import.service.ts:22-26` (chunk/start/status for `kehe/import`, `unfi/import`, `spins/import-stores-insight`, `DistributorSalesReports/import`), `src/service/sampleFile.service.ts:94-124` (the three `format` endpoints).
- **Broker workspace makes zero calls** into these controllers — consistent with the brand-audience-only target guards.
- **Cross-module consumer**: the trade-spend promo-create stepper calls `distributorsalesreports/velocity-per-store-for-promotion` (`src/app/(brand)/[brandID]/(promo)/(trade-spend)/promo-create/product-stepper/BannerSKUs.tsx:9-27`). Once `[RequireModule]` enforces, brands with `approved-promotions` but without `distributor-sales-report` get 403 there — the form must tolerate it (hide the velocity column; 403-not-401, plan §5-2). Q2.
- **Dormant admin-surface calls in web**: `dcs.service.ts:102,132` (`masterdataupload/distribution-centers`, `distributor-dc` exports) and `store.service.ts:58` (`masterdataupload/stores` export) exist but have no component callers (only a unit test imports `DCsService`) — they would 403 for non-admins; leave them to the admin app and delete from web in Phase 5.
- Admin app (not caboodle.web): all MasterDataUpload import/export screens and the DataMappings CRUD ride ADMIN claims today and keep `[MustHavePermission]`; they migrate with the admin app per IAM plan Phase 5.
- When `/me/access` lands: route→slug maps unchanged; sequence the module-assignment backfill before flipping `ALLOW_ALL_WHEN_NO_MODULES` (today any non-backfilled tenant sees all four data-source screens).

## 8. Test checklist

- **Comparator (Phase 2.5)** personas per endpoint: brand owner, brand sub-user, *a broker connected to the brand* (expects new 403s — §5-1 whitelist), an unconnected broker (403 both sides), ADMIN (support context), caller with missing header (today-empty vs target-403, §5-2 whitelist), caller with stale/other-brand header (403 both sides).
- **Matrix tests**: for each §4 row — allowed with the module granted on the active brand; 403 when the module is missing, when the action flag is missing (Custom grant without Create/Delete/Export), and when the organization is suspended. Verify `Custom` grants with only `View` block imports, exports and deletes (today nothing distinguishes them).
- **Job ownership**: chunk/start/status 403 for a different brand's job id (existing behavior, kept); same-brand cross-module poll blocked once the `ModuleType` check is added to the KeHE status handler (§5-6); enqueued Hangfire jobs still write rows under the brand captured at enqueue.
- **Platform rows**: all §4.1/§4.4 actions 403 for brand and broker roles (no DataUpload claims) and pass for ADMIN; master keHes/unfis import still writes per-CSV-row `BrandID`s; master exports unscoped (ADMIN-only).
- **Data pre-check**: count `BrandID = Guid.Empty` rows in the four record tables before enforcing (orphans from the missing-header path, §5-2).
- **Reflection test (plan 4.3)**: all 122 actions carry exactly one of the four guard attributes; baseline shrinks only; `KeHEController`/`SPINSController`/`UNFIController` casing does not break discovery.
- **Contract tests**: `GET /brands/me` untouched by this area; promo-create tolerates 403 from `velocity-per-store-for-promotion` (Q2); import chunk/status response shapes unchanged (FE polls them).

## 9. Open questions

1. **Q1 — SPINS child modules** (`item-ranking-report`, `stores-insight-report`) exist in the catalog but gate nothing (FE nests both report pages under the `spins` route gate). Endpoints split cleanly by family, so child-level enforcement is possible. Recommendation: gate all SPINS endpoints on parent `spins` (matches FE and avoids the enablement footgun where `spins` is enabled without its children); keep the children as catalog/display nodes; revisit only if product wants per-report entitlement.
2. **Q2 — `velocity-per-store-for-promotion` audience**: consumed by the trade-spend promo-create screen (`approved-promotions` flow), not the DSR page. Recommendation: gate it `RM(brand: "distributor-sales-report", View)` (it reads DSR data), seed `approved-promotions → distributor-sales-report (OptionalDataSource)` so the dependency is visible in the catalog, and make the promo form hide velocity on 403.
3. **Q3 — accept the broker lock-out?** Today any connected broker can call all 81 brand-data actions via the `BrandID` header; the target (brand-audience slugs only + D1 broker-catalog rule) denies broker workspaces entirely. Recommendation: accept — no broker FE exists and sales uploads are brand business data (invariant 10 sharing would apply only if Broker-audience copies of `kehe`/`unfi`/`spins`/`distributor-sales-report` were ever seeded). Needs product confirmation that no brokerage operates these screens through the brand's own workspace today.
4. **Q4 — DataMappings action semantics**: one seeded `Create` claim guards reads, upsert, delete, import, export (`CaboodlePermissions.cs:156`). Recommendation: keep as-is under `[MustHavePermission]` for cut-over parity (ADMIN-only either way); split into View/Upsert/Delete/Export claims only if non-ADMIN platform operators are ever introduced.
5. **Q5 — hard deletes**: `DELETE /kehe`, `/unfi`, `/spins/items-ranking`, `/spins/stores-insight` physically `DELETE FROM` with optional filters — a filterless call wipes the brand's table, leaves no soft-delete/purge trail, and is today available to any brand-connected caller. Recommendation: keep behavior at cut-over (module `Delete` action becomes the guard), log soft-delete conversion + audit event as follow-up debt; decide whether `Delete` should additionally require a filter (product call).
