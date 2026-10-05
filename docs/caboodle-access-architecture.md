# Caboodle Access Architecture v2

**Platform Admin → Organizations → Brands → Users → Module Access → Permissions**

Status: proposal for review before backend implementation · 2026-09-30

This document replaces the relationship, plan and billing parts of `caboodle-organization-identity-demo.md`. The rest of that document still applies: users are independent identities, Brands and Brokerages are organizations, and people belong to them through memberships.

It is based on a review of this demo and of `caboodle.backend` (the .NET 6 API). Section 10 maps every table the backend has today onto this model.

---

## 0. What changed after the Platform Admin review

| # | Feedback | Decision in this design |
|---|---|---|
| 1 | Brokers should not have to request a Brand and wait for approval. | **Only the Platform Admin connects a Brand to a Brokerage.** There is no request/approve flow. Once connected, the Brokerage Admin assigns their own users to that Brand. |
| 2 | A user assigned to a Brand gets all of that Brand's module permissions by default; the Brokerage Admin can restrict them. | Each assignment has an **access mode**: `Full` (the default) or `Custom`. `Full` follows whatever modules are enabled, including modules enabled later. `Custom` is an explicit list the admin edits. |
| 3 | The Brokerage Admin has every Brokerage permission and full access to every connected Brand. | The admin role carries a **full brand access** flag. Admin access is worked out from the active connections at request time and is never stored per brand, so a newly connected Brand is available to the admin immediately. |
| 4 | Remove pricing, subscriptions, payments, billing and the permissions that go with them. | Plans, subscriptions, invoices, payment methods, module prices and `billing.*` are removed. **The Platform Admin enables modules per organization directly.** The backend never had any of this; it only exists in the demo. |

---

## 1. The model on one page

```
                               PLATFORM ADMIN  (global ADMIN role, outside every organization)
                                     │
             creates organizations · enables modules per organization · connects Brands to Brokerages
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   BRAND ORGANIZATION                                 BROKERAGE ORGANIZATION
   e.g. Acme Foods                                    e.g. ABC Brokerage
   enabled modules: Brand catalog                     enabled modules: Broker catalog
          │                                                     │
          │◄──────────── BRAND CONNECTION (Platform Admin only) ─┤   many-to-many
          │                                                     │
     MEMBERSHIPS                                           MEMBERSHIPS
     Alice  — Brand Admin    (full, own brand)             John — Brokerage Admin (full, every connected brand)
     Bob    — Brand Member ──► BRAND ACCESS: Acme           Mike — Broker ──► BRAND ACCESS: Acme           [Full]
                              [Custom grants]                                BRAND ACCESS: Private Label  [Custom grants]
```

Six rules explain the whole model:

1. **A person reaches an organization only through a Membership.** A user is never a Brand or a Brokerage.
2. **A Membership has one Role.** The role gives **organization permissions**: what you may *administer* (members, invitations, brand assignments). It never gives you data.
3. **Data is always reached through a Brand.** Every piece of business data belongs to a Brand. A Brand member works on their own Brand. A broker works on the Brands they are assigned to.
4. **Modules are enabled per organization by the Platform Admin.** This is the ceiling. Nobody inside the organization can go above it.
5. **Module permissions sit on a Brand Access**, which is one membership working on one Brand. They list, per module, the actions `view`, `create`, `edit`, `delete` and `export`.
6. **Effective access is always what the organization has enabled intersected with what the person was given.** Access is computed on the server for every request. It is never read from the token.

---

## 2. Answers to the four architecture questions

### Q1. Are Modules assigned to Users, Organizations, or both?

**Both, at two different levels that mean different things.**

| Level | Name | Who sets it | Meaning |
|---|---|---|---|
| Organization | **Module entitlement** | Platform Admin only | "ABC Brokerage has Market Overview." Nobody in ABC can use a module the organization does not have. |
| Person × Brand | **Module grant** (on a Brand Access) | Organization Admin | "Mike may view and edit Market Overview *for Acme Foods*." |

A user never holds a module globally. They hold it *in one organization, for one brand*. Mike can have Market Overview for Acme Foods and not for Private Label.

### Q2. Are Permissions assigned to Users, Organizations, Brand assignments, or a combination?

A combination. Each kind of permission lives in exactly one place:

| Kind of permission | Examples | Attached to |
|---|---|---|
| **Platform permissions** | create organizations, connect brands, enable modules, DataHub, soft-delete purge | the global `ADMIN` role, as `Identity.RoleClaims` (unchanged from today) |
| **Organization permissions** | invite members, change roles, assign members to brands, edit module access | the **Role** of a **Membership** (user × organization) |
| **Module permissions** | `view` / `create` / `edit` / `delete` / `export` on a module | the **Brand Access** (membership × brand) |

**Organizations hold no permissions.** They hold entitlements, which are a ceiling.

**Brand Connections hold no permissions either.** A connection only makes a Brand *assignable* inside the Brokerage.

### Q3. How do organization permissions and brand permissions interact?

They are **orthogonal**. One never implies the other, with one deliberate exception.

- An organization permission lets you *manage* something, but it gives you no data. `access.manage` lets a Brokerage Admin edit Mike's module permissions for Acme. It does not, by itself, let anyone open Acme's promotions.
- A module permission lets you *work on data* inside one brand. It gives no administrative power. Mike having `edit` on every module for Acme does not let him invite anyone.
- **The exception is the Admin role**, which carries `HasFullBrandAccess = true`:
  - a Brand Admin gets full access to their own Brand;
  - a Brokerage Admin gets full access to every Brand that is actively connected.
  This access is **derived** at request time, never stored as rows. It therefore follows connections and entitlements automatically.
