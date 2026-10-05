import {
  getEnabledModules,
  normalizeActions,
  normalizeGrants,
  type ModuleAccess,
} from "@/lib/permissions/modules";
import { PERMISSIONS, getRole } from "@/lib/permissions/permissions";
import type {
  AppState,
  BrandAccess,
  BrandConnection,
  Membership,
  ModuleAction,
  Organization,
  PermissionId,
  PlatformModule,
  Role,
} from "@/types";

/**
 * Request-time access resolution (architecture v2, section 6.2).
 *
 * This is the only place that decides what someone may do with data. Effective
 * access is always what is available on a Brand intersected with what the
 * person was given, worked out fresh every time and never stored:
 *
 *   brands    = a Brand's own id, or a Brokerage's actively connected Brands
 *   available = on each Brand, the organization's own enabled modules, plus,
 *               for a Brokerage, the modules that Brand has enabled. Brand
 *               modules flow through to the brokerages working on the Brand;
 *               brokerage tools (Market Overview, ...) come from the Brokerage.
 *   admin     -> every available module, every action
 *   member    -> per brand: Full (= available) or Custom (= grants ∩ available)
 */

/**
 * How someone reaches a Brand. `admin` and `support` are derived; `full` and
 * `custom` come from a Brand Access row.
 */
export type BrandAccessKind = "admin" | "support" | "full" | "custom";

export type ResolvedBrand = {
  brand: Organization;
  kind: BrandAccessKind;
  /** The Brand Access row behind `full` and `custom`. */
  brandAccess?: BrandAccess;
  /**
   * The ceiling on this brand: the organization's own enabled modules, plus
   * the Brand's enabled modules when working on it from a Brokerage.
   */
  available: PlatformModule[];
  /** Effective module access on this brand. */
  modules: ModuleAccess;
};

export type AccessContext = {
  organization: Organization;
  membership?: Membership;
  role?: Role;
  /** The Platform Admin opened this organization for support. */
  isSupport: boolean;
  permissions: PermissionId[];
  /** The organization's own module entitlement. */
  enabledModules: PlatformModule[];
  /** Every Brand this person can work on here, in name order. */
  brands: ResolvedBrand[];
  /** The Brand the requests run against (the BrandID header). */
  activeBrandId: string | null;
};

const ALL_PERMISSION_IDS = PERMISSIONS.map((permission) => permission.id);

/** Full: every available module, with every action that module supports. */
function fullAccess(available: PlatformModule[]): ModuleAccess {
  return Object.fromEntries(
    available.map((module) => [
      module.id,
      normalizeActions(module.availableActions),
    ]),
  );
}

/**
 * Custom: only granted modules that are still available and whose parent is
 * granted too, never above what the module supports.
 */
function customAccess(
  grants: BrandAccess["grants"],
  available: PlatformModule[],
): ModuleAccess {
  return Object.fromEntries(
    normalizeGrants(grants, available).map((grant) => [
      grant.moduleId,
      grant.actions,
    ]),
  );
}

/**
 * The modules that can be used on one Brand from one organization: its own
 * enabled modules, plus the Brand's when the organization is a Brokerage.
 */
export function getAvailableModules(
  state: AppState,
  organizationId: string,
  brandId: string,
): PlatformModule[] {
  const own = getEnabledModules(state, organizationId);
  if (organizationId === brandId) return own;
  return [...own, ...getEnabledModules(state, brandId)];
}

/** Connections that currently give a Brokerage access to a Brand. */
export function getActiveConnections(
  state: AppState,
  brokerageId: string,
): BrandConnection[] {
  return state.brandConnections.filter((connection) => {
    if (connection.brokerageOrganizationId !== brokerageId) return false;
    if (connection.status !== "active") return false;
    const brand = state.organizations.find(
      (org) => org.id === connection.brandOrganizationId,
    );
    return brand?.status === "active";
  });
}

