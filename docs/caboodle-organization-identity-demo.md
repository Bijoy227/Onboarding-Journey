# Caboodle — Organization, Identity, Roles & Permissions Demo

## Purpose

This document is the complete product/UX specification for a **frontend-only Next.js prototype** demonstrating the proposed future identity and organization model for Caboodle.

The prototype is intended for a client demo with Constance.

It is **not** a production implementation and does not need a backend, database, real authentication provider, real email delivery, or DNS verification.

Everything should be **mimicked in the frontend** using local/static mock data and browser state where useful.

The goal is to demonstrate how Caboodle could work in a modern SaaS-style architecture where:

- Users are independent identities.
- Brands and Brokerage firms are Organizations.
- Users become members of Organizations.
- Roles belong to memberships, not directly to users.
- Permissions are assigned to roles.
- A Brand can work with multiple Brokerage organizations.
- A Brokerage can work with multiple Brands.
- A Brokerage can manage a private Brand without requiring a Brand Owner user.
- Organizations can have verified domains.
- Users can discover an organization from their work email domain.
- Users can request access to an existing organization.
- Organization administrators can approve/reject membership requests.
- Organization administrators can invite users.
- Platform/Super Admin functionality exists for exceptional/platform-level administration.
- The old model of Constance manually creating every Brand/Broker and assigning users should no longer be the normal onboarding path.

---

# 1. Core Product Philosophy

The most important architectural change is:

> **Organization first → Membership second → Role third → Permissions fourth.**

Do NOT model the system as:

```text
Role
  ↓
Brand/Broker
  ↓
User
```

Instead:

```text
User
  ↓
Membership
  ↓
Organization
  ↓
Role
  ↓
Permissions
```

Organizations can be:

```text
Brand
Brokerage
```

A user's access to an organization comes through a membership.

Example:

```text
Acme Foods
    |
    +-- Alice → Organization Admin
    +-- Bob   → Brand Member
    +-- Sarah → Brand Member
```

And:

```text
ABC Brokerage
    |
    +-- John  → Organization Admin
    +-- Mike  → Broker
    +-- Lisa  → Broker
```

The company is NOT represented by a user.

---

# 2. What This Prototype Must Demonstrate

The demo should allow Constance to experience the system from multiple perspectives.

At minimum, the prototype must support switching/logging in as these mock users:

## Platform Admin

Example:

```text
constance@caboodle.com
```

Role:

```text
Platform Admin
```

Capabilities:

- View all organizations.
- View all users.
- View all membership requests.
- View all invitations.
- View organization relationships.
- Verify organizations/domains manually for demo purposes.
- Suspend/restore organizations.
- View platform-level audit activity.
- Handle exceptional support cases.
- Access an organization for support/demo purposes without becoming a normal member.

Important:

Platform Admin is NOT the normal way customers create organizations.

---

## Brand Organization Admin

Example:

```text
alice@acmefoods.com
```

Organization:

```text
Acme Foods
Type: Brand
Domain: acmefoods.com
```

Role:

```text
Organization Admin
```

Capabilities:

- Manage organization profile.
- Manage members.
- Invite members.
- Approve/reject membership requests.
- Assign organization roles.
- Manage organization domain settings.
- View connected Brokerage organizations.
- Approve/reject Brokerage relationship requests.

---

## Brand Member

Example:

```text
bob@acmefoods.com
```

Organization:

```text
Acme Foods
```

Role:

```text
Brand Member
```

Capabilities should be deliberately limited.

For the demo, allow:

- View organization.
- View members.
- View connected Brokerages.
- View own profile.

Do NOT give administrative capabilities.

---

## Brokerage Organization Admin

Example:

```text
john@abc-brokerage.com
```

Organization:

```text
ABC Brokerage
Type: Brokerage
Domain: abc-brokerage.com
```

Role:

```text
Organization Admin
```

Capabilities:

- Manage organization.
- Invite brokerage members.
- Approve/reject membership requests.
- Assign roles.
- View connected Brands.
- Request relationships with Brands.
- Manage private Brands/managed organizations where permitted.

---

## Broker

Example:

```text
mike@abc-brokerage.com
```

Organization:

```text
ABC Brokerage
```

Role:

```text
Broker
```

Capabilities:

- View organization.
- View organization members.
- View connected Brands.
- View approved relationships.
- Request/participate in permitted Brand relationships if the demo supports it.

No organization administration.

---

## Optional Collaborator / External User

Example:

```text
consultant@external.com
```

This demonstrates an important real-world scenario:

A Brand may work with people whose email domain does not match the Brand's domain.

The user can be explicitly invited despite having an external domain.

This proves that domain matching is a security/onboarding mechanism, not the complete authorization model.

---

# 3. Important Terminology

Use these terms consistently throughout the prototype.

## User

A person's Caboodle account.

Example:

```text
Alice
alice@acmefoods.com
```

A User is not a Brand and is not a Brokerage.

---

## Organization

A business entity represented inside Caboodle.

Types:

```text
Brand
Brokerage
```

Examples:

```text
Acme Foods
ABC Brokerage
```

---

## Membership

The relationship between a User and an Organization.

Example:

```text
Alice
  ↓
Membership
  ↓
Acme Foods
  ↓
Organization Admin
```

A User may have memberships in multiple organizations.

---

## Role

Defines the user's responsibility within an organization.

Example roles:

```text
Organization Admin
Brand Member
Broker
```