- **Ceilings always apply from the top down:**
  - effective access = entitlement ∩ grant;
  - an admin can never grant a module the organization does not have;
  - a module the Platform Admin disables stops working at once for everyone, including admins.

A request is checked at whichever layer it touches:
- management endpoints check organization permissions;
- data endpoints check module permissions in the active brand;
- platform endpoints check platform permissions.

### Q4. How is a user assigned to multiple Brands represented?

One **Membership** in the Brokerage, plus **one Brand Access row per Brand**. Each row has its own access mode and its own grants:

```
Mike ── Membership (role: Broker) ──► ABC Brokerage
          ├── Brand Access → Acme Foods          mode: Full     (every enabled module, every action)
          └── Brand Access → XYZ Private Label   mode: Custom
                 ├── market-overview     view, create, edit
                 └── files               view
```

At runtime, the brand switcher picks one Brand and the frontend sends it in the existing `BrandID` header. Screens that span brands, such as Promotional Management across all brands, receive the list of brands where the user has that module and action (section 6.3).

A person who belongs to **two organizations** has two memberships, and they never merge. The external consultant can be a Brand Member of Acme and a Broker at ABC who is assigned to Acme; these are still two separate contexts with different module catalogs. The organization switcher chooses the context.

---

## 3. Entities and relationships

### 3.1 Entity diagram

```
Identity.Users (existing)
   │ 1
   │ *
Organization.Memberships ──* 1── Organization.Roles ──1 *── Organization.RolePermissions
   │ *            │ 1
   │              ▼
   │        Organization.Organizations ──1 1── Brand.Brands          (Type = Brand only; same Id)
   │              │ 1     │ 1     │ 1
   │              │       │       └──* Configuration.ModuleAssignments ──* 1── Configuration.Modules
   │              │       │            (module entitlement, existing table)             ▲
   │              │       └──* Organization.Invitations                                  │
   │              │                                                                      │
   │              └──* Organization.BrandConnections *──1 Organizations (Type = Brand)    │
   │                    (Brokerage ↔ Brand, created by the Platform Admin)               │
   │ 1                                                                                   │
   │ *                                                                                   │
Organization.BrandAccess ──* 1── Organizations (Type = Brand)                             │
   │ 1                                                                                   │
   │ *                                                                                   │
Organization.BrandAccessModules ──* 1───────────────────────────────────────────────────┘
   (module grants, used only when AccessMode = Custom)
```

**Where the tables live:**
- New tables go in a new `Organization` schema in `MainDbContext`.
- Module entitlements stay in the existing `Configuration` schema.
- User ids in the new tables are `uuid`, matching the existing link tables such as `BrandBrokers.BrokerID`.
- There is no FK to `Identity.Users`. It lives in another DbContext and its `Id` is `text`, the same situation every existing link table has. Every other relationship above is a real FK.
- `MainDbContext` has no soft-delete hook and no global query filter. Wherever this design says a row is soft-deleted, the code must set `Deleted` itself, filter on it in every query, and add `WHERE "Deleted" = FALSE` to every unique index, as the existing tables do.

**Enums** follow the repo rule for open enums: values start at 5 with gaps of 5. `ModuleActions` is a fixed `[Flags]` enum.

### 3.2 Tables

**`Organization.Organizations`** is the business entity: a Brand or a Brokerage.

| Column | Type | Notes |
|---|---|---|
| `ID` | uuid PK | **For a Brand this equals `Brand.Brands.ID`**, so every existing `BrandID` column in the database stays valid unchanged. |
| `Type` | int | `Brand = 5`, `Brokerage = 10`. Cannot change after creation. |
| `Name` | text | |
| `Status` | int | `Active = 5`, `Suspended = 10`. Suspended blocks every member, and for a Brand it also blocks every brokerage's access to it. |
| `MembershipPolicy` | int | From the demo: anyone, verified domain, or invite only. Only needed if self-service sign-up stays (decision D7). |
| audit columns | | `AuditableEntity` |

`Brand.Brands` keeps the brand profile (logo, slug, vendor, URLs). Its `UserID` (the brand owner) is retired. An FK `Brands.ID → Organizations.ID` enforces the 1:1 link.

**`Organization.Memberships`** says a person belongs to an organization.

| Column | Type | Notes |
|---|---|---|
| `ID` | uuid PK | |
| `OrganizationID` | uuid FK | |
| `UserID` | uuid | |
| `RoleID` | uuid FK → Roles | The role's organization type must match the organization's type. |
| `Status` | int | `Active = 5`, `Suspended = 10`, `Removed = 15` |
| `Source` | int | `Created = 5`, `Invitation = 10`, `AccessRequest = 15`, `Migrated = 20`, `PlatformAdmin = 25` |
| audit columns | | |

Unique index on `(OrganizationID, UserID)` where not deleted: a person has at most one membership per organization.

**`Organization.Roles`** and **`Organization.RolePermissions`** are seeded system roles, one set per organization type.

| Column | Type | Notes |
|---|---|---|
| `ID` | uuid PK | |
| `Key` | text, unique | `brand-admin`, `brand-member`, `brokerage-admin`, `broker` |
| `Name`, `Description` | text | |
| `OrganizationType` | int | |
| `HasFullBrandAccess` | bool | `true` for the two admin roles |
| `IsSystem` | bool | `true`. This leaves room for custom roles later without a schema change. |

`RolePermissions(RoleID, Permission text)` lists the role's organization permissions (section 4.2).

These are **separate from `Identity.Roles`**. Identity roles are global and, after migration, only `ADMIN` (the Platform Admin) remains in use.

**`Organization.BrandConnections`** says a Brokerage works with a Brand. Only the Platform Admin writes it.

