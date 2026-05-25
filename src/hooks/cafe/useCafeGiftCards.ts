/**
 * Cafe gift cards CRUD + redemption.
 * Issue: insert into cafe_gift_cards. Code is a 12-char uppercase token —
 * either the caller supplies one or we generate one.
 * Redeem: insert positive amount into cafe_gift_card_redemptions; the DB
 * trigger debits the card and rejects when funds are insufficient.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeGiftCard {
  id: string;
  store_id: string;
  code: string;
  initial_balance_cents: number;
  balance_cents: number;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  message: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CafeGiftCardRedemption {
  id: string;
  gift_card_id: string;
  order_id: string | null;
  store_id: string;
  amount_cents: number;
  notes: string | null;
  created_at: string;
}

export interface IssueGiftCardInput {
  initial_balance_cents: number;
  code?: string;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  message?: string | null;
  expires_at?: string | null;
}

export interface UseCafeGiftCardsResult {
  cards: CafeGiftCard[];
  redemptionsByCard: Record<string, CafeGiftCardRedemption[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  issue: (input: IssueGiftCardInput) => Promise<CafeGiftCard | null>;
  redeem: (cardId: string, amountCents: number, orderId?: string | null) => Promise<{ ok: boolean; error?: string }>;
  setActive: (cardId: string, active: boolean) => Promise<void>;
  remove: (cardId: string) => Promise<void>;
}

const generateCode = (prefix = ""): string => {
  // Uppercase alphanumeric without lookalikes (no 0/O/1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  const head = prefix ? prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) : segment(4);
  return `${head}-${segment(4)}-${segment(4)}`;
};

export function useCafeGiftCards(storeId: string | undefined): UseCafeGiftCardsResult {
  const [cards, setCards] = useState<CafeGiftCard[]>([]);
  const [redemptionsByCard, setRedemptionsByCard] = useState<Record<string, CafeGiftCardRedemption[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const cardRes = await supabase.from("cafe_gift_cards" as never).select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    if (cardRes.error) {
      console.error("[useCafeGiftCards] load", cardRes.error);
      setError("Couldn't load gift cards.");
      setLoading(false);
      return;
    }
    const rows = (cardRes.data ?? []) as unknown as CafeGiftCard[];
    setCards(rows);
    if (rows.length > 0) {
      const redRes = await supabase
        .from("cafe_gift_card_redemptions" as never)
        .select("*")
        .in("gift_card_id", rows.map((c) => c.id))
        .order("created_at", { ascending: false });
      const reds = (redRes.data ?? []) as unknown as CafeGiftCardRedemption[];
      const grouped: Record<string, CafeGiftCardRedemption[]> = {};
      for (const r of reds) {
        grouped[r.gift_card_id] = grouped[r.gift_card_id] ?? [];
        grouped[r.gift_card_id].push(r);
      }
      setRedemptionsByCard(grouped);
    } else {
      setRedemptionsByCard({});
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const issue = useCallback(async (input: IssueGiftCardInput) => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      code: input.code || generateCode("GC"),
      initial_balance_cents: input.initial_balance_cents,
      balance_cents: input.initial_balance_cents,
      recipient_name: input.recipient_name ?? null,
      recipient_email: input.recipient_email ?? null,
      recipient_phone: input.recipient_phone ?? null,
      message: input.message ?? null,
      expires_at: input.expires_at ?? null,
      is_active: true,
    };
    const { data, error: err } = await supabase
      .from("cafe_gift_cards" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeGiftCards] issue", err);
      setError("Couldn't issue gift card.");
      return null;
    }
    const created = data as unknown as CafeGiftCard;
    setCards((p) => [created, ...p]);
    return created;
  }, [storeId]);

  const redeem = useCallback(async (cardId: string, amountCents: number, orderId?: string | null) => {
    if (!storeId) return { ok: false, error: "no store" };
    const { error: err } = await supabase
      .from("cafe_gift_card_redemptions" as never)
      .insert({
        gift_card_id: cardId, store_id: storeId,
        amount_cents: amountCents,
        order_id: orderId ?? null,
      } as never);
    if (err) {
      console.error("[useCafeGiftCards] redeem", err);
      return { ok: false, error: err.message || "Redemption failed." };
    }
    await load();
    return { ok: true };
  }, [storeId, load]);

  const setActive = useCallback(async (cardId: string, active: boolean) => {
    setCards((p) => p.map((c) => c.id === cardId ? { ...c, is_active: active } : c));
    const { error: err } = await supabase
      .from("cafe_gift_cards" as never).update({ is_active: active } as never).eq("id", cardId);
    if (err) { console.error("[useCafeGiftCards] setActive", err); await load(); }
  }, [load]);

  const remove = useCallback(async (cardId: string) => {
    const prev = cards;
    setCards((p) => p.filter((c) => c.id !== cardId));
    const { error: err } = await supabase.from("cafe_gift_cards" as never).delete().eq("id", cardId);
    if (err) { console.error("[useCafeGiftCards] remove", err); setCards(prev); }
  }, [cards]);

  return { cards, redemptionsByCard, loading, saving, error, refresh: load, issue, redeem, setActive, remove };
}
