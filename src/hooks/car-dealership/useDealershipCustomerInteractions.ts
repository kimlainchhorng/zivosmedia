/**
 * Customer comms log — per-customer touchpoint timeline.
 *
 * Mirrors the structural pattern of useDealershipLeadActivities (load → log →
 * remove with optimistic update + snapshot rollback) but bound to a customer.
 * Lazy-loaded: pass `customerId = null` (e.g. when the Customer 360 sheet is
 * closed) to skip the query and return an empty list.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── types ───────────────────────────────────────────────────────────────────

export type CustomerInteractionType =
  | "note" | "call" | "email" | "sms" | "visit" | "meeting" | "letter" | "other";

export type InteractionDirection = "inbound" | "outbound";

export interface DealershipCustomerInteraction {
  id: string;
  store_id: string;
  customer_id: string;
  user_id: string | null;
  interaction_type: CustomerInteractionType;
  direction: InteractionDirection | null;
  summary: string;
  body: string | null;
  outcome: string | null;
  occurred_at: string;
  created_at: string;
}

export interface DealershipCustomerInteractionDraft {
  interaction_type: CustomerInteractionType;
  direction?: InteractionDirection | null;
  summary: string;
  body?: string | null;
  outcome?: string | null;
  /** Defaults to now() on the server if omitted. */
  occurred_at?: string;
}

// ─── hook ────────────────────────────────────────────────────────────────────

export function useDealershipCustomerInteractions(
  storeId: string | undefined,
  customerId: string | null,
) {
  const [interactions, setInteractions] = useState<DealershipCustomerInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId || !customerId) { setInteractions([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("car_dealership_customer_interactions")
      .select("*")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: false });
    if (error) {
      console.error("[useDealershipCustomerInteractions] load failed", error);
      setInteractions([]);
    } else {
      setInteractions((data ?? []) as unknown as DealershipCustomerInteraction[]);
    }
    setLoading(false);
  }, [storeId, customerId]);

  useEffect(() => { void load(); }, [load]);

  const log = useCallback(async (
    draft: DealershipCustomerInteractionDraft,
  ): Promise<boolean> => {
    if (!storeId || !customerId) return false;
    if (!draft.summary.trim()) return false;

    setSaving(true);
    const payload = {
      store_id: storeId,
      customer_id: customerId,
      interaction_type: draft.interaction_type,
      direction: draft.direction ?? null,
      summary: draft.summary.trim(),
      body: draft.body?.trim() || null,
      outcome: draft.outcome?.trim() || null,
      occurred_at: draft.occurred_at ?? new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("car_dealership_customer_interactions")
      .insert(payload as never)
      .select("*")
      .single();
    if (error) {
      console.error("[useDealershipCustomerInteractions] log failed", error);
      setSaving(false);
      return false;
    }
    setInteractions((prev) => [data as unknown as DealershipCustomerInteraction, ...prev]);
    setSaving(false);
    return true;
  }, [storeId, customerId]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const snapshot = interactions;
    setInteractions((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase
      .from("car_dealership_customer_interactions")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[useDealershipCustomerInteractions] delete failed", error);
      setInteractions(snapshot);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [interactions]);

  return { interactions, loading, saving, log, remove, refresh: load };
}