| Column | Type | Notes |
|---|---|---|
| `ID` | uuid PK | |
| `BrokerageOrganizationID` | uuid FK | must be a Brokerage |
| `BrandOrganizationID` | uuid FK | must be a Brand |
| `Status` | int | `Active = 5`, `Suspended = 10` (access paused, assignments kept), `Ended = 15` (assignments removed) |
| `Regions` | text[] | Optional metadata, e.g. Northeast. It does not scope data (decision D8). |
| `ConnectedByUserID`, `ConnectedOn`, `EndedByUserID?`, `EndedOn?` | | |

Unique index on `(BrokerageOrganizationID, BrandOrganizationID)` where `Status <> Ended`. A Brand may be connected to many Brokerages, and a Brokerage to many Brands.

**`Organization.BrandAccess`** is one non-admin membership working on one Brand.

| Column | Type | Notes |
|---|---|---|
| `ID` | uuid PK | |
| `MembershipID` | uuid FK, cascade | |
| `BrandOrganizationID` | uuid FK | |
| `AccessMode` | int | `Full = 5` (default), `Custom = 10` |
| `AssignedByUserID`, `AssignedOn` | | |
| audit columns | | |

- Unique index on `(MembershipID, BrandOrganizationID)` where not deleted. Ending a connection soft-deletes these rows (F6), so a later reconnect must be able to assign the same Brand again.
- In a **Brand** organization the row is created automatically with the membership, with `BrandOrganizationID = Membership.OrganizationID`. Every non-admin therefore resolves the same way.
- In a **Brokerage** the Brokerage Admin creates one row per assigned Brand. A row can only be created while an active connection exists (section 8).
- **Admins have no rows.** Their access is derived from the role.

**`Organization.BrandAccessModules`** is the module grant list. It is read only when `AccessMode = Custom`.

| Column | Type | Notes |
|---|---|---|
| `BrandAccessID` | uuid FK, cascade | PK part 1 |
| `ModuleID` | uuid FK → `Configuration.Modules` | PK part 2. The module's audience must match the organization type. |
| `Actions` | int flags | `View = 1`, `Create = 2`, `Edit = 4`, `Delete = 8`, `Export = 16`. Any action implies `View`. |

A missing row means **no access** to that module.

**`Configuration.Modules`** is the existing catalog, unchanged apart from one column:
- It keeps its tree (`ParentModuleId`), `Audience` (`Brand = 1`, `Broker = 2`), `IsActive` and its dependencies.
- **Add `AvailableActions int flags`** (default all five). A report that is view/export only then never offers create/edit/delete checkboxes, and `Full` never grants actions the module doesn't have.
- No price columns. There never were any in the backend.

**`Configuration.ModuleAssignments`** is the existing table, **reused as the module entitlement**.
- Replace the `BrandId?` / `BrokerId?` pair with **`OrganizationID`**. The values carry over unchanged (section 10.2).
- Drop `CK_ModuleAssignments_BrandOrBroker`. Unique index on `(ModuleId, OrganizationID)`.
- The existing dependency engine (`Required`, `AutoEnable`) and `ModuleAssignmentHistories` keep working as they do.

**`Organization.Invitations`** replaces `Identity.InvitedUsers`.

| Column | Type | Notes |
|---|---|---|
| `ID`, `Email`, `Token`, `ExpiresOn`, `Status` | | Status: `Pending = 5`, `Accepted = 10`, `Expired = 15`, `Revoked = 20` |
| `OrganizationID` | uuid FK | |
| `RoleID` | uuid FK | |
| `BrandOrganizationIDs` | uuid[] | Brokerage invitations only: the Brands to assign on acceptance, each starting at `Full`. They are checked against the connections that are active at acceptance time. |
| `InvitedByUserID` | uuid | |

`Organization.Domains` and `Organization.AccessRequests` carry over from the demo unchanged, if self-service sign-up stays (decision D7).

---

## 4. Roles and the permission catalogue

### 4.1 Platform permissions: the global `ADMIN` role

The Platform Admin is not a member of any organization. The role is the existing `ADMIN` Identity role, enforced by the existing `[MustHavePermission]` and role-claim mechanism. The existing Admin permissions (DataHub, Configuration, SoftDeletePurge and so on) stay. Add:

| Permission | Allows |
|---|---|
| `Permissions.Platform.Organizations.View` / `.Create` / `.Update` | list, create and rename organizations; suspend and restore them |
| `Permissions.Platform.BrandConnections.View` / `.Manage` | connect, suspend and end Brand ↔ Brokerage connections |
| `Permissions.Configuration.ModuleAssignments.View` / `.Assign` | **existing**; `.View` previews and reads enabled modules, `.Assign` applies them. Both now target `OrganizationID`. |
| `Permissions.Platform.Memberships.View` / `.Manage` | support: see anyone's access and fix memberships |

**Support access.** The Platform Admin may open any organization and Brand. The resolver gives her full access. Every such request is written to the audit trail with `IsSupportAccess = true`.

### 4.2 Organization permissions and the four system roles

| Permission | Meaning | Brand Admin | Brand Member | Brokerage Admin | Broker |
|---|---|:-:|:-:|:-:|:-:|
| `organization.view` | see the organization profile | ✓ | ✓ | ✓ | ✓ |
| `organization.update` | edit profile and settings | ✓ | – | ✓ | – |
| `member.view` | see the member list | ✓ | ✓ | ✓ | ✓ |
| `member.invite` | send and revoke invitations | ✓ | – | ✓ | – |
| `member.approve` | approve or reject access requests | ✓ | – | ✓ | – |
| `member.update` | change a member's role | ✓ | – | ✓ | – |
| `member.suspend` | suspend or restore a membership | ✓ | – | ✓ | – |
| `member.remove` | remove a member | ✓ | – | ✓ | – |
| `domain.view` / `domain.manage` | email domains | ✓ | – | ✓ | – |
| `connection.view` | see connected organizations (a Brand sees its Brokerages; a Brokerage sees its Brands) | ✓ | ✓ | ✓ | – ¹ |
| `access.manage` | assign members to Brands and edit their module permissions | ✓ | – | ✓ | – |
| **Full brand access** (role flag, not a permission) | every enabled module, every action | own Brand | – | every connected Brand | – |

