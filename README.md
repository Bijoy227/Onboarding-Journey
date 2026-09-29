# Onboarding-Journey

A frontend-only prototype of the proposed Caboodle identity model: **Organization → Membership → Role → Permission**, plus organization-to-organization relationships, verified-domain onboarding, and subscriptions: **Organization → Plan → Modules**, with each member granted specific modules and actions.

It exists to make the model understandable to a non-technical audience, while keeping the code structured so a real backend can replace the mock services later.

The functional source of truth is [docs/caboodle-organization-identity-demo.md](docs/caboodle-organization-identity-demo.md).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm start        # serve the production build (run npm run build first)
npm run lint     # ESLint
```

## Demo accounts

No passwords are checked. Pick an account from the login screen, or type its email and submit.

| Account | Email | Sees |
|---|---|---|
| Platform Admin | `constance@caboodle.com` | The whole platform: organizations, users, relationships, module catalog, plans, subscriptions, audit log |
| Brand Admin | `alice@acmefoods.com` | Acme Foods (Professional plan), full administrative control and every module |
| Brand Member | `bob@acmefoods.com` | Acme Foods, read-only identity access; 9 granted modules, no delete anywhere |
| Brokerage Admin | `john@abc-brokerage.com` | ABC Brokerage (Professional plan), full administrative control |
| Broker | `mike@abc-brokerage.com` | ABC Brokerage, can request brand relationships; 5 granted modules |
| External Collaborator | `consultant@agency.com` | Member of **two** organizations, external email domain; only a few reports |

Turn on **Demo mode** in the profile menu to show a panel listing the current user, organization, role, plan, every effective permission and the actions held in each module. It updates as you switch accounts, which is the quickest way to explain the authorization model.

## Walkthrough

Everything below works against mock state — no backend, no email, no DNS.

1. **Self-service onboarding.** Sign out → *Create an account* with `you@acmefoods.com`. A code screen stands in for the verification email: any 6-digit code works, and a "demo inbox" shows a code you can use. Discovery then finds Acme Foods from the email domain and offers to request access. Nobody at Caboodle had to create that organization.
2. **New organization.** Sign up with a free domain (for example `you@freshfields.com`), verify the email, and create the organization. Try the domain `conflicted.com` to see the domain-conflict path. The creator becomes Organization Admin automatically, then verifies the domain (simulated).
3. **Plan and payment.** The journey continues to *Choose a plan*: Standard, Professional, or Custom, where you tick individual modules and sub-modules and pay their list price. Brands and Brokerages see different plans because their module catalogs differ. Monthly or annual (two months free). Payment is a dummy checkout: *Fill test card* uses `4242 4242 4242 4242`; a number ending in `0002` is declined. Paying activates the plan and issues an invoice.
4. **Modules and module access.** After onboarding the admin can open every module in the plan. *Organization → Module access* decides, per member, which modules they can use and which actions they have in each (view, create, edit, delete, export). As Bob, *Contacts* lets him create and edit but shows delete and export locked; *Distributors* says he has no access; *Ask Caboodle* says it isn't in the plan. Grant him something as Alice and it appears in his sidebar.
5. **Billing.** *Organization → Billing* shows the plan, its modules, the card on file and invoices, and *Change plan* re-runs the plan and payment steps.
6. **Approve a request.** As Alice, go to *Administration → Access requests*. Sarah Johnson is waiting. Approving is what creates her membership.
7. **Invite someone.** *Members → Invite member*. Use an external address like `someone@agency.com` to see that an external domain is flagged but never blocked. Open the invitation from *Administration → Invitations* to accept it as the invitee.
8. **Connect two organizations.** As John (ABC Brokerage), *Relationships → Find organizations* → request a relationship with Northwind Traders. As Alice, *Relationships → Requests* shows West Coast Brokerage waiting for approval.
9. **One brand, many brokerages.** Acme Foods is connected to ABC Brokerage (Northeast) and XYZ Brokerage (Midwest).
10. **A brand with no owner.** As John, open *Relationships → Managed brands → XYZ Private Label*: zero members, operated entirely through the management relationship.
11. **Permissions are real.** As Bob, *Settings* disappears from the sidebar — and navigating straight to `/organization/settings` shows an unauthorized state rather than the page.
12. **One person, many organizations.** Sign in as the consultant and use the organization switcher in the sidebar header. Role, permissions and modules change with the organization.
13. **Platform administration.** As Constance, the Platform Admin section covers organizations, users, relationships, domain verification and the audit log. *Audit log → Reset demo data* restores the original seed.
14. **Catalog, plans and subscriptions.** *Platform admin → Modules* is the Brand and Brokerage module catalog, seeded from what caboodle.web gates today, shown as a tree of modules and the sub-modules under them (fold modules away, or search and keep matches under their parent). Add, edit or delete modules and sub-modules, give each one an image that replaces its default icon everywhere, and click any price to change it. *Plans* lists Standard, Professional and custom plans per organization type; create custom plans priced by module or as a bundle, optionally private to one organization. *Subscriptions* puts any organization on any plan for its type without payment. Duplicate Test Organization starts with no plan, and XYZ Private Label is on a custom plan Caboodle built for it.

## How the code is organized

```
src/
  app/
    (auth)/          sign in, sign up, onboarding, invitation links
    (app)/           the authenticated dashboard shell
  components/
    ui/              shadcn/ui primitives
    common/          badges, avatars, empty/unauthorized states, guards
    features/        invite dialog, domain verification, activity feed, plan and
                     module pickers, onboarding steps
    layout/          sidebar, organization switcher, profile menu, permission panel
  lib/
    mock/            seed data, the module catalog, and the in-memory store
                     (persisted to localStorage)
    permissions/     the permission catalogue, roles, hasPermission(), and
                     module entitlement and access (modules.ts)
    services/        the mock service layer
  types/             the domain model
