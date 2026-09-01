import { supabase as typedSupabase } from "@/integrations/supabase/client";

const supabase: any = typedSupabase;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export type SalonBookingLinkScope = "manage" | "review";
export type SalonBookingActionScope = "deposit" | "tip";

type IssuedAccess = {
  token: string | null;
  expiresAt: string | null;
};

const storageKey = (bookingId: string, scope: SalonBookingLinkScope) =>
  `zivo:salon-booking-access:${scope}:${bookingId}`;

const normalizeToken = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return CAPABILITY_RE.test(token) ? token : null;
};

/**
 * Read a capability from #cap=..., retain it only for this browser tab, and
 * remove it from the visible URL/history immediately. Fragments never reach
 * the server, and sessionStorage lets a Stripe round-trip return to the same
 * tab without putting the secret into a Stripe redirect URL.
 */
export const readSalonBookingAccessToken = (
  bookingId: string,
  scope: SalonBookingLinkScope,
): string | null => {
  if (typeof window === "undefined" || !bookingId) return null;

  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fragmentToken = normalizeToken(fragment.get("cap"));
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  if (fragmentToken) {
    window.sessionStorage.setItem(storageKey(bookingId, scope), fragmentToken);
    return fragmentToken;
  }

  return normalizeToken(
    window.sessionStorage.getItem(storageKey(bookingId, scope)),
  );
};

export const persistSalonBookingAccessToken = (
  bookingId: string,
  scope: SalonBookingLinkScope,
  token: string | null,
) => {
  if (typeof window === "undefined" || !bookingId) return;
  const normalized = normalizeToken(token);
  if (normalized) {
    window.sessionStorage.setItem(storageKey(bookingId, scope), normalized);
  }
};

export const buildSalonBookingAccessPath = (
  bookingId: string,
  destination: "booking" | "review",
  token: string | null,
) => {
  const path = `/${destination}/${encodeURIComponent(bookingId)}`;
  const normalized = normalizeToken(token);
  return normalized ? `${path}#cap=${encodeURIComponent(normalized)}` : path;
};

const firstRow = (data: unknown) =>
  (Array.isArray(data) ? data[0] : null) as {
    access_token?: unknown;
    expires_at?: unknown;
  } | null;

export const issueSalonBookingAccess = async (
  bookingId: string,
  scope: SalonBookingLinkScope,
): Promise<IssuedAccess> => {
  const { data, error } = await supabase.rpc("salon_issue_booking_access", {
    p_booking_id: bookingId,
    p_scope: scope,
  });
  if (error) throw new Error("Could not create a secure customer link.");
  const row = firstRow(data);
  return {
    token: normalizeToken(row?.access_token),
    expiresAt: typeof row?.expires_at === "string" ? row.expires_at : null,
  };
};

export const exchangeSalonBookingActionAccess = async (
  bookingId: string,
  manageToken: string | null,
  scope: SalonBookingActionScope,
): Promise<IssuedAccess> => {
  const { data, error } = await supabase.rpc("salon_exchange_booking_access", {
    p_booking_id: bookingId,
    p_manage_token: normalizeToken(manageToken),
    p_scope: scope,
  });
  if (error) throw new Error("This secure booking link is invalid or expired.");
  const row = firstRow(data);
  return {
    token: normalizeToken(row?.access_token),
    expiresAt: typeof row?.expires_at === "string" ? row.expires_at : null,
  };
};
