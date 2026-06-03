import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";
import { logChannelAction } from "@/lib/channels/adminLog";

export type Channel = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  owner_id: string;
  is_public: boolean;
  channel_join_approval_required?: boolean;
  restrict_saving_content?: boolean;
  reaction_policy?: "all" | "some" | "none";
  subscriber_count: number;
  wallpaper_style?: "green" | "blue" | "pink" | "none";
  topics_enabled?: boolean;
  hide_members?: boolean;
  slow_mode_seconds?: number;
  subscriber_permissions?: ChannelSubscriberPermissions | null;
  is_verified?: boolean;
  verified_at?: string | null;
};

export type ChannelSubscriberPermissions = {
  sendMessages: boolean;
  sendMedia: boolean;
  addMembers: boolean;
  pinMessages: boolean;
  editOwnTags: boolean;
  changeInfo: boolean;
  chargeStars: boolean;
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

export type ChannelServiceEvent = {
  id: string;
  type: "member_joined" | "member_left";
  at: string;
  user_id: string;
  display_name: string;
};

export function useChannel(handle: string | undefined) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [serviceEvents, setServiceEvents] = useState<ChannelServiceEvent[]>([]);
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
    const normalizedHandle = decodeURIComponent(handle).replace(/^@+/, "").trim().toLowerCase();
    setLoading(true);
    const { data: ch } = await supabase
      .from("channels")
      .select("*")
      .eq("handle", normalizedHandle)
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

    const { data: recentSubscribers } = await supabase
      .from("channel_subscribers")
      .select("user_id, joined_at, role")
      .eq("channel_id", ch.id)
      .neq("role", "pending")
      .order("joined_at", { ascending: false })
      .limit(5);
    const { data: recentMemberActions } = await (supabase as any)
      .from("channel_admin_log")
      .select("id, actor_id, target_user_id, action, created_at")
      .eq("channel_id", ch.id)
      .in("action", ["member_left", "member_removed"])
      .order("created_at", { ascending: false })
      .limit(5);
    const subscriberRows = (recentSubscribers ?? []) as Array<{ user_id: string; joined_at: string; role: string }>;
    const memberActionRows = (recentMemberActions ?? []) as Array<{
      id: string;
      actor_id: string;
      target_user_id: string | null;
      action: "member_left" | "member_removed";
      created_at: string;
    }>;
    const serviceProfileIds = Array.from(new Set([
      ...subscriberRows.map((row) => row.user_id),
      ...memberActionRows.map((row) => row.action === "member_removed" ? row.target_user_id : row.actor_id),
    ].filter(Boolean) as string[]));
    let profileMap = new Map<string, { full_name?: string | null }>();
    if (serviceProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name")
        .in("user_id", serviceProfileIds);
      profileMap = new Map(
        ((profiles ?? []) as Array<{ user_id: string; full_name?: string | null }>).map((profile) => [
          profile.user_id,
          profile,
        ]),
      );
    }
    const joinedEvents = subscriberRows.map((row) => {
        const profile = profileMap.get(row.user_id);
        const displayName = profile?.full_name?.trim() || "A member";
        return {
          id: `member-joined-${row.user_id}-${row.joined_at}`,
          type: "member_joined" as const,
          at: row.joined_at,
          user_id: row.user_id,
          display_name: displayName,
        };
      });
    const leftEvents = memberActionRows.map((row) => {
      const userIdForEvent = row.action === "member_removed" ? row.target_user_id : row.actor_id;
      const profile = userIdForEvent ? profileMap.get(userIdForEvent) : undefined;
      const displayName = profile?.full_name?.trim() || "A member";
      return {
        id: `member-left-${row.id}`,
        type: "member_left" as const,
        at: row.created_at,
        user_id: userIdForEvent || row.actor_id,
        display_name: displayName,
      };
    });
    setServiceEvents(
      [...joinedEvents, ...leftEvents]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8),
    );

    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: sub } = await supabase
        .from("channel_subscribers")
        .select("role, notifications_on")
        .eq("channel_id", ch.id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      setIsSubscribed(!!sub && sub.role !== "pending");
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
    await supabase.from("channel_subscribers").upsert({
      channel_id: channel.id,
      user_id: userId,
      role: channel.channel_join_approval_required ? "pending" : "sub",
    } as any, { onConflict: "channel_id,user_id" });
    void logChannelAction(channel.id, userId, "member_joined");
    await refresh();
  };

  const unsubscribe = async () => {
    if (!channel || !userId) return;
    await supabase
      .from("channel_subscribers")
      .delete()
      .eq("channel_id", channel.id)
      .eq("user_id", userId);
    void logChannelAction(channel.id, userId, "member_left");
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

  return { channel, posts, serviceEvents, isSubscribed, notificationsOn, role, loading, userId, refresh, subscribe, unsubscribe, setNotifications };
}