Do not encode the organization itself into the role.

Avoid treating:

```text
Brand Owner
Broker Sub User
```

as fundamental identity types.

Instead:

```text
Organization Admin
Brand Member
Broker
```

are memberships/roles.

---

## Permission

A fine-grained capability.

Examples:

```text
organization.view
organization.update
member.view
member.invite
member.approve
member.role.assign
relationship.view
relationship.request
relationship.approve
domain.view
domain.manage
```

Roles are collections of permissions.

---

## Organization Relationship

A business relationship between two organizations.

Example:

```text
Acme Foods
    ↕
ABC Brokerage
```

A Brand can have multiple Brokerage relationships.

A Brokerage can have multiple Brand relationships.

---

## Domain

An email domain associated with an organization.

Example:

```text
Acme Foods
    |
    +-- acmefoods.com
```

Domain verification proves control of the domain.

Domain matching can help discover organizations and automate membership workflows.

---

# 4. Target Organization Model

The prototype should visually communicate this model:

```text
                         CABOODLE
                            |
                +-----------+-----------+
                |                       |
             BRAND                  BROKERAGE
                |                       |
          Acme Foods              ABC Brokerage
                |                       |
        +-------+-------+        +------+------+
        |       |       |        |      |      |
      Alice   Bob     Sarah    John   Mike   Lisa
        |                       |
      Admin                   Admin
```

Relationships:

```text
                 Acme Foods
                /    |     \
               /     |      \
              /      |       \
             ↓       ↓        ↓
        Broker A  Broker B  Broker C
```

This must be possible in the prototype.

---

# 5. Main Navigation

The application should have a modern SaaS dashboard layout.

Suggested navigation:

```text
Dashboard

Organization
  - Overview
  - Members
  - Roles
  - Domains
  - Settings

Relationships
  - Connected Organizations
  - Requests

Administration
  - Invitations
  - Access Requests

Platform Admin       [only Platform Admin]
  - Organizations
  - Users
  - Relationships
  - Audit Log
```

Do not add Caboodle business modules such as CRM, Trade Spend, Product Specs, etc.

This prototype is only about identity, organizations, access, roles, permissions, and relationships.

---

# 6. Login / Demo User Switching

Because this is frontend-only, real authentication is not required.

Create a polished demo login screen.

Example:

```text
Welcome to Caboodle

Sign in to continue

Email
[________________________]

Password
[________________________]

[ Sign in ]
```

Below the normal login form, include:

```text
Demo accounts

Platform Admin
constance@caboodle.com

Brand Admin
alice@acmefoods.com

Brand Member
bob@acmefoods.com

Brokerage Admin
john@abc-brokerage.com

Broker
mike@abc-brokerage.com
```

Clicking a demo account can populate the login fields or directly enter the demo environment.

This is only for demonstration.

The application should preserve the selected mock session in browser storage so page navigation and refresh do not immediately lose the session.

Include a profile/avatar menu with:

```text
Current user
Organization
Role

Switch demo user
Log out
```

The demo should make it extremely easy for Constance to switch between perspectives.

---

# 7. Organization Creation Journey

This is one of the most important flows.

The normal customer should be able to create their own organization.

There should be no requirement for Constance to create the organization first.

## Step 1 — Create Account

```text
Create your Caboodle account

Work email
[ alice@acmefoods.com ]

Password
[ ******** ]

[ Continue ]
```

---

## Step 2 — Organization Discovery

Caboodle extracts:

```text
acmefoods.com
```

from the email address.

Show:

```text
We found an organization associated with your email domain.

Acme Foods

[ Request access ]

[ Create a different organization ]
```

If no organization exists:

```text
We couldn't find your organization.

[ Create an organization ]
```

---

# 8. Create Organization

Form:

```text
Create your organization

Organization name
[ Acme Foods ]

Organization type

( ) Brand
( ) Brokerage

Work email
alice@acmefoods.com

Domain
acmefoods.com

[ Continue ]
```

Do not ask for a "Brand Owner" or "Broker User" at this stage.

The creator becomes:

```text
Organization Admin
```

automatically.

---

# 9. Domain Verification Demo

After creating an organization, show:

```text
Verify your organization

To verify that Acme Foods controls acmefoods.com,
add this DNS TXT record:

Host:
@

Value:
caboodle-verification=acme-123456

[ I've added the record — Verify ]

[ Skip for now ]
```

Since this is frontend-only, clicking Verify should simulate successful verification.

Show:

```text
✓ Domain verified

acmefoods.com
```

Allow the demo to show both states:

```text
Unverified
Verified
```

Platform Admin should be able to simulate verification from the admin area.

---

# 10. Why Domain Verification Exists

The UI should explain:

> Domain verification establishes that the organization controls the domain. It can then be used to improve organization discovery and membership controls.

Important:

Domain verification does NOT mean:

> Only users with this domain can ever belong to the organization.

External users may still be invited.

Example:

```text
Acme Foods
acmefoods.com

Members:
alice@acmefoods.com
bob@acmefoods.com
consultant@agency.com
```

The external consultant can be a valid member if explicitly invited.

---

# 11. Organization Membership Policy

Create a simple organization setting:

```text
Who can request access?

( ) Anyone can request
( ) Verified organization domain users can request
( ) Invitation only
```

For the demo, support:

### Domain + Approval

A user with:

```text
@acmefoods.com
```

can request access.

An administrator must approve the request.

### Invitation Only

