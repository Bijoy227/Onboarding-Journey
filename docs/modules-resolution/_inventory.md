# Inventory — Existing Modules Resolution

Generated 2026-10-06 · BE develop @ 07f8fa01 · web develop @ 956295e4 · source of truth for all workbooks

## Section A — Controller & action inventory (backend)

Route convention: `VersionedApiController` ⇒ `[Route("api/v{version:apiVersion}/[controller]")]`, so prefix = `/api/v1/` + class name minus `Controller`, lowercased, unless an explicit `[Route]` overrides it. Action templates below are relative to the prefix. `BrandID` = `[BrandIDHeader]` on the action. Repo root for file paths: `D:\Fork\Caboodle BE Repository\caboodle.backend`.

### AdminController
Prefix: `/api/v1/admin` · File: `caboodle\src\Hosts\API\Controllers\Admin\AdminController.cs` · Requests mostly from: Modules.Admin.Application (also Modules.ProductSpecs.Application (1)) + 1 service-based action(s)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST login | ITokenService.GetAdminTokenAsync (no mediator) | [AllowAnonymous] | — |
| GET pipelines/dealstages | GetAllPipeLineDealStagesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.PipeLineDealStage, CaboodleModule.PipeLine)] | — |
| PUT pipelines/dealstages | UpdatePipeLineDealStageRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.PipeLineDealStage, CaboodleModule.PipeLine)] | — |
| POST data-cleanup/bannersku | BannerSKUDataCleanupRequest | — | — |
| GET data-cleanup/sync-per-unit-price | SyncPricingsOfEventsRequest | — | — |
| POST email-loggers | GetAllEmailLoggersRequest | — | — |
| POST email-loggers/resend | ResendEmailsRequest | — | — |
| GET email-loggers/{id} | GetEmailLoggerDetailRequest | — | — |
| GET email-loggers/address-suggestions | GetEmailAddressSuggestionsRequest | — | — |
| GET bubbies-db/connectivity | CheckBubbiesDbConnectivityRequest | — | — |
| GET bubbies-db/tables | GetBubbiesDbTablesReportRequest | — | — |

### ConfigurationsController
Prefix: `/api/v1/configurations` · File: `caboodle\src\Hosts\API\Controllers\Admin\ConfigurationController.cs` · Requests mostly from: Modules.Admin.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET modules | GetConfigurationModulesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Modules, CaboodleModule.Configuration)] | — |
| POST modules | CreateConfigurationModuleRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.Modules, CaboodleModule.Configuration)] | — |
| PUT modules/{id:guid} | UpdateConfigurationModuleRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Modules, CaboodleModule.Configuration)] | — |
| DELETE modules | DeleteConfigurationModulesRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Modules, CaboodleModule.Configuration)] | — |
| POST modules/seed | SeedConfigurationModulesRequest | [MustHavePermission(CaboodleAction.Execute, CaboodleResource.Modules, CaboodleModule.Configuration)] | — |
| POST module-assignments/preview | PreviewModuleAssignmentsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.ModuleAssignments, CaboodleModule.Configuration)] | — |
| POST module-assignments/apply | ApplyModuleAssignmentsRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.ModuleAssignments, CaboodleModule.Configuration)] | — |
| POST module-assignments/details | GetModuleAssignmentDetailsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.ModuleAssignments, CaboodleModule.Configuration)] | — |
| POST module-assignments/backfill-all | BackfillAllModuleAssignmentsRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.ModuleAssignments, CaboodleModule.Configuration)] | — |

### FileKeyBackfillController
Prefix: `/api/v1/admin/file-key-backfill` (explicit [Route]) · File: `caboodle\src\Hosts\API\Controllers\Admin\FileKeyBackfillController.cs` · Requests mostly from: Modules.Admin.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET status | GetUserFileKeyBackfillStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.UserFileKeyBackfill, CaboodleModule.Admin)] | — |
| POST run | TriggerUserFileKeyBackfillRequest | [MustHavePermission(CaboodleAction.Execute, CaboodleResource.UserFileKeyBackfill, CaboodleModule.Admin)] | — |

### SoftDeletePurgeController
Prefix: `/api/v1/admin/soft-delete-purge` (explicit [Route]) · File: `caboodle\src\Hosts\API\Controllers\Admin\SoftDeletePurgeController.cs` · Requests mostly from: Modules.Admin.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET settings | GetSoftDeletePurgeSettingsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| PUT settings | UpdateSoftDeletePurgeSettingsRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| POST runs | SearchSoftDeletePurgeRunsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| GET runs/{runId:guid} | GetSoftDeletePurgeRunRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| POST runs/details | SearchSoftDeletePurgeRunDetailsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| POST seed | SeedSoftDeletePurgeRequest | [MustHavePermission(CaboodleAction.Execute, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |
| POST runs/trigger | TriggerSoftDeletePurgeRunRequest | [MustHavePermission(CaboodleAction.Execute, CaboodleResource.SoftDeletePurge, CaboodleModule.Admin)] | — |

### AuthController
Prefix: `/api/v1/auth` · File: `caboodle\src\Hosts\API\Controllers\Identity\AuthController.cs` · Requests mostly from: BuildingBlocks.Application identity services (no Modules.* project; service-based)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST login | ITokenService.GetTokenAsync (no mediator) | [AllowAnonymous] | — |
| POST refresh-token | ITokenService.RefreshTokenAsync (no mediator) | [AllowAnonymous] | — |

### RolesController
Prefix: `/api/v1/roles` · File: `caboodle\src\Hosts\API\Controllers\Identity\RolesController.cs` · Requests mostly from: BuildingBlocks.Application identity services (no Modules.* project; service-based)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | IRoleService.GetListAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| GET {id} | IRoleService.GetByIdAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| GET {id}/permissions | IRoleService.GetByIdWithPermissionsAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| PUT {id}/permissions | IRoleService.UpdatePermissionsAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| POST | IRoleService.CreateOrUpdateAsync (no mediator) | [MustHavePermission(CaboodleAction.Create, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| PUT | IRoleService.CreateOrUpdateAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Roles, CaboodleModule.Role)] | — |
| DELETE {id} | IRoleService.DeleteAsync (no mediator) | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Roles, CaboodleModule.Role)] | — |

### UsersController
Prefix: `/api/v1/users` · File: `caboodle\src\Hosts\API\Controllers\Identity\UsersController.cs` · Requests mostly from: Modules.Admin.Application + 20 service-based action(s)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET check-by-email | IUserService.ExistsWithEmailAsync (no mediator) | [AllowAnonymous] | — |
| GET | IUserService.GetListAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Users, CaboodleModule.User)] | — |
| GET unassigned | IUserService.GetUnAssignedListAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Users, CaboodleModule.User)] | — |
| GET {id} | IUserService.GetAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.Users, CaboodleModule.User)] | — |
| GET brands-info | GetBrandsOfUserRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Users, CaboodleModule.User)] | — |
| POST invite | IUserService.InviteAsync (no mediator) | — | — |
| GET invited-user/{verificationCode:guid} | IUserService.GetInvitedUserByVerificationCodeAsync (no mediator) | [AllowAnonymous] | — |
| POST invite/{id:guid} | IUserService.ResendInvitaionLinkAsync (no mediator) | — | — |
| POST invite/brand-sub-user | IUserService.InviteBrandSubUserAsync (no mediator) | — | Y |
| POST | IUserService.CreateAsync (no mediator) | [MustHavePermission(CaboodleAction.Create, CaboodleResource.Users, CaboodleModule.User)] | — |
| PUT | IUserService.UpdateAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Users, CaboodleModule.User)] | — |
| PUT {id}/update-active-status/{status} | IUserService.ChangeActiveStatusAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Users, CaboodleModule.User)] | — |
| PUT {id}/update-email-confirmation/{status} | IUserService.ChangeEmailConfirmationStatusAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Users, CaboodleModule.User)] | — |
| GET users/{id}/roles | IUserService.GetRolesAsync (no mediator) | [MustHavePermission(CaboodleAction.View, CaboodleResource.UserRoles, CaboodleModule.User)] | — |
| POST users/{id}/assign-role | IUserService.AssignRoleAsync (no mediator) | [MustHavePermission(CaboodleAction.Update, CaboodleResource.UserRoles, CaboodleModule.User)] | — |
| DELETE users/{id}/remove-role | IUserService.RemoveRoleAsync (no mediator) | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.UserRoles, CaboodleModule.User)] | — |
| DELETE delete-multiple | IUserService.DeleteAsync (no mediator) | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Users, CaboodleModule.User)] | — |
| POST resend-email-verification | IUserService.ResendEmailVerificationAsync (no mediator) | [AllowAnonymous] | — |
| POST verify-email | IUserService.ConfirmEmailAsync (no mediator) | [AllowAnonymous] | — |
| POST forgot-password | IUserService.ForgotPasswordAsync (no mediator) | [AllowAnonymous] | — |
| POST reset-password | IUserService.ResetPasswordAsync (no mediator) | [AllowAnonymous] | — |
| DELETE delete | RemoveUnassignedUsersRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Users, CaboodleModule.User)] | — |

### BrandsController
Prefix: `/api/v1/brands` · File: `caboodle\src\Hosts\API\Controllers\Modules\Brand\BrandsController.cs` · Requests mostly from: Modules.Brand.Application (also Modules.DataUpload.Application (2))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET me | GetMyAssignedBrandsRequest | — | — |
| GET | GetAllBrandsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Brands, CaboodleModule.Brand)] | — |
| GET owners | GetAllBrandsOwnersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Brands, CaboodleModule.Brand)] | — |
| POST users | GetBrandOwnersAndSubUsersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandUsers, CaboodleModule.Broker)] | — |
| POST apl | GetAplRequest | — | Y |
| POST apl/filter-options | GetFilterOptionsRequest | — | Y |
| GET apl-total-count | GetAPLReportTotalCountsRequest | — | Y |
| POST apl/export | ExportAPLRequest | — | Y |
| GET apl-activities | GetActivitiesRequest | — | Y |
| GET apl-activities/export | ExportActivitiesReportRequest | — | Y |
| POST | UpsertBrandRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.Brands, CaboodleModule.Brand)] | — |
| PUT assign-user-to-brand | AssignBrandToUserRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Brand)] | — |
| PATCH assign-brand-to-broker | AssignBrandsToBrokerRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Broker)] | — |
| POST assign-brands-to-sub-brokers | AssignBrandsToSubBrokersRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Broker)] | — |
| DELETE remove-brand-from-broker | RemoveBrandFromBrokerRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Broker)] | — |
| DELETE remove-brands-from-broker | RemoveBrandsFromBrokersRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Broker)] | — |
| DELETE remove-owner-from-brand | RemoveUserFromBrandRequest | [MustHavePermission(CaboodleAction.Assign, CaboodleResource.BrandAssign, CaboodleModule.Brand)] | — |
| POST import | ImportBrandsRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET export | BrandsExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |

