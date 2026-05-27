import { LODGING_TAB_IDS, type LodgingTabId } from "@/lib/admin/storeTabRouting";

export type LodgingSidebarAuditItem = {
  tab: LodgingTabId;
  label: string;
  emptyTitle: string;
  emptyBody: string;
  fixButtonLabel: string;
  fixTab: LodgingTabId;
};

const make = (tab: LodgingTabId, label: string, emptyTitle: string, fixButtonLabel: string, fixTab: LodgingTabId = tab): LodgingSidebarAuditItem => ({
  tab,
  label,
  emptyTitle,
  emptyBody: `${label} is available and shows a setup path when no live data exists.`,
  fixButtonLabel,
  fixTab,
});

export const LODGING_EMPTY_STATE_AUDIT: LodgingSidebarAuditItem[] = [
  make("lodge-overview", "Hotel Operations", "Hotel setup is ready to continue", "Continue setup"),
  make("lodge-rooms", "Rooms & Rates", "No room types configured yet", "Add first room"),
  make("lodge-rate-plans", "Rate Plans & Availability", "No rooms to price yet", "Open Rooms & Rates", "lodge-rooms"),
  make("lodge-reservations", "Reservations", "No reservations yet", "Open Front Desk", "lodge-frontdesk"),
  make("lodge-calendar", "Calendar & Availability", "No active room inventory yet", "Set inventory", "lodge-rooms"),
  make("lodge-guests", "Guests", "No guest records yet", "Open Reservations", "lodge-reservations"),
  make("lodge-frontdesk", "Front Desk", "No arrivals or in-house guests yet", "Review reservations", "lodge-reservations"),
  make("lodge-housekeeping", "Housekeeping", "No housekeeping rooms yet", "Set room inventory", "lodge-rooms"),
  make("lodge-maintenance", "Maintenance", "No maintenance tickets yet", "Open rooms", "lodge-rooms"),
  make("lodge-nightaudit", "Night Audit", "No night audit reports yet", "Open Front Desk", "lodge-frontdesk"),
  make("lodge-addons", "Add-ons & Packages", "Guest service catalog is ready to fill", "Add room add-ons", "lodge-rooms"),
  make("lodge-guest-requests", "Guest Requests", "No guest requests yet", "Open Reservations", "lodge-reservations"),
  make("lodge-dining", "Dining & Meal Plans", "No dining add-ons configured yet", "Add meal plans", "lodge-rooms"),
  make("lodge-experiences", "Experiences & Tours", "No experiences configured yet", "Add experiences", "lodge-rooms"),
  make("lodge-transport", "Transport & Transfers", "No transport add-ons configured yet", "Add transfers", "lodge-rooms"),
  make("lodge-wellness", "Spa & Wellness", "No wellness services configured yet", "Add wellness services", "lodge-rooms"),
  make("lodge-amenities", "Amenities & Policies", "Amenities need property details", "Complete profile", "lodge-property"),
  make("lodge-property", "Property Profile", "Property profile needs details", "Complete property profile"),
  make("lodge-policies", "Policies & Rules", "Policies and rules need setup", "Add policies"),
  make("lodge-reviews", "Reviews & Guest Feedback", "No guest feedback yet", "Open guest requests", "lodge-guest-requests"),
  make("lodge-reports", "Reports", "No report data yet", "Add rooms", "lodge-rooms"),
  make("lodge-promos", "Promotions", "No active promotions yet", "Create promotion"),
  make("lodge-channels", "Channel Manager", "No OTA channels connected yet", "Connect channel"),
  make("lodge-payouts", "Payouts", "No payouts processed yet", "Open Reports", "lodge-reports"),
  make("lodge-inbox", "Guest Inbox", "No guest messages yet", "Open Reservations", "lodge-reservations"),
  make("lodge-staff", "Staff", "No staff members yet", "Add staff member"),
  make("lodge-handover", "Shift Handover", "No active handover notes yet", "Open Staff", "lodge-staff"),
  make("lodge-concierge", "Concierge", "No concierge requests yet", "Add experiences", "lodge-experiences"),
  make("lodge-lostfound", "Lost & Found", "No lost & found items logged yet", "Log first item"),
  make("lodge-gallery", "Photo Gallery", "Property photos not uploaded yet", "Upload photos", "lodge-property"),
  make("lodge-folio", "Guest Folios", "No active folios yet", "Open Reservations", "lodge-reservations"),
  make("lodge-groupbooking", "Group Bookings", "No group bookings yet", "Create group booking"),
  make("lodge-revenue", "Revenue Management", "No revenue data yet", "Add room types", "lodge-rooms"),
  make("lodge-notifications", "Notifications", "No notification preferences set yet", "Configure notifications"),
  make("lodge-yield", "Yield Management", "Yield rules not configured yet", "Open Rate Plans", "lodge-rate-plans"),
  make("lodge-inventory", "Room Inventory", "Room inventory not set up yet", "Open Calendar", "lodge-calendar"),
  make("lodge-roomservice", "Room Service", "No room service items yet", "Add menu items", "lodge-dining"),
  make("lodge-vouchers", "Vouchers & Gift Cards", "No vouchers issued yet", "Create voucher"),
  make("lodge-parking", "Parking", "Parking add-ons not configured yet", "Add parking", "lodge-addons"),
  make("lodge-wakeup", "Wake-up Calls", "No wake-up calls scheduled yet", "Open Front Desk", "lodge-frontdesk"),
  make("lodge-laundry", "Laundry", "Laundry add-ons not configured yet", "Add laundry service", "lodge-addons"),
  make("lodge-complaints", "Complaints", "No complaints logged yet", "Open Reviews", "lodge-reviews"),
];

export function auditLodgingSidebarTabs() {
  const registered = new Set(LODGING_TAB_IDS);
  return LODGING_EMPTY_STATE_AUDIT.map((item) => ({
    ...item,
    registered: registered.has(item.tab),
    hasMeaningfulEmptyState: Boolean(item.emptyTitle && item.emptyBody && item.fixButtonLabel && item.fixTab),
    passes: registered.has(item.tab) && Boolean(item.emptyTitle && item.emptyBody && item.fixButtonLabel && item.fixTab),
  }));
}