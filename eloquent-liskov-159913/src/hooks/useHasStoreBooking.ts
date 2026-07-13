/**
 * useHasStoreBooking
 * Returns whether the current authenticated user has at least one
 * confirmed/completed booking or order at the given store.
 *
 * Match surface (any of):
 *   Lodge: guest_user_id = auth.uid()  OR  guest_email ILIKE auth.email
 *   Food:  user_id = auth.uid()        OR  customer_email ILIKE auth.email
 *
 * All branches run in parallel via Promise.allSettled so one failing
 * branch (schema drift) does not break the whole check.
 *
 * Persistence: result is cached per (userId, storeId) in localStorage with
 * a 24h TTL so the UI does not flicker between locked → unlocked on refresh.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LODGE_OK = ["confirmed", "checked_in", "checked_out", "completed"];
const FOOD_OK = ["delivered", "completed", "ready", "preparing", "confirmed"];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type StoreBookingSource =
  | "lodge_reservation"
  | "food_order"
  | null;

export interface HasStoreBookingResult {
  hasBooking: boolean;
  source: StoreBookingSource;
}

const ok = (r: PromiseSettledResult<any>) =>
  r.status === "fulfilled" && Array.isArray(r.value?.data) && r.value.data.length > 0;

const cacheKey = (userId: string, storeId: string) =>
  `zivo:store-unlock:${userId}:${storeId}`;

/**
 * Wipe the cached unlock state for a (user, store) pair so the next query
 * goes back to the network. Useful when the user just completed a booking
 * and wants to force-refresh without waiting for the natural staleTime.
 */
export function clearStoreBookingCache(userId: string | undefined, storeId: string | undefined) {
  if (!userId || !storeId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(cacheKey(userId, storeId));
  } catch {
    /* ignore */
  }
}

function readCache(userId: string | undefined, storeId: string | undefined): HasStoreBookingResult | undefined {
  if (!userId || !storeId || typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(cacheKey(userId, storeId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { ts: number; value: HasStoreBookingResult };
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

function writeCache(userId: string | undefined, storeId: string | undefined, value: HasStoreBookingResult) {
  if (!userId || !storeId || typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(userId, storeId), JSON.stringify({ ts: Date.now(), value }));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useHasStoreBooking(storeId: string | undefined) {
  // Read sync user id (best-effort) so initialData can hydrate immediately.
  let initialUserId: string | undefined;
  try {
    if (typeof window !== "undefined") {
      // Supabase v2 stores session under sb-<ref>-auth-token; we don't know the ref here,
      // so scan for any matching key.
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            initialUserId = parsed?.user?.id || parsed?.currentSession?.user?.id;
            if (initialUserId) break;
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  const initialData = readCache(initialUserId, storeId);

  return useQuery<HasStoreBookingResult>({
    queryKey: ["has-store-booking", storeId],
    enabled: !!storeId,
    staleTime: 60_000,
    initialData,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!session?.access_token || !user || !storeId) return { hasBooking: false, source: null };
      const email = (user.email || "").toLowerCase();

      const sb: any = supabase;

      const lodgeByUser = sb
        .from("lodge_reservations")
        .select("id")
        .eq("store_id", storeId)
        .eq("guest_user_id", user.id)
        .in("status", LODGE_OK)
        .limit(1);

      const lodgeByEmail = email
        ? sb
            .from("lodge_reservations")
            .select("id")
            .eq("store_id", storeId)
            .ilike("guest_email", email)
            .in("status", LODGE_OK)
            .limit(1)
        : Promise.resolve({ data: [] });

      const foodByUser = sb
        .from("food_orders")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .in("status", FOOD_OK)
        .limit(1);

      const foodByEmail = email
        ? sb
            .from("food_orders")
            .select("id")
            .eq("store_id", storeId)
            .ilike("customer_email", email)
            .in("status", FOOD_OK)
            .limit(1)
        : Promise.resolve({ data: [] });

      const [lU, lE, fU, fE] = await Promise.allSettled([
        lodgeByUser,
        lodgeByEmail,
        foodByUser,
        foodByEmail,
      ]);

      let result: HasStoreBookingResult = { hasBooking: false, source: null };
      if (ok(lU) || ok(lE)) result = { hasBooking: true, source: "lodge_reservation" };
      else if (ok(fU) || ok(fE)) result = { hasBooking: true, source: "food_order" };

      writeCache(user.id, storeId, result);
      return result;
    },
  });
}