¹ A Broker still sees the Brands *they are assigned to*, because those are part of their access context. What they do not see is the brokerage's whole portfolio.

**Removed from the demo:**
- `relationship.request`, `relationship.approve`, `relationship.reject`, `relationship.manage`: connecting is now a Platform Admin action.
- `billing.view`, `billing.manage`: billing is gone.
- `module.full_access`: now the role flag.
- `module.assign`: now `access.manage`.

**External collaborator is not a role.** It is a Brand Member or Broker whose email is outside the organization's verified domain. The UI can label it from the domain.

### 4.3 Module actions

`View`, `Create`, `Edit`, `Delete`, `Export`. Today's backend actions are the string constants of the static class `CaboodleAction` (it is not an enum). Its 12 members map onto them as follows:

| Today's `CaboodleAction` | Module action |
|---|---|
| View, Search | `View` |
| Create, Import | `Create` |
| Update, Assign | `Edit` |
| Upsert | `Create` when the payload has no id, otherwise `Edit`. The handler decides. |
| Delete | `Delete` |
| Export | `Export` |
| Execute | None. It only guards Platform operations (seeding the module catalog, the soft-delete purge, the file-key backfill), which stay `[MustHavePermission]`. |
| Generate, Clean | None. Defined but not used anywhere. |

---

## 5. How each role gets access

| Who | Organization permissions come from | Brands they can work on | Modules and actions per Brand |
|---|---|---|---|
| **Platform Admin** (Constance) | global `ADMIN` role claims | all (support access, audited) | all |
| **Brand Admin** (Alice @ Acme) | role `brand-admin` | Acme only | every module **Acme** has enabled, with every action |
| **Brand Member** (Bob @ Acme) | role `brand-member` | Acme only, through his auto-created Brand Access | `Full`: everything Acme has enabled. `Custom`: his grants ∩ Acme's modules. |
| **Brokerage Admin** (John @ ABC) | role `brokerage-admin` | every Brand with an **active** connection to ABC | every module **ABC** has enabled, with every action, on every connected Brand |
| **Broker** (Mike @ ABC) | role `broker` | only Brands with a Brand Access row **and** an active connection | per Brand: `Full` means everything ABC has enabled; `Custom` means his grants ∩ ABC's modules |

**Which catalog applies (decision D1).** A broker working on Acme uses the **Brokerage's** modules: the Broker-audience catalog as ABC has it enabled. Examples are Market Overview, Category Review, Promotional Management and Distributor APL, plus the Broker-audience copies of Product Spec, Retailers, Distributors, Regions, Approved Promotions and Trade Spend Sandbox. They are applied to Acme's data.

This is how the backend already works: the Broker catalog exists so brokers have their own toolset over brand data. It is also why "all permissions for that Brand's modules" means "every module ABC can use, on Acme".

The alternative, a broker inherits Acme's Brand-audience module list, changes one line in the resolver (section 6.2). It needs the Platform Admin's confirmation.

### Worked example: what Mike can do

Starting facts:
- **ABC has enabled:** market-overview, category-review-group (with category-review and category-review-calendar), promotional-management, files, and the Broker copies of product-spec, retailers and approved-promotions.
- **Connections:** ABC ↔ Acme is Active. ABC ↔ Private Label is Active. ABC ↔ Northwind does not exist.
- **Mike's Brand Access:** Acme `Full`. Private Label `Custom` with `market-overview: view, create, edit` and `files: view`.

| Mike asks for | Result | Why |
|---|---|---|
| Promotional Management, Acme, edit | ✅ | Acme is Full, and ABC has the module. |
| Promotional Management, Private Label, view | ❌ 403 | Custom, and the module is not granted. |
| Market Overview, Private Label, delete | ❌ 403 | The grant has view, create and edit only. |
| Files, Private Label, view | ✅ | granted |
| anything for Northwind | ❌ 403 | not connected, so not assignable |
| Promotional Management, all brands | data for **Acme only** | The allowlist is the brands where he has that module and action. |
| Invite a colleague | ❌ 403 | The `broker` role lacks `member.invite`. |

Now the Platform Admin enables `distributor-apl` for ABC:
- Mike gets it on Acme at once, because Acme is Full.
- He does not get it on Private Label, because Custom never gains modules on its own.
- John gets it on every connected brand.

---

## 6. Request-time access resolution

### 6.1 Request context

| Header | Status | Meaning |
|---|---|---|
| `OrganizationID` | **new** | The workspace: which membership the request acts through. The frontend sends it from the organization switcher. If it is missing and the user has exactly one membership, that membership is used, which keeps today's single-organization users working. |
| `BrandID` | existing | The active Brand. **In a Brand workspace** it must equal the organization id; if it is missing, it defaults to the organization id. **In a Brokerage workspace** it must be a Brand in the user's context. If it is missing, the endpoint runs in cross-brand mode and must use the allowlist (6.3). |

**The JWT does not change:** no role, permission or brand claims. That already matches today's token, and access changes take effect immediately instead of waiting for the token to expire.

### 6.2 The resolver

This is the only place that decides access. It **replaces** `BrandValidationMiddleware`, `GetMyAssignedBrandsRequest.BuildModulesAsync`, `CategoryReviewAccessHelper`, `PromotionalManagementBrandAccess`, `PromoTabAccessHelper` and the role checks spread across about 40 files.