/** The Brands an organization's members can reach at all. */
export function getReachableBrands(
  state: AppState,
  organization: Organization,
): Organization[] {
  if (organization.type === "brand") return [organization];

  const brandIds = new Set(
    getActiveConnections(state, organization.id).map(
      (connection) => connection.brandOrganizationId,
    ),
  );
  return state.organizations
    .filter((org) => brandIds.has(org.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A membership's Brand Access rows that have not been ended. */
export function getBrandAccessRows(
  state: AppState,
  membershipId: string,
): BrandAccess[] {
  return state.brandAccess.filter(
    (row) => row.membershipId === membershipId && !row.deletedAt,
  );
}

/**
 * The Brands one membership works on, and what it may do on each. Used by
 * the resolver and by the admin screens that show someone else's access.
 */
export function resolveMembershipBrands(
  state: AppState,
  membership: Membership,
): ResolvedBrand[] {
  const organization = state.organizations.find(
    (org) => org.id === membership.organizationId,
  );
  const role = getRole(state, membership.roleId);
  if (!organization || !role) return [];

  const rows = getBrandAccessRows(state, membership.id);

  return getReachableBrands(state, organization).flatMap(
    (brand): ResolvedBrand[] => {
      const available = getAvailableModules(state, organization.id, brand.id);

      if (role.hasFullBrandAccess) {
        return [
          {
            brand,
            kind: "admin",
            available,
            modules: fullAccess(available),
          },
        ];
      }

      const brandAccess = rows.find(
        (row) => row.brandOrganizationId === brand.id,
      );
      if (!brandAccess) return [];

      if (brandAccess.accessMode === "full") {
        return [
          {
            brand,
            kind: "full",
            brandAccess,
            available,
            modules: fullAccess(available),
          },
        ];
      }

      return [
        {
          brand,
          kind: "custom",
          brandAccess,
          available,
          modules: customAccess(brandAccess.grants, available),
        },
      ];
    },
  );
}

function pickActiveBrand(
  organization: Organization,
  brands: ResolvedBrand[],
  requestedBrandId: string | null | undefined,
): string | null {
  // In a Brand workspace the active Brand is always the organization itself.
  if (organization.type === "brand") {
    return brands.some((entry) => entry.brand.id === organization.id)
      ? organization.id
      : null;
  }
  if (
    requestedBrandId &&
    brands.some((entry) => entry.brand.id === requestedBrandId)
  ) {
    return requestedBrandId;
  }
  return brands[0]?.brand.id ?? null;
}

/**
 * Resolve(userId, organizationId, brandId) from the architecture document.
 * Returns null when the person has no way into this organization.
 */
export function resolveAccess(
  state: AppState,
  userId: string | null | undefined,
  organizationId: string | null | undefined,
  requestedBrandId?: string | null,
): AccessContext | null {
  if (!userId || !organizationId) return null;
  const user = state.users.find((item) => item.id === userId);
  const organization = state.organizations.find(
    (org) => org.id === organizationId,
  );
  if (!user || !organization || user.status === "suspended") return null;

  const enabledModules = getEnabledModules(state, organization.id);

  // Support access: full access, every action audited.
  if (user.isPlatformAdmin) {
    const brands = (
      organization.type === "brand"
        ? [organization]
        : getReachableBrands(state, organization)
    ).map((brand): ResolvedBrand => {
      const available = getAvailableModules(state, organization.id, brand.id);
      return {
        brand,
        kind: "support",
        available,
        modules: fullAccess(available),
      };
    });
    return {
      organization,
      isSupport: true,
      permissions: ALL_PERMISSION_IDS,
      enabledModules,
      brands,
      activeBrandId: pickActiveBrand(organization, brands, requestedBrandId),
    };
  }

  if (organization.status !== "active") return null;
  const membership = state.memberships.find(
    (item) =>
      item.userId === userId &&
      item.organizationId === organizationId &&
      item.status === "active",
  );
  const role = membership ? getRole(state, membership.roleId) : undefined;
  if (!membership || !role) return null;

  const brands = resolveMembershipBrands(state, membership);
  return {
    organization,
    membership,
    role,
    isSupport: false,
    permissions: role.permissionIds,
    enabledModules,
    brands,
    activeBrandId: pickActiveBrand(organization, brands, requestedBrandId),
  };
}

/** The active Brand's entry. */
export function getActiveBrand(
  context: AccessContext | null,
): ResolvedBrand | undefined {
  if (!context?.activeBrandId) return undefined;
  return context.brands.find((entry) => entry.brand.id === context.activeBrandId);
}

/** The effective module map on the active Brand. */
export function getActiveModules(context: AccessContext | null): ModuleAccess {
  return getActiveBrand(context)?.modules ?? {};
}

/**
 * The allowlist for cross-brand screens: every Brand where this person has
 * the module with the action.
 */
export function brandsWith(
  context: AccessContext | null,
  moduleId: string,
  action: ModuleAction = "view",
): Organization[] {
  if (!context) return [];
  return context.brands
    .filter((entry) => entry.modules[moduleId]?.includes(action))
    .map((entry) => entry.brand);
}

export const ACCESS_KIND_LABEL: Record<BrandAccessKind, string> = {
  admin: "Admin (full)",
  support: "Support (full)",
  full: "Full",
  custom: "Custom",
};
