/**
 * Grocery store configuration — single source of truth.
 * Only stores with real product API integrations are listed.
 */
import logoWalmart from "@/assets/brand-logos/walmart.png";
import logoCostco from "@/assets/brand-logos/costco.png";
import logoTarget from "@/assets/brand-logos/target.png";
import logoKroger from "@/assets/brand-logos/kroger.png";

export type StoreName =
  | "Walmart"
  | "Costco"
  | "Target"
  | "Kroger";

export type StoreCategory =
  | "grocery"
  | "food-market"
  | "fashion"
  | "restaurant"
  | "drink"
  | "cafe"
  | "bakery"
  | "mall"
  | "supermarket"
  | "convenience"
  | "hotel"
  | "resort"
  | "guesthouse"
  | "car-rental"
  | "car-dealership"
  | "auto-repair"
  | "tire-shop"
  | "auto-parts"
  | "gas-station"
  | "salon"
  | "spa"
  | "gym"
  | "laundry"
  | "electronics"
  | "pharmacy"
  | "hardware"
  | "florist"
  | "bookstore"
  | "jewelry"
  | "pet-shop"
  | "toys"
  | "furniture"
  | "home-decor"
  | "sporting-goods"
  | "other";

export const STORE_CATEGORY_OPTIONS: { value: StoreCategory; label: string; group?: string }[] = [
  // 🏨 Stay
  { value: "hotel", label: "Hotel", group: "Hotels & Resorts" },
  { value: "resort", label: "Resort", group: "Hotels & Resorts" },
  { value: "guesthouse", label: "Guesthouse / B&B", group: "Hotels & Resorts" },

  // 🍽️ Food & Drink
  { value: "restaurant", label: "Restaurant", group: "Food & Drink" },
  { value: "cafe", label: "Coffee Shop / Café", group: "Food & Drink" },
  { value: "bakery", label: "Bakery", group: "Food & Drink" },
  { value: "drink", label: "Bar / Drinks", group: "Food & Drink" },

  // 🛒 Shopping & Markets
  { value: "grocery", label: "Grocery", group: "Shopping & Markets" },
  { value: "supermarket", label: "Supermarket", group: "Shopping & Markets" },
  { value: "convenience", label: "Convenience Store", group: "Shopping & Markets" },
  { value: "food-market", label: "Food Market", group: "Shopping & Markets" },
  { value: "mall", label: "Mall", group: "Shopping & Markets" },
  { value: "fashion", label: "Fashion / Clothing", group: "Shopping & Markets" },
  { value: "electronics", label: "Electronics", group: "Shopping & Markets" },
  { value: "pharmacy", label: "Pharmacy", group: "Shopping & Markets" },
  { value: "hardware", label: "Hardware Store", group: "Shopping & Markets" },
  { value: "florist", label: "Florist", group: "Shopping & Markets" },
  { value: "bookstore", label: "Bookstore", group: "Shopping & Markets" },
  { value: "jewelry", label: "Jewelry", group: "Shopping & Markets" },
  { value: "pet-shop", label: "Pet Shop", group: "Shopping & Markets" },
  { value: "toys", label: "Toy Store", group: "Shopping & Markets" },
  { value: "furniture", label: "Furniture", group: "Shopping & Markets" },
  { value: "home-decor", label: "Home Decor", group: "Shopping & Markets" },
  { value: "sporting-goods", label: "Sporting Goods", group: "Shopping & Markets" },

  // 🚗 Auto
  { value: "car-rental", label: "Rental Car", group: "Auto" },
  { value: "car-dealership", label: "Car Dealership", group: "Auto" },
  { value: "auto-repair", label: "Auto Repair", group: "Auto" },
  { value: "tire-shop", label: "Tire Shop", group: "Auto" },
  { value: "auto-parts", label: "Auto Parts", group: "Auto" },
  { value: "gas-station", label: "Gas Station", group: "Auto" },

  // 💆 Beauty & Wellness
  { value: "salon", label: "Salon / Barber", group: "Beauty & Wellness" },
  { value: "spa", label: "Spa & Massage", group: "Beauty & Wellness" },
  { value: "gym", label: "Gym & Fitness", group: "Beauty & Wellness" },

  // 🧺 Services
  { value: "laundry", label: "Laundry & Dry Clean", group: "Services" },

  // Misc
  { value: "other", label: "Other", group: "Other" },
];

export const GROCERY_MARKETPLACE_CATEGORIES: StoreCategory[] = [
  "grocery",
  "supermarket",
  "convenience",
  "food-market",
  "pharmacy",
];