```csharp
AccessContext Resolve(Guid userId, Guid organizationId, Guid? brandId)
{
    if (IsPlatformAdmin(userId))
        return SupportContext(organizationId, brandId);                 // full access, audited

    Membership membership = ActiveMembership(userId, organizationId);  // user, membership and organization all active
    if (membership is null) throw Forbidden();

    Role role = membership.Role;
    ModuleSet enabled = EnabledModules(organizationId);                // ModuleAssignments; audience = organization type

    IEnumerable<Guid> reachable = organization.Type == Brand
        ? new[] { organizationId }                                     // a brand works on itself
        : ActiveConnectedBrands(organizationId);                       // connection Active and brand organization Active

    var brands = new Dictionary<Guid, ModuleMap>();
    foreach (Guid brand in reachable)
    {
        if (role.HasFullBrandAccess) { brands[brand] = Full(enabled); continue; }

        BrandAccess access = FindBrandAccess(membership.ID, brand);
        if (access is null) continue;                                  // not assigned to this brand

        brands[brand] = access.AccessMode == Full
            ? Full(enabled)
            : Custom(access.Grants, enabled);
        // Decision D1 alternative: use EnabledModules(brand) here instead of `enabled`.
    }

    if (brandId is not null && !brands.ContainsKey(brandId.Value)) throw Forbidden();
    return new AccessContext(userId, membership, role.Permissions, brands,
                             activeBrandId: brandId ?? (organization.Type == Brand ? organizationId : null));
}

// Full: every enabled module, with every action that module supports.
ModuleMap Full(ModuleSet enabled) =>
    enabled.ToMap(module => module.AvailableActions);

// Custom: only granted modules that are still enabled, whose parent is granted too.
ModuleMap Custom(Grants grants, ModuleSet enabled) =>
    grants.Where(grant => enabled.Contains(grant.ModuleId))
          .Where(grant => grant.Module.ParentId is null || grants.Has(grant.Module.ParentId))
          .ToMap(grant => (grant.Actions | View) & grant.Module.AvailableActions)
          .WithViewOn(RequiredDependencies(grants, enabled));
```

The last line matters. Market Overview has a `Required` dependency on Product Spec, Regions, Retailers and Distributors (`ModuleDependencies`, seeded in `ModuleCatalogSeedData`). A user who is granted Market Overview therefore also gets **view** on those enabled data sources, so the screen's lookups work. Nothing extra is stored for this.

### 6.3 How endpoints use it

**Organization management endpoints:**

```csharp
[HttpPost]
[RequireOrgPermission(OrgPermissions.MemberInvite)]
public Task<Guid> InviteAsync(CreateInvitationRequest request) => Mediator.Send(request);
```

**Brand data endpoints.** Put **one** attribute on each endpoint, naming the module slug for each audience that may call it. ASP.NET Core requires *every* authorize policy on an action to pass, so two separate attributes would mean "brand AND broker", which is wrong.

```csharp
[HttpGet("{id}")]
[RequireModule(brand: "approved-promotions", broker: "approved-promotions", ModuleActions.View)]
public Task<PromotionDto> GetAsync(Guid id) => Mediator.Send(new GetTradeSpendPromoRequest(id));
```

The attribute checks the slug for the current workspace's audience against the **active brand**. If the endpoint names no slug for that audience, it is not available in that workspace and returns 403.

**Upserts and other payload-dependent checks** are made in the handler:

```csharp
_access.Demand("product-spec", request.Id is null ? ModuleActions.Create : ModuleActions.Edit);
```

**Cross-brand broker screens** (Promotional Management, Category Review, Retail APL, Brand Report) read the allowlist:

```csharp
IReadOnlyCollection<Guid> allowed = _access.BrandsWith("promotional-management-events", ModuleActions.View);
Guid[] brandIds = request.BrandIds?.Intersect(allowed).ToArray() ?? allowed.ToArray();
```

The policy provider and handler follow the pattern of the existing `PermissionPolicyProvider` and `PermissionAuthorizationHandler`, with a `module:` policy prefix. `IAccessContext` is a scoped service that resolves lazily, so it does not depend on middleware order.

### 6.4 Caching and invalidation

- The resolved context is cached through `ICacheService` under `access:{userId}:{organizationId}:v{version}`.
- Each organization has a version counter, `access-version:{organizationId}`. Any change that affects access in that organization bumps it:

| Change | Versions bumped |
|---|---|
| membership, role, Brand Access or grant | that organization |
| module entitlement | that organization |
| connection created, suspended or ended | both organizations |
| Brand suspended | the Brand and every Brokerage connected to it |

- This extends the existing `InvalidateUserPermissionCacheHandler` pattern. Keep a short TTL (5 minutes) as a safety net.

### 6.5 What the frontend reads: `GET /api/v1/me/access`

This replaces `GET /brands/me`. It returns every membership with its permissions, brands and modules, so the frontend can build the organization switcher, the brand switcher and the menu.

```json
{
  "isPlatformAdmin": false,
  "organizations": [
    {
      "organizationId": "…abc", "name": "ABC Brokerage", "type": "Brokerage",
      "role": "broker", "permissions": ["organization.view", "member.view"],
      "brands": [
        { "brandId": "…acme", "name": "Acme Foods", "accessMode": "Full",
          "modules": { "market-overview": ["view","create","edit","delete","export"], "files": ["view","create","edit","delete","export"] } },
        { "brandId": "…pl", "name": "XYZ Private Label", "accessMode": "Custom",
          "modules": { "market-overview": ["view","create","edit"], "files": ["view"] } }
      ]
    }
  ]
}
```

