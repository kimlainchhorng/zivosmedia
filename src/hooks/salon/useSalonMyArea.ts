/**
 * useSalonMyArea — feeds the /salon/me portal page.
 *
 * Single hook that pulls four parallel queries for the logged-in user:
 *   1) salons they have any history with (via salon_portal_my_salons RPC)
 *   2) their upcoming + past bookings (via direct SELECT on salon_bookings;
 *      RLS scopes to bookings where client_id maps to a salon_clients row
 *      with user_id = auth.uid())
 *   3) loyalty events on those same client rows
 *   4) gift cards where recipient_user_id = auth.uid()
 *
 * RLS handles all scoping — no .eq("user_id", uid) is required on the
 * frontend. Realtime subscriptions on salon_bookings + salon_gift_cards keep
 * the portal fresh if the salon owner edits a booking or issues a new card.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SalonBookingStatus } from "@/hooks/salon/useSalonBookings";

export interface MyAreaSalon {
  store_id: string;
  store_name: string;
  store_slug: string;
  logo_url: string | null;
  client_id: string;
  visits_count: number;
  total_spent_cents: number;
  last_visit_at: string | null;
  loyalty_points: number;
  // Filled in by the hook after the booking + preferences fetches.
  sms_opt_in?: boolean;
  email_opt_in?: boolean;
  marketing_opt_in?: boolean;
}

export interface MyAreaBooking {
  id: string;
  store_id: string;
  store_name: string;
  client_id: string;
  service_name: string;
  stylist_name: string | null;
  start_at: string;
  end_at: string;
  status: SalonBookingStatus;
  price_cents: number;
  addons_total_cents: number;
  service_id: string | null;
  store_slug: string;
}

export interface MyAreaLoyaltyEvent {
  id: string;
  store_id: string;
  client_id: string;
  event_type: string;
  points_delta: number;
  reason: string | null;
  created_at: string;
}

export interface MyAreaGiftCard {
  id: string;
  store_id: string;
  code: string;
  initial_cents: number;
  balance_cents: number;
  expires_at: string | null;
  is_active: boolean;
  recipient_name: string | null;
  purchaser_name: string | null;
  message: string | null;
  store_name: string;
}

interface UseResult {
  loading: boolean;
  error: string | null;
  salons: MyAreaSalon[];
  upcoming: MyAreaBooking[];
  past: MyAreaBooking[];
  loyalty: MyAreaLoyaltyEvent[];
  giftCards: MyAreaGiftCard[];
  refresh: () => Promise<void>;
}

export function useSalonMyArea(): UseResult {
  const { user, isLoading: authLoading } = useAuth();
  const [salons, setSalons] = useState<MyAreaSalon[]>([]);
  const [upcoming, setUpcoming] = useState<MyAreaBooking[]>([]);
  const [past, setPast] = useState<MyAreaBooking[]>([]);
  const [loyalty, setLoyalty] = useState<MyAreaLoyaltyEvent[]>([]);
  const [giftCards, setGiftCards] = useState<MyAreaGiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);

    try {
      // Fetch the cross-store overview first — gives us the client_id list we
      // need to enrich bookings/loyalty with store metadata.
      const { data: salonsData, error: salonsErr } = await supabase
        .rpc("salon_portal_my_salons");
      if (salonsErr) throw salonsErr;
      const salonRows = (salonsData ?? []) as unknown as MyAreaSalon[];

      // Pull per-salon opt-in state for the preferences card. salon_clients
      // RLS lets the user read their own row (policy "Clients can view their
      // own row" already exists in the original migration).
      const { data: prefs } = await supabase
        .from("salon_clients")
        .select("id, sms_opt_in, email_opt_in, marketing_opt_in")
        .eq("user_id", user.id);
      const prefByClient = new Map<string, { sms_opt_in: boolean; email_opt_in: boolean; marketing_opt_in: boolean }>();
      for (const p of (prefs ?? []) as any[]) {
        prefByClient.set(p.id, { sms_opt_in: p.sms_opt_in, email_opt_in: p.email_opt_in, marketing_opt_in: p.marketing_opt_in });
      }
      const enrichedSalons: MyAreaSalon[] = salonRows.map((s) => ({
        ...s,
        ...prefByClient.get(s.client_id),
      }));
      setSalons(enrichedSalons);

      // Build a store-id → metadata map for booking enrichment.
      const storeMeta = new Map<string, { name: string; slug: string }>();
      for (const s of salonRows) storeMeta.set(s.store_id, { name: s.store_name, slug: s.store_slug });

      // Bookings — RLS scopes to ones the user can see; we just need to
      // partition into upcoming/past. Pull all (limited) and sort below.
      const { data: bookings, error: bErr } = await supabase
        .from("salon_bookings")
        .select("id, store_id, client_id, service_id, service_name, stylist_name, start_at, end_at, status, price_cents, addons_total_cents")
        .order("start_at", { ascending: false })
        .limit(100);
      if (bErr) throw bErr;
      const now = Date.now();
      const up: MyAreaBooking[] = [];
      const pa: MyAreaBooking[] = [];
      for (const b of (bookings ?? []) as any[]) {
        const meta = storeMeta.get(b.store_id);
        const row: MyAreaBooking = {
          id: b.id,
          store_id: b.store_id,
          store_name: meta?.name ?? "Salon",
          store_slug: meta?.slug ?? "",
          client_id: b.client_id,
          service_name: b.service_name,
          stylist_name: b.stylist_name,
          start_at: b.start_at,
          end_at: b.end_at,
          status: b.status,
          price_cents: b.price_cents,
          addons_total_cents: b.addons_total_cents ?? 0,
          service_id: b.service_id,
        };
        const isFuture = new Date(b.start_at).getTime() > now;
        const isActive = b.status === "pending" || b.status === "confirmed";
        if (isFuture && isActive) up.push(row);
        else pa.push(row);
      }
      up.sort((a, b) => a.start_at.localeCompare(b.start_at));
      setUpcoming(up);
      setPast(pa.slice(0, 50));

      // Loyalty events (RLS-scoped to the user's client rows).
      const { data: events, error: lErr } = await supabase
        .from("salon_loyalty_events")
        .select("id, store_id, client_id, event_type, points_delta, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (lErr) throw lErr;
      setLoyalty((events ?? []) as unknown as MyAreaLoyaltyEvent[]);

      // Gift cards (RLS-scoped via recipient_user_id).
      const { data: cards, error: gErr } = await supabase
        .from("salon_gift_cards")
        .select("id, store_id, code, initial_cents, balance_cents, expires_at, is_active, recipient_name, purchaser_name, message")
        .order("created_at", { ascending: false });
      if (gErr) throw gErr;
      // Enrich gift cards with store name; salons array doesn't include
      // stores the user hasn't booked at, so fetch store names for any
      // missing stores in one query.
      const cardRows = (cards ?? []) as any[];
      const missingStores = cardRows
        .map((c) => c.store_id as string)
        .filter((id) => !storeMeta.has(id));
      if (missingStores.length > 0) {
        const { data: extra } = await supabase
          .from("store_profiles")
          .select("id, name, slug")
          .in("id", missingStores);
        for (const s of (extra ?? []) as any[]) {
          storeMeta.set(s.id, { name: s.name, slug: s.slug });
        }
      }
      setGiftCards(cardRows.map((c) => ({
        id: c.id,
        store_id: c.store_id,
        code: c.code,
        initial_cents: c.initial_cents,
        balance_cents: c.balance_cents,
        expires_at: c.expires_at,
        is_active: c.is_active,
        recipient_name: c.recipient_name,
        purchaser_name: c.purchaser_name,
        message: c.message,
        store_name: storeMeta.get(c.store_id)?.name ?? "Salon",
      })));
    } catch (e: any) {
      console.error("[useSalonMyArea] load failed", e);
      setError(e?.message ?? "Couldn't load your salon area.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  // Realtime: refresh on any change to the user's bookings or gift cards.
  // Using a coarse "*" filter on the user's data is cheap because RLS already
  // limits what Postgres broadcasts to this connection.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`salon-my-area:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_bookings" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_gift_cards" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_loyalty_events" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  return {
    loading: authLoading || loading,
    error,
    salons,
    upcoming,
    past,
    loyalty,
    giftCards,
    refresh: load,
  };
}
