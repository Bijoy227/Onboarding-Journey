# Onboarding-Journey

A frontend-only prototype of the proposed Caboodle identity model: **Organization → Membership → Role → Permission**, plus organization-to-organization relationships and verified-domain onboarding.

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
| Platform Admin | `constance@caboodle.com` | The whole platform: organizations, users, relationships, audit log |
| Brand Admin | `alice@acmefoods.com` | Acme Foods, full administrative control |
| Brand Member | `bob@acmefoods.com` | Acme Foods, read-only |
| Brokerage Admin | `john@abc-brokerage.com` | ABC Brokerage, full administrative control |
| Broker | `mike@abc-brokerage.com` | ABC Brokerage, can request brand relationships |
| External Collaborator | `consultant@agency.com` | Member of **two** organizations, external email domain |

Turn on **Demo mode** in the profile menu to show a panel listing the current user, organization, role and every effective permission. It updates as you switch accounts, which is the quickest way to explain the authorization model.

## Walkthrough

Everything below works against mock state — no backend, no email, no DNS.

1. **Self-service onboarding.** Sign out → *Create an account* with `you@acmefoods.com`. Discovery finds Acme Foods from the email domain and offers to request access. Nobody at Caboodle had to create that organization.
2. **New organization.** From discovery, choose *Create a different organization*. Try the domain `conflicted.com` to see the domain-conflict path, then use a free one. The creator becomes Organization Admin automatically, then verifies the domain (simulated).
3. **Approve a request.** As Alice, go to *Administration → Access requests*. Sarah Johnson is waiting. Approving is what creates her membership.
4. **Invite someone.** *Members → Invite member*. Use an external address like `someone@agency.com` to see that an external domain is flagged but never blocked. Open the invitation from *Administration → Invitations* to accept it as the invitee.
5. **Connect two organizations.** As John (ABC Brokerage), *Relationships → Find organizations* → request a relationship with Northwind Traders. As Alice, *Relationships → Requests* shows West Coast Brokerage waiting for approval.
6. **One brand, many brokerages.** Acme Foods is connected to ABC Brokerage (Northeast) and XYZ Brokerage (Midwest).
7. **A brand with no owner.** As John, open *Relationships → Managed brands → XYZ Private Label*: zero members, operated entirely through the management relationship.
8. **Permissions are real.** As Bob, *Settings* disappears from the sidebar — and navigating straight to `/organization/settings` shows an unauthorized state rather than the page.
9. **One person, many organizations.** Sign in as the consultant and use the organization switcher in the sidebar header. Role and permissions change with the organization.
10. **Platform administration.** As Constance, the Platform Admin section covers organizations, users, relationships, domain verification and the audit log. *Audit log → Reset demo data* restores the original seed.

## How the code is organized

```
src/
  app/
    (auth)/          sign in, sign up, onboarding, invitation links
    (app)/           the authenticated dashboard shell
  components/
    ui/              shadcn/ui primitives
    common/          badges, avatars, empty/unauthorized states, guards
    features/        invite dialog, domain verification, activity feed
    layout/          sidebar, organization switcher, profile menu, permission panel
  lib/
    mock/            seed data and the in-memory store (persisted to localStorage)
    permissions/     the permission catalogue, roles, and hasPermission()
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

## Scope

Deliberately **not** implemented: real authentication, database, email, DNS verification, billing, or any Caboodle business module (CRM, trade spend, product specs, retailers). The prototype is only about the identity foundation.

State lives in `localStorage`, so changes survive a refresh and are per-browser. Reset it from *Platform admin → Audit log → Reset demo data*, or by clearing site data.
