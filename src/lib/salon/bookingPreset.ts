/**
 * Cross-tab handoff: lets one salon tab queue up a "new booking" dialog
 * pre-filled with values for the Bookings tab to consume. Used by Waitlist
 * → Bookings ("Book now") and (later) Walk-ins → Bookings if needed.
 *
 * Backed by sessionStorage so a hard refresh in between doesn't replay it.
 */

const KEY = "zivo:salon:newBookingPreset";

export interface SalonBookingPreset {
  client_id?: string | null;
  client_name?: string;
  client_phone?: string;
  service_id?: string;
  stylist_id?: string;
  /** When set, the booking dialog will mark this waitlist row as 'booked' on save. */
  waitlist_id?: string;
}

export function writeBookingPreset(preset: SalonBookingPreset) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(preset));
  } catch {
    // sessionStorage may be unavailable (incognito quirks) — fail silent.
  }
}

export function consumeBookingPreset(): SalonBookingPreset | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as SalonBookingPreset;
  } catch {
    return null;
  }
}
