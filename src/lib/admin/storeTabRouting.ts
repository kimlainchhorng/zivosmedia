export const LODGING_TAB_IDS = ["lodge-overview", "lodge-rooms", "lodge-rate-plans", "lodge-reservations", "lodge-calendar", "lodge-guests", "lodge-frontdesk", "lodge-housekeeping", "lodge-maintenance", "lodge-nightaudit", "lodge-addons", "lodge-guest-requests", "lodge-dining", "lodge-experiences", "lodge-transport", "lodge-wellness", "lodge-amenities", "lodge-property", "lodge-policies", "lodge-reviews", "lodge-reports", "lodge-promos", "lodge-channels", "lodge-payouts", "lodge-inbox", "lodge-staff", "lodge-handover", "lodge-concierge", "lodge-lostfound", "lodge-gallery", "lodge-folio", "lodge-groupbooking", "lodge-revenue", "lodge-notifications", "lodge-yield", "lodge-inventory", "lodge-roomservice", "lodge-vouchers", "lodge-parking", "lodge-wakeup", "lodge-laundry", "lodge-complaints"] as const;
export const AUTO_REPAIR_TAB_IDS = [
  "ar-dashboard",
  "ar-service-catalog",
  "ar-invoices",
  "ar-autocheck",
  "ar-parts",
  "ar-inspections",
  "ar-vehicles",
  "ar-estimates",
  "ar-workorders",
  "ar-labor-time",
  "ar-techs",
  "ar-reminders",
  "ar-tires",
  "ar-parts-suppliers",
  "ar-warranty",
  "ar-fleet",
  "ar-loaners",
  "ar-photos",
  "ar-reviews",
  "ar-inbox",
  "ar-promos",
  "ar-campaigns",
  "ar-gift-cards",
  "ar-customer-notes",
  "ar-booking-link",
  "ar-qr",
  "ar-reports",
  "ar-fin-income",
  "ar-fin-expenses",
  "ar-fin-payments",
  "ar-fin-pnl",
  "ar-fin-tax",
] as const;
export const SALON_TAB_IDS = [
  "salon-dashboard",
  "salon-bookings",
  "salon-walkins",
  "salon-waitlist",
  "salon-services",
  "salon-packages",
  "salon-retail",
  "salon-stylists",
  "salon-schedules",
  "salon-timeclock",
  "salon-commissions",
  "salon-clients",
  "salon-history",
  "salon-loyalty",
  "salon-gift-cards",
  "salon-reviews",
  "salon-income",
  "salon-expenses",
  "salon-reports",
] as const;
export const CAR_RENTAL_TAB_IDS = [
  "car-rental-dashboard",
  "car-rental-reservations",
  "car-rental-fleet",
  "car-rental-rates",
  "car-rental-addons",
  "car-rental-locations",
  "car-rental-customers",
  "car-rental-checkout",
  "car-rental-returns",
  "car-rental-maintenance",
  "car-rental-reviews",
  "car-rental-promotions",
  "car-rental-income",
  "car-rental-expenses",
  "car-rental-reports",
] as const;
export const CAR_DEALERSHIP_TAB_IDS = [
  "cd-dashboard",
  "cd-inventory",
  "cd-leads",
  "cd-test-drives",
  "cd-sales",
  "cd-customers",
  "cd-financing",
  "cd-trade-ins",
  "cd-reviews",
  "cd-promotions",
  "cd-income",
  "cd-expenses",
  "cd-reports",
] as const;
export const CAFE_TAB_IDS = [
  "cafe-dashboard",
  "cafe-orders",
  "cafe-kds",
  "cafe-tables",
  "cafe-menu",
  "cafe-modifiers",
  "cafe-inventory",
  "cafe-recipes",
  "cafe-purchasing",
  "cafe-customers",
  "cafe-loyalty",
  "cafe-gift-cards",
  "cafe-promotions",
  "cafe-reviews",
  "cafe-baristas",
  "cafe-shifts",
  "cafe-timeclock",
  "cafe-tips",
  "cafe-payment",
  "cafe-income",
  "cafe-expenses",
  "cafe-reports",
] as const;
export const BASE_TAB_IDS = ["profile", "orders", "products", "payment", "settings", "customers", "marketing", "livestream", "software", "employees", "payroll", "employee-schedule", "time-clock", "attendance", "training", "documents", "employee-rules", "customer-bookings"] as const;