Only invited users can join.

### Open Request

Users can request access even when their email domain is external.

Do not make this overly complex in the first prototype.

---

# 12. Existing Organization Journey

Suppose:

```text
sarah@acmefoods.com
```

signs up.

Caboodle detects:

```text
acmefoods.com
```

and finds:

```text
Acme Foods
```

Show:

```text
Acme Foods

We found an organization associated with your email domain.

[ Request access ]
```

After clicking:

```text
Access request submitted

Organization:
Acme Foods

Status:
Pending

An organization administrator will review your request.
```

Sarah cannot access organization resources while status is:

```text
Pending
```

---

# 13. Admin Approval Journey

Alice logs in.

Navigate:

```text
Administration
    ↓
Access Requests
```

Show:

```text
Pending Requests

Sarah Johnson
sarah@acmefoods.com

Requested:
Brand Member

[ Approve ] [ Reject ]
```

Approve.

Status becomes:

```text
Approved
```

Sarah can now access Acme Foods.

---

# 14. Invitation Journey

An organization administrator can directly invite someone.

Example:

```text
Members
  ↓
Invite member
```

Form:

```text
Email
[ david@acmefoods.com ]

Role
[ Brand Member ]

[ Send invitation ]
```

After sending:

```text
Invitation sent

david@acmefoods.com
Role: Brand Member
Organization: Acme Foods

Status: Pending
```

Simulate the email.

Create an Invitations page where the invitation can be inspected.

---

# 15. Invitation Acceptance

David clicks the simulated invitation.

Show:

```text
You've been invited to join

Acme Foods

Invited by:
Alice Johnson

Role:
Brand Member

[ Accept invitation ]
```

After accepting:

```text
David
    ↓
Acme Foods
    ↓
Brand Member
```

The user now has an active membership.

---

# 16. External User Invitation

Demonstrate:

```text
Acme Foods
```

inviting:

```text
consultant@agency.com
```

The system should NOT reject the invitation simply because:

```text
agency.com != acmefoods.com
```

Instead show:

```text
External member

This user does not belong to the organization's verified domain.

They can still join because they were explicitly invited.
```

This is an important demo point.

---

# 17. Brokerage Organization Creation

Use the exact same organization creation system.

Example:

```text
Create organization

Name:
ABC Brokerage

Type:
Brokerage

Domain:
abc-brokerage.com
```

John automatically becomes:

```text
ABC Brokerage
    ↓
Organization Admin
```

There is no concept of:

```text
Broker = Company
```

The company is the Organization.

John is simply a member with the Organization Admin role.

---

# 18. Multiple Brokers

Inside:

```text
ABC Brokerage
```

show:

```text
Members

John Carter
Organization Admin

Mike Smith
Broker

Sarah Lee
Broker

David Brown
Broker
```

This demonstrates that a Brokerage organization can have multiple Broker-role users.

No `ParentBrokerId` is needed in the conceptual model.

---

# 19. Brand ↔ Brokerage Relationship

Relationships should be independent of membership.

Example:

```text
Acme Foods
Type: Brand

ABC Brokerage
Type: Brokerage
```

ABC Brokerage can request a relationship.

Navigate:

```text
Relationships
    ↓
Find organizations
```

Search:

```text
Acme Foods
```

Show:

```text
Acme Foods
Brand
Domain: acmefoods.com

[ Request relationship ]
```

---

# 20. Relationship Request

After clicking:

```text
Relationship requested

ABC Brokerage
        ↓
Acme Foods

Status:
Pending
```

Acme Admin sees:

```text
Relationship Requests

ABC Brokerage
Type: Brokerage

[ Approve ] [ Reject ]
```

After approval:

```text
ABC Brokerage
       ↕
   Connected
       ↕
Acme Foods
```

---

# 21. Multiple Brokerage Relationships

The demo must show one Brand connected to multiple Brokerage firms.

Example:

```text
Acme Foods

Connected Brokerages

ABC Brokerage
Region: Northeast

XYZ Brokerage
Region: Midwest

West Coast Brokerage
Region: West
```

This demonstrates:

```text
One Brand
    ↓
Multiple Brokerages
```

Do not implement the region logic deeply yet.

For the demo, Region can simply be relationship metadata.

---

# 22. Private Brand Managed by Brokerage

This is one of the most important scenarios.

Create:

```text
XYZ Private Label
Type: Brand
```

But do NOT create a Brand Owner membership.

Instead:

```text
ABC Brokerage
       ↓
manages
       ↓
XYZ Private Label
```

Show:

```text
XYZ Private Label

Owner / Manager:
ABC Brokerage

Brand members:
None
```

ABC Brokerage users can access the private Brand based on the relationship/management permission.

This demonstrates why a Brand should not require a Brand Owner user.

---

# 23. Organization Memberships

Every organization should have a Members page.

Example:

```text
Acme Foods

Members
------------------------------------------------
Name              Email                 Role
------------------------------------------------
Alice Johnson     alice@acmefoods.com   Admin
Bob Smith         bob@acmefoods.com     Member
Sarah Lee         sarah@acmefoods.com   Member
Consultant        consultant@agency.com External
```

Actions for admins:

```text
Change role
Suspend membership
Remove member
Resend invitation
```

For the frontend demo, these actions should work against mock state.

---

# 24. Roles

Create a Roles page.

Example:

```text
Roles

Organization Admin
Brand Member
Broker
```

Click a role.

