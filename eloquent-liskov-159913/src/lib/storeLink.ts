export const LODGING_CATEGORIES = [
  "hotel",
  "resort",
  "guesthouse",
  "hostel",
  "villa",
  "lodge",
  "motel",
  "inn",
  "boutique",
] as const;

export function isLodgingCategory(category: string | null | undefined): boolean {
  return !!category && (LODGING_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Resolve the public-facing URL for a store based on its category.
 * Lodging stores have a dedicated route at /hotel/:storeId; everything else
 * uses the grocery-style /grocery/shop/:slug route.
 */
export function getStorePublicPath(store: {
  id: string;
  slug: string;
  category: string | null | undefined;
}): string {
  if (isLodgingCategory(store.category)) return `/hotel/${store.id}`;
  return `/grocery/shop/${store.slug}`;
}
