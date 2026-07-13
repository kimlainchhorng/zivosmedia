import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

export type Channel = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  owner_id: string;
  is_public: boolean;
  subscriber_count: number;
  is_verified?: boolean;
  verified_at?: string | null;
};

export type ChannelPost = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string | null;
  media: any;
  scheduled_for: string | null;
  published_at: string | null;
  view_count: number;
  reactions_count: any;
  created_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  comments_enabled?: boolean;
  comments_count?: number;
};

export function useChannel(handle: string | undefined) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const refresh = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    const { data: ch } = await supabase
      .from("channels")
      .select("*")
      .eq("handle", handle)
      .maybeSingle();
    if (!ch) {
      setChannel(null);
      setLoading(false);
      return;
    }
    setChannel(ch as any);

    const { data: postsData } = await supabase
      .from("channel_posts")
      .select("*")
      .eq("channel_id", ch.id)
      .not("published_at", "is", null)
      // Pinned first, then newest. The sort runs again client-side after
      // re-fetches in case `is_pinned` flips for an already-loaded post.
      .order("is_pinned", { ascending: false } as any)
      .order("published_at", { ascending: false })
      .limit(50);
    setPosts((postsData ?? []) as any);

    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: sub } = await supabase
        .from("channel_subscribers")
        .select("role, notifications_on")
        .eq("channel_id", ch.id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      setIsSubscribed(!!sub);
      setRole(sub?.role ?? null);
      setNotificationsOn(sub?.notifications_on ?? true);
    } else {
      setIsSubscribed(false);
      setRole(null);
      setNotificationsOn(true);
    }
    setLoading(false);
  }, [handle]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // realtime
  useEffect(() => {
    if (!channel?.id) return;
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `channel-posts:${channel.id}`,
        event: "*",
        schema: "public",
        table: "channel_posts",
        filter: `channel_id=eq.${channel.id}`,
      },
      () => refresh(),
    );
    return unsubscribe;
  }, [channel?.id, refresh]);

  const subscribe = async () => {
    if (!channel || !userId) return;
    await supabase.from("channel_subscribers").insert({
      channel_id: channel.id,
      user_id: userId,
      role: "sub",
    } as any);
    await refresh();
  };

  const unsubscribe = async () => {
    if (!channel || !userId) return;
    await supabase
      .from("channel_subscribers")
      .delete()
      .eq("channel_id", channel.id)
      .eq("user_id", userId);
    await refresh();
  };

  const setNotifications = async (next: boolean) => {
    if (!channel || !userId) return;
    // Optimistic — flip locally so the bell icon responds immediately, then
    // roll back if the persist fails.
    const previous = notificationsOn;
    setNotificationsOn(next);
    const { error } = await supabase
      .from("channel_subscribers")
      .update({ notifications_on: next })
      .eq("channel_id", channel.id)
      .eq("user_id", userId);
    if (error) {
      setNotificationsOn(previous);
      throw error;
    }
  };

  return { channel, posts, isSubscribed, notificationsOn, role, loading, userId, refresh, subscribe, unsubscribe, setNotifications };
}