Show its permissions.

---

# 25. Permissions

Use permission identifiers similar to:

```text
organization.view
organization.update

member.view
member.invite
member.update
member.remove
member.approve
member.suspend

role.view
role.assign

domain.view
domain.manage
domain.verify

relationship.view
relationship.request
relationship.approve
relationship.reject
relationship.manage
```

Keep permissions generic.

Do not create permissions for business modules yet.

---

# 26. Role Permission Matrix

For the demo:

| Permission | Organization Admin | Brand Member | Broker |
|---|---:|---:|---:|
| organization.view | ✓ | ✓ | ✓ |
| organization.update | ✓ | — | — |
| member.view | ✓ | ✓ | ✓ |
| member.invite | ✓ | — | — |
| member.approve | ✓ | — | — |
| member.remove | ✓ | — | — |
| role.assign | ✓ | — | — |
| domain.view | ✓ | — | — |
| domain.manage | ✓ | — | — |
| relationship.view | ✓ | ✓ | ✓ |
| relationship.request | ✓ | — | ✓ |
| relationship.approve | ✓ | — | — |

The UI should enforce these permissions.

Do not merely hide buttons.

If a route/action is unauthorized, the frontend should show an appropriate unauthorized state.

---

# 27. Platform Admin

Platform Admin is separate from organization roles.

Example:

```text
Constance
Platform Admin
```

She can see:

```text
Platform
├── Organizations
├── Users
├── Access Requests
├── Invitations
├── Relationships
├── Domain Verification
└── Audit Log
```

Platform Admin should NOT be presented as:

```text
Brand Owner
Broker
```

She operates at the Caboodle platform level.

---

# 28. Platform Organization List

Show:

```text
Organizations

Acme Foods
Brand
Verified
12 members

ABC Brokerage
Brokerage
Verified
8 members

XYZ Private Label
Brand
Unverified
0 direct members
Managed by ABC Brokerage
```

Filters:

```text
Type
Status
Domain verification
```

---

# 29. Platform User List

Show:

```text
Users

Alice Johnson
alice@acmefoods.com

Bob Smith
bob@acmefoods.com

John Carter
john@abc-brokerage.com

Mike Smith
mike@abc-brokerage.com
```

Clicking a user shows:

```text
User
Alice Johnson

Email
alice@acmefoods.com

Memberships

Acme Foods
Organization Admin

Status
Active
```

---

# 30. User With Multiple Organizations

The prototype should include at least one user with multiple memberships.

Example:

```text
consultant@agency.com
```

Memberships:

```text
Acme Foods
External Collaborator

ABC Brokerage
External Collaborator
```

When logging in, the user should see an organization switcher:

```text
Current organization

Acme Foods
ABC Brokerage
```

This demonstrates that:

> A User is not an Organization.

---

# 31. Organization Switcher

Put an organization switcher in the application header.

Example:

```text
Acme Foods ▼
```

Click:

```text
Your organizations

✓ Acme Foods
  ABC Brokerage
```

Changing organization changes:

- current organization
- available navigation
- effective role
- effective permissions
- visible members
- visible relationships

---

# 32. Important Authorization Rule

Never determine access from:

```text
user.role == "BrandOwner"
```

Instead determine:

```text
currentUser
    ↓
membership for currentOrganization
    ↓
role
    ↓
permissions
```

Conceptually:

```ts
hasPermission(
    currentUser,
    currentOrganization,
    "member.invite"
)
```

This is important even in the frontend prototype because it demonstrates the architecture we want the real backend to implement later.

---

# 33. Mock Data Model

The frontend should use TypeScript interfaces resembling the future backend model.

## User

```ts
type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "active" | "invited" | "suspended";
};
```

## Organization

```ts
type Organization = {
  id: string;
  name: string;
  type: "brand" | "brokerage";
  status: "active" | "suspended";
  domains: OrganizationDomain[];
  createdAt: string;
};
```

## Organization Domain

```ts
type OrganizationDomain = {
  id: string;
  domain: string;
  verified: boolean;
  verifiedAt?: string;
  isPrimary: boolean;
};
```

## Membership

```ts
type Membership = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: "pending" | "active" | "suspended" | "removed";
  source: "invitation" | "access_request" | "created";
  createdAt: string;
};
```

## Role

```ts
type Role = {
  id: string;
  name: string;
  description: string;
  organizationType?: "brand" | "brokerage";
  permissionIds: string[];
};
```

## Permission

```ts
type Permission = {
  id: string;
  name: string;
  description: string;
};
```

## Organization Relationship

```ts
type OrganizationRelationship = {
  id: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  type: "brokerage_represents_brand" | "brokerage_manages_brand";
  status: "pending" | "active" | "rejected" | "suspended";
  regions?: string[];
  requestedByUserId: string;
  approvedByUserId?: string;
  createdAt: string;
};
```

## Invitation

```ts
type Invitation = {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  invitedByUserId: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  expiresAt: string;
};
```

## Access Request

```ts
type AccessRequest = {
  id: string;
  userId: string;
  organizationId: string;
  requestedRoleId: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  reviewedByUserId?: string;
};
```

---

# 34. Suggested Mock Organizations

Seed the application with these organizations.

## Acme Foods

```text
id: org-acme

Name:
Acme Foods

Type:
Brand

Domain:
acmefoods.com

Domain:
Verified
```

Members:

```text
Alice Johnson
Organization Admin

Bob Smith
Brand Member
```

