# Onboarding-Journey

A frontend-only prototype of the proposed Caboodle access model, **architecture v2**:

**Platform Admin → Organizations → Brands → Users → Module access → Permissions**

- People join organizations (Brands and Brokerages) through a **membership** with one **role**. The role says what they may administer, never what data they see. There are four system roles, and the Platform Admin can create **custom roles** for Brand-type or Brokerage-type organizations.
- People **create their own organization** from their work email domain, and verify that domain, or find and join one that already exists.
- The **Platform Admin** **enables modules** per organization and **connects Brands to Brokerages**. There is no request/approve flow between organizations, and no plans, payment, subscriptions or billing.
- Every piece of business data belongs to a **Brand**. On a Brand, a Brokerage's people get the Brokerage's own modules (Market Overview, Category Review, Promotional Management, ...) **plus every module that Brand has enabled**: Brand modules flow through.
- Each membership without full brand access has one **Brand Access** per Brand it works on, either **Full** (follows what is available on that Brand) or **Custom** (an explicit list of modules and actions).
- Admins get full access to their own Brand or to every connected Brand, worked out from the role at request time, never stored.
- **Effective access = what is available on the Brand ∩ what the person was given**, resolved in one place.

It exists to make the model understandable to a non-technical audience, while keeping the code structured so a real backend can replace the mock services later.

The design is [docs/caboodle-access-architecture.md](docs/caboodle-access-architecture.md). The demo follows its recommendations for decisions D1 to D9, with two exceptions: self-service organization creation is kept (D7), and a Brand's modules flow through to the brokerages working on it (the D1 alternative). [docs/caboodle-organization-identity-demo.md](docs/caboodle-organization-identity-demo.md) is the original product brief; v2 replaces its relationship, plan and billing parts.

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
| Platform Admin | `constance@caboodle.com` | The whole platform: organizations, connections, enabled modules, the module catalog, users, audit log. Can open any organization with audited support access. |
| Brand Admin | `alice@acmefoods.com` | Acme Foods. Every Brand permission and every module Acme has enabled. |
| Brand Member | `bob@acmefoods.com` | Acme Foods with **Custom** access: 9 modules, no delete anywhere. |
| Brokerage Admin | `john@abc-brokerage.com` | ABC Brokerage. Full access to every connected Brand (Acme Foods, XYZ Private Label). |
| Broker | `mike@abc-brokerage.com` | ABC Brokerage. Acme Foods at **Full**, XYZ Private Label at **Custom**: the worked example in section 5 of the design. |
| Consultant | `consultant@agency.com` | External domain, two memberships that never merge: Brand Member at Acme, Broker at ABC. |

Turn on **Demo mode** in the profile menu to show a panel with the current user, organization, role, active Brand, every organization permission and the actions held in each module on that Brand.

## Walkthrough

Everything below works against mock state: no backend, no email, no DNS.

