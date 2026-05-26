/**
 * useVerificationRealtime — subscribe once at app boot. When an admin
 * flips a `profiles.is_verified` or `store_profiles.is_verified` flag,
 * every connected client receives the postgres_changes event and
 * invalidates the relevant react-query caches so the badge updates
 * everywhere within ~1 second.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VERIFICATION_KEY_ROOTS = new Set([
  "admin-users",
  "admin-stores-verification",
  "suggested-users",
  "follow-suggestions",
  "public-profile",
  "verified-status",
  "feed",
  "feed-posts",
  "reels-feed",
  "chat-hub-personal",
  "chat-hub-shop",
  "chat-hub-ride",
  "chat-hub-support",
  "chat-hub-groups",
  "personal-chat-peer",
  "social-notifications",
  "notifications",
  "activity-feed",
  "explore-users",
  "explore-trending",
  "smart-search-users",
  "smart-search",
  "live-stream-host",
  "live-stream-viewers",
  "live-chat",
  "live-streams",
  "dating-profiles",
  "sound-posts",
  "leaderboard",
  "qr-profile",
]);

export function useVerificationRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidateAll = () => {
      qc.invalidateQueries({
        predicate: (q) => {
          const root = q.queryKey?.[0];
          return typeof root === "string" && VERIFICATION_KEY_ROOTS.has(root);
        },
      });
    };
    const handleChange = (payload: any) => {
      const oldV = payload?.old?.is_verified;
      const newV = payload?.new?.is_verified;
      if (oldV === newV) return;
      invalidateAll();
    };

    const channel = supabase
      .channel(`verification-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        handleChange,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "store_profiles" },
        handleChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
