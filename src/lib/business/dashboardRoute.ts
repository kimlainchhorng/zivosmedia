/**
 * Resolves the correct dashboard route for a newly-created Business Page
 * based on its category. Centralized so the wizard and the auto-redirect
 * on mount stay in sync.
 */
import { isLodgingStoreCategory, normalizeStoreCategory } from "@/hooks/useOwnerStoreProfile";
import type { StoreCategory } from "@/config/groceryStores";

export const RESTAURANT_CATEGORIES = new Set<StoreCategory>([
  "restaurant",
  "cafe",
  "bakery",
  "drink",
]);

export type ResolvedDashboard = {
  path: string;
  /** True when we couldn't match the category and fell back to the generic store dashboard. */
  fallback: boolean;
};

export function resolvePublicBusinessPageRoute(
  category: StoreCategory | string | null | undefined,
  storeId: string | undefined,
  slug?: string | null,
) {
  if (category && isLodgingStoreCategory(category as StoreCategory) && storeId) {
    return `/hotel/${storeId}`;
  }

  return slug ? `/store/${slug}` : storeId ? `/shop/${storeId}` : "/business";
}

export function resolveBusinessDashboardRoute(
  category: StoreCategory | string | null | undefined,
  storeId: string | undefined
): ResolvedDashboard {
  const normalizedCategory = normalizeStoreCategory(category);

  // Cafés have their own admin module (KDS, modifiers, tables, payments) so
  // they go to /admin/stores/<id>?tab=cafe-dashboard rather than the legacy
  // Eats dashboard. Checked before the restaurant fallback below.
  if (category === "cafe" && storeId) {
    return { path: `/admin/stores/${storeId}?tab=cafe-dashboard`, fallback: false };
  }

  // Restaurants/bakeries/drinks → Eats restaurant dashboard. (Cafés handled above.)
  if (category && RESTAURANT_CATEGORIES.has(category as StoreCategory)) {
    return { path: "/eats/restaurant-dashboard", fallback: false };
  }

  // Auto repair → full store admin dashboard with repair-specific sections.
  if (normalizedCategory === "auto repair" && storeId) {
    return { path: `/admin/stores/${storeId}?tab=ar-dashboard`, fallback: false };
  }

  // Car rental → store admin dashboard with car-rental sections.
  if (normalizedCategory === "car rental" && storeId) {
    return { path: `/admin/stores/${storeId}?tab=car-rental-dashboard`, fallback: false };
  }

  // Car dealership → store admin dashboard with dealership sections.
  if (normalizedCategory === "car dealership" && storeId) {
    return { path: `/admin/stores/${storeId}?tab=cd-dashboard`, fallback: false };
  }

  // Lodging → store edit page on the lodge tab.
  if (category && isLodgingStoreCategory(category as StoreCategory) && storeId) {
    return { path: `/admin/stores/${storeId}?tab=lodge-overview`, fallback: false };
  }

  // Generic store dashboard.
  if (storeId) {
    return { path: `/admin/stores/${storeId}`, fallback: !category };
  }

  // Last-resort safety net — should never hit unless we have neither category nor storeId.
  return { path: "/admin/stores", fallback: true };
}