---

## ABC Brokerage

```text
id: org-abc

Name:
ABC Brokerage

Type:
Brokerage

Domain:
abc-brokerage.com

Domain:
Verified
```

Members:

```text
John Carter
Organization Admin

Mike Smith
Broker

Sarah Lee
Broker
```

---

## XYZ Brokerage

```text
id: org-xyz-broker

Name:
XYZ Brokerage

Type:
Brokerage

Domain:
xyzbrokerage.com

Domain:
Verified
```

---

## XYZ Private Label

```text
id: org-private

Name:
XYZ Private Label

Type:
Brand

Domain:
private-label.example

Domain:
Unverified
```

Direct Brand members:

```text
None
```

Managed by:

```text
ABC Brokerage
```

---

# 35. Seed Relationships

Create these relationships:

```text
ABC Brokerage
    ↕
Acme Foods
Status: Active
Region: Northeast
```

```text
XYZ Brokerage
    ↕
Acme Foods
Status: Active
Region: Midwest
```

```text
ABC Brokerage
    ↓ manages
XYZ Private Label
Status: Active
```

This immediately demonstrates all major business scenarios.

---

# 36. Seed Users

At minimum:

```text
Constance
constance@caboodle.com
Platform Admin
```

```text
Alice Johnson
alice@acmefoods.com
Acme Foods
Organization Admin
```

```text
Bob Smith
bob@acmefoods.com
Acme Foods
Brand Member
```

```text
John Carter
john@abc-brokerage.com
ABC Brokerage
Organization Admin
```

```text
Mike Smith
mike@abc-brokerage.com
ABC Brokerage
Broker
```

```text
Sarah Lee
sarah@abc-brokerage.com
ABC Brokerage
Broker
```

```text
External Consultant
consultant@agency.com
Acme Foods
External Collaborator
```

If implementing the optional multi-organization scenario:

```text
External Consultant
consultant@agency.com

Acme Foods
External Collaborator

ABC Brokerage
External Collaborator
```

---

# 37. Demo Scenarios

The application should be designed around these demo scenarios.

## Scenario A — New Brand

Log in as a new user.

Create:

```text
Acme Foods
Brand
```

Verify:

```text
acmefoods.com
```

Automatically become:

```text
Organization Admin
```

Then enter the organization.

---

## Scenario B — Another Brand Employee

Sign out.

Sign up/login as:

```text
bob@acmefoods.com
```

Caboodle discovers:

```text
Acme Foods
```

Request access.

Switch to Alice.

Approve request.

Switch back to Bob.

Bob now has access.

---

## Scenario C — Invite Brand Member

Login as Alice.

Invite:

```text
david@acmefoods.com
```

Role:

```text
Brand Member
```

View pending invitation.

Accept as David.

David becomes an active member.

---

## Scenario D — New Brokerage

Create:

```text
ABC Brokerage
Brokerage
```

Verify:

```text
abc-brokerage.com
```

Creator becomes:

```text
Organization Admin
```

Invite:

```text
Mike
Sarah
```

Assign:

```text
Broker
```

Show that multiple Broker users can exist.

---

## Scenario E — Brokerage Requests Brand Relationship

Login as John.

Search:

```text
Acme Foods
```

Request relationship.

Login as Alice.

Approve relationship.

Both organizations now see the relationship.

---

## Scenario F — Multiple Brokerages

Show:

```text
Acme Foods

Connected Brokerages

ABC Brokerage
Northeast

XYZ Brokerage
Midwest
```

This demonstrates that one Brand can have multiple Brokerage relationships.

---

## Scenario G — Private Brand

Login as John.

Show:

```text
ABC Brokerage

Managed Brands

XYZ Private Label
```

Open the private Brand.

Show:

```text
Brand members:
None

Managed by:
ABC Brokerage
```

This demonstrates that a Brand does not require a Brand Owner user.

---

## Scenario H — External User

Invite:

```text
consultant@agency.com
```

to Acme Foods.

Show the warning:

```text
This email domain does not match the organization's
verified domain.

The user can still be invited as an external member.
```

Accept invitation.

Show:

```text
External Collaborator
```

---

## Scenario I — Platform Admin

Login as:

```text
constance@caboodle.com
```

Show:

```text
Organizations
Users
Access Requests
Invitations
Relationships
Domain Verification
Audit Log
```

Emphasize:

> Constance is now administering the Caboodle platform, not manually creating every customer organization.

---

# 38. Access Control UX

The UI should demonstrate permission-based access.

For example, when logged in as:

```text
Bob
Brand Member
```

Members page may be visible.

But:

```text
Invite Member
```

should not be available.

Likewise:

```text
Organization Settings
```

should either be hidden or show:

```text
You don't have permission to access this page.
```

When logged in as:

```text
Alice
Organization Admin
```

the same functionality is available.

This is critical to demonstrate the future authorization architecture.

---

# 39. Permission Debugging Panel

Because this is a technical/client architecture demo, include an optional developer-friendly panel.

Example:

```text
Current Session

User:
Alice Johnson

Organization:
Acme Foods

Role:
Organization Admin

Permissions:
✓ organization.view
✓ organization.update
✓ member.view
✓ member.invite
✓ member.approve
✓ member.remove
✓ role.assign
✓ domain.view
✓ domain.manage
✓ relationship.view
✓ relationship.approve
```

When switching users, this panel updates.

This makes it easy to explain to Constance how authorization works.

