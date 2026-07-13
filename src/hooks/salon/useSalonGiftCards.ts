/**
 * useSalonGiftCards — owner-managed store-credit gift cards.
 * Reads remain owner-scoped through RLS. Mutations are routed through the
 * salon-gift-card-manage Edge Function so codes, ownership, and redemption
 * bounds are validated server-side.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

export interface SalonGiftCard {
  id: string;
  store_id: string;
  code: string;
  initial_cents: number;
  balance_cents: number;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  purchaser_name: string | null;
  message: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalonGiftCardRedemption {
  id: string;
  gift_card_id: string;
  store_id: string;
  booking_id: string | null;
  amount_cents: number;
  redeemed_at: string;
  notes: string | null;
}

export interface IssueGiftCardInput {
  initial_cents: number;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  purchaser_name?: string;
  message?: string;
  expires_at?: string | null;
}

interface Result {
  cards: SalonGiftCard[];
  redemptions: SalonGiftCardRedemption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  issue: (input: IssueGiftCardInput) => Promise<SalonGiftCard>;
  redeem: (cardId: string, amountCents: number, opts?: { booking_id?: string; notes?: string }) => Promise<void>;
  toggleActive: (cardId: string, isActive: boolean) => Promise<void>;
  remove: (cardId: string) => Promise<void>;
}

export function useSalonGiftCards(storeId: string | undefined): Result {
  const [cards, setCards] = useState<SalonGiftCard[]>([]);
  const [redemptions, setRedemptions] = useState<SalonGiftCardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setError(null);
    const [cardsRes, redRes] = await Promise.all([
      supabase.from("salon_gift_cards").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
      supabase.from("salon_gift_card_redemptions").select("*").eq("store_id", storeId).order("redeemed_at", { ascending: false }),
    ]);
    if (cardsRes.error) { setError(cardsRes.error.message); setLoading(false); return; }
    if (redRes.error) { setError(redRes.error.message); setLoading(false); return; }
    setCards((cardsRes.data ?? []) as unknown as SalonGiftCard[]);
    setRedemptions((redRes.data ?? []) as unknown as SalonGiftCardRedemption[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const issue = useCallback(async (input: IssueGiftCardInput): Promise<SalonGiftCard> => {
    if (!storeId) throw new Error("No store.");
    const { data, error: err } = await supabase.functions.invoke("salon-gift-card-manage", {
      body: {
        action: "issue",
        store_id: storeId,
        card: input,
      },
    });
    if (err) throw new Error(err.message);
    if (!data?.card) throw new Error(data?.error || "Could not issue gift card.");
    const created = data.card as SalonGiftCard;
    setCards((prev) => [created, ...prev]);
    return created;
  }, [storeId]);

  const redeem = useCallback(async (cardId: string, amountCents: number, opts: { booking_id?: string; notes?: string } = {}) => {
    if (!storeId) return;
    const { data, error: err } = await supabase.functions.invoke("salon-gift-card-manage", {
      body: {
        action: "redeem",
        card_id: cardId,
        store_id: storeId,
        amount_cents: amountCents,
        booking_id: opts.booking_id ?? null,
        notes: opts.notes?.trim() || null,
      },
    });
    if (err) throw new Error(err.message);
    if (data?.error) throw new Error(data.error);
    await refresh();
  }, [storeId, refresh]);

  const toggleActive = useCallback(async (cardId: string, isActive: boolean) => {
    const { data, error: err } = await supabase.functions.invoke("salon-gift-card-manage", {
      body: { action: "set_active", card_id: cardId, active: isActive },
    });
    if (err) throw new Error(err.message);
    if (data?.error) throw new Error(data.error);
    const updated = data?.card as SalonGiftCard | undefined;
    setCards((prev) => prev.map((c) => c.id === cardId ? (updated ?? { ...c, is_active: isActive }) : c));
  }, []);

  const remove = useCallback(async (cardId: string) => {
    const { data, error: err } = await supabase.functions.invoke("salon-gift-card-manage", {
      body: { action: "delete", card_id: cardId },
    });
    if (err) throw new Error(err.message);
    if (data?.error) throw new Error(data.error);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setRedemptions((prev) => prev.filter((r) => r.gift_card_id !== cardId));
  }, []);

  return { cards, redemptions, loading, error, refresh, issue, redeem, toggleActive, remove };
}
