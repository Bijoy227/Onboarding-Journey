# Workbook template — Existing Modules Resolution

Every workbook in `docs/modules-resolution/` follows this structure exactly. Shared vocabulary and rules are defined here once; workbooks reference them instead of restating them.

Status line for every workbook: `Status: proposed · <date> · BE develop @ <commit>`.

## Shared vocabulary

**Target guards** (one per endpoint, no exceptions — this feeds the IAM plan's Phase 4 reflection test):

| Guard | Use for |
|---|---|
| `[RequireModule(brand: "slug", broker: "slug", ModuleActions.X)]` | Brand-data and brokerage-work endpoints. One attribute naming the slug per audience; omit an audience that may never call it. Checked against the active brand. |
| `[RequireOrgPermission(OrgPermissions.X)]` | Organization management (members, invitations, brand access, org profile). |
| `[MustHavePermission(...)]` | Platform Admin endpoints only (existing mechanism). |
| `[Authorize]` | Explicit "any authenticated user" — rare, must be justified in Notes. |
| `[AllowAnonymous]` | Public endpoints — must be justified in Notes. |
| Handler `_access.Demand("slug", action)` | Payload-dependent checks (Upsert: `request.Id is null ? Create : Edit`); the endpoint still carries `[RequireModule(... , View)]` as the floor. |

**Guard conventions:**

- **Brand-independent module check** — for brokerage-owned rows that have no brand (e.g. PromoTabs, null-brand CategoryReviews): `[RequireModule]` validates the module against the current workspace without requiring an active `BrandID` (architecture doc invariant 11). Mark such rows "brand-independent" in Notes.
- **Superseded by IAM** — endpoints the IAM plan replaces get Target guard = "keep current guard until retired" and Notes = `Superseded by IAM plan → <replacement endpoint>` (architecture doc §10.1 / §9). Never invent module guards for them.
- **Proposed slugs** — a target guard naming a module that doesn't exist in the catalog yet is marked `*(Qn)`, referencing the workbook's §9 question that proposes it.
- **Claim-set legend** — where Today's guard is `[MustHavePermission]`, the attribute alone doesn't say who can call it; the seeded claim sets do (ADMIN = all; BROKER/BROKERSUBUSER = subsets; brand roles = none seeded). State the effective audience in the Today's-guard cell (e.g. "ADMIN-only in practice") with a `CaboodlePermissions.cs` reference.

**Action mapping** (architecture doc §4.3): View/Search → `View`; Create/Import → `Create`; Update/Assign → `Edit`; Delete → `Delete`; Export → `Export`; Upsert → handler Demand; Execute/Generate/Clean → platform-only or unused.

**Data ownership taxonomy:**

| Class | Meaning | Scoping key |
|---|---|---|
| Brand-owned | The brand's business data, shared with connected brokerages that hold the module | `BrandID` (unchanged) |
| Brokerage-owned | A brokerage's work about a brand; private between brokerages (D6) | `BrandID` + `BrokerageOrganizationID` (new) |
| Platform | Catalog/config/ops data | n/a (platform permissions) |
| User-scoped | Belongs to the individual (profile, personal files) | `UserID` |
| Identity/IAM | Covered by the IAM implementation plan, not by workbooks | cross-reference only |

**Cross-brand endpoints** (screens spanning brands) use the resolver allowlist: `_access.BrandsWith("slug", action)` intersected with any requested brand ids — never raw role checks.

**Parity rule:** document what today's guard/helper actually allows and denies, with `file:line`. Where today's behavior is a bug (fail-open, wrong status, dead check), mark it **do-not-reproduce** with one line of justification — the comparator tests need to know intentional differences.

**Decision sensitivity:** tag any row whose target guard flips with a pending decision: `D1` (broker catalog), `D9` (trade spend entitlement), `N11` (5-action flags), or a workbook-local `Q#`.

## Required sections

```
# <NN>. <Area name> — resolution workbook
Status: proposed · <date> · BE develop @ <commit>
Scope: <controllers + action counts> · BE project(s): Modules.<X>

## 1. What this area is
2–5 sentences: what it does, who uses it (brand / broker / platform), where data lives (schemas.tables).

## 2. Data ownership
Table: Table → Ownership class → Scoping change needed → Notes (incl. nullable keys, CreatedBy-derived ownership).

## 3. Module catalog mapping
Slugs covering this area per audience (from _inventory.md), parent/child + dependencies.
Gaps: endpoints with no plausible slug → proposal (new catalog entry / org permission / [Authorize] / platform).

## 4. Endpoint authorization matrix  ← the core; EVERY action appears
One table per controller: Verb + route | Request/handler | Today's guard | Target guard | Notes/decision tags.
A route that dispatches several request types takes one row per request type.

## 5. Parity notes
Current access behavior per helper/middleware/role-check with file:line; resolver must-match list; do-not-reproduce list.

## 6. Code changes beyond attributes
Queries to re-scope, helpers/files to delete, Demand() call sites, BrandID-header edge cases (missing/stale header callers), transactions.

## 7. FE impact (Phase 5)
Web route→slug gating today, menus, admin screens touching this area; what changes when /me/access lands.

## 8. Test checklist
Parity/comparator cases, matrix tests, reflection-test expectations for this area's actions.

## 9. Open questions
Numbered Q1, Q2… — anything needing product/Platform-Admin input, with a recommendation each.
```

Style: matrices exhaustive, prose tight. Exact routes and handler names from `_inventory.md`. No invented endpoints; no skipped ones.