### BrandReportController
Prefix: `/api/v1/brandreport` · File: `caboodle\src\Hosts\API\Controllers\Modules\Broker\BrandReportController.cs` · Requests mostly from: Modules.Broker.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET settings/status-options/column-types | GetBrandReportStatusColumnTypesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReportStatusOption, CaboodleModule.Broker)] | — |
| GET settings/status-options | GetBrandReportStatusOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReportStatusOption, CaboodleModule.Broker)] | — |
| POST settings/status-options | CreateBrandReportStatusOptionRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReportStatusOption, CaboodleModule.Broker)] | — |
| PUT settings/status-options | UpdateBrandReportStatusOptionRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReportStatusOption, CaboodleModule.Broker)] | — |
| DELETE settings/status-options/{id:guid} | DeleteBrandReportStatusOptionRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrandReportStatusOption, CaboodleModule.Broker)] | — |
| GET settings/status-settings | GetBrandReportStatusSettingsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReportStatusSettings, CaboodleModule.Broker)] | — |
| PUT settings/status-settings | UpdateBrandReportStatusSettingsRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReportStatusSettings, CaboodleModule.Broker)] | — |
| POST notify | NotifyBrandReportsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST notify/batch | NotifyBrandReportsBatchRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST resend | ResendBrandReportEmailLogsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST {brandReportId:guid}/renotify | RenotifyBrandReportRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| GET {brandReportId:guid}/recipients | GetBrandReportRecipientsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| PUT {id:guid} | UpdateBrandReportRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST manual | CreateBrandReportsManualRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| DELETE | DeleteBrandReportsRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST {brandReportId:guid}/notes | CreateBrandReportNoteRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| PUT {brandReportId:guid}/notes/{noteId:guid} | UpdateBrandReportNoteRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| DELETE notes | DeleteBrandReportNotesRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST list | GetBrandReportListRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| GET {brandReportId:guid} | GetBrandReportDetailRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST filter-options | GetBrandReportFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST analytics | GetBrandReportAnalyticsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST analytics/{brandId:guid} | GetBrandReportBrandAnalyticsRequest | — | — |
| POST due-dates | GetBrandReportDueDatesRequest | — | — |
| GET export/{jobId:guid}/status | GetBrandReportExportJobStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST export/{jobId:guid}/cancel | CancelBrandReportExportJobRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| POST email-logs/list | GetBrandReportEmailLogsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| GET {brandReportId:guid}/audit-log | GetBrandReportAuditLogRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |
| GET audit-log/user/{userId:guid} | GetBrandReportAuditLogByUserRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrandReport, CaboodleModule.Broker)] | — |

### BrokersController
Prefix: `/api/v1/brokers` · File: `caboodle\src\Hosts\API\Controllers\Modules\Broker\BrokersController.cs` · Requests mostly from: Modules.Broker.Application (also Modules.TradeSpend.Application (3), Modules.CRM.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetBrokersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Brokers, CaboodleModule.Broker)] | — |
| GET banner | GetAllBannersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Banners, CaboodleModule.Broker)] | — |
| POST promotional-management-events | GetPromotionalManagementEventsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| GET events-with-same-name | GetEventsWithSameNameRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| POST promotional-management-filters | GetPromotionalManagementFiltersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| PATCH promotional-management-events/event-status | UpdatePromotionalManagementEventStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| PATCH promotional-management-events/submission-status | UpdatePromotionalManagementSubmissionStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| POST category-reviews/all | GetCategoryReviewsRequest | — | — |
| POST category-reviews/list | GetCategoryReviewListRequest | — | — |
| GET category-reviews/due-dates | GetCategoryReviewDueDatesRequest | — | — |
| PATCH category-reviews/calender/push | PushCategoryReviewRecordsIntoCalenderRequest | — | Y |
| PATCH category-reviews/calender/remove | RemoveCategoryReviewRecordsFromCalenderRequest | — | Y |
| POST category-reviews/calender | GetCategoryReviewCalenderRequest | — | Y |
| POST category-reviews/calender/group | GetCategoryReviewCalenderByGroupRequest | — | Y |
| POST category-reviews/calender/emails | SendCategoryReviewCalenderEmailsRequest | — | Y |
| POST category-reviews/calender/{categoryReviewId:guid} | GetCategoryReviewCalenderDetailsRequest | — | Y |
| POST category-reviews/calender/{categoryReviewId:guid}/brands | AssignCategoryReviewCalenderBrandsRequest | — | Y |
| POST category-reviews/calender/email-logs | GetCategoryReviewEmailLoggersRequest | — | — |
| POST category-reviews/calender/filter | GetCategoryReviewCalenderFilterPropsRequest | — | Y |
| POST category-reviews/filter | GetCategoryReviewFilterPropsRequest | — | — |
| POST category-reviews/export | ExportCategoryReviewSampleFileRequest, ExportCategoryReviewRequest | — | — |
| GET {regionID:Guid}/get-retailers | GetRegionRetailersRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| GET {retailerID:Guid}/regions/{regionID:Guid}/banners | GetRegionRetailerBannersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| GET export-events | ExportPromoEventsWithSameNameRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| POST export-promotional-management-events | ExportPromotionalManagementEventsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| GET export-promotional-management-events/{jobId}/status | GetPromotionalManagementExportStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| POST promotional-management-events-export-time | GetPromotionalManagementEventsExportQueryTime | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromotionalManagement, CaboodleModule.Broker)] | — |
| POST category-reviews | UpsertCategoryReviewRequest | — | Y |
| POST category-reviews/import/chunk | UploadChunkForCategoryReviewImportRequest | — | Y |
| POST category-reviews/import/start | StartCategoryReviewFileImportRequest | — | Y |
| GET category-reviews/import/{jobId:guid}/status | GetCategoryReviewImportJobStatusRequest | — | Y |
| GET promos-at-a-glance/notes | GetPromoAtaGlanceNotesForBrokerRequest | — | — |
| POST promos-at-a-glance/notes/filters | GetPromoAtaGlanceNotesFiltersForBrokerRequest | — | — |
| GET promos-at-a-glance/notes/export | ExportPromotionalNotesRequest | — | — |
| POST retail-apl | GetRetailAplRequest | — | — |
| GET retail-apl/export/{jobId:guid}/status | GetRetailAplExportJobStatusRequest | — | — |
| POST retail-apl/export/{jobId:guid}/cancel | CancelRetailAplExportJobRequest | — | — |
| POST retail-apl/filter-options | GetRetailAplFilterOptionsRequest | — | — |
| POST apl/import | ImportDistributorAPLRequest | — | — |
| POST apl/list | GetDistributorAPLsRequest | — | — |
| POST apl/filter-options | GetAplFilterOptionsRequest | — | — |
| GET apl-filter | GetDistributorAPLFiltersRequest | — | — |
| GET apl-filter-brand | GetBrandsRequest | — | — |
| GET apl-filter-category | GetCategoriesRequest | — | — |
| GET apl-filter-dc | GetDCsRequest | — | — |
| GET apl-filter-region | GetRegionsRequest | — | — |
| GET apl-filter-upc | GetUPCsRequest | — | — |
| GET apl-property-values | GetDistributorAPLPropertyValuesRequest | — | — |
| POST apl/export | ExportDistributorAPLsRequest | — | — |
| POST apl | UpsertDistributorAPLRequest | — | — |
| DELETE apl | DeleteDistributorAPLRequest | — | — |
| DELETE category-reviews | DeleteCategoryReviewsRequest | — | — |
| DELETE category-reviews/bulk | BulkDeleteCategoryReviewsRequest | — | — |

### MarketOverviews
Prefix: `/api/v1/marketoverviews` · File: `caboodle\src\Hosts\API\Controllers\Modules\Broker\MarketOverviewsController.cs` · Requests mostly from: Modules.Broker.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST list | GetMarketOverviewsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST report/parent-props | GetMarketOverviewReportRequest | — | Y |
| POST report/child-props | GetMarketOverviewReportChildPropsRequest | — | Y |
| POST filters | GetMarketOverviewFiltersRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST options/search | GetMarketOverviewLocationOptionsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST options/stores/search | GetMarketOverviewStoreOptionsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST filters/for-brand | GetMarketOverviewFiltersForBrandRequest | — | Y |
| POST report | GetMarketOverviewsReportRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST report/export | ExportMarketOverviewRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| POST report/export/for-brand | ExportMarketOverviewReportForBrandRequest | — | Y |
| POST | CreateMarketOverviewsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| PUT | UpdateMarketOverviewRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |
| DELETE | DeleteMarketOverviewsRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrokerMarketOverview, CaboodleModule.Broker)] | — |

### PromotionalManagementNotesController
Prefix: `/api/v1/brokers/promotional-management-notes` (explicit [Route]) · File: `caboodle\src\Hosts\API\Controllers\Modules\Broker\PromotionalManagementNotesController.cs` · Requests mostly from: Modules.Broker.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET tabs | GetPromoTabsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| POST tabs | CreatePromoTabRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| PUT tabs/order | UpdatePromoTabOrderRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| PUT tabs/{tabId:guid} | UpdatePromoTabRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| DELETE tabs/{tabId:guid} | DeletePromoTabRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| POST tabs/{tabId:guid}/columns | CreatePromoTabColumnRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| PUT tabs/{tabId:guid}/columns/order | UpdatePromoTabColumnOrderRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| PUT columns/{columnId:guid} | UpdatePromoTabColumnRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| DELETE columns/{columnId:guid} | DeletePromoTabColumnRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |
| POST tabs/{tabId:guid}/rows/list | GetPromoTabRowsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| POST tabs/{tabId:guid}/rows | CreatePromoTabRowRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| PUT rows/{rowId:guid}/cells/{columnId:guid} | UpdatePromoTabCellRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| PUT rows/{rowId:guid}/cells | UpdatePromoTabCellsRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| DELETE rows | DeletePromoTabRowsRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| POST tabs/{tabId:guid}/columns/{columnId:guid}/values | GetPromoTabColumnValuesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BrokerPromoTabData, CaboodleModule.Broker)] | — |
| POST tabs/{tabId:guid}/export | ExportPromoTabRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.BrokerPromoTab, CaboodleModule.Broker)] | — |