The panel can be hidden behind:

```text
Demo / Developer Mode
```

---

# 40. Audit Log

Include a lightweight mock audit log.

Examples:

```text
Alice approved Sarah's access request
2 minutes ago
```

```text
John requested a relationship with Acme Foods
5 minutes ago
```

```text
Alice invited David to Acme Foods
10 minutes ago
```

```text
Acme Foods domain was verified
20 minutes ago
```

```text
John created ABC Brokerage
30 minutes ago
```

The audit log does not need to be exhaustive.

Its purpose is to demonstrate that important identity/security events can be tracked.

---

# 41. Organization Settings

For each organization:

```text
Organization Settings

Name
Acme Foods

Type
Brand

Primary domain
acmefoods.com
✓ Verified

Membership policy
Domain + Approval

Status
Active
```

For Brokerage:

```text
ABC Brokerage

Type
Brokerage

Primary domain
abc-brokerage.com
✓ Verified
```

---

# 42. Domain Management

Domain page:

```text
Domains

acmefoods.com
Primary
Verified

Actions:
[ View verification details ]
```

Add domain:

```text
[ Add domain ]
```

New domain:

```text
example.acmefoods.com
Pending verification
```

For frontend demo, verification can be simulated.

---

# 43. Organization Discovery

Create a reusable discovery component.

Given:

```text
alice@acmefoods.com
```

derive:

```text
acmefoods.com
```

Search mock organizations.

Possible states:

### Organization found

```text
Acme Foods
Verified domain: acmefoods.com

[ Request access ]
```

### No organization found

```text
No organization found.

[ Create organization ]
```

### Domain already claimed by another organization

Show:

```text
This domain is already associated with an organization.

If you believe this is incorrect, contact Caboodle support.
```

For the demo, Platform Admin can resolve this conflict.

---

# 44. Domain Conflict Scenario

Seed an optional test organization:

```text
Duplicate Test Organization
domain: conflicted.com
```

Attempt to create another organization using:

```text
conflicted.com
```

Show:

```text
Domain already associated

conflicted.com is already associated with another
organization.

You cannot claim this domain until ownership is resolved.
```

This demonstrates that domain ownership is treated as a controlled resource.

---

# 45. Important UX Principle

Do not overwhelm users with technical concepts.

The customer should see:

```text
Create organization
Join organization
Invite members
Request access
Connect organizations
```

They should NOT need to understand:

```text
RBAC
Membership
OrganizationRelationship
Permission IDs
DNS TXT records
```

Those are implementation concepts.

The UI should use business language.

---

# 46. Architecture Explanation Page

Add an optional page:

```text
How Caboodle Access Works
```

with this visual:

```text
User
 ↓
Membership
 ↓
Organization
 ↓
Role
 ↓
Permissions
```

And:

```text
Organization
      ↕
Organization Relationship
      ↕
Organization
```

And:

```text
Organization
 ↓
Verified Domain
 ↓
Organization Discovery
 ↓
Access Request / Invitation
```

This page is useful during the client demo.

---

# 47. Old Model vs New Model

Include a comparison page for the demo.

## Current Concept

```text
Brand
 ↓
Brand Owner User

Brand
 ↓
Brand Sub Users

Brand
 ↓
BrandBroker
 ↓
Broker User
 ↓
ParentBroker
```

Problems:

- Brand represented through users.
- Broker represented through a user.
- Only one effective Brand Owner.
- Difficult to support multiple Broker users.
- Difficult to support multiple Brokerages per Brand.
- Private Brands require awkward exceptions.
- Constance must manually create business entities.
- User onboarding and organization creation are coupled.
- Domain ownership is not established.
- Roles and organizations are tightly coupled.

## Proposed Concept

```text
User
 ↓
Membership
 ↓
Organization
 ↓
Role
 ↓
Permissions
```

And:

```text
Brand Organization
        ↕
Brokerage Organization
```

Benefits to demonstrate:

- Multiple admins.
- Multiple brokers.
- Multiple brokerages per Brand.
- Private/managed Brands.
- Organization discovery.
- Domain verification.
- Self-service onboarding.
- Admin approval workflows.
- Clear permission model.
- Platform administration separated from customer administration.

---

# 48. What This Prototype Is NOT

Do not implement:

- Real backend.
- Real database.
- Real authentication.
- OAuth.
- Real email delivery.
- Real DNS verification.
- Stripe.
- Billing.
- Subscription plans.
- CRM.
- Product Specs.
- Trade Spend.
- DataHub.
- Retailer management.
- Store management.
- Promotions.
- AI features.

Those are outside the scope of this prototype.

---

# 49. Frontend Technical Requirements

Use:

- Next.js
- TypeScript
- App Router
- Modern responsive UI
- Clean reusable components
- Mock data/services
- Browser local storage for demo session/state where appropriate

The project starts empty.

The implementation should be clean enough that the mock services can later be replaced by real API calls.

Do NOT hardcode business logic directly into UI components.

Create a simple frontend service/repository layer.

For example:

```text
src/
  app/
  components/
  features/
    auth/
    organizations/
    memberships/
    roles/
    permissions/
    relationships/
    invitations/
    access-requests/
    domains/
    platform-admin/
  lib/
    mock/
    auth/
    permissions/
  types/
```

The exact folder structure can be improved by the coding agent, but the separation of concerns should remain.

---

# 50. Mock Service Layer

Use functions conceptually like:

