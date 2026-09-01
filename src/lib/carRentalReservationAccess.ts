import { supabase as typedSupabase } from "@/integrations/supabase/client";

const supabase: any = typedSupabase;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export type CarRentalReservationAccessScope = "manage" | "review";

type IssuedAccess = {
  token: string | null;
  expiresAt: string | null;
};

const storageKey = (
  reservationId: string,
  scope: CarRentalReservationAccessScope,
) => `zivo:car-rental-reservation-access:${scope}:${reservationId}`;

const normalizeToken = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return CAPABILITY_RE.test(token) ? token : null;
};

export const isCarRentalReservationAccessToken = (
  value: unknown,
): value is string => normalizeToken(value) !== null;

/**
 * Read a capability from #cap=..., retain it only for this browser tab, and
 * immediately remove the fragment from the visible URL/history. Fragments do
 * not reach the server; sessionStorage preserves the secret across same-tab
 * navigation without turning it into a durable credential.
 */
export const readCarRentalReservationAccessToken = (
  reservationId: string,
  scope: CarRentalReservationAccessScope,
): string | null => {
  if (typeof window === "undefined" || !reservationId) return null;

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
    window.sessionStorage.setItem(
      storageKey(reservationId, scope),
      fragmentToken,
    );
    return fragmentToken;
  }

  return normalizeToken(
    window.sessionStorage.getItem(storageKey(reservationId, scope)),
  );
};

export const persistCarRentalReservationAccessToken = (
  reservationId: string,
  scope: CarRentalReservationAccessScope,
  token: string | null,
) => {
  if (typeof window === "undefined" || !reservationId) return;
  const normalized = normalizeToken(token);
  if (normalized) {
    window.sessionStorage.setItem(storageKey(reservationId, scope), normalized);
  }
};

export const buildCarRentalReservationAccessPath = (
  reservationId: string,
  destination: "booking" | "review",
  token: string | null,
) => {
  const route =
    destination === "booking" ? "car-rental-booking" : "car-rental-review";
  const path = `/${route}/${encodeURIComponent(reservationId)}`;
  const normalized = normalizeToken(token);
  return normalized ? `${path}#cap=${encodeURIComponent(normalized)}` : path;
};

const firstRow = (data: unknown) => {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object"
    ? (row as { access_token?: unknown; expires_at?: unknown })
    : null;
};

export const issueCarRentalReservationAccess = async (
  reservationId: string,
  scope: CarRentalReservationAccessScope,
): Promise<IssuedAccess> => {
  const { data, error } = await supabase.rpc(
    "car_rental_issue_reservation_access",
    {
      p_reservation_id: reservationId,
      p_scope: scope,
    },
  );
  if (error) throw new Error("Could not create a secure customer link.");
  const row = firstRow(data);
  if (!row) throw new Error("Could not create a secure customer link.");
  return {
    token: normalizeToken(row?.access_token),
    expiresAt: typeof row?.expires_at === "string" ? row.expires_at : null,
  };
};
