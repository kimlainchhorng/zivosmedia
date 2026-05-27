/**
 * useSalonGiftCards — owner-managed store-credit gift cards.
 * Generates a unique 12-char code on issue. Balance is maintained by a
 * Postgres trigger on the redemptions table, so the UI just inserts a row
 * with the spend amount.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

// 12-char code in 3 groups of 4, alphanumeric (no easy confusables).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    groups.push(s);
  }
  return groups.join("-");
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
    const { data: { user } } = await supabase.auth.getUser();
    // Retry on the (very unlikely) code collision.
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = makeCode();
      const { data, error: err } = await supabase
        .from("salon_gift_cards")
        .insert({
          store_id: storeId,
          code,
          initial_cents: input.initial_cents,
          balance_cents: input.initial_cents,
          recipient_name: input.recipient_name?.trim() || null,
          recipient_email: input.recipient_email?.trim() || null,
          recipient_phone: input.recipient_phone?.trim() || null,
          purchaser_name: input.purchaser_name?.trim() || null,
          message: input.message?.trim() || null,
          expires_at: input.expires_at ?? null,
          issued_by_user_id: user?.id ?? null,
        } as never)
        .select()
        .single();
      if (err) {
        if ((err as any).code === "23505") continue; // code unique violation, retry
        throw new Error(err.message);
      }
      const created = data as unknown as SalonGiftCard;
      setCards((prev) => [created, ...prev]);
      return created;
    }
    throw new Error("Couldn't generate a unique code. Try again.");
  }, [storeId]);

  const redeem = useCallback(async (cardId: string, amountCents: number, opts: { booking_id?: string; notes?: string } = {}) => {
    if (!storeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("salon_gift_card_redemptions")
      .insert({
        gift_card_id: cardId,
        store_id: storeId,
        booking_id: opts.booking_id ?? null,
        amount_cents: amountCents,
        notes: opts.notes?.trim() || null,
        redeemed_by_user_id: user?.id ?? null,
      } as never);
    if (err) throw new Error(err.message);
    await refresh();
  }, [storeId, refresh]);

  const toggleActive = useCallback(async (cardId: string, isActive: boolean) => {
    const { error: err } = await supabase
      .from("salon_gift_cards")
      .update({ is_active: isActive } as never)
      .eq("id", cardId);
    if (err) throw new Error(err.message);
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, is_active: isActive } : c));
  }, []);

  const remove = useCallback(async (cardId: string) => {
    const { error: err } = await supabase.from("salon_gift_cards").delete().eq("id", cardId);
    if (err) throw new Error(err.message);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setRedemptions((prev) => prev.filter((r) => r.gift_card_id !== cardId));
  }, []);

  return { cards, redemptions, loading, error, refresh, issue, redeem, toggleActive, remove };
}