```

### Replacing the mock backend

`src/lib/services/*` is the seam. Each function is already async and shaped like an API call:

```ts
await inviteMember({ email, organizationId, roleId, invitedByUserId });
await approveAccessRequest(requestId, actorUserId);
await createOrganizationRelationship({ ... });
```

They read and write through `src/lib/mock/store.ts`, the only module that knows state lives in memory and localStorage. Swapping these bodies for `fetch` calls should not require reshaping the UI.

Authorization is resolved in one place, `hasPermission()` in `src/lib/permissions/permissions.ts`, always as *user → membership for this organization → role → permissions*. No screen decides access from a user-level role flag, which is the property the real backend should preserve.

Module access adds two layers, both in `src/lib/permissions/modules.ts`:

- **Entitlement:** *organization → active subscription → plan → modules*. No active plan means no modules. A sub-module only counts when its parent module is in the plan.
- **Access:** *user → membership → role*. A role with `module.full_access` (Organization Admin) gets every entitled module with every action; everyone else gets only the module grants stored on their membership, cleaned against the plan, so a member can never hold a module the organization hasn't subscribed to.

The catalog is two levels deep (module → sub-module). Screens, tabs and reports below that, which caboodle.web doesn't gate on their own, are listed as a module's `features`. Catalog slugs the UI never checks are left out, and the same slug can exist on both sides as two different modules, so modules are always looked up by audience plus slug.

## Scope

Deliberately **not** implemented: real authentication, database, email (the verification code is simulated), DNS verification, or real payments (checkout validates the card's shape and charges nothing). Business modules (CRM, trade spend, product specs, retailers, ...) are single placeholder pages: they exist to show the plan and the member's actions being enforced, not the modules themselves.

State lives in `localStorage`, so changes survive a refresh and are per-browser. Reset it from *Platform admin → Audit log → Reset demo data*, or by clearing site data.