export function isGroceryMarketplaceCategory(category?: string | null): category is StoreCategory {
  return !!category && GROCERY_MARKETPLACE_CATEGORIES.includes(category as StoreCategory);
}

export interface StoreConfig {
  name: StoreName;
  slug: string;
  logo: string;
  edgeFunction: string;
  placeholder: string;
  emptyTitle: string;
  emptyDescription: string;
  promo?: string;
  defaultQuery: string;
  category: StoreCategory;
  /** Estimated delivery time in minutes */
  deliveryMin: number;
  /** Store rating (1-5) */
  rating: number;
  /** Store hours display */
  hours: string;
  /** Markets where this store is available (ISO country codes). Empty = all markets */
  markets?: string[];
}

export const GROCERY_STORES: StoreConfig[] = [
  {
    name: "Walmart",
    slug: "walmart",
    logo: logoWalmart,
    edgeFunction: "walmart-search",
    placeholder: "Search Walmart products…",
    emptyTitle: "Search Walmart Products",
    emptyDescription: "Search for groceries, household items, and more. A ZIVO driver will shop and deliver to your door.",
    defaultQuery: "chips soda milk bread chicken eggs cheese cookies juice water cereal pizza snacks candy ice cream coffee frozen vegetables beef bacon shrimp garden tools patio furniture toys shoes clothes detergent soap vitamins diapers dog food cat food batteries toothpaste shampoo paper towels yogurt butter rice pasta sauce",
    category: "grocery",
    deliveryMin: 35,
    rating: 4.6,
    hours: "6am–11pm",
    markets: ["US"],
  },
  {
    name: "Costco",
    slug: "costco",
    logo: logoCostco,
    edgeFunction: "costco-search",
    placeholder: "Search Costco products…",
    emptyTitle: "Search Costco Products",
    emptyDescription: "Browse Costco's bulk deals and everyday essentials. A ZIVO driver handles the shopping for you.",
    defaultQuery: "chips soda milk bread chicken eggs cheese cookies juice water cereal pizza snacks candy ice cream coffee frozen vegetables beef bacon shrimp garden tools patio furniture toys shoes clothes detergent soap vitamins diapers dog food cat food batteries toothpaste shampoo paper towels yogurt butter rice pasta sauce",
    category: "grocery",
    deliveryMin: 50,
    rating: 4.8,
    hours: "10am–8:30pm",
    markets: ["US"],
  },
  {
    name: "Target",
    slug: "target",
    logo: logoTarget,
    edgeFunction: "target-search",
    placeholder: "Search Target products…",
    emptyTitle: "Search Target Products",
    emptyDescription: "Find everyday essentials and top brands at Target. A ZIVO driver will shop and deliver to your door.",
    defaultQuery: "chips soda milk bread chicken eggs cheese cookies juice water cereal pizza snacks candy ice cream coffee frozen vegetables beef bacon shrimp garden tools patio furniture toys shoes clothes detergent soap vitamins diapers dog food cat food batteries toothpaste shampoo paper towels yogurt butter rice pasta sauce",
    category: "grocery",
    deliveryMin: 40,
    rating: 4.7,
    hours: "8am–10pm",
    markets: ["US"],
  },
  {
    name: "Kroger",
    slug: "kroger",
    logo: logoKroger,
    edgeFunction: "kroger-search",
    placeholder: "Search Kroger products…",
    emptyTitle: "Search Kroger Products",
    emptyDescription: "Shop fresh groceries and household staples from Kroger. A ZIVO driver delivers right to you.",
    defaultQuery: "chips soda milk bread chicken eggs cheese cookies juice water cereal pizza snacks candy ice cream coffee frozen vegetables beef bacon shrimp garden tools patio furniture toys shoes clothes detergent soap vitamins diapers dog food cat food batteries toothpaste shampoo paper towels yogurt butter rice pasta sauce",
    category: "grocery",
    deliveryMin: 35,
    rating: 4.5,
    hours: "6am–12am",
    markets: ["US"],
  },
];

export const DEFAULT_STORE: StoreName = "Walmart";

/** Filter stores available in a specific market (ISO country code, e.g. "US", "KH") */
export function getStoresForMarket(countryCode: string): StoreConfig[] {
  const code = countryCode.toUpperCase();
  return GROCERY_STORES.filter((s) => !s.markets || s.markets.length === 0 || s.markets.includes(code));
}

/** Look up by name */
export function getStoreConfig(name: StoreName): StoreConfig {
  return GROCERY_STORES.find((s) => s.name === name) ?? GROCERY_STORES[0];
}

/** Look up by URL slug */
export function getStoreBySlug(slug: string): StoreConfig | undefined {
  return GROCERY_STORES.find((s) => s.slug === slug);
}
