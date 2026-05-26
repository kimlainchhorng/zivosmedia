/**
 * useSuggestedContacts — "People you may know"
 * Sources: people who follow me but I don't follow back, recent DM partners not in contacts.
 * Uses stale-while-revalidate caching (memory + sessionStorage, 5 min TTL) and
 * runs the three independent reads in parallel.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Suggested = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  reason: "follower" | "chat";
};

const TTL_MS = 5 * 60 * 1000;
const memCache = new Map<string, { data: Suggested[]; fetchedAt: number }>();

function ssKey(uid: string) { return `zivo:suggested:${uid}`; }

function readSession(uid: string): { data: Suggested[]; fetchedAt: number } | null {
  try {
    const raw = sessionStorage.getItem(ssKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.fetchedAt) return null;
    return parsed;
  } catch { return null; }
}

function writeSession(uid: string, payload: { data: Suggested[]; fetchedAt: number }) {
  try { sessionStorage.setItem(ssKey(uid), JSON.stringify(payload)); } catch { /* quota */ }
}

export function useSuggestedContacts() {
  const { user } = useAuth();
  const [items, setItems] = useState<Suggested[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const fetchFresh = useCallback(async (uid: string): Promise<Suggested[]> => {
    // Run the four independent reads in parallel
    const [existingRes, followersRes, dmsRes, dismissedRes] = await Promise.all([
      supabase.from("user_contacts").select("contact_user_id").eq("owner_id", uid),
      (supabase as any).from("follows").select("follower_id").eq("following_id", uid).limit(50),
      (supabase as any)
        .from("direct_messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(40),
      (supabase as any).from("suggestion_dismissals").select("dismissed_user_id").eq("user_id", uid),
    ]);

    const skip = new Set<string>(((existingRes.data ?? []) as any[]).map((r) => r.contact_user_id));
    ((dismissedRes.data ?? []) as any[]).forEach((r) => skip.add(r.dismissed_user_id));
    skip.add(uid);

    const candidates = new Map<string, Suggested["reason"]>();
    ((followersRes.data ?? []) as any[]).forEach((r) => {
      if (r.follower_id && !skip.has(r.follower_id)) candidates.set(r.follower_id, "follower");
    });
    ((dmsRes.data ?? []) as any[]).forEach((m) => {
      const other = m.sender_id === uid ? m.receiver_id : m.sender_id;
      if (other && !skip.has(other) && !candidates.has(other)) candidates.set(other, "chat");
    });

    const ids = Array.from(candidates.keys()).slice(0, 12);
    if (ids.length === 0) return [];

    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, username")
      .in("user_id", ids);

    const byId = new Map(((profs ?? []) as any[]).map((p) => [p.user_id, p]));
    return ids
      .map((id) => {
        const p: any = byId.get(id);
        if (!p) return null;
        return {
          user_id: id,
          full_name: p.full_name ?? null,
          username: p.username ?? null,
          avatar_url: p.avatar_url ?? null,
          reason: candidates.get(id)!,
        } as Suggested;
      })
      .filter(Boolean) as Suggested[];
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (!user) { setItems([]); setLoading(false); setIsStale(false); return; }

    // Hydrate from cache immediately (SWR)
    const cached = memCache.get(user.id) ?? readSession(user.id);
    const fresh = cached && Date.now() - cached.fetchedAt < TTL_MS;

    if (cached) {
      setItems(cached.data);
      setLoading(false);
      if (fresh && !force) {
        setIsStale(false);
        return;
      }
      setIsStale(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchFresh(user.id);
      const payload = { data, fetchedAt: Date.now() };
      memCache.set(user.id, payload);
      writeSession(user.id, payload);
      setItems(data);
    } catch {
      // keep cached items on failure
    } finally {
      setLoading(false);
      setIsStale(false);
    }
  }, [user, fetchFresh]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Realtime invalidation: re-fetch when a new follower or DM appears.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`suggested-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` },
        () => { void refresh(true); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` },
        () => { void refresh(true); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  // Clear caches on sign-out so the next signed-in user starts clean.
  useEffect(() => {
    if (user) return;
    memCache.clear();
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("zivo:suggested:"))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
  }, [user]);

  const dismiss = useCallback(async (dismissedId: string) => {
    if (!user) return;
    const next = items.filter((i) => i.user_id !== dismissedId);
    setItems(next);
    const cur = memCache.get(user.id);
    if (cur) {
      const payload = { data: next, fetchedAt: cur.fetchedAt };
      memCache.set(user.id, payload);
      writeSession(user.id, payload);
    }
    await (supabase as any)
      .from("suggestion_dismissals")
      .upsert({ user_id: user.id, dismissed_user_id: dismissedId }, { onConflict: "user_id,dismissed_user_id" });
  }, [user, items]);

  return { items, loading, isStale, refresh, dismiss };
}
