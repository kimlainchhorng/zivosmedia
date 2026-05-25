/**
 * Cafe reviews CRUD + owner reply mutation. Reviews are typically posted
 * by customers (rare) or seeded by the owner from offline channels; here
 * we expose a manual create() so an admin can record a paper-form review.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeReview {
  id: string;
  store_id: string;
  order_id: string | null;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  rating_stars: number;
  comment: string | null;
  tags: string[];
  is_visible: boolean;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CafeReviewDraft = Pick<CafeReview, "display_name" | "rating_stars" | "comment" | "tags" | "is_visible">;

export interface UseCafeReviewsResult {
  reviews: CafeReview[];
  stats: { avg: number; count: number; unreplied: number; distribution: Record<number, number> };
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CafeReviewDraft) => Promise<CafeReview | null>;
  reply: (id: string, response: string) => Promise<void>;
  setVisible: (id: string, visible: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCafeReviews(storeId: string | undefined): UseCafeReviewsResult {
  const [reviews, setReviews] = useState<CafeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_reviews" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCafeReviews] load", err);
      setError("Couldn't load reviews.");
      setLoading(false);
      return;
    }
    setReviews((data ?? []) as unknown as CafeReview[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, count: 0, unreplied: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    let sum = 0, unreplied = 0;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      if (!r.is_visible) continue;
      sum += r.rating_stars;
      dist[r.rating_stars] = (dist[r.rating_stars] ?? 0) + 1;
      if (!r.owner_response) unreplied++;
    }
    const count = reviews.filter((r) => r.is_visible).length;
    return { avg: count > 0 ? sum / count : 0, count, unreplied, distribution: dist };
  }, [reviews]);

  const create = useCallback(async (draft: CafeReviewDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const payload = {
      store_id: storeId,
      display_name: draft.display_name.trim(),
      rating_stars: draft.rating_stars,
      comment: draft.comment?.trim() || null,
      tags: draft.tags,
      is_visible: draft.is_visible,
    };
    const { data, error: err } = await supabase
      .from("cafe_reviews" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeReviews] create", err);
      setError("Couldn't save review.");
      return null;
    }
    const created = data as unknown as CafeReview;
    setReviews((p) => [created, ...p]);
    return created;
  }, [storeId]);

  const reply = useCallback(async (id: string, response: string) => {
    setSaving(true);
    const { data, error: err } = await supabase
      .from("cafe_reviews" as never)
      .update({ owner_response: response.trim() || null } as never)
      .eq("id", id).select("*").single();
    setSaving(false);
    if (err) { console.error("[useCafeReviews] reply", err); await load(); return; }
    const updated = data as unknown as CafeReview;
    setReviews((p) => p.map((r) => r.id === id ? updated : r));
  }, [load]);

  const setVisible = useCallback(async (id: string, visible: boolean) => {
    setReviews((p) => p.map((r) => r.id === id ? { ...r, is_visible: visible } : r));
    const { error: err } = await supabase.from("cafe_reviews" as never).update({ is_visible: visible } as never).eq("id", id);
    if (err) { console.error("[useCafeReviews] setVisible", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const prev = reviews;
    setReviews((p) => p.filter((r) => r.id !== id));
    const { error: err } = await supabase.from("cafe_reviews" as never).delete().eq("id", id);
    if (err) { console.error("[useCafeReviews] remove", err); setReviews(prev); }
  }, [reviews]);

  return { reviews, stats, loading, saving, error, refresh: load, create, reply, setVisible, remove };
}
