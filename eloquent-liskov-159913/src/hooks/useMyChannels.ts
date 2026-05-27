/**
 * useMyChannels — channels the current user is subscribed to (or owns), with
 * the latest published post for each, sorted by recency.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MyChannel = {
  id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  subscriber_count: number;
  role: string;
  last_post_at: string | null;
  last_post_preview: string | null;
};

export function useMyChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<MyChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setChannels([]); setLoading(false); return; }
    setLoading(true);

    const { data: subs } = await (supabase as any)
      .from("channel_subscribers")
      .select("channel_id, role")
      .eq("user_id", user.id);

    const ids = (subs ?? []).map((s: any) => s.channel_id as string);
    if (!ids.length) { setChannels([]); setLoading(false); return; }

    const { data: chs } = await supabase
      .from("channels")
      .select("id, handle, name, avatar_url, subscriber_count")
      .in("id", ids);

    const { data: posts } = await (supabase as any)
      .from("channel_posts")
      .select("channel_id, body, published_at")
      .in("channel_id", ids)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    const lastByChan = new Map<string, { body: string | null; at: string }>();
    (posts ?? []).forEach((p: any) => {
      if (!lastByChan.has(p.channel_id)) {
        lastByChan.set(p.channel_id, { body: p.body, at: p.published_at });
      }
    });

    const roleByChan = new Map<string, string>();
    (subs ?? []).forEach((s: any) => roleByChan.set(s.channel_id, s.role));

    const merged: MyChannel[] = (chs ?? []).map((c: any) => ({
      id: c.id,
      handle: c.handle,
      name: c.name,
      avatar_url: c.avatar_url,
      subscriber_count: c.subscriber_count ?? 0,
      role: roleByChan.get(c.id) ?? "sub",
      last_post_at: lastByChan.get(c.id)?.at ?? null,
      last_post_preview: lastByChan.get(c.id)?.body ?? null,
    })).sort((a, b) =>
      (b.last_post_at ?? "").localeCompare(a.last_post_at ?? "")
    );

    setChannels(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { channels, loading, refresh };
}