export type LodgingTabId = typeof LODGING_TAB_IDS[number];
export type AutoRepairTabId = typeof AUTO_REPAIR_TAB_IDS[number];
export type SalonTabId = typeof SALON_TAB_IDS[number];
export type CafeTabId = typeof CAFE_TAB_IDS[number];
export type CarRentalTabId = typeof CAR_RENTAL_TAB_IDS[number];
export type CarDealershipTabId = typeof CAR_DEALERSHIP_TAB_IDS[number];
export type BaseTabId = typeof BASE_TAB_IDS[number];

export const isLodgingTab = (tab?: string | null): tab is LodgingTabId => Boolean(tab && (LODGING_TAB_IDS as readonly string[]).includes(tab));
export const isAutoRepairTab = (tab?: string | null): tab is AutoRepairTabId => Boolean(tab && (AUTO_REPAIR_TAB_IDS as readonly string[]).includes(tab));
export const isSalonTab = (tab?: string | null): tab is SalonTabId => Boolean(tab && (SALON_TAB_IDS as readonly string[]).includes(tab));
export const isCafeTab = (tab?: string | null): tab is CafeTabId => Boolean(tab && (CAFE_TAB_IDS as readonly string[]).includes(tab));
export const isCarRentalTab = (tab?: string | null): tab is CarRentalTabId => Boolean(tab && (CAR_RENTAL_TAB_IDS as readonly string[]).includes(tab));
export const isCarDealershipTab = (tab?: string | null): tab is CarDealershipTabId => Boolean(tab && (CAR_DEALERSHIP_TAB_IDS as readonly string[]).includes(tab));
export const isBaseStoreTab = (tab?: string | null): tab is BaseTabId => Boolean(tab && (BASE_TAB_IDS as readonly string[]).includes(tab));
export const isKnownStoreTab = (tab?: string | null) => isLodgingTab(tab) || isAutoRepairTab(tab) || isSalonTab(tab) || isCafeTab(tab) || isCarRentalTab(tab) || isCarDealershipTab(tab) || isBaseStoreTab(tab);

export function getTabFromSearch(search: string | URLSearchParams | null | undefined) {
  if (!search) return null;
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  return params.get("tab");
}

export function resolveStoreTab(requestedTab: string | null | undefined, isLodgingStore: boolean, isAutoRepairStore = false, isSalonStore = false, isCafeStore = false, isCarRentalStore = false, isCarDealershipStore = false) {
  const moduleDefault = () => (
    isLodgingStore ? "lodge-overview"
    : isAutoRepairStore ? "ar-dashboard"
    : isSalonStore ? "salon-dashboard"
    : isCafeStore ? "cafe-dashboard"
    : isCarRentalStore ? "car-rental-dashboard"
    : isCarDealershipStore ? "cd-dashboard"
    : "profile"
  );
  if (!requestedTab) return moduleDefault();
  if (isLodgingTab(requestedTab)) return isLodgingStore ? requestedTab : "profile";
  if (isAutoRepairTab(requestedTab)) return isAutoRepairStore ? requestedTab : "profile";
  if (isSalonTab(requestedTab)) return isSalonStore ? requestedTab : "profile";
  if (isCafeTab(requestedTab)) return isCafeStore ? requestedTab : "profile";
  if (isCarRentalTab(requestedTab)) return isCarRentalStore ? requestedTab : "profile";
  if (isCarDealershipTab(requestedTab)) return isCarDealershipStore ? requestedTab : "profile";
  if (isBaseStoreTab(requestedTab)) return requestedTab;
  return moduleDefault();
}

export function resolveStoreTabFromSearch(search: string | URLSearchParams | null | undefined, isLodgingStore: boolean, isAutoRepairStore = false, isSalonStore = false, isCafeStore = false, isCarRentalStore = false, isCarDealershipStore = false) {
  return resolveStoreTab(getTabFromSearch(search), isLodgingStore, isAutoRepairStore, isSalonStore, isCafeStore, isCarRentalStore, isCarDealershipStore);
}

export function buildStoreTabUrl(storeId: string, tab: string) {
  return `/admin/stores/${encodeURIComponent(storeId)}?tab=${encodeURIComponent(tab)}`;
}