The frontend uses this only to decide what to show. Every endpoint enforces access again on the server.

---

## 7. Flows

### F1. The Platform Admin sets up an organization

1. `POST /organizations {name, type}` creates the organization.
   - For a Brand, this also creates the `Brand.Brands` row with the same id.
2. `POST /configurations/module-assignments/apply {organizationId, moduleIds}` enables modules. This is the existing endpoint and dependency engine, now keyed by organization.
3. `POST /invitations {organizationId, role: brand-admin | brokerage-admin, email}` invites the first admin. This step is optional: a Brand may have no members at all (see F2).

A new organization has **no modules** until the Platform Admin enables them (decision D4).

### F2. The Platform Admin connects a Brand to a Brokerage

1. `POST /brandconnections {brokerageOrganizationId, brandOrganizationId, regions?}` creates the connection with status **Active** immediately. There is no request or approval.
2. The versions of both organizations are bumped. John (Brokerage Admin) now has full access to that Brand, and ABC's Broker users do not have it yet.
3. A private-label Brand is simply a Brand with no memberships, connected to its Brokerage. No special relationship type is needed.

### F3. The Brokerage Admin adds a broker and assigns Brands

1. `POST /invitations {role: broker, email, brandIds: [Acme, PrivateLabel]}` invites the broker. The brands are optional at this point.
2. On acceptance:
   - a Membership is created with role `broker`;
   - one Brand Access row is created per listed Brand that is still actively connected, each `AccessMode = Full`.
3. Existing member: `PUT /brandaccess/{membershipId}/brands {brandIds}` **sets** the full list of assigned Brands:
   - new rows start at `Full`;
   - Brands dropped from the list lose their row.

### F4. The Brokerage Admin restricts a broker's permissions for one Brand

1. The editor shows ABC's enabled modules as a tree. Only each module's `AvailableActions` are offered.
2. `PUT /brandaccess/{brandAccessId}/modules {mode: "Custom", grants: [{moduleId, actions}]}` saves the list.
   - The server removes grants for modules ABC doesn't have, forces `View` on, and drops a sub-module whose parent isn't granted.
   - All grants are replaced in one transaction.
3. **Reset to full access:** `PUT /brandaccess/{brandAccessId}/modules {mode: "Full"}`. The grant rows are deleted.
4. The first time an admin opens a `Full` row for editing, the editor pre-ticks everything, so "restrict" really means unticking.

### F5. The Brand Admin manages Brand members

Same screens as F3 and F4, with one Brand Access per member (created automatically):
- new members start at `Full` (decision D2);
- `PUT /brandaccess/{brandAccessId}/modules` restricts a member.

### F6. Changes that remove access

| Event | Effect |
|---|---|
| Connection **Suspended** | Every ABC user loses Acme at once. Brand Access rows are kept, and **Resume** restores them unchanged. |
| Connection **Ended** | ABC users lose Acme. The Brand Access rows for Acme are soft-deleted, so history remains. Reconnecting later starts with no assignments. |
| Module disabled for an organization | Nobody in that organization can use it, admins included. Custom grants for it stay dormant and come back if it is re-enabled. `Full` users get it back automatically. |
| Membership suspended or removed | All of that person's access in that organization stops. |
| Organization suspended | All its members stop. For a Brand, every connected Brokerage also loses access to it. |
| Role changed from admin to member | In a Brokerage, the admin must choose which Brands to keep in the same request (F3), because the derived full access disappears. In a Brand, the Brand Access is created at `Full`. |

### F7. A user signs in and works

1. Log in. The token is unchanged.
2. `GET /me/access` returns the organizations, brands and modules.
3. The user picks an organization (`OrganizationID` header) and a brand (`BrandID` header).
4. Every call is resolved and enforced by the resolver (6.2).

---

## 8. Invariants and edge cases

The server enforces all of these, not only the UI.

1. **Connections are created and changed only by the Platform Admin.** No organization role can create, suspend or end one.
2. There is at most **one non-ended connection per (Brokerage, Brand)** pair. The two sides must have the right types.
3. A **Brand Access in a Brokerage** requires an active connection, both when it is written and when it is read. A **Brand Access in a Brand organization** always points at that Brand.
4. **Grants ⊆ entitlement.** This is cleaned on write for a tidy UI and intersected on read for security. The read-time intersection is the real guarantee.
5. A sub-module requires its parent. Any action implies `View`. A grant never exceeds the module's `AvailableActions`.
6. **`Full` includes modules enabled in the future. `Custom` never gains modules by itself.**
7. **Admins are always full and cannot be restricted** (decision D3). To restrict someone, give them the member role instead.
8. An organization that has members must keep **at least one active admin**. A Brand organization may have **zero** members (private label).
9. Memberships never merge. The same person reaching Acme as a Brand Member and as an ABC Broker gets two separate contexts with different catalogs.
10. **Brand-owned data** (product specs, retailers, promotions, trade spend) is keyed by `BrandID`. It is shared by the Brand's users and by every connected Brokerage user who has the module.
11. **Brokerage-owned data** (market overviews, category reviews, brand reports, promo tabs) belongs to **(Brokerage, Brand)**. Two Brokerages serving the same Brand must not see each other's records (decision D6).
    - Today `MarketOverview`, `CategoryReview`, `CategoryReviewCalender` and `BrandReport` carry only `BrandID` and `CreatedBy`, with no brokerage column.
    - `CategoryReview.BrandID` is nullable: a category review can be saved with no Brand, and those rows are scoped to the broker company through `CreatedBy`. They need the brokerage column too, and a module check that doesn't depend on an active Brand.
    - They need a `BrokerageOrganizationID` column, backfilled from the creator's membership.
    - `PromoTabs.BrokerID` already means "the broker company".
