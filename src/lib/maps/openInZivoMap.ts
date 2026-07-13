/**
 * openInZivoMap — open a location/destination inside the ZIVO app instead of
 * bouncing the user out to Google or Apple Maps. Customer-facing flows
 * (hotel pages, store listings, grocery, chat location shares, etc.) call
 * this so the map experience stays inside the app — the user can either
 * book a ride to the destination or just view the route.
 *
 * Driver navigation and admin tools should still use `openDirections` /
 * `openExternalUrl` directly because those flows need turn-by-turn from
 * Google Maps / Apple Maps / Waze.
 */
import type { NavigateFunction } from "react-router-dom";

export interface ZivoMapTarget {
  /** Optional latitude — when both lat/lng are present the route map can
   *  render the destination pin directly. */
  lat?: number | null;
  lng?: number | null;
  /** Human-readable label shown as the destination ("ARK House", "Phnom
   *  Penh", "Independence Monument"). Used as fallback when coords are
   *  missing. */
  label?: string | null;
  /** Postal address — falls back to this for the destination text if no
   *  label is supplied. */
  address?: string | null;
  /** Optional pickup origin (e.g. the hotel the user is currently viewing).
   *  When omitted the ride hub uses the user's current location. */
  pickup?: {
    lat?: number | null;
    lng?: number | null;
    name?: string | null;
  };
  /** Where to focus on the store map instead. If provided we land on
   *  /store-map?focus={storeId} which shows the property pin on the
   *  general explore-stores map. Used by "View on map" buttons that aren't
   *  about routing somewhere. */
  storeId?: string | null;
}

function withDest(target: ZivoMapTarget): string {
  const destText = target.label || target.address || "";
  let qs = `?tab=book`;
  if (destText) qs += `&destination=${encodeURIComponent(destText)}`;
  if (typeof target.lat === "number" && typeof target.lng === "number") {
    qs += `&destLat=${target.lat}&destLng=${target.lng}`;
  }
  if (target.pickup) {
    if (typeof target.pickup.lat === "number" && typeof target.pickup.lng === "number") {
      qs += `&pickupLat=${target.pickup.lat}&pickupLng=${target.pickup.lng}`;
    }
    if (target.pickup.name) {
      qs += `&pickup=${encodeURIComponent(target.pickup.name)}`;
    }
  }
  return `/rides/hub${qs}`;
}

/**
 * Build the ride-hub URL for a destination without doing the navigation.
 * Useful when you need an `href` (e.g. on a `<Link>`).
 */
export function zivoRouteUrl(target: ZivoMapTarget): string {
  if (target.storeId) {
    return `/store-map?focus=${encodeURIComponent(target.storeId)}`;
  }
  return withDest(target);
}

/**
 * Navigate to the ride hub with the destination pre-filled — user can view
 * the route or book a ride from there.
 */
export function openInZivoMap(navigate: NavigateFunction, target: ZivoMapTarget): void {
  navigate(zivoRouteUrl(target));
}
