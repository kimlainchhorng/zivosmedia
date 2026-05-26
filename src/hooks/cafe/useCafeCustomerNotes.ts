/**
 * Per-customer notes + VIP flag, keyed by phone. Used to tag regulars and
 * keep ops notes ("always oat milk, no foam"). Admin-only — never queried
 * via the public RPCs.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeCustomerNote {
  id: string;
  store_id: string;
  phone: string;
  is_vip: boolean;
  notes: string | null;
  updated_at: string;
}

export function useCafeCustomerNotes(storeId: string | undefined) {
  const [rows, setRows] = useState<CafeCustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_customer_notes" as never)
      .select("*")
      .eq("store_id", storeId);
    if (err) {
      console.error("[useCafeCustomerNotes] load", err);
      setError("Couldn't load customer notes.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as CafeCustomerNote[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  // Build a lookup map keyed by phone for fast per-row hydration.
  const byPhone = useMemo(() => {
    const m = new Map<string, CafeCustomerNote>();
    for (const r of rows) m.set(r.phone, r);
    return m;
  }, [rows]);

  const save = useCallback(async (
    phone: string,
    patch: { is_vip?: boolean; notes?: string | null },
  ): Promise<boolean> => {
    if (!storeId) return false;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) { setError("Phone required to save a note."); return false; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const existing = byPhone.get(trimmedPhone);
    const next = {
      store_id: storeId,
      phone: trimmedPhone,
      is_vip: patch.is_vip ?? existing?.is_vip ?? false,
      notes: patch.notes === undefined ? existing?.notes ?? null : (patch.notes && patch.notes.trim() ? patch.notes.trim() : null),
      updated_by_user_id: userData.user?.id ?? null,
    };
    const { error: err } = await supabase
      .from("cafe_customer_notes" as never)
      .upsert(next as never, { onConflict: "store_id,phone" });
    setSaving(false);
    if (err) {
      console.error("[useCafeCustomerNotes] save", err);
      setError("Couldn't save note.");
      return false;
    }
    await load();
    return true;
  }, [storeId, byPhone, load]);

  return { rows, byPhone, loading, saving, error, save, refresh: load };
}
