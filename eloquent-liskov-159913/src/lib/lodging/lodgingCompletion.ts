import type { LodgeRoom } from "@/hooks/lodging/useLodgeRooms";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";

export type LodgingCompletionTab =
  | "lodge-overview" | "lodge-rooms" | "lodge-rate-plans" | "lodge-calendar" | "lodge-property"
  | "lodge-policies" | "lodge-addons" | "lodge-housekeeping" | "lodge-maintenance"
  | "lodge-reservations" | "lodge-guest-requests" | "lodge-frontdesk" | "lodge-reports"
  | "lodge-dining" | "lodge-staff" | "lodge-channels" | "lodge-promos" | "lodge-reviews";

export type LodgingCompletionItem = {
  key: string;
  label: string;
  tab: LodgingCompletionTab;
  ready: boolean;
  hint: string;
  actionLabel: string;
};

export type LodgingCompletionInput = {
  rooms: LodgeRoom[];
  profile: LodgePropertyProfile | null | undefined;
  addons: { active?: boolean; disabled?: boolean }[];
  housekeepingCount?: number;
  maintenanceReady?: boolean;
  reservationsCount?: number;
  guestRequestsCount?: number;
  reportsReady?: boolean;
  /** New Phase 5 signals */
  mealPlansCount?: number;
  staffCount?: number;
  channelConnectionsCount?: number;
  promotionsCount?: number;
  reviewsAwaitingReply?: number;
};

