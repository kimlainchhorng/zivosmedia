import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single shared presence channel for the chat list.
 * Returns the set of user_ids currently online from the provided list.
 */
export function useBulkPresence(currentUserId: string | undefined, watchIds: string[]) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const sortedWatchIds = watchIds.slice().sort();
  const watchSet = new Set(sortedWatchIds);
  const watchKey = sortedWatchIds.join(",");
  const lastKey = useRef("");

  useEffect(() => {
    if (!currentUserId) return;
    lastKey.current = watchKey;

    const channel = supabase.channel(`chat-list-presence-${currentUserId}`, {
      config: { presence: { key: currentUserId } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const next = new Set<string>();
      for (const key of Object.keys(state)) {
        if (watchSet.has(key)) next.add(key);
      }
      setOnlineIds(next);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, watchKey]);

  return onlineIds;
}
