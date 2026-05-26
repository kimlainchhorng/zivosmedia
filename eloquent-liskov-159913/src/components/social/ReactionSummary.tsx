/**
 * ReactionSummary — shows the top 3 emoji reactions on a post + a total count.
 * Renders inline next to the engagement bar; subscribes to `post_reactions`
 * for the post and re-counts on every change.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { topicForGroupSync } from "@/lib/security/channelName";
import type { ReactionEmoji } from "./ReactionPicker";

interface Props {
  postId: string;
  source: "store" | "user";
}

const POST_REACTIONS_ENABLED = import.meta.env.VITE_ENABLE_POST_REACTIONS === "true";

export default function ReactionSummary({ postId, source }: Props) {
  const [top, setTop] = useState<ReactionEmoji[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!POST_REACTIONS_ENABLED) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await (supabase as any)
        .from("post_reactions")
        .select("emoji")
        .eq("post_id", postId)
        .eq("source", source);
      if (cancelled || error || !data) return;

      const counts = new Map<ReactionEmoji, number>();
      for (const r of data) {
        const e = r.emoji as ReactionEmoji;
        counts.set(e, (counts.get(e) ?? 0) + 1);
      }
      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);

      setTop(sorted);
      setTotal(data.length);
    }

    load();

    // Re-count on insert/delete using a postgres_changes channel.
    // Channel name is opaque (hashed) so leaked topic-name metadata doesn't
    // expose post IDs to other Realtime subscribers.
    const channelName = topicForGroupSync(`${source}:${postId}`, "reactions");
    const channel = (supabase as any)
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_reactions", filter: `post_id=eq.${postId}` },
        load,
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [postId, source]);

  if (!POST_REACTIONS_ENABLED || total === 0) return null;

  return (
    <div className="flex items-center gap-1 text-white/90 drop-shadow shrink-0">
      <span className="flex items-center -space-x-1.5 text-sm sm:text-base leading-none">
        {top.map((emoji, i) => (
          <span
            key={emoji}
            className="rounded-full bg-black/40 px-1 py-0.5 ring-1 ring-white/10 backdrop-blur-sm"
            style={{ zIndex: 3 - i }}
          >
            {emoji}
          </span>
        ))}
      </span>
      <span className="text-[11px] sm:text-xs font-semibold tabular-nums">{total}</span>
    </div>
  );
}
