import { buildStoreTabUrl, resolveStoreTabFromSearch, type LodgingTabId } from "@/lib/admin/storeTabRouting";
import type { LodgingQaCheck } from "@/lib/lodging/lodgingQa";

export type FrontDeskOperationalStats = {
  arrivals: number;
  inHouse: number;
  departures: number;
  activeReservations: number;
  openGuestRequests: number;
};

type ReservationLike = { check_in: string; check_out: string; status: string };

export function todayYmd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getFrontDeskOperationalStats(reservations: ReservationLike[], openGuestRequests = 0, today = todayYmd()): FrontDeskOperationalStats {
  return {
    arrivals: reservations.filter((r) => r.check_in === today && ["confirmed", "hold"].includes(r.status)).length,
    inHouse: reservations.filter((r) => r.status === "checked_in" && r.check_in <= today && r.check_out > today).length,
    departures: reservations.filter((r) => r.check_out === today && r.status === "checked_in").length,
    activeReservations: reservations.filter((r) => !["cancelled", "checked_out", "no_show"].includes(r.status)).length,
    openGuestRequests,
  };
}

export function runFrontDeskQa({ storeId = "preview-store", stats, hasPrimaryActions = true, hasSecondaryActions = true, baseUrl = "" }: { storeId?: string; stats: FrontDeskOperationalStats; hasPrimaryActions?: boolean; hasSecondaryActions?: boolean; baseUrl?: string }): LodgingQaCheck[] {
  const frontDeskUrl = `${baseUrl}${buildStoreTabUrl(storeId, "lodge-frontdesk")}`;
  const checks: LodgingQaCheck[] = [
    { id: "frontdesk-route", name: "Front Desk route", status: "pass", detail: `Front Desk opens at ${frontDeskUrl}.`, category: "route", fixTab: "lodge-frontdesk" as LodgingTabId, url: frontDeskUrl },
    { id: "frontdesk-tab-resolution", name: "Front Desk deep-link resolution", status: resolveStoreTabFromSearch("?tab=lodge-frontdesk", true) === "lodge-frontdesk" ? "pass" : "fail", detail: "?tab=lodge-frontdesk resolves directly to the Front Desk panel.", category: "route", fixTab: "lodge-frontdesk" as LodgingTabId, url: frontDeskUrl },
    { id: "frontdesk-live-stats", name: "Live Front Desk stats", status: Number.isFinite(stats.activeReservations + stats.openGuestRequests) ? "pass" : "fail", detail: `Stats computed: ${stats.arrivals} arrivals, ${stats.inHouse} in-house, ${stats.departures} departures, ${stats.activeReservations} active, ${stats.openGuestRequests} requests.`, category: "system", fixTab: "lodge-frontdesk" as LodgingTabId },
    { id: "frontdesk-empty-primary-actions", name: "Front Desk primary empty-state actions", status: hasPrimaryActions ? "pass" : "fail", detail: "Empty Front Desk columns include primary setup routing to reservations, rooms, or guest requests.", category: "empty-state", fixTab: "lodge-reservations" as LodgingTabId },
    { id: "frontdesk-empty-secondary-actions", name: "Front Desk secondary empty-state actions", status: hasSecondaryActions ? "pass" : "fail", detail: "Empty Front Desk columns include secondary routing to rooms, rate plans, and guest requests.", category: "empty-state", fixTab: "lodge-rooms" as LodgingTabId },
  ];

  if (stats.activeReservations === 0) checks.push({ id: "frontdesk-no-live-reservations", name: "No live Front Desk reservation data", status: "warning", detail: "No active reservations are present yet. This is setup data, not a system failure.", category: "setup", fixTab: "lodge-reservations" as LodgingTabId });
  if (stats.openGuestRequests === 0) checks.push({ id: "frontdesk-no-guest-requests", name: "No open guest requests", status: "warning", detail: "No pending guest requests are present yet. Guest request workflow is installed and ready.", category: "setup", fixTab: "lodge-guest-requests" as LodgingTabId });
  return checks;
}