12. **Every change is audited:** connections, entitlements, memberships, roles, Brand Access, grants and support access. The existing `ModuleAssignmentHistories` and `Auditing` trail patterns cover this.
13. **Every endpoint declares its authorization.** Add a unit test that reflects over the controllers and fails if an action has none of `[RequireModule]`, `[RequireOrgPermission]`, `[MustHavePermission]` or `[AllowAnonymous]`.
    - Today many endpoints have no attribute at all. Because of the global `MapControllers().RequireAuthorization()`, that means any signed-in user can call them.
    - Controllers where no action has an attribute: TradeSpends (48), TradeSpendsSandbox (26), KeHE (22), UNFI (22), SPINS (19), PipeLines (18), DistributorSalesReports (18), Directory (16), Files (14), Reports (11), IntelligenceChat (6), Profile (6), DistributionCenter (5), DataHub Export (4) and Dashboard (2).
    - Several others are only partly covered: Brokers (40 of 53 actions have no attribute), DataHub (27 of 68), Banners (21 of 25), Distributors (21 of 24) and Brands (7 of 19).

---

## 9. API surface

Routes follow the repo rule that the controller class name is the prefix.

| Controller → route | Endpoint | Guard |
|---|---|---|
| `OrganizationsController` → `/organizations` | `GET`, `POST`, `PUT {id}`, `PUT {id}/status` | Platform |
| `BrandConnectionsController` → `/brandconnections` | `GET ?brokerageId&brandId`, `POST`, `PUT {id}/status` (Active or Suspended), `DELETE {id}` (ends it) | Platform |
| `ConfigurationsController` → `/configurations` (existing) | `POST module-assignments/preview`, `/apply`, `/details` and `/backfill-all` now take `organizationId`. `backfill-all` assigns every active module to every Brand and every active `BROKER` user today; it must target organizations instead. | Platform: `preview` and `details` need `Permissions.Configuration.ModuleAssignments.View`; `apply` and `backfill-all` need `.Assign` |
| `MembersController` → `/members` | `GET`, `PUT {membershipId}/role`, `PUT {membershipId}/status`, `DELETE {membershipId}` | `member.*` |
| `InvitationsController` → `/invitations` | `GET`, `POST`, `POST {id}/resend`, `DELETE {id}`; anonymous `GET {token}` and `POST {token}/accept` | `member.invite` |
| `BrandAccessController` → `/brandaccess` | `GET ?membershipId`, `PUT {membershipId}/brands`, `PUT {brandAccessId}/modules` | `access.manage` |
| `ConnectionsController` → `/connections` | `GET`: this organization's connected Brands or Brokerages | `connection.view` |
| `MeController` → `/me` | `GET access` | authenticated |

In `/members` and `/brandaccess`, a Platform Admin passes `OrganizationID` for support.

---

## 10. Mapping from today's backend

### 10.1 What exists today and what replaces it