### BannersController
Prefix: `/api/v1/banners` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\BannersController.cs` · Requests mostly from: Modules.CRM.Application (also Modules.Brand.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | UpsertBannerRequest | — | — |
| DELETE | DeleteBannersRequest | — | — |
| POST for-retailer | GetBannersRequest | — | Y |
| POST for-retailer/global | GetGlobalBannersRequest | — | Y |
| GET for-admin | GetBannersForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Banners, CaboodleModule.Banner)] | — |
| POST for-admin/filter-options | GetFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Banners, CaboodleModule.Banner)] | — |
| POST {bannerID:guid}/activities | UpsertBannerActivityRequest | — | Y |
| GET {bannerID:guid}/activities | GetBannerActivitiesRequest | — | Y |
| DELETE {bannerID:guid}/activities/{activityID} | DeleteBannerActivityRequest | — | Y |
| PATCH {bannerID:guid}/skus | UpdateBannerSKURequest | — | Y |
| POST {bannerID:guid}/skus | CreateBannerSKURequest | — | Y |
| POST {bannerID:guid}/get-skus | GetBannerSKUsOfCurrentBrandRequest | — | Y |
| POST skus/for-admin | GetBannerSkusForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BannerSKUs, CaboodleModule.BannerSKU)] | — |
| POST skus/filter-options | GetSkuFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.BannerSKUs, CaboodleModule.BannerSKU)] | — |
| POST skus/for-promo | GetBannerSKUsForPromoRequest | — | Y |
| GET skus/for-promo/filter-properties | GetBannerSKUFilterPropertiesRequest | — | Y |
| GET skus | GetSKUsRequest | — | Y |
| DELETE skus/delete | DeleteBannerSKURequest | — | Y |
| DELETE sku/duplicates | DeleteBannerSKUDuplicatesRequest | — | — |
| POST promorules | GetRetailerPromoRulesRequest | — | — |
| POST promorules/export | ExportRetailerPromoRulesRequest | — | — |
| POST promorules/import | ImportRetailerPromoRulesRequest | — | — |
| POST promorules/upsert | UpsertRetailerPromoRuleRequest | — | — |
| DELETE promorules | DeleteRetailerPromoRulesRequest | — | — |
| GET with-distributor-connection | GetBannersToLinkWithDistributorRequest | — | Y |

### ContactsController
Prefix: `/api/v1/contacts` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\ContactsController.cs` · Requests mostly from: Modules.CRM.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | UpsertContactRequest | — | Y |
| DELETE | DeleteContactsRequest | — | Y |
| GET | GetContactsRequest | — | Y |
| GET export | ExportContactsRequest | — | Y |
| GET for-admin | GetContactsForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Contacts, CaboodleModule.Contact)] | — |
| POST for-admin/filter-options | GetContactFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Contacts, CaboodleModule.Contact)] | — |

### DistributionCenterController
Prefix: `/api/v1/distributioncenter` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\DistributionCenterController.cs` · Requests mostly from: Modules.CRM.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST distributor/dcs/search | GetDistributorsDcsRequest | — | — |
| POST for-admin/filter-options | GetDcFilterOptionsRequest | — | — |
| GET dcs | GetDcsRequest | — | — |
| POST dcs | UpsertDCRequest | — | — |
| POST distributor/dcs | UpsertDistributorDCRequest | — | — |

### DistributorsController
Prefix: `/api/v1/distributors` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\DistributorsController.cs` · Requests mostly from: Modules.CRM.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetDistributorsRequest | — | Y |
| GET leaf | GetLeafDistributorsRequest | — | Y |
| GET leaf/broker | GetLeafDistributorsForBrokerRequest | — | — |
| GET sub-distributors/{parentDistributorID:guid} | GetDistributorDeliveryMethodsRequest | — | Y |
| POST sub-distributors/for-admin | GetSubDistributorsForAdminRequest | — | — |
| POST sub-distributors/filter-options | GetSubDistributorFilterOptionsRequest | — | — |
| GET sub-distributors/global/{parentDistributorID:guid} | GetGlobalSubDistributorsRequest | — | — |
| GET global | GetGlobalDistributorsRequest | — | — |
| GET {distributorID:guid} | GetDistributorRequest | — | Y |
| GET {distributorID:guid}/retailers | GetDistributorRetailersRequest | — | Y |
| POST {distributorID:guid}/banners | GetDistributorBannersRequest | — | Y |
| GET {distributorID:guid}/dcs | GetDistributorDcsRequest | — | Y |
| POST | UpsertDistributorRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.Distributors, CaboodleModule.Distributor)] | — |
| POST sub-distributors | UpsertSubDistributorRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.Distributors, CaboodleModule.Distributor)] | — |
| POST connect-brand | ConnectDistributorsToCurrentBrandRequest | — | Y |
| POST sub-distributors/connect | ConnectSubDistributorToDistributorRequest | — | Y |
| POST connect-retailer | ConnectRetailerToDistributorRequest | — | Y |
| POST connect-banner | ConnectDistributorWithBannerRequest | — | Y |
| POST connect-banners | ConnectDistributorWithBannersRequest | — | Y |
| PATCH update-markup | UpdateMarkupRequest | — | Y |
| DELETE banners/remove | RemoveBannersFromDistributorRequest | — | Y |
| DELETE brand-distributor-connection/{ID:guid} | RemoveDistributorFromBrandRequest | — | Y |
| DELETE sub-distributors/remove | RemoveSubDistributorFromBrandRequest | — | Y |
| DELETE | DeleteDistributorsRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Retailers, CaboodleModule.Retailer)] | — |

### PipelinesController
Prefix: `/api/v1/pipelines` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\PipeLinesController.cs` · Requests mostly from: Modules.CRM.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET plans | GetPlansRequest | — | Y |
| POST plans | UpsertPlanRequest | — | Y |
| POST plans/add-default | CreateDefaultPlanRequest | — | Y |
| DELETE plans | DeletePlansRequest | — | Y |
| GET {planID:guid}/tasks | GetPipeLinesRequest | — | Y |
| GET {id:guid} | GetPipeLineRequest | — | Y |
| GET {pipelineID:guid}/activities | GetPipeLineActivitiesRequest | — | Y |
| GET mentions | GetUsersToMentionInActivityRequest | — | — |
| POST | UpsertPipeLineRequest | — | Y |
| POST {pipelineID:guid}/activities | UpsertPipeLineActivityRequest | — | Y |
| POST file-upload | UploadActivityFileRequest | — | Y |
| PUT reorder | ReOrderPipeLineRequest | — | Y |
| PUT change-deal-stage-state | UpdatePipeLineDealStageStateRequest | — | Y |
| DELETE | DeletePipeLineRequest | — | Y |
| DELETE {pipelineID:guid}/activities/{activityID:guid}/delete | DeletePipeLineActivityRequest | — | Y |
| DELETE file | DeleteActivityFileRequest | — | Y |
| POST dealstages | CreatePipeLineDealStageRequest | — | Y |
| GET dealstages | GetPipeLineDealStagesRequest | — | Y |

### RegionsController
Prefix: `/api/v1/regions` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\RegionsController.cs` · Requests mostly from: Modules.CRM.Application (also Modules.Broker.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetRegionsRequest | — | — |
| POST retailers | GetRetailerRegionsRequest | — | — |
| POST retailers/filter-options | GetRetailerRegionsFilterOptionsRequest | — | — |
| POST | UpsertRegionRequest | — | — |
| POST retailer-region | UpsertRetailerRegionRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.RetailerRegions, CaboodleModule.Retailer)] | — |

### RetailersController
Prefix: `/api/v1/retailers` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\RetailersController.cs` · Requests mostly from: Modules.CRM.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET global | GetAllRetailersRequest | — | — |
| POST global/filter-options | GetRetailerFilterOptionsRequest | — | — |
| GET | GetRetailersOfCurrentBrandRequest | — | Y |
| GET export/current-brand | ExportRetailersOfCurrentBrandRequest | — | Y |
| GET export/all | ExportRetailersRequest | — | — |
| GET {retailerId:guid} | GetRetailerRequest | — | Y |
| POST for-promo | GetRetailersForPromoRequest | — | Y |
| POST | UpsertRetailerRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.Retailers, CaboodleModule.Retailer)] | — |
| DELETE | DeleteRetailersRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.Retailers, CaboodleModule.Retailer)] | — |

### StoresController
Prefix: `/api/v1/stores` · File: `caboodle\src\Hosts\API\Controllers\Modules\CRM\StoresController.cs` · Requests mostly from: Modules.DataHub.Application (also Modules.DataUpload.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST store-list/filter-options | GetStoreListFilterOptionsRequest | — | — |
| POST store-list/search | GetStoreListRequest | — | — |
| GET store-list/{id:guid} | GetStoreListEntryByIdRequest | — | — |
| POST store-list | CreateStoreListEntryRequest | — | — |
| PUT store-list/{id:guid} | UpdateStoreListEntryRequest | — | — |
| POST store-list/delete | DeleteStoreListEntriesRequest | — | — |
| POST store-list/import/chunk | UploadChunkForStoreListImportRequest | — | — |
| GET store-list/import/{jobId:guid}/status | GetKeHEImportJobStatusRequest | — | — |

Commented-out (block comment, inactive, excluded from counts): GET (GetAsync), GET {id:guid} (GetAsync), POST (UpsertAsync)

### DashboardController
Prefix: `/api/v1/dashboard` · File: `caboodle\src\Hosts\API\Controllers\Modules\Dashboard\DashboardController.cs` · Requests mostly from: Modules.Dashboard.Application (also Modules.Report.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET product-status-summery-report | ProductStatusSummaryReportRequest | — | Y |
| GET roll-up-report | GetRollUpReportForDashboardRequest | — | Y |

### CredentialManagerController
Prefix: `/api/v1/credentialmanager` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataHub\CredentialManagerController.cs` · Requests mostly from: Modules.DataHub.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET credentials | GetCredentialsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET credentials/{id:guid} | GetCredentialByIdRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST credentials | CreateCredentialRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| PUT credentials/{id:guid} | UpdateCredentialRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| DELETE credentials/{id:guid} | DeleteCredentialRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |

### DataHubController
Prefix: `/api/v1/datahub` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataHub\DataHubController.cs` · Requests mostly from: Modules.DataHub.Application (also Modules.DataUpload.Application (2))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST import/unified/retailer | ImportUnifiedRetailersRequest | [AllowAnonymous] | — |
| POST import/unified/store | ImportUnifiedStoresRequest | [AllowAnonymous] | — |
| POST import/mapping-data | ImportMappingDataRequest | — | — |
| POST sync | ExecuteDataSyncRequest | — | — |
| POST map-existing-data | MapExistingDataRequest | — | — |
| POST report-sync/product-name-category | SyncMappedProductNameAndCategoryRequest | — | — |
| POST report-sync/distributor-sales-records | SyncDistributorSalesRecordsRequest | — | — |
| POST health/crawler | CheckCrawlerServiceAvailabilityRequest | [AllowAnonymous] | — |
| GET sync/dashboard | GetSyncDashboardRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET sync-runs | GetDataSyncRunsRequest | — | — |
| GET sync-runs/{id:guid} | GetDataSyncRunByIdRequest | — | — |
| GET unmapped/dashboard | GetUnmappedDashboardRequest | — | — |
| POST unmapped/records | GetUnmappedRecordsRequest | — | — |
| POST unmapped/records/export | StartUnmappedRecordsExportRequest | — | — |
| POST unmapped/filter-options | GetUnmappedFilterOptionsRequest | — | — |
| POST unmapped/unfi/records-by-status | GetUnmappedUNFIRecordsByStatusRequest | — | — |
| GET unmapped/unfi/record | GetUnmappedUNFIRecordByIdRequest | — | — |
| POST unmapped/kehe/records-by-status | GetUnmappedKeHeRecordsByStatusRequest | — | — |
| GET unmapped/kehe/record | GetUnmappedKeHeRecordByIdRequest | — | — |
| POST unmapped/retailers | GetUnmappedRetailersRequest | — | — |
| GET unmapped/retailer-suggestions | GetRetailerMappingSuggestionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/customers | GetUnmappedCustomersRequest | — | — |
| POST unmapped/upcs | GetUnmappedUpcsRequest | — | — |
| POST unmapped/overall-status | BulkUpdateUnmappedOverallStatusCommand | — | — |
| POST unmapped/resolve | ResolveUnmappedRecordsCommand | — | — |
| GET unmapped/audits | GetResolutionAuditsRequest | — | — |
| POST mapped/filter-options | GetMappedRecordsFilterOptionsRequest | — | — |
| POST mapped/kehe | GetKeHeMappedRecordsRequest | — | — |
| POST mapped/unfi | GetUNFIMappedRecordsRequest | — | — |
| POST mapped/kehe/export | StartKeHeMappedRecordsExportRequest | — | — |
| POST mapped/unfi/export | StartUNFIMappedRecordsExportRequest | — | — |
| GET mapped/upcs | GetMappedUpcsRequest | — | — |
| GET summary | GetDataHubAdminSummaryQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET sources | GetDataHubSourceStatusQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/summary | GetMappedDashboardSummaryQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/trends | GetMappedDashboardTrendsQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/quality | GetMappedDashboardQualityQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/records/overview | GetMappedRecordsOverviewQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/records/data-quality | GetMappedRecordsDataQualityQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/records/business-metrics | GetMappedRecordsBusinessMetricsQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/records/breakdowns | GetMappedRecordsBreakdownsQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapped-dashboard/records/trends | GetMappedRecordsTrendsQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapping/unmapped | GetUnmappedEntitiesQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST mapping/unmapped/bulk-map | BulkMapUnmappedValuesCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/dimension-status-by-value | UpdateUnmappedDimensionStatusByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/resolve-retailer-by-value | BulkResolveUnmappedRetailerByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/resolve-store-by-value | BulkResolveUnmappedStoreByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/resolve-upc-by-value | BulkResolveUnmappedUpcByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/re-resolve-retailer-by-value | BulkReResolveUnmappedRetailerByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/re-resolve-store-by-value | BulkReResolveUnmappedStoreByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST unmapped/re-resolve-upc-by-value | BulkReResolveUnmappedUpcByValueCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET unmapped/product-suggestions | GetUpcProductSuggestionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST validate-mapping-status | ValidateUnmappedRecordsMappingRequest | [AllowAnonymous] | — |
| POST admin/geocode-store-list | GeocodeStoreListBackfillRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/store-list/backfill-entry-ids | StartStoreListEntryIdBackfillRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/store-list/duplicate-cleanup | StartStoreListDuplicateCleanupRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/store-list/merge | MergeStoreListEntriesRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET admin/store-list/merge/history | GetStoreMergeHistoryRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/store-list/merge/history/{id:guid}/undo | UndoStoreMergeRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/geocode-address | GeocodeAddressRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/store-list/nearby-stores | CheckNearbyStoresRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET admin/store-list/regions | GetRegionsForRetailerBannerRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/backfill-store-mapping | UnmappedStoreBackfillRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/backfill-retailer-matching | RetailerMatchingBackfillRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/backfill-unmapped-overall-status | BackfillUnmappedOverallStatusRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/repair-confidential-mapped-data | ConfidentialMappedDataRepairRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST admin/clear-brand-data | ClearBrandDataRequest | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET admin/clear-brand-data/{jobId:guid}/status | GetBrandDataCleanupJobStatusRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |

### EntityResolutionController
Prefix: `/api/v1/entityresolution` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataHub\EntityResolutionController.cs` · Requests mostly from: Modules.DataHub.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET dashboard | GetEntitiesDashboardQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities/search | GetUnifiedEntitiesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST suggestions | GetEntitySummeryListRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST rules/apply | ApplyRulesRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| GET entities/{entityId:guid} | GetUnifiedEntityDetailsQuery | [MustHavePermission(CaboodleAction.View, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities | CreateUnifiedEntityCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| PUT entities/{entityId:guid} | UpdateUnifiedEntityCommand | [MustHavePermission(CaboodleAction.Update, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities/{entityId:guid}/aliases | AddUnifiedEntityAliasCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| PUT aliases/{aliasId:guid}/status | ChangeAliasStatusCommand | [MustHavePermission(CaboodleAction.Update, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities/merge | MergeUnifiedEntitiesCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities/seed/kehe-retailers | SeedKeHeRetailersCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |
| POST entities/seed/kehe-customers | SeedKeHeCustomersCommand | [MustHavePermission(CaboodleAction.Upsert, CaboodleResource.EntityResolution, CaboodleModule.DataHub)] | — |

### ExportController
Prefix: `/api/v1/export` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataHub\ExportController.cs` · Requests mostly from: Modules.DataHub.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST start | StartExportRequest | — | Y |
| GET {jobId}/status | GetExportJobStatusRequest | — | Y |
| POST admin/start | StartAdminExportRequest | — | — |
| GET admin/{jobId}/status | GetAdminExportJobStatusRequest | — | — |

### DataMappingsController
Prefix: `/api/v1/datamappings` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\DataMappingsController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetDataMappingsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| GET {id} | GetDataMappingRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| POST | UpsertDataMappingRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| DELETE | DeleteDataMappingsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| POST import | DataMappingsImportRequst | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| GET export/sample-file | ExportDataMappingSampleFileRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| GET export | ExportDataMappingsRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |
| GET filter-data | GetDataMappingFiltersRequest | [MustHavePermission(CaboodleAction.Create, CaboodleResource.DataUpload, CaboodleModule.DataUpload)] | — |

### DistributorSalesReportsController
Prefix: `/api/v1/distributorsalesreports` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\DistributorSalesReportsController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST filter-data | GetDistributorSalesRecordsFilterOptionsRequest | — | Y |
| POST sales-by-product | GetSalesByProductReportRequest | — | Y |
| POST sales-by-chain | GetSalesByChainReportRequest | — | Y |
| POST sales-by-store | GetSalesByStoreReportRequest | — | Y |
| POST sales-by-city | GetSalesByCityReportRequest | — | Y |
| POST sales-by-state | GetSalesByStateReportRequest | — | Y |
| POST sales-details | GetSalesDetailsReportRequest | — | Y |
| POST total-dollar-and-cases | GetTotalDollarAndCasesReportRequest | — | Y |
| POST velocity-per-store | GetVelocityPerStoreReportRequest | — | Y |
| POST velocity-per-store-for-promotion | GetVelocityPerStoreReportForPromotionRequest | — | Y |
| POST dc-report | GetDcReportRequest | — | Y |
| POST store-void-report | GetStoreVoidReportRequest | — | Y |
| POST warehouse-report | GetWarehouseReportRequest | — | Y |
| POST retail-sales-report | GetRetailSalesReportRequest | — | Y |
| POST export-report | ExportDistributorSalesReportByTypeRequest | — | Y |
| POST import/chunk | UploadChunkForDistributorReportFileImportRequest | — | Y |
| POST import/start | StartDistributorReportFileImportRequest | — | Y |
| GET import/{jobId:guid}/status | GetDistributorReportImportJobStatusRequest | — | Y |

### KeHEController
Prefix: `/api/v1/kehe` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\KeHeController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | ImportKeHERequest | — | Y |
| POST import/chunk | UploadChunkForKeHEImportRequest | — | Y |
| GET import/{jobId}/status | GetKeHEImportJobStatusRequest | — | Y |
| GET export | ExportKeHERecordsRequest | — | Y |
| POST export-report | ExportKeHEReportByTypeRequest | — | Y |
| GET format | ExportKeHESampleFileRequest | — | Y |
| GET | GetKeHeRecordsRequest | — | Y |
| GET total-dollar-and-cases-shiped | GetTotalDollarAndCasesRequest | — | Y |
| GET sales-by-product | GetSalesByProductRequest | — | Y |
| GET sales-by-retailer | GetSalesByRetailerRequest | — | Y |
| GET sales-by-store | GetSalesByStoreRequest | — | Y |
| GET sales-by-state | GetSalesByStateRequest | — | Y |
| GET sales-by-city | GetSalesByCityRequest | — | Y |
| GET sales-details | GetSalesDetailsRequest | — | Y |
| GET dc-report | GetKeHEDCReportRequest | — | Y |
| GET sales-report | GetKeHeSalesReportRequest | — | Y |
| GET warehouse-report | GetKeHEWarehouseReportRequest | — | Y |
| GET store-void-report | GetStoreVoidReportRequest | — | Y |
| GET velocity-report | GetVelocityPerStoreReportRequest | — | Y |
| GET filter-criteria-data | GetKeHeFiltersDataRequest | — | Y |
| POST filter-data | GetKeheFilterOptionsRequest | — | Y |
| DELETE | DeleteKeHeRecordsRequest | — | Y |

### MasterDataUploadController
Prefix: `/api/v1/masterdataupload` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\MasterDataUploadController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST distributors | DistributorsImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST sub-distributors | SubDistributorsImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST retailers | RetailersImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST contacts | ContactsImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST banners | BannersImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST bannerskus | BannerSkusImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST categories | CategoryImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST price-list | PriceListImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST productspecs | ProductSpecImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST keHes | ImportMasterKeHeRecordsRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST unfis | ImportMasterUnfiRecordsRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST distributor-dc | DistributorDcImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST retailer-regions | RetailerRegionImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST regions | RegionImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST stores | StoreImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST distribution-centers | DistributionCenterImportRequest | [MustHavePermission(CaboodleAction.Import, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET contacts | ContactsExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST categories/export | CategoryExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST price-list/export | PriceListExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET banners/export | BannersExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET distributors | DistributorExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST sub-distributors/export | SubDistributorExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET retailers | RetailersExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST bannerskus/export | BannerSkusExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET productspecs | ProductSpectExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET keHes | ExportMasterKeHeRecordsRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET unfis | ExportMasterUnfiRecordsRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST distributor-dc/export | DistributorDcExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET regions | RegionExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| POST retailer-regions/export | RetailerRegionExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET distribution-centers | DistributionCenterExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET stores | StoreExportRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |
| GET sample-file | ExportSampleFileRequest | [MustHavePermission(CaboodleAction.Export, CaboodleResource.MasterDataUpload, CaboodleModule.DataUpload)] | — |

Commented-out (block comment, inactive, excluded from counts): POST banner-reatiler (ImportBannerRetailerAsync), POST crm (ImportCRMDataAsync)

### SPINSController
Prefix: `/api/v1/spins` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\SPINSController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST import-items-ranking | ImportSPINSItemsRankingRecordsRequest | — | Y |
| POST import-stores-insight | ImportSPINSStoresInsightRecordsRequest | — | Y |
| POST import-stores-insight/chunk | UploadChunkForSPINSStoresInsightImportRequest | — | Y |
| GET import-stores-insight/{jobId:guid}/status | GetSPINSStoresInsightImportJobStatusRequest | — | Y |
| GET banner/product | GetProductFilteredByBannerRequest | — | Y |
| GET export-items-ranking | ExportItemsRankingReportRequest | — | Y |
| GET export-stores-ingiht | ExportStoresInsightReportRequest | — | Y |
| GET format/{isItemsRanking} | ExportSPINSSampleFileRequest | — | Y |
| GET time-periods-report | ItemsRankingTimePeriodsReportRequest | — | Y |
| GET item-ranking-report | GetItemRankingReportRequest | — | Y |
| GET brand-ranking-report | GetBrandRankingReportRequest | — | Y |
| POST void-report | GetVoidReportRequest | — | Y |
| POST banner-weekly-unit-sales | RetailerWeeklyUnitSalesReportRequest | — | Y |
| POST bump-chart | GetBumpChartReportRequest | — | Y |
| POST items-ranking-filter-data | GetItemsRankingFiltersRequest | — | Y |
| POST stores-insight-filter-data | GetStoresInsightFiltersRequest | — | Y |
| GET items-ranking-numeric-filters-data | GetMinMaxFilterValuesRequest | — | Y |
| DELETE items-ranking | DeleteItemsRankingDataRequest | — | Y |
| DELETE stores-insight | DeleteStoresInsightDataRequest | — | Y |

### UNFIController
Prefix: `/api/v1/unfi` · File: `caboodle\src\Hosts\API\Controllers\Modules\DataUpload\UNFIController.cs` · Requests mostly from: Modules.DataUpload.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetUnfiRecordsRequest | — | Y |
| GET filter-criteria-data | GetUNFIFiltersDataRequest | — | Y |
| POST filter-data | GetUNFIFilterOptionsRequest | — | Y |
| GET format | ExportUNFISampleFileRequest | — | Y |
| GET export | ExportUNFIRecordsRequest | — | Y |
| GET total-dollar-and-cases-shiped | GetUNFITotalDollarAndCasesRequest | — | Y |
| GET dc-report | GetUNFIDCReportRequest | — | Y |
| GET sales-report | GetUNFIRetailSalesReportRequest | — | Y |
| GET warehouse-report | GetWarehouseReportRequest | — | Y |
| GET sales-by-product-report | GetSalesByProductReportRequest | — | Y |
| GET velocity-report | GetUNFIVelocityPerStoreReportRequest | — | Y |
| GET sales-by-chain-report | GetSalesByChainReportRequest | — | Y |
| GET sales-by-city-report | GetSalesByCityReportRequest | — | Y |
| GET sales-by-store-report | GetSalesByStoreReportRequest | — | Y |
| GET sales-by-state-report | GetSalesByStateReportRequest | — | Y |
| GET sales-details-report | GetSalesDetailsReportRequest | — | Y |
| GET store-void-report | GetUNFIStoreVoidReportRequest | — | Y |
| POST export-report | ExportUNFIReportByTypeRequest | — | Y |
| POST | ImportUNFIRecordsRequest | — | Y |
| POST import/chunk | UploadChunkForUNFIImportRequest | — | Y |
| GET import/{jobId:guid}/status | GetUNFIImportJobStatusRequest | — | Y |
| DELETE | DeleteUnfiRecordsRequest | — | Y |

### DirectoryController
Prefix: `/api/v1/directory` · File: `caboodle\src\Hosts\API\Controllers\Modules\FileRepository\DirectoryController.cs` · Requests mostly from: Modules.FileRepository.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetDirectoryRequest | — | — |
| GET search | GetDirectoriesAndFilesByNameRequest | — | — |
| GET tree | GetDirectoryTreeRequest | — | — |
| GET parent | GetParentDirectoryRequest | — | — |
| GET root | GetRootDirectoryTreeRequest | — | Y |
| GET broker/root | GetRootDirectoryTreeRequest | — | — |
| POST | DirectoryCreationRequest | — | Y |
| POST broker | DirectoryCreationRequest | — | — |
| POST tree | DirectoryTreeCreationRequest | — | Y |
| POST broker/tree | DirectoryTreeCreationRequest | — | — |
| PUT | DirectoryUpdateRequest | — | Y |
| PUT broker | DirectoryUpdateRequest | — | — |
| DELETE | DeleteDirectoryRequest | — | Y |
| DELETE broker | DeleteDirectoryRequest | — | — |
| GET download | DirectoryDownloadRequest | — | Y |
| GET broker/download | DirectoryDownloadRequest | — | — |

### FilesController
Prefix: `/api/v1/files` · File: `caboodle\src\Hosts\API\Controllers\Modules\FileRepository\FilesController.cs` · Requests mostly from: Modules.FileRepository.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST upload | UploadFileRequest | — | Y |
| POST upload/chunk | UploadChunkFileRequest | — | Y |
| GET download | FileDownloadRequest | — | Y |
| POST share | CreateFileShareLinkRequest | — | Y |
| DELETE share/{token} | RevokeFileShareLinkRequest | — | Y |
| DELETE {id:guid} | DeleteFileRequest | — | Y |
| PUT move | FileMoveRequest | — | Y |
| PUT rename | UpdateFileRequest | — | Y |
| POST broker/upload | UploadFileRequest | — | — |
| POST broker/upload/chunk | UploadChunkFileRequest | — | — |
| GET broker/download | FileDownloadRequest | — | — |
| DELETE broker/{id:guid} | DeleteFileRequest | — | — |
| PUT broker/move | FileMoveRequest | — | — |
| PUT broker/rename | UpdateFileRequest | — | — |

### ShareController
Prefix: `/share` (explicit [Route]) · File: `caboodle\src\Hosts\API\Controllers\Modules\FileRepository\ShareController.cs` · Requests mostly from: Modules.FileRepository.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET {token} | ResolveFileShareLinkRequest | [AllowAnonymous] | — |

### IntelligenceChatController
Prefix: `/api/v1/intelligencechat` · File: `caboodle\src\Hosts\API\Controllers\Modules\Intelligence\IntelligenceChatController.cs` · Requests mostly from: Modules.Intelligence.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST chat | ChatRequest | — | Y |
| GET sessions | ListChatSessionsRequest | — | Y |
| GET sessions/{sessionId:guid} | GetChatSessionRequest | — | Y |
| DELETE sessions/{sessionId:guid} | DeleteChatSessionRequest | — | Y |
| POST evaluation/run | RunEvaluationRequest | — | — |
| POST master-entities/populate | PopulateMasterEntitiesRequest | — | — |

### CategoriesController
Prefix: `/api/v1/categories` · File: `caboodle\src\Hosts\API\Controllers\Modules\ProductSpecs\CategoriesController.cs` · Requests mostly from: Modules.ProductSpecs.Application (also Modules.Broker.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | GetCategoriesRequest | — | Y |
| GET export | ExportCategoriesRequest | — | Y |
| GET {id} | GetCategoryRequest | — | Y |
| POST for-admin | GetCategoriesForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Categories, CaboodleModule.Category)] | — |
| POST filter-options | GetCategoryFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.Categories, CaboodleModule.Category)] | — |
| POST | UpsertCategoryRequest | — | Y |
| POST import | ImportCategoryRequest | — | Y |
| PATCH {id}/link-product | AddProductsWithCategoryRequest | — | Y |
| PATCH {id}/remove-product | RemoveProductsFromCategoryRequest | — | Y |
| DELETE | DeleteCategoriesRequest | — | Y |

### PriceListsController
Prefix: `/api/v1/pricelists` · File: `caboodle\src\Hosts\API\Controllers\Modules\ProductSpecs\PriceListsController.cs` · Requests mostly from: Modules.ProductSpecs.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST upsert | UpsertPriceListRequest | — | Y |
| POST create | CreatePriceListRequest | — | Y |
| POST | GetPriceListsRequest | — | Y |
| POST by-distributor | GetPriceListGroupedByDistributorRequest | — | Y |
| POST for-admin | GetPriceListsForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.PriceLists, CaboodleModule.PriceList)] | — |
| POST filter-options | GetPriceListFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.PriceLists, CaboodleModule.PriceList)] | — |
| GET {id:guid} | GetPriceListRequest | — | Y |
| DELETE | DeletePriceListsRequest | — | Y |
| POST import | ImportPriceListRequest | — | Y |
| POST export | ExportPricingListRequest | — | Y |
| GET export-sample-file | GetPriceListSampleFileRequest | — | Y |

### ProductSpecsController
Prefix: `/api/v1/productspecs` · File: `caboodle\src\Hosts\API\Controllers\Modules\ProductSpecs\ProductSpecsController.cs` · Requests mostly from: Modules.ProductSpecs.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | GetProductsSpecRequest | — | Y |
| GET filters | GetProductSpecFilterDataRequest | — | Y |
| POST for-admin | GetProductsSpecForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.ProductsSpec, CaboodleModule.ProductSpec)] | — |
| POST filter-options | GetProductSpecFilterOptionsRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.ProductsSpec, CaboodleModule.ProductSpec)] | — |
| GET {productID:guid} | GetProductSpecRequest | — | Y |
| GET for-bannerSku/{bannerID:guid} | GetProductsForBannerSkuRequest | — | Y |
| POST export | ExportProductsRequest | — | Y |
| GET export-sample-file | ExportProductSpecSampleFileRequest | — | Y |
| POST import | ImportProductsRequest | — | Y |
| POST upsert | UpsertProductSpecRequest | — | Y |
| DELETE | DeleteProductsSpecRequest | — | Y |
| DELETE force-delete | ForceDeleteProductSpecRequest | — | Y |

### ReportsController
Prefix: `/api/v1/reports` · File: `caboodle\src\Hosts\API\Controllers\Modules\Report\ReportsController.cs` · Requests mostly from: Modules.Report.Application

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET products | GetProductsReportRequest | — | Y |
| POST roll-up/sandbox-promotions | GetTradeSpendRollUpReportRequest | — | Y |
| POST roll-up/brand-approved-promotions | GetBrandApprovedPromotionsRollUpReportRequest | — | Y |
| GET brand-market-overview | GetMarketOverviewReportForBrandRequst | — | Y |
| GET brand-market-overview-export | ExportMarketOverviewsForBrandRequest | — | Y |
| GET brand-market-overview-filters | GetBrandMarketOverviewFilterRequest | — | Y |
| GET retail-report | GetRetailReportsRequest | — | Y |
| GET retail-report/product/{id:Guid} | GetProductsOfRetailReportRequest | — | Y |
| GET retail-report/activities/{id:guid} | GetActivitiessOfRetailReportRequest | — | Y |
| POST sales-tracker | GetSalesTrackerReportRequest | — | Y |
| POST forecast-data-export | GetForecastDataRequest | — | — |

### SubUsersController
Prefix: `/api/v1/subusers` · File: `caboodle\src\Hosts\API\Controllers\Modules\SubUsers\SubUsersController.cs` · Requests mostly from: Modules.Brand.Application (also Modules.Broker.Application (5), Modules.Admin.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET brand | GetBrandSubUsersRequest | — | Y |
| GET brand/invited-user | GetInvitedSubUsersRequest | — | Y |
| DELETE brand/remove/{id} | RemoveBrandSubUserRequest | — | Y |
| GET brands/for-admin | GetBrandsSubUsersForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SubUsers, CaboodleModule.SubUser)] | — |
| PUT brands/change-user-active-status | ToggleSubUserActiveStatusRequest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Users, CaboodleModule.User)] | — |
| PUT brokers/change-user-active-status | ToggleActiveStatusOfSubBrokerReqest | [MustHavePermission(CaboodleAction.Update, CaboodleResource.Users, CaboodleModule.User)] | — |
| GET brokers/for-admin | GetBrokersSubUsersForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SubUsers, CaboodleModule.SubUser)] | — |
| GET broker | GetBrokerSubUsersRequest | — | — |
| GET broker/invited-users | GetInvitedUsersRequest | — | — |
| DELETE broker/remove/{id} | RemoveBrokerSubUserRequest | [MustHavePermission(CaboodleAction.Delete, CaboodleResource.SubUsers, CaboodleModule.Broker)] | — |
| GET admin/invited-users | GetInvitedSubUsersForAdminRequest | [MustHavePermission(CaboodleAction.View, CaboodleResource.SubUsers, CaboodleModule.SubUser)] | — |
| DELETE cancel-invitation | DeleteSubUsersInvitationRequest | — | — |

### TradeSpendsSandboxController
Prefix: `/api/v1/tradespendssandbox` · File: `caboodle\src\Hosts\API\Controllers\Modules\TradeSpendSandbox\TradeSpendsSandboxController.cs` · Requests mostly from: Modules.TradeSpendSandbox.Application (also Modules.TradeSpend.Application (3))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST all | GetPromotionsRequest | — | Y |
| POST {id:Guid} | GetPromotionDetailsRequest | — | Y |
| PATCH {familyId:Guid} | UpdatePromotionFamilyNameRequest | — | Y |
| POST {id:Guid}/push-to-tradespend | PushPromotionToTradeSpendRequest | — | Y |
| GET {familyId:Guid}/versions | GetPromotionVersionsRequest | — | Y |
| POST {familyId:Guid}/versions | CreatePromotionVersionRequest | — | Y |
| PATCH {familyId:Guid}/versions/{id:Guid}/reporting | SetReportingVersionRequest | — | Y |
| DELETE {familyId:Guid}/versions/{id:Guid} | DeletePromotionVersionRequest | — | Y |
| PATCH {id:Guid}/events/update-status | UpdateEventsStatusRequest | — | Y |
| GET {id:Guid}/filter-properties | GetFilterPropertiesRequest | — | Y |
| GET filter-properties | GetFilterOptionsForPromotionListRequest | — | Y |
| GET {promoID:Guid}/events/{id:Guid} | GetPromotionalEventRequest | — | Y |
| GET name-exist | CheckPromotionNameAlreadyExistRequest | — | Y |
| POST | UpsertPromotionRequest | — | Y |
| PATCH {id:Guid}/update-event-status | UpdateEventsStatusRequest | — | Y |
| POST edlp | UpsertEDLPOnlyPromotionRequest | — | Y |
| POST duplicate | DuplicateSandboxPromotionRequest | — | Y |
| PUT {promoID:Guid}/events/{id:Guid} | UpdatePromotionalEventRequest | — | Y |
| PUT | UpdatePromotionRequest | — | Y |
| PATCH | UpdateAverageWeeklySalesRequest | — | Y |
| DELETE {promoID:Guid}/events | DeletePromotionalEventsRequest | — | Y |
| DELETE | DeletePromotionsRequest | — | Y |
| GET {promotionId:Guid}/promotion-fees/{id:Guid} | GetPromotionFeeRequest | — | Y |
| POST {promotionId:Guid}/promotion-fees | InsertPromotionFeeRequest | — | Y |
| PUT {promotionId:Guid}/promotion-fees/{id:Guid} | UpdatePromotionFeeRequest | — | Y |
| DELETE {promotionId:Guid}/promotion-fees/{id:Guid} | DeletePromotionFeeRequest | — | Y |

### TradeSpendsController
Prefix: `/api/v1/tradespends` · File: `caboodle\src\Hosts\API\Controllers\Modules\TradeSpend\TradeSpendsController.cs` · Requests mostly from: Modules.TradeSpend.Application (also Modules.DataUpload.Application (2), Modules.DataHub.Application (1))

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET name-exist | GetTradeSpendPromoNameExistRequest | — | Y |
| POST all | GetTradeSpendPromosRequest | — | Y |
| POST {id:Guid} | GetTradeSpendPromoRequest | — | Y |
| POST {id:Guid}/push-to-sandbox | PushPromotionToSandboxRequest | — | Y |
| POST simple/validate | ValidateSimplePromotionRequest | — | Y |
| POST simple/{id:Guid} | GetSimplePromotionDetailRequest | — | Y |
| GET simple/{id:Guid}/filter-properties | GetSimplePromotionFilterPropertiesRequest | — | Y |
| POST simple/{id:Guid}/events | AddSimplePromotionEventsRequest | — | Y |
| DELETE simple/{id:Guid}/events | DeleteSimplePromotionEventsRequest | — | Y |
| PUT simple/{id:Guid}/events | UpdateSimplePromotionEventsRequest | — | Y |
| POST simple | CreateSimplePromotionRequest | — | Y |
| GET {id:Guid}/filter-properties | GetFilterPropertiesRequest | — | Y |
| GET {promoID:Guid}/events/{id:Guid} | GetTradeSpendPromoEventRequest | — | Y |
| PUT {promoID:Guid}/events/{id:Guid} | UpdateTradeSpendPromoEventRequest | — | Y |
| POST | UpsertTradeSpendPromoRequest | — | Y |
| POST edlp | UpsertEDLPOnlyPromotionRequest | — | Y |
| POST duplicate | DuplicateTradeSpendRequest | — | Y |
| PUT | UpdateTradeSpendPromoRequest | — | Y |
| PATCH | UpdateAverageWeeklySalesRequest | — | Y |
| DELETE | DeleteTradeSpendPromotionsRequest | — | Y |
| DELETE {promoID:Guid} | DeleteTradeSpendPromoEventsRequest | — | Y |
| GET {promoID:Guid}/brand-approved-promotion-fees/{id:Guid} | GetBrandApprovedPromotionFeeRequest | — | Y |
| POST promos-at-a-glance | GetPromosAtAGlanceRequest | — | Y |
| POST promos-at-a-glance/export | ExportPromotionEventsRequest | — | Y |
| GET promos-at-a-glance/export/{jobId}/status | GetPromosAtAGlanceExportStatusRequest | — | Y |
| GET promos-at-a-glance/events | GetEventsWithSameEventNameRequest | — | Y |
| GET promos-at-a-glance/events/export | ExportEventsWithSameEventNameRequest | — | Y |
| PATCH promos-at-a-glance/event-status | UpdateBrandEventStatusRequest | — | Y |
| PATCH promos-at-a-glance/submission-status | UpdateBrandSubmissionStatusRequest | — | Y |
| GET promos-at-a-glance/events/filters | GetPromotionEventFiltersRequest | — | Y |
| POST promos-at-a-glance/filters | GetBrandPromotionalManagementFiltersRequest | — | Y |
| GET promos-at-a-glance/notes | GetPromoAtaGlanceNotesRequest | — | Y |
| GET promos-at-a-glance/export-for-brand | ExportBrandPromotionalNotesRequest | — | Y |
| POST promos-at-a-glance/notes | UpsertPromoAtaGlanceNoteRequest | — | Y |
| DELETE promos-at-a-glance/notes | DeletePromoAtaGlanceNotesRequest | — | Y |
| GET monthly-report/refresh | RefreshMonthlyReportRequest | — | Y |
| GET monthly-report/type-options | GetMonthlyReportTypeOptionsRequest | — | Y |
| GET monthly-report/dependent-type-options | GetMonthlyReportDependentTypeOptionsRequest | — | Y |
| POST monthly-report/filter-properties | GetMonthlyReportFilterPropertiesRequest | — | Y |
| POST monthly-report/export/start | StartExportRequest | — | Y |
| POST monthly-report/multi-year | GetMultiYearMonthlyReportRequest | — | Y |
| POST monthly-report | GetMonthlyReportRequest | — | Y |
| POST monthly-report/grand-totals | GetMonthlyReportGrandTotalsRequest | — | Y |
| POST monthly-report/multi-year/grand-totals | GetMultiYearMonthlyReportGrandTotalsRequest | — | Y |
| GET monthly-report/actual/import/template | ExportMonthlyReportActualImportTemplateRequest | — | Y |
| POST monthly-report/backfill | BackfillMonthlyReportRequest | — | Y |
| POST monthly-report/actual/import/chunk | UploadChunkForMonthlyReportActualImportRequest | — | Y |
| GET monthly-report/actual/import/{jobId:guid}/status | GetMonthlyReportActualImportJobStatusRequest | — | Y |

### ProfileController
Prefix: `/api/v1/profile` · File: `caboodle\src\Hosts\API\Controllers\Profile\ProfileController.cs` · Requests mostly from: BuildingBlocks.Application identity services (no Modules.* project; service-based)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| GET | IUserService.GetAsync (no mediator) | — | — |
| PUT | IUserService.UpdateAsync (no mediator) | — | — |
| PUT image-upload | IUserService.UploadProfileImageAsync (no mediator) | — | — |
| DELETE image-remove | IUserService.DeleteProfileImageAsync (no mediator) | — | — |
| PUT change-password | IUserService.ChangePasswordAsync (no mediator) | — | — |
| GET permissions | IUserService.GetPermissionsAsync (no mediator) | — | — |

### RegistrationController
Prefix: `/api/v1/registration` · File: `caboodle\src\Hosts\API\Controllers\Registration\RegistrationController.cs` · Requests mostly from: BuildingBlocks.Application identity services (no Modules.* project; service-based)

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | IUserService.CreateInvitedUserAsync (no mediator) | [AllowAnonymous] | — |

### SnsEmailWebhookController
Prefix: `/api/v1/webhooks/sns-email-events` (explicit [Route]) · File: `caboodle\src\Hosts\API\Controllers\Webhooks\SnsEmailWebhookController.cs` · Requests mostly from: BuildingBlocks.Infrastructure

| Verb + route | Request / handler | Authorization | BrandID |
|---|---|---|---|
| POST | ProcessSnsEmailEventRequest | [AllowAnonymous] | — |

**Totals:** 45 controllers · 678 actions · 236 with `[MustHavePermission]` · 16 with `[AllowAnonymous]` · 426 with neither.
## Section B — Module catalog (backend)

Source: `ModuleCatalogSeedData` (`caboodle\src\Modules\Admin\Modules.Admin.Application\Configuration\Seeding\ModuleCatalogSeedData.cs`), entity `Module` (`caboodle\src\BuildingBlocks\Core\Domain\Configuration\Module.cs`), enums in `BuildingBlocks\Core\Shared\Enums\Enums.cs` (`ModuleAudience` Brand=1/Broker=2; `ModuleDependencyKind` Required=1/OptionalDataSource=2/AutoEnable=3).

Seed trigger: `POST /api/v1/configurations/modules/seed` → `SeedConfigurationModulesRequest` handler (Modules.Admin.Application, gated `[MustHavePermission(CaboodleAction.Execute, CaboodleResource.Modules, CaboodleModule.Configuration)]`). Upsert semantics: insert sets `IsActive = TRUE`, `Description = NULL`; on reseed `DisplayName`/`Description` are never overwritten (only parent/sort/depth/audience). Dependency rows are audience-scoped — a seed row is silently skipped unless both slugs exist in the same audience (that is why BrokerRoots carries data-source copies at sort 100–105). The `Module` entity has no group or route column; "group" below = top-level root in the tree, "FE route" = segment(s) from Section C maps (— = no FE route references the slug directly).

Tree order preserved (indent shown in slug). 36 Brand + 15 Broker = 51 modules; 45 dependency seeds (32 Brand, 13 Broker).

### Brand audience

| Slug | Name | Parent | Group | FE route(s) | Dependencies (kind) |
|---|---|---|---|---|---|
| dashboard | Dashboard | — | dashboard | dashboard | — |
| · banner-count-graph | Banner Count Graph | dashboard | dashboard | — | product-spec (Required) |
| · trade-spend-roll-up-report | Trade Spend Roll Up Report | dashboard | dashboard | — | approved-promotions, product-spec, distributors, retailers (all Required) |
| product-spec | Product Spec | — | product-spec | — | — |
| · categories-products-pricing | Categories Products Pricing | product-spec | product-spec | categories, products, pricing | — |
| distributors | Distributors | — | distributors | distributors, banners | — |
| retailers | Retailers | — | retailers | retailers | — |
| regions | Regions | — | regions | regions | — |
| contacts | Contacts | — | contacts | contacts | — |
| pipelines | Pipelines | — | pipelines | pipeline | — |
| promotion-planning | Promotion Planning | — | promotion-planning | — (nav group only) | — |
| · approved-promotions | Approved Promotions | promotion-planning | promotion-planning | promo-planning, simple-entries | product-spec (Required); trade-spend-sandbox (AutoEnable) |
| · trade-spend-sandbox | Trade Spend Sandbox | promotion-planning | promotion-planning | trade-spend-sandbox | — |
| · promotional-calendar | Promotional Calendar | promotion-planning | promotion-planning | — | — |
| ·· promotional-calendar-view | Promotional Calendar View | promotional-calendar | promotion-planning | promotional-calendar | approved-promotions (Required); regions (OptionalDataSource) |
| ·· promotional-calendar-notes | Promotional Calendar Notes | promotional-calendar | promotion-planning | promotional-notes | approved-promotions (Required) |
| files | Files | — | files | file-upload | — |
| reports | Reports | — | reports | report | — |
| · broker-market-activities | Broker Market Activities | reports | reports | brand-market-overview-report | retailers (Required) |
| · category-review-report | Category Review Report | reports | reports | — | — |
| ·· category-review | Category Review | category-review-report | reports | category-review-brand | — |
| ·· category-review-calendar | Category Review Calendar | category-review-report | reports | category-review-calendar-brand | — |
| · retail-reports | Retail Reports | reports | reports | retail-report | retailers (Required); product-spec (OptionalDataSource) |
| · sales-tracker | Sales Tracker | reports | reports | sales-tracker | regions (Required); retailers (OptionalDataSource) |
| enhanced-reporting | Enhanced Reporting | — | enhanced-reporting | product-report | — |
| · trade-spend-roll-up | Trade Spend Roll Up | enhanced-reporting | enhanced-reporting | banner-report | approved-promotions, trade-spend-sandbox, product-spec, distributors, retailers (all Required) |
| · monthly-report | Monthly Report | enhanced-reporting | enhanced-reporting | monthly-report | approved-promotions, trade-spend-sandbox, product-spec, distributors (all Required) |
| data-upload-reporting | Data Upload Reporting | — | data-upload-reporting | — | — |
| · spins | SPINS | data-upload-reporting | data-upload-reporting | spins | — |
| ·· item-ranking-report | Item Ranking Report | spins | data-upload-reporting | — (nested under /spins) | — |
| ·· stores-insight-report | Stores Insight Report | spins | data-upload-reporting | — (nested under /spins) | — |
| · kehe | KeHE | data-upload-reporting | data-upload-reporting | kehe | — |
| · unfi | UNFI | data-upload-reporting | data-upload-reporting | unfi | — |
| · distributor-sales-report | Distributor Sales Report | data-upload-reporting | data-upload-reporting | distributor-sales-report | — |
| ai | AI | — | ai | — | — |
| · ask-caboodle | Ask Caboodle | ai | ai | dashboard-ai, ask-caboodle | product-spec, distributors, retailers, regions, approved-promotions, trade-spend-sandbox, contacts, pipelines (all OptionalDataSource) |

### Broker audience

| Slug | Name | Parent | Group | FE route(s) | Dependencies (kind) |
|---|---|---|---|---|---|
| market-overview | Market Overview | — | market-overview | market-overview, market-overview-report | product-spec, regions, retailers, distributors (all Required) |
| promotional-management | Promotional Management | — | promotional-management | promotional-management | — |
| · promotional-management-notes | Promotional Management Notes | promotional-management | promotional-management | — (route gates on parent) | approved-promotions (Required) |
| · promotional-management-events | Promotional Management Events | promotional-management | promotional-management | — (route gates on parent) | approved-promotions, trade-spend-sandbox, product-spec, distributors (Required); regions (OptionalDataSource) |
| category-review-group | Category Review | — | category-review-group | — | — |
| · category-review | Category Review | category-review-group | category-review-group | category-review | — |
| · category-review-calendar | Category Review Calendar | category-review-group | category-review-group | category-review-calendar | — |
| distributor-apl | Distributor APL | — | distributor-apl | distributor-apl (nav also gates /retail-apl on this slug) | product-spec, regions, distributors (all Required) |
| files | Files | — | files | file-repository | — |
| product-spec | Product Spec | — | (data-source copy, sort 100) | — | — |
| regions | Regions | — | (data-source copy, sort 101) | — | — |
| retailers | Retailers | — | (data-source copy, sort 102) | — | — |
| distributors | Distributors | — | (data-source copy, sort 103) | — | — |
| approved-promotions | Approved Promotions | — | (data-source copy, sort 104) | — | — |
| trade-spend-sandbox | Trade Spend Sandbox | — | (data-source copy, sort 105) | — | — |

Notes: slugs are not unique across audiences — `files`, `product-spec`, `regions`, `retailers`, `distributors`, `approved-promotions`, `trade-spend-sandbox`, `category-review`, `category-review-calendar` exist in both with different IDs (FE access layer grants if any audience's copy is enabled). `broker-market-activities` sits under the Brand audience despite the name. The only AutoEnable edge in the catalog: Brand `approved-promotions` → `trade-spend-sandbox`.

## Section C — FE route→module gating maps (web)

Source: `caboodle.web\src\constants\moduleConstants.ts` (CS-146). The end-user app reads its module list from `GET api/v1/brands/me`; the file's header comment states the admin `api/v1/configurations/*` routes (catalog CRUD, assignment preview/apply/details) are **admin-app only and must never be called from caboodle.web**.

Constants:

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_MODULE_ACCESS` | `false` | Slug absent from the `/me` payload ⇒ deny |
| `ALLOW_ALL_WHEN_NO_MODULES` | `true` | Empty `modules` array (tenant not backfilled) ⇒ allow everything; populated payload is authoritative. "Set to false once module assignments are backfilled everywhere." |

### BRAND_ROUTE_MODULES (first path segment after `/[brandID]` → slug)

| Route segment | Module slug |
|---|---|
| dashboard | dashboard |
| categories | categories-products-pricing |
| products | categories-products-pricing |
| pricing | categories-products-pricing |
| distributors | distributors |
| retailers | retailers |
| banners | distributors |
| regions | regions |
| contacts | contacts |
| pipeline | pipelines |
| promo-planning | approved-promotions |
| simple-entries | approved-promotions (CS-1708 — Simple Entries write into `POST api/v1/tradespends`; no catalog module of their own) |
| trade-spend-sandbox | trade-spend-sandbox |
| promotional-calendar | promotional-calendar-view |
| promotional-notes | promotional-calendar-notes |
| file-upload | files |
| report | reports |
| brand-market-overview-report | broker-market-activities |
| category-review-brand | category-review |
| category-review-calendar-brand | category-review-calendar |
| retail-report | retail-reports |
| sales-tracker | sales-tracker |
| monthly-report | monthly-report |
| banner-report | trade-spend-roll-up |
| product-report | enhanced-reporting ("Promoted Case Sales Analysis" has no module; inherits the section gate) |
| spins | spins (SPINS sub-reports nest under /spins and resolve to this gate) |
| kehe | kehe |
| unfi | unfi |
| distributor-sales-report | distributor-sales-report |
| dashboard-ai | ask-caboodle |
| ask-caboodle | ask-caboodle |

Ungated brand segments (per the file's comment): `/profile`, `/apl-report`, `/apl-activity` (the APL screens have no catalog module).

### BROKER_ROUTE_MODULES (first path segment, no `[brandID]` → slug)

| Route segment | Module slug |
|---|---|
| market-overview | market-overview |
| market-overview-report | market-overview (no separate module for the report view) |
| category-review | category-review |
| category-review-calendar | category-review-calendar |
| promotional-management | promotional-management |
| distributor-apl | distributor-apl |
| file-repository | files |

Commented out in source: `retailApl: "retail-apl"` in MODULE_SLUGS and `"retail-apl": MODULE_SLUGS.retailApl` in BROKER_ROUTE_MODULES — so `/retail-apl` is not route-gated. Broker `/dashboard` is deliberately absent (no broker-home module; always reachable).

### Nav menus (`caboodle.web\src\helper\appNav.helper.ts` — shared by HeaderComponent and AppSidebar)

Brand workspace (`buildBrandNavItems`):

| Menu path | URL | moduleSlug |
|---|---|---|
| Home | /{brandId}/dashboard | dashboard |
| Management → Product Specs | /{brandId}/categories | categories-products-pricing |
| Management → CRM (group) | — | — (no `crm` module; shown if any child survives) |
| Management → CRM → Distributors | /{brandId}/distributors | distributors |
| Management → CRM → Retailers | /{brandId}/retailers | retailers |
| Management → CRM → Regions | /{brandId}/regions | regions |
| Management → CRM → Contacts | /{brandId}/contacts | contacts |
| Management → CRM → Pipeline | /{brandId}/pipeline | pipelines |
| Promotional Planning (group) | — | promotion-planning |
| Promotional Planning → Approved Promotions | /{brandId}/promo-planning | approved-promotions |
| Promotional Planning → Trade Spend Sandbox | /{brandId}/trade-spend-sandbox | trade-spend-sandbox |
| Promotional Planning → Promotional Calendar | /{brandId}/promotional-calendar | promotional-calendar-view |
| Files (action button) | /{brandId}/file-upload | files |
| Reports (action button) | /{brandId}/report | reports |

Broker workspace (`buildBrokerNavItems`):

| Menu path | URL | moduleSlug |
|---|---|---|
| Dashboard | /dashboard | — (ungated) |
| Management → Market Overview → Details | /market-overview | market-overview |
| Management → Market Overview → Report | /market-overview-report | market-overview |
| Management → Category Review | /category-review | category-review |
| Strategy → Promotional Management | /promotional-management | promotional-management |
| Strategy → Distributor APL | /distributor-apl | distributor-apl |
| Strategy → Brand Retail Item Status | /retail-apl | distributor-apl |
| Files (action button) | /file-repository | files |

(The broker workspace has no Reports shortcut.)

## Section D — Anomalies

- **426 of 678 actions carry neither `[MustHavePermission]` nor `[AllowAnonymous]`** — they rely only on the default authenticated-user policy; nothing server-side ties them to a module. FE route gating is the only module control for most brand-workspace endpoints (CRM, TradeSpend, DataUpload, FileRepository, Reports…).
- **Role checks live inside handlers, not attributes**, in 35 Application files. Notables: BrandsController → `GetMyAssignedBrandsRequest`, `UpsertBrandRequest`, `AssignBrandToUserRequest`, `RemoveUserFromBrandRequest`, `AssignBrandsToSubBrokersRequest`, `RemoveBrandFromBrokerRequest`; BrokersController → `GetBrokersRequest`, `CategoryReviewAccessHelper`, `PromoTabAccessHelper`; SubUsersController → `GetBrokerSubUsersRequest`, `RemoveBrokerSubUserRequest`, `ToggleActiveStatusOfSubBrokerReqest`, `ToggleSubUserActiveStatusRequest`, `RemoveBrandSubUserRequest`, `DeleteSubUsersInvitationRequest`; Directory/FilesController → every Directory/File handler (`DirectoryCreationRequest`, `DeleteDirectoryRequest`, `UploadFileRequest`, `UploadChunkFileRequest`, `DeleteFileRequest`, `FileMoveRequest`, `UpdateFileRequest`, `CreateFileShareLinkRequest`, `RevokeFileShareLinkRequest`, …); UsersController → `GetBrandsOfUserRequest`; ConfigurationsController → `ModuleAssignmentService`, `BackfillAllModuleAssignmentsRequest`; BrandReportController → `GetBrandReportAuditLogByUserRequest`.
- **Doubled route segment in UsersController**: `[HttpGet("users/{id}/roles")]`, `[HttpPost("users/{id}/assign-role")]`, `[HttpDelete("users/{id}/remove-role")]` resolve to `/api/v1/users/users/{id}/…`.
- **Permission-attribute mismatches**: DistributorsController `DELETE` gated with `CaboodleResource.Retailers, CaboodleModule.Retailer`; RegionsController `POST retailer-region` gated with `CaboodleModule.Retailer`; CredentialManagerController uses `CaboodleAction.View` on all five actions including create/update/delete; BrokersController PATCH event-status/submission-status use `View` for writes and `GET {regionID}/get-retailers` uses `Create` for a read.
- **`[AllowAnonymous]` on data endpoints**: DataHubController `POST import/unified/retailer`, `POST import/unified/store`, `POST validate-mapping-status`, `POST health/crawler` (plus the expected anonymous AuthController, registration/email flows, ShareController token resolution, SNS webhook).
- **MarketOverviews** lacks the `Controller` suffix — still discovered (inherits `[ApiController]`, which derives from `ControllerAttribute`), so `[controller]` resolves to the full class name: `/api/v1/marketoverviews`.
- **ShareController** lives at unversioned `/share` (BaseApiController + `[Route("share")]`), outside the `/api/v1` surface, anonymous.
- **Duplicate functionality routes**: AdminController `GET|PUT pipelines/dealstages` vs PipelinesController `GET|POST dealstages` (same handlers family, different prefixes); TradeSpendsSandboxController `PATCH {id:Guid}/events/update-status` and `PATCH {id:Guid}/update-event-status` both send `UpdateEventsStatusRequest`; `POST /api/v1/auth/login` vs `POST /api/v1/admin/login` (user vs admin token). Directory/Files controllers duplicate every route as a `broker/...` twin sending the same request type (brand vs broker file areas). No exact verb+path collisions exist anywhere.
- **Cross-module request reuse**: StoresController `GET store-list/import/{jobId}/status` reuses `GetKeHEImportJobStatusRequest` (DataUpload) for DataHub store-list imports; BrandsController import/export use DataUpload's `MasterDataUpload` permission; controllers' folder grouping ≠ request-type module (StoresController is in CRM folder but is DataHub-backed).
- **Dead/inactive code**: commented-out legacy CRM Stores region (StoresController ~11–60: GET, GET {id:guid}, POST) and MasterDataUploadController banner-retailer + crm imports (~200–220); AdminController `data-cleanup/*`, `email-loggers/*`, `bubbies-db/*` have no permission attribute; request body DTOs (`BulkMapUnmappedRequest`, `GetUnmappedEntitiesRequest`, nine others) are declared inside Host controller files rather than Application.
- **FE map vs catalog**: `/retail-apl` is gated in the nav under `distributor-apl` but its BROKER_ROUTE_MODULES entry (and the `retail-apl` slug) is commented out — the route itself is reachable regardless of modules, and no `retail-apl` module exists in the catalog. Brand `banners` route gates on `distributors`, not a banner module.
- **Catalog slugs with no FE route reference**: Brand `product-spec`, `promotion-planning`, `promotional-calendar`, `banner-count-graph`, `trade-spend-roll-up-report`, `category-review-report`, `item-ranking-report`, `stores-insight-report`, `data-upload-reporting`, `ai`; Broker `promotional-management-notes`, `promotional-management-events`, `category-review-group` and the six data-source copies (sort 100–105). These are parents/in-page gates/dependency anchors — workbooks must not assume every module has a route.
- **Ungated FE surfaces**: `/profile`, `/apl-report`, `/apl-activity`, broker `/dashboard` — reachable with any (or no) module assignment.
- **`ALLOW_ALL_WHEN_NO_MODULES = true`** — any tenant whose assignments are not backfilled sees the entire app; planners must sequence backfill before flipping it.