```ts
signIn(email: string, password: string)

signOut()

getCurrentUser()

getOrganizationsForUser(userId: string)

getMembership(userId: string, organizationId: string)

getPermissions(userId: string, organizationId: string)

createOrganization(...)

requestOrganizationAccess(...)

approveAccessRequest(...)

rejectAccessRequest(...)

inviteMember(...)

acceptInvitation(...)

removeMember(...)

changeMemberRole(...)

createOrganizationRelationship(...)

approveOrganizationRelationship(...)

rejectOrganizationRelationship(...)

verifyDomain(...)

getOrganizations(...)

getUsers(...)
```

These are mock implementations.

Later they can be replaced with API calls without redesigning the UI.

---

# 51. State Management

The prototype should have a centralized mock application state.

It can be initialized from seed data.

Actions should mutate the state.

At minimum persist:

```text
current user
current organization
organizations
users
memberships
roles
permissions
invitations
access requests
relationships
domains
audit events
```

Use localStorage or another lightweight browser persistence mechanism so the demo survives page refresh.

Provide a way to reset demo data:

```text
Reset Demo Data
```

This is useful during the client presentation.

---

# 52. Demo Reset

Platform Admin should have:

```text
Demo Controls

[ Reset demo data ]
```

Confirmation:

```text
Reset all demo changes?

This will restore the original demo organizations,
users, memberships, invitations and relationships.

[ Cancel ]
[ Reset ]
```

---

# 53. Visual Design

The UI should feel like a modern B2B SaaS application.

Prioritize:

- Clean dashboard.
- Clear hierarchy.
- Professional typography.
- Cards/tables where appropriate.
- Status badges.
- Empty states.
- Confirmation dialogs.
- Toast notifications.
- Loading states.
- Responsive layout.
- Organization switcher.
- User/profile menu.
- Consistent terminology.

Avoid making it look like an internal CRUD admin panel.

This is a **client-facing product concept demo**.

---

# 54. Demo Status Badges

Use consistent status labels.

Organizations:

```text
Active
Suspended
```

Domains:

```text
Verified
Pending
Unverified
```

Membership:

```text
Active
Pending
Suspended
Removed
```

Invitation:

```text
Pending
Accepted
Expired
Revoked
```

Access Request:

```text
Pending
Approved
Rejected
```

Relationship:

```text
Pending
Active
Rejected
Suspended
```

---

# 55. Demo Script for Constance

The coding agent should build the prototype so this exact walkthrough is possible.

## Part 1 — Explain the Concept

Start as Platform Admin.

Show:

```text
Organizations
Users
Relationships
```

Explain:

> Caboodle no longer thinks of a Brand or Brokerage as a user. They are organizations.

Then show:

```text
Organization
    ↓
Membership
    ↓
Role
    ↓
Permissions
```

---

## Part 2 — Create a Brand

Sign out.

Create:

```text
Acme Foods
Brand
```

using:

```text
alice@acmefoods.com
```

Show domain discovery and verification.

Explain:

> We don't need Constance to create this Brand anymore.

Alice becomes:

```text
Organization Admin
```

automatically.

---

## Part 3 — Add Brand Members

Invite:

```text
bob@acmefoods.com
```

Show invitation.

Accept invitation.

Show:

```text
Acme Foods
2 members
```

---

## Part 4 — Demonstrate Access Request

Use another:

```text
sarah@acmefoods.com
```

Show organization discovery.

Request access.

Switch to Alice.

Approve.

Switch back to Sarah.

Show that Sarah now has access.

---

## Part 5 — Create Brokerage

Create:

```text
ABC Brokerage
Brokerage
```

with:

```text
john@abc-brokerage.com
```

John becomes:

```text
Organization Admin
```

Invite:

```text
Mike
Sarah
```

with role:

```text
Broker
```

Show:

```text
ABC Brokerage
├── John — Admin
├── Mike — Broker
└── Sarah — Broker
```

Explain:

> We no longer need a single user to represent the brokerage company.

---

## Part 6 — Connect Brokerage to Brand

As John:

```text
Request relationship
```

with:

```text
Acme Foods
```

As Alice:

```text
Approve
```

Show the relationship from both sides.

---

## Part 7 — Multiple Brokerage Firms

Connect another Brokerage:

```text
XYZ Brokerage
```

to Acme Foods.

Show:

```text
Acme Foods
│
├── ABC Brokerage
└── XYZ Brokerage
```

Explain:

> This supports the real-world regional brokerage model.

---

## Part 8 — Private Brand

Show:

```text
XYZ Private Label
```

managed by:

```text
ABC Brokerage
```

with:

```text
0 Brand Owner users
```

Explain:

> A Brand can exist independently of having a Brand Owner user.

---

## Part 9 — External User

Invite:

```text
consultant@agency.com
```

to Acme Foods.

Show:

```text
External domain
```

but allow the invitation.

Explain:

> Domain verification helps us establish organization ownership and automate discovery, but it doesn't prevent legitimate external collaborators from being invited.

---

## Part 10 — Permissions

Switch between:

```text
Alice — Organization Admin
Bob — Brand Member
John — Brokerage Admin
Mike — Broker
Constance — Platform Admin
```

Show how the available actions change.

Open the permission debug panel.

Demonstrate:

```text
Same application
Different membership
Different role
Different permissions
Different experience
```

---

# 56. Critical Product Principles

The coding agent should preserve these principles.

## Principle 1