| Today (caboodle.backend) | Becomes |
|---|---|
| `Brand.Brands` row | `Organization(Type = Brand, ID = Brands.ID)`. The profile stays in `Brand.Brands`. |
| A `BROKER` user (the "broker company" is this user's id) | `Organization(Type = Brokerage, ID = that user's id)` plus a Membership for the user as `brokerage-admin` |
| A `BROKERSUBUSER` user (+ `ParentBrokerID` / `UsersHierarchy`) | a Membership as `broker` in the parent broker's Brokerage |
| `BrandBrokers` rows of a primary broker (`ParentBrokerID` null) | `BrandConnections`, status Active |
| `BrandBrokers` rows of a sub-broker | `BrandAccess` with mode `Full`, which keeps today's behaviour |
| `Brands.UserID` (brand owner) | a Membership as `brand-admin`, one per owned brand |
| `BrandSubUsers` | a Membership as `brand-member` plus a `BrandAccess` with mode `Full` (today sub-users have owner-level data access) |
| `ModuleAssignments.BrandId` / `.BrokerId` | `ModuleAssignments.OrganizationID`, same value |
| `PromoTabs.BrokerID` | the Brokerage organization id, same value (rename the column later) |
| `InvitedUsers (UserType, BrandIDs, ParentUserID)` | `Organization.Invitations (OrganizationID, RoleID, BrandOrganizationIDs)` |
| Global roles `BRANDOWNER`, `BRANDSUBUSER`, `BROKER`, `BROKERSUBUSER`, `UNASSIGNED` | retired after cut-over. `ADMIN` stays as the Platform Admin. |
| `Permissions.Broker.*` role claims | module grants checked with `[RequireModule]` |
| `BrandValidationMiddleware` and the per-module access helpers | the resolver (6.2) |
| `GET /brands/me` (+ `CanAccessTradespend` rule) | `GET /me/access`. Trade spend access becomes a normal module entitlement (decision D9). |
| `PATCH /brands/assign-brand-to-broker`, `POST /brands/assign-brands-to-sub-brokers`, `PUT /brands/assign-user-to-brand`, and `DELETE /brands/remove-brand-from-broker`, `remove-brands-from-broker`, `remove-owner-from-brand` | `POST /brandconnections` (Platform) and `PUT /brandaccess/{membershipId}/brands` (Brokerage Admin) |
| `POST /users/{id}/assign-role` with `BrandIDs` | membership and role endpoints (`/members`) |

### 10.2 Migration, in one EF migration plus a backfill job

**The key trick is reusing ids:**
- Brand organizations keep `Brands.ID`.
- Brokerage organizations take the primary broker's user id.

Every existing `BrandID`, `ModuleAssignments.BrokerId` and `PromoTabs.BrokerID` value is then already correct, and no business table has to be rewritten.

1. **Pre-checks.** Run these as report-only queries first and fix or accept each one:
   - sub-broker `BrandBrokers` rows for a Brand that the parent broker is not linked to (they would break invariant 3);
   - duplicate `BrandBrokers` rows (there is no unique constraint today);
   - rows where `Deleted` and `DeletedOn` disagree. Only Identity's `BaseDbContext` soft-deletes through EF, by setting `DeletedOn`. Business tables live in `MainDbContext`, which has no soft-delete hook: `DeleteAsync` hard-deletes, and hand-written SQL often sets `Deleted = TRUE` and leaves `DeletedOn` null. Treat `Deleted` as the authoritative flag, which is also what existing reads and filtered unique indexes use;
   - `UsersHierarchy.ParentUserID` disagreeing with `BrandBrokers.ParentBrokerID` (use `ParentBrokerID`, list the mismatches);
   - brand sub-users whose `UsersHierarchy` parent is a brand id (written by `AssignBrandToUserRequest`).
2. Create the `Organization` schema and seed the four roles and their permissions.
3. Insert Brand organizations from `Brand.Brands` (not deleted).
4. Insert Brokerage organizations from users in role `BROKER`.
   - There is no company name today, so use the broker's name or email domain as a placeholder.
   - The Platform Admin renames them afterwards.
5. Insert memberships:
   - owners → `brand-admin`;
   - `BrandSubUsers` → `brand-member`;
   - brokers → `brokerage-admin`;
   - sub-brokers → `broker`.
6. Insert connections from the primary brokers' `BrandBrokers` rows, and `BrandAccess` (`Full`) rows from the sub-brokers' rows.
7. Add `ModuleAssignments.OrganizationID = COALESCE(BrandId, BrokerId)`, then drop the old columns and the check constraint.
8. Add `BrokerageOrganizationID` to the broker-owned tables (invariant 11), backfilled from `CreatedBy` → that user's Brokerage membership.

### 10.3 Rollout

1. **Shadow.**
   - Ship the tables, the backfill and the resolver.
   - The old middleware still decides access.
   - The resolver runs alongside it and logs every request where the two disagree.
   - Fix the data until the log is quiet.
2. **Management.** Ship the Platform and organization endpoints and `GET /me/access`. The frontend switches to them. The old assignment endpoints become read-only.
3. **Enforcement.**
   - Put `[RequireModule]` or `[RequireOrgPermission]` on every endpoint, with the test from section 8, item 13 guarding coverage.
   - Switch from the old middleware to the resolver.
   - Remove the old access helpers.
4. **Retire.** Drop `Brands.UserID`, `BrandSubUsers`, `BrandBrokers`, `UsersHierarchy`, `InvitedUsers` and the retired global roles.

---

## 11. Demo changes that follow from this

- **Remove:**
  - plans, subscriptions, billing, invoices and payment pages;
  - the onboarding plan and payment steps;
  - module prices;
  - `billing.*`, `module.full_access` and `relationship.request`/`approve`/`reject`;
  - "Find organizations" and "Relationship requests".
- **Platform Admin:**
  - "Connect a Brand" on the Brokerage detail page;
  - suspend and end on connections;
  - "Enabled modules" on each organization, which replaces plans.
- **Brokerage Admin:**
  - a "Brands" page listing connected Brands and who is assigned to each;
  - brand checkboxes on the member dialog and on invitations;
  - a per-brand permission editor with Full / Custom and a reset button.
- **Everyone:**
  - a brand switcher next to the organization switcher;
  - the menu driven by the active brand's module map.

---

## 12. Decisions to confirm with the Platform Admin

Each one has a recommendation, and the design works as written if all are accepted.

| # | Question | Recommendation |
|---|---|---|
| D1 | When a broker is assigned to Acme, whose module list applies? | **The Brokerage's** (Broker catalog), applied to Acme's data. That is the existing split in the catalog. The alternative is a one-line change in the resolver. |
| D2 | Do new **Brand** members also start at Full? | **Yes**, the same rule as brokers. Today brand sub-users already have owner-level data access. |
| D3 | Can an admin's brand access be restricted? | **No.** Admins are always full. Use the member role to restrict someone. |
| D4 | What modules does a newly created organization start with? | **None** until the Platform Admin enables them, since she handles money separately. |
| D5 | May a Brand Admin see which Brokerages, and which broker users, work on their Brand? | **Brokerages: yes. Broker users: yes, read-only.** |
| D6 | Are Brokerage-owned records private to the Brokerage that created them? | **Yes.** Needs the new column from invariant 11. |
| D7 | Is self-service organization sign-up (domain discovery, access requests) kept? | **Yes for joining an existing organization.** Creating a new organization should be Platform Admin only, to match how she now controls connections and modules. |
| D8 | Do connection regions restrict data? | **No, metadata only for now.** |
| D9 | Today a brand owner loses trade spend when their brand has a broker (`CanAccessTradespend`). Keep that? | **Drop the hardcoded rule.** Whether a Brand has trade spend becomes a normal module choice made by the Platform Admin. |

---

## Appendix: backend issues found during the review

These are outside this design. Each was confirmed in the code, and they are worth fixing before or alongside it:

- `TokenService` accepts `SecuritySettings:MasterPassword` in place of any user's password, including on the admin login (`TokenService.cs` lines 59 and 85).
- The seeded admin's password is `"123456"` (`ApplicationDbSeeder.cs` line 113).
- JWT validation turns off the issuer and audience checks (`Auth/Jwt/Startup.cs` lines 35–37).
- `BrandValidationMiddleware` writes a 400 JSON body for an invalid `BrandID` but never sets the status code, so the client receives a 200.
- `POST /users/invite` has no permission attribute.