1. **The access chain.** As Mike, the sidebar has a **Brand switcher** under the organization switcher. On Acme Foods he is Full: every module ABC has enabled, plus Acme's own modules, listed under "Acme Foods" in the sidebar. Switch to XYZ Private Label: only Market Overview (view, create, update) and Files (view). Open Promotional Management: locked on this Brand. *How access works* walks through the same example.
2. **Connect a Brand.** As Constance, *Platform admin → Organizations → ABC Brokerage → Connect a Brand* → Northwind Traders. Sign in as John: Northwind is there at once, at full access. Sign in as Mike: it isn't, because he hasn't been assigned to it.
3. **Assign and restrict.** As John, *Organization → Brand access*. *Assign brands* gives a broker connected Brands, each starting at Full. Click an assignment to open the editor: switch to Custom (everything starts ticked, so restricting means unticking), or reset to full access. Only the actions a module supports are offered.
4. **Enabled modules are the ceiling.** As Constance, *Edit modules* on ABC Brokerage and enable Distributor APL. Mike gets it on Acme (Full) but not on XYZ Private Label (Custom never grows on its own), and Sarah Lee's dormant Distributor APL grant comes back.
5. **Brand modules flow through.** As Constance, *Edit modules* on XYZ Private Label and enable Contacts. As John, switch to XYZ Private Label: Contacts appears under the Brand's name in the sidebar. Mike, who is Custom there, doesn't get it until John grants it.
6. **Suspend vs end.** *Platform admin → Connections*: suspending ABC ↔ Acme removes Acme from everyone at ABC at once and keeps the assignments; resuming restores them. Ending removes the assignments; reconnecting starts with none.
7. **Roles.** As John, on *Members*, demote a Brokerage Admin to Broker: you choose which Brands they keep. The last active admin can't be demoted, suspended or removed.
8. **Brand side.** As Alice, *Brand access* shows Bob's Custom access; *Brokerages* lists ABC and XYZ and who from each works on Acme (read-only).
9. **Support access.** As Constance, *Open as support* on any organization. The header shows *Support access · audited*, and everything done there is flagged in the audit log.
10. **Self-service onboarding.** Sign out → *Create an account* with `you@acmefoods.com`. Any 6-digit code verifies the email. Discovery finds Acme Foods from the domain; request access, then approve it as Alice. The new member starts at Full.
11. **A new organization.** Sign up with a free domain (for example `you@freshfields.com`), verify the email, and create the organization. Try the domain `conflicted.com` to see the domain-conflict path. The creator becomes its Brand Admin or Brokerage Admin automatically, then verifies the domain (simulated). The journey is Account → Verify email → Organization → Domain: there is no plan or payment step. The new organization has no modules until the Platform Admin enables some.
12. **Invitations.** As John, *Members → Invite member* as a Broker with Brands ticked. Open it from *Administration → Invitations* to accept it: the Brands are assigned at Full if they are still connected. `lisa@abc-brokerage.com` is already waiting.
13. **Platform administration.** The Platform Admin can also *Create organization* for a customer; it starts with no members and no modules (Duplicate Test Organization shows this). *Modules* is the catalog, with the actions each module supports. *Audit log → Reset demo data* restores the seed.
14. **Custom roles.** As Constance, *Platform admin → Roles → New role*: pick Brand or Brokerage, tick its permissions, and choose whether it has full brand access. Every organization of that type can then give it to members. The four system roles can't be changed; a custom role can be edited at any time and deleted once nobody holds it.

## How the code is organized

```
src/
  app/
    (auth)/          sign in, sign up, email verification, discovery, invitation links
    (app)/           the authenticated dashboard shell
  components/
    ui/              shadcn/ui primitives
    common/          badges, avatars, empty/unauthorized states, guards
    features/        dialogs (invite, assign brands, connect, enabled modules,
                     create organization), module picker, activity feed
    layout/          sidebar, organization and brand switchers, profile menu,
                     permission panel
  lib/
    mock/            seed data, the module catalog, and the in-memory store
                     (persisted to localStorage)
    permissions/     permissions.ts: the permission catalogue and the four system roles
                     modules.ts:     the catalog and module entitlement
                     access.ts:      the request-time resolver
    services/        the mock service layer
  types/             the domain model
```

### Replacing the mock backend

`src/lib/services/*` is the seam. Each function is already async and shaped like an API call from section 9 of the design:

| Service | Endpoint it stands in for |
|---|---|
| `organization-service` | `/organizations` |
| `connection-service` | `/brandconnections` |
| `entitlement-service` | `/configurations/module-assignments/apply` |
| `brand-access-service` | `/brandaccess` |
| `membership-service`, `invitation-service`, `access-request-service` | `/members`, `/invitations` |
| `role-service` | custom roles (Platform Admin) |

They read and write through `src/lib/mock/store.ts`, the only module that knows state lives in memory and localStorage.

Access is resolved in one place, `resolveAccess()` in `src/lib/permissions/access.ts`, mirroring section 6.2:

- **Membership:** user → active membership in an active organization → role → organization permissions.
- **Enabled modules:** the organization's module assignments, with a sub-module counting only when its parent is enabled.
- **Brands:** the organization itself for a Brand, or the actively connected Brands (connection active, Brand active) for a Brokerage.
- **Available on a Brand:** the organization's own enabled modules, plus, for a Brokerage, the modules that Brand has enabled.
- **Per Brand:**
  - a role with full brand access gets every available module with every action it supports;
  - everyone else needs a Brand Access row, which is Full (the same) or Custom (grants ∩ available).
- **Platform Admin:** gets support access to any organization.

`GET /me/access` would return the same shape. No screen decides access from a user-level flag or a role name.

## Scope

Deliberately **not** implemented:
- real authentication, a database or email (the verification code is simulated);
- DNS verification;
- server-side enforcement, which is the backend's job (`[RequireModule]` / `[RequireOrgPermission]` in the design).

Business modules (CRM, trade spend, product specs, ...) are single placeholder pages. They exist to show the person's actions on the active Brand being enforced, not the modules themselves.

State lives in `localStorage`, so changes survive a refresh and are per-browser. Reset it from *Platform admin → Audit log → Reset demo data*, or by clearing site data.
