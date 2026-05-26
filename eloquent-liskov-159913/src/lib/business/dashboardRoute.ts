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

  // Restaurants/cafés/bakeries/drinks → Eats restaurant dashboard.
  if (category && RESTAURANT_CATEGORIES.has(category as StoreCategory)) {
    return { path: "/eats/restaurant-dashboard", fallback: false };
  }

  // Auto repair → full store admin dashboard with repair-specific sections.
  if (normalizedCategory === "auto repair" && storeId) {
    return { path: `/admin/stores/${storeId}?tab=ar-dashboard`, fallback: false };
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
