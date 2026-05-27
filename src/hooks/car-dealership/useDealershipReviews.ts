/**
 * Car dealership reviews / ratings — read + owner response.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DealershipReview {
  id: string;
  store_id: string;
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string;
  vehicle_label: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  owner_response: string | null;
  owner_responded_at: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export function useDealershipReviews(storeId: string | undefined) {
  const [reviews, setReviews] = useState<DealershipReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_reviews")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipReviews] load failed", err);
      setError("Couldn't load reviews.");
      setLoading(false);
      return;
    }
    setReviews((data ?? []) as unknown as DealershipReview[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const respondTo = useCallback(async (id: string, response: string) => {
    setSaving(true); setError(null);
    const patch = { owner_response: response, owner_responded_at: new Date().toISOString() };
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error: err } = await supabase
      .from("car_dealership_reviews").update(patch as never).eq("id", id);
    if (err) { setError("Couldn't save response."); setSaving(false); void load(); return false; }
    setSaving(false);
    return true;
  }, [load]);

  const toggleVisible = useCallback(async (id: string, is_visible: boolean) => {
    setSaving(true);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_visible } : r)));
    const { error: err } = await supabase
      .from("car_dealership_reviews").update({ is_visible } as never).eq("id", id);
    if (err) { setSaving(false); void load(); return false; }
    setSaving(false);
    return true;
  }, [load]);

  return { reviews, loading, saving, error, respondTo, toggleVisible, refresh: load };
}
