/**
 * ReactionSummary — shows the top 3 emoji reactions on a post + a total count.
 * Renders inline next to the engagement bar; subscribes to `post_reactions`
 * for the post and re-counts on every change.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { topicForGroupSync } from "@/lib/security/channelName";
import type { ReactionEmoji } from "@/lib/social/reactions";
import { cn } from "@/lib/utils";
import Zap from "lucide-react/dist/esm/icons/zap";

interface Props {
  postId: string;
  source: "store" | "user";
}

const POST_REACTIONS_ENABLED = import.meta.env.VITE_ENABLE_POST_REACTIONS === "true";

function formatReactionCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
}

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
  const compactTotal = formatReactionCount(total);
  const reactionLabel = `${total} ${total === 1 ? "reaction" : "reactions"}`;
  const topLabel = top.length > 0 ? `Top reactions: ${top.join(" ")}` : "Live reactions";
  const leadReaction = top[0] ?? null;
  const mixLabel = top.length > 1 ? "Live mix" : "Top reaction";
  const reactionPulse =
    total >= 25
      ? { label: "High pulse", width: "100%" }
      : top.length > 1
        ? { label: "Mixed pulse", width: `${Math.max(44, Math.min(88, total * 8))}%` }
        : { label: "Focused pulse", width: `${Math.max(28, Math.min(62, total * 10))}%` };

  return (
    <div
      role="status"
      aria-live="polite"
      className="zivo-social-reaction-summary group flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-foreground transition-all hover:-translate-y-0.5 active:scale-[0.98] sm:px-2.5 sm:py-2"
      aria-label={`${reactionLabel}. ${topLabel}`}
      title={`${reactionLabel} · ${topLabel}`}
    >
      <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
        <Zap className="h-3.5 w-3.5" />
      </span>
      {leadReaction && (
        <span className="hidden items-center gap-1 rounded-full px-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" aria-hidden />
          {mixLabel}
        </span>
      )}
      <span className="flex items-center -space-x-2 text-sm leading-none sm:text-base">
        {top.map((emoji, i) => (
          <span
            key={emoji}
            title={i === 0 ? "Leading reaction" : "Top reaction"}
            className={cn(
              "zivo-social-reaction-emoji grid h-7 w-7 place-items-center rounded-full text-[13px] shadow-sm transition-transform group-hover:-translate-y-0.5 sm:h-8 sm:w-8 sm:text-sm",
              i === 0 && "ring-2 ring-primary/20",
            )}
            style={{ zIndex: 3 - i }}
          >
            {emoji}
          </span>
        ))}
      </span>
      <span className="zivo-social-chip relative min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-black tabular-nums text-primary sm:text-xs">
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" aria-hidden />
        {compactTotal}
      </span>
      <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-primary/10 lg:block" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
          style={{ width: reactionPulse.width }}
        />
      </span>
      <span className="sr-only">{reactionPulse.label}.</span>
      <span className="sr-only">{leadReaction ? `${leadReaction} is leading.` : ""}</span>
    </div>
  );
}