A user is not a Brand.

## Principle 2

A user is not a Brokerage.

## Principle 3

A Brand is an Organization.

## Principle 4

A Brokerage is an Organization.

## Principle 5

Users access organizations through Memberships.

## Principle 6

Roles belong to Memberships.

## Principle 7

Permissions belong to Roles.

## Principle 8

Brand ↔ Brokerage is an Organization Relationship.

## Principle 9

Domain verification establishes organizational domain ownership.

## Principle 10

Domain matching helps organization discovery but does not replace invitations/authorization.

## Principle 11

An organization can exist without direct members in certain managed/private-brand scenarios.

## Principle 12

A Brand can have multiple Brokerage relationships.

## Principle 13

A Brokerage can have multiple Broker users.

## Principle 14

Platform Admin should handle platform-level exceptions, not normal customer onboarding.

## Principle 15

Customer organizations should be able to onboard themselves.

---

# 57. Final Target Mental Model

The complete conceptual model demonstrated by this prototype should be:

```text
                         CABOODLE PLATFORM
                                |
                       +--------+--------+
                       |                 |
                    USERS          ORGANIZATIONS
                       |                 |
                       |          +------+------+
                       |          |             |
                       |        BRANDS       BROKERAGES
                       |          |             |
                       |          +------+------+
                       |                 |
                       +---- MEMBERSHIP--+
                                |
                               ROLE
                                |
                           PERMISSIONS
```

And separately:

```text
              BRAND
                ↕
       ORGANIZATION RELATIONSHIP
                ↕
            BROKERAGE
```

With:

```text
Organization
      |
      +── Domains
      |
      +── Members
      |
      +── Roles
      |
      +── Settings
      |
      +── Relationships
```

And onboarding:

```text
User
  ↓
Email / Account
  ↓
Organization Discovery
  ↓
┌───────────────────────┐
│ Existing Organization │
└───────────┬───────────┘
            │
       Request Access
            │
            ↓
        Admin Review
            │
            ↓
        Membership
            │
            ↓
           Role
            │
            ↓
       Permissions


OR


┌──────────────────────┐
│ New Organization     │
└──────────┬───────────┘
           │
     Create Organization
           │
     Verify Domain
           │
    Creator = Admin
           │
           ↓
     Invite / Approve
        Members
```

This is the target experience that the frontend prototype should communicate.

---

# 58. Success Criteria

The prototype is successful if, during the demo, Constance can clearly see that:

1. She does not need to manually create every Brand.
2. She does not need to manually create every Brokerage.
3. A Brand can have multiple administrators/members.
4. A Brokerage can have multiple Broker users.
5. A Brand can work with multiple Brokerage organizations.
6. A Brokerage can manage a private Brand without a Brand Owner.
7. Users can discover organizations from verified domains.
8. Users can request access.
9. Organization admins can approve/reject access.
10. Organization admins can invite users.
11. External users can still be invited.
12. Roles are independent from organizations.
13. Permissions are independent from users.
14. Platform Admin and customer organization administration are separate concepts.
15. A single user can belong to multiple organizations.
16. Switching organizations changes the user's effective permissions.
17. The system no longer depends on Constance manually creating customer business entities.
18. The architecture can later support plans, modules, billing, SSO, SCIM, advanced RBAC, and business modules without redesigning the identity foundation.

---

# 59. Future Scope — Do Not Implement Yet

The architecture should leave room for:

```text
SSO / SAML
SCIM
MFA
Passwordless login
OAuth
Advanced RBAC
Custom roles
Teams
Departments
Groups
Subscription plans
Module entitlements
Billing
Usage limits
Audit/security center
Organization-level API keys
Service accounts
Enterprise domain policies
Multiple verified domains
Domain claim verification
Automatic provisioning
Deprovisioning
```

These should NOT be implemented in this prototype unless needed for the demo.

The prototype's purpose is to establish the correct **Organization + Identity + Membership + Role + Permission + Relationship** model.

---

# 60. Final Instruction to the Coding Agent

Build the application as a polished, client-demo-ready SaaS prototype based on this specification.

Do not build backend infrastructure.

Do not invent business modules.

Do not preserve the old `BrandOwner`, `BrandSubUser`, `BrokerSubUser`, or `ParentBrokerId` conceptual model in the new UX.

Instead demonstrate the new model:

```text
User
  ↓
Membership
  ↓
Organization
  ↓
Role
  ↓
Permissions
```

and:

```text
Brand Organization
        ↕
Organization Relationship
        ↕
Brokerage Organization
```

The application must be fully navigable and interactive using mock frontend state.

All important flows should actually work in the demo:

- Create organization.
- Discover organization.
- Request access.
- Approve/reject access.
- Invite member.
- Accept invitation.
- Change role.
- Remove/suspend member.
- Verify domain.
- Request Brand ↔ Brokerage relationship.
- Approve/reject relationship.
- Show multiple Brokerages connected to one Brand.
- Show multiple Brokers inside one Brokerage.
- Show a private Brand managed by a Brokerage.
- Show external users.
- Switch organizations.
- Switch demo users.
- Enforce mock permissions.
- Show Platform Admin capabilities.
- Reset demo data.

The final result should feel like the beginning of a real Caboodle identity platform, not a CRUD mockup.

Most importantly, the prototype should make the **business model understandable to a non-technical client** while keeping the underlying frontend architecture clean enough to evolve into the real Caboodle backend later.
