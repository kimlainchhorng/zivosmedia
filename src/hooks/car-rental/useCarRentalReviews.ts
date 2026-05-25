/**
 * Reviews CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CarRentalReview {
  id: string;
  store_id: string;
  reservation_id: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  customer_name: string;
  vehicle_label: string | null;
  rating: number;
  cleanliness: number | null;
  service: number | null;
  value: number | null;
  comment: string | null;
  reply: string | null;
  reply_at: string | null;
  is_published: boolean;
  is_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarRentalReviewDraft {
  reservation_id?: string | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
  customer_name: string;
  vehicle_label?: string | null;
  rating: number;
  cleanliness?: number | null;
  service?: number | null;
  value?: number | null;
  comment?: string | null;
}

export function useCarRentalReviews(storeId: string | undefined) {
  const [reviews, setReviews] = useState<CarRentalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_reviews")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCarRentalReviews] load failed", err);
      setError("Couldn't load reviews.");
      setLoading(false);
      return;
    }
    setReviews((data ?? []) as unknown as CarRentalReview[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalReviewDraft): Promise<CarRentalReview | null> => {
    if (!storeId) return null;
    setSaving(true);
    const payload = {
      store_id: storeId,
      reservation_id: draft.reservation_id ?? null,
      customer_id: draft.customer_id ?? null,
      vehicle_id: draft.vehicle_id ?? null,
      customer_name: draft.customer_name.trim(),
      vehicle_label: draft.vehicle_label ?? null,
      rating: draft.rating,
      cleanliness: draft.cleanliness ?? null,
      service: draft.service ?? null,
      value: draft.value ?? null,
      comment: draft.comment?.trim() || null,
    };
    const { data, error: err } = await supabase
      .from("car_rental_reviews")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalReviews] create failed", err);
      setError("Couldn't add review.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalReview;
    setReviews((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const replyTo = useCallback(async (id: string, reply: string) => {
    setSaving(true);
    const patch = { reply: reply.trim() || null, reply_at: reply.trim() ? new Date().toISOString() : null, is_acknowledged: true };
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } as CarRentalReview : r));
    const { error: err } = await supabase.from("car_rental_reviews").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalReviews] reply failed", err);
      setError("Couldn't save reply — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const acknowledge = useCallback(async (id: string) => {
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_acknowledged: true } : r));
    await supabase.from("car_rental_reviews").update({ is_acknowledged: true } as never).eq("id", id);
  }, []);

  const togglePublished = useCallback(async (id: string, isPublished: boolean) => {
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_published: isPublished } : r));
    await supabase.from("car_rental_reviews").update({ is_published: isPublished } as never).eq("id", id);
  }, []);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = reviews;
    setReviews((p) => p.filter((r) => r.id !== id));
    const { error: err } = await supabase.from("car_rental_reviews").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalReviews] delete failed", err);
      setError("Couldn't delete review.");
      setReviews(prev);
    }
    setSaving(false);
  }, [reviews]);

  return { reviews, loading, saving, error, create, replyTo, acknowledge, togglePublished, remove, refresh: load };
}