export function getLodgingCompletion(input: LodgingCompletionInput) {
  const {
    rooms, profile, addons, housekeepingCount = 0, maintenanceReady = false,
    reservationsCount = 0, guestRequestsCount = 0,
    mealPlansCount = 0, staffCount = 0, channelConnectionsCount = 0,
    promotionsCount = 0, reviewsAwaitingReply = 0,
  } = input;
  const activeRooms = rooms.filter((r) => r.is_active);
  const hasRooms = rooms.length > 0;
  const hasInventory = activeRooms.some((r) => (r.units_total || 0) > 0);
  const hasRates = activeRooms.some((r) => (r.base_rate_cents || 0) > 0 && (r.units_total || 0) > 0);
  const hasAvailability = activeRooms.some((r) => (r.min_stay || 1) >= 1 && (r.units_total || 0) > 0);
  const hasTimes = Boolean(profile?.check_in_from || profile?.check_out_until || rooms.some((r) => r.check_in_time || r.check_out_time));
  const hasProfile = Boolean(profile && ((profile.facilities?.length || 0) > 0 || (profile.languages?.length || 0) > 0 || (profile.contact && Object.keys(profile.contact).length > 0) || hasTimes));
  const hasPolicies = Boolean(profile?.cancellation_policy || Object.keys(profile?.house_rules || {}).length || rooms.some((r) => r.cancellation_policy));
  const activeAddons = addons.filter((a) => a.active !== false && !a.disabled).length;
  const hasReservations = reservationsCount > 0;
  const reportsReady = input.reportsReady ?? (hasReservations || hasRooms);
  const contactObj = (profile?.contact || {}) as any;
  const hasGuestEssentials = Boolean((contactObj.wifi_ssid || contactObj.wifi_password) && (contactObj.emergency_police || contactObj.emergency_medical || contactObj.emergency_fire));
  const needsStaff = rooms.length >= 5;

  const items: LodgingCompletionItem[] = [
    { key: "rooms", label: "Rooms created", tab: "lodge-rooms", ready: hasRooms, hint: "Create at least one sellable room type.", actionLabel: "Add rooms" },
    { key: "inventory", label: "Active room inventory", tab: "lodge-rooms", ready: hasInventory, hint: "Set active rooms and available unit counts.", actionLabel: "Set inventory" },
    { key: "rates", label: "Base rates", tab: "lodge-rate-plans", ready: hasRates, hint: "Add base rates to active rooms with units.", actionLabel: "Add rates" },
    { key: "availability", label: "Availability rules", tab: "lodge-calendar", ready: hasAvailability, hint: "Confirm stay rules and calendar availability.", actionLabel: "Open calendar" },
    { key: "times", label: "Check-in/check-out", tab: "lodge-property", ready: hasTimes, hint: "Set guest arrival and departure windows.", actionLabel: "Set times" },
    { key: "profile", label: "Property profile", tab: "lodge-property", ready: hasProfile, hint: "Complete facilities, contacts, languages, and highlights.", actionLabel: "Complete profile" },
    { key: "guest-essentials", label: "Guest essentials", tab: "lodge-property", ready: hasGuestEssentials, hint: "Add Wi-Fi credentials and local emergency contacts.", actionLabel: "Add essentials" },
    { key: "policies", label: "Policies & rules", tab: "lodge-policies", ready: hasPolicies, hint: "Add cancellation policy and house rules.", actionLabel: "Add policies" },
    { key: "meal-plans", label: "Dining & meal plans", tab: "lodge-dining", ready: mealPlansCount > 0, hint: "Offer breakfast, half-board, or all-inclusive plans.", actionLabel: "Open dining" },
    { key: "addons", label: "Add-ons & packages", tab: "lodge-addons", ready: activeAddons > 0, hint: "Create guest extras, transfers, meals, tours, or services.", actionLabel: "Add services" },
    { key: "staff", label: "Hotel staff", tab: "lodge-staff", ready: !needsStaff || staffCount > 0, hint: "Assign front-desk and housekeeping team members.", actionLabel: "Open staff" },
    { key: "housekeeping", label: "Housekeeping board", tab: "lodge-housekeeping", ready: housekeepingCount > 0, hint: "Populate room status tracking for operations.", actionLabel: "Open housekeeping" },
    { key: "channels", label: "Channel manager", tab: "lodge-channels", ready: channelConnectionsCount > 0, hint: "Connect Booking.com, Airbnb, and other OTAs via iCal.", actionLabel: "Open channels" },
    { key: "promotions", label: "Promotions & discounts", tab: "lodge-promos", ready: promotionsCount > 0, hint: "Drive direct bookings with promo codes and seasonal offers.", actionLabel: "Open promotions" },
    { key: "reports", label: "Reports readiness", tab: "lodge-reports", ready: reportsReady, hint: "Revenue and occupancy reports can run after rooms or reservations exist.", actionLabel: "Open reports" },
  ];

  const complete = items.filter((item) => item.ready).length;
  const incomplete = items.filter((item) => !item.ready);

  // New NBA priority chain (Phase 5).
  const byKey = (k: string) => items.find(i => i.key === k)!;
  let nextBestAction: LodgingCompletionItem;
  if (!hasRooms) nextBestAction = byKey("rooms");
  else if (!hasRates || !hasInventory) nextBestAction = byKey("rates");
  else if (!hasGuestEssentials) nextBestAction = byKey("guest-essentials");
  else if (mealPlansCount === 0) nextBestAction = byKey("meal-plans");
  else if (needsStaff && staffCount === 0) nextBestAction = byKey("staff");
  else if (channelConnectionsCount === 0) nextBestAction = byKey("channels");
  else if (promotionsCount === 0) nextBestAction = byKey("promotions");
  else if (reviewsAwaitingReply > 0) nextBestAction = { key: "reviews", label: "Reviews waiting", tab: "lodge-reviews", ready: false, hint: `${reviewsAwaitingReply} review${reviewsAwaitingReply === 1 ? "" : "s"} need a reply.`, actionLabel: "Reply to reviews" };
  else if (!hasProfile) nextBestAction = byKey("profile");
  else if (activeAddons === 0) nextBestAction = byKey("addons");
  else if (!hasReservations && guestRequestsCount === 0) nextBestAction = { key: "guest-requests", label: "Guest Requests", tab: "lodge-guest-requests", ready: false, hint: "Open the request workspace and reservation follow-up queue.", actionLabel: "Open guest requests" };
  else nextBestAction = { key: "frontdesk", label: "Front Desk", tab: "lodge-frontdesk", ready: true, hint: "Run arrivals, in-house guests, departures, folios, and service follow-up.", actionLabel: "Open front desk" };

  return {
    items,
    complete,
    total: items.length,
    percent: items.length ? Math.round((complete / items.length) * 100) : 0,
    readyItems: items.filter((item) => item.ready),
    incompleteItems: incomplete,
    nextBestAction,
    status: incomplete.length === 0 ? "Complete" : hasRooms && hasRates ? "Needs setup data" : "Needs attention",
  };
}

