/**
 * TopFans — "Top fans this month" carousel for a creator profile.
 *
 * Pulls the creator's posts, then scores each engager by their likes +
 * comments on those posts in the last 30 days. Comments weigh 3× a like
 * because they're a stronger signal of fan investment.
 *
 * Self-hides when there's no engagement signal — never shows a fabricated
 * leaderboard.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { BarChart3, ChevronRight, Gauge, Heart, MessageCircle, Sparkles, Trophy, UsersRound } from "lucide-react";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const COMMENT_WEIGHT = 3;

interface Fan {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean | null;
  likes: number;
  comments: number;
  score: number;
}

interface Props {
  creatorId: string;
  /** Visible heading. Defaults to "Top fans this month". */
  title?: string;
  /** Cap the visible cards. Defaults to 8. */
  limit?: number;
  className?: string;
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TopFans({ creatorId, title = "Top fans this month", limit = 8, className }: Props) {
  const navigate = useNavigate();

  const { data: fans = [] } = useQuery<Fan[]>({
    queryKey: ["top-fans-30d", creatorId, limit],
    enabled: !!creatorId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      if (!creatorId) return [];
      const since = new Date(Date.now() - WINDOW_MS).toISOString();

      // 1) Get the creator's recent posts. We don't need older than the
      //    window — engagement on those wouldn't count anyway.
      const { data: posts } = await (supabase as any)
        .from("user_posts")
        .select("id")
        .eq("user_id", creatorId)
        .gte("created_at", new Date(Date.now() - 2 * WINDOW_MS).toISOString())
        .limit(500);
      const postIds = ((posts ?? []) as Array<{ id: string }>).map((p) => p.id);
      if (postIds.length === 0) return [];

      // 2) Pull recent likes + comments on those posts in parallel.
      const [likesRes, commentsRes] = await Promise.all([
        (supabase as any)
          .from("post_likes")
          .select("user_id")
          .in("post_id", postIds)
          .gte("created_at", since)
          .limit(2000),
        (supabase as any)
          .from("post_comments")
          .select("user_id")
          .in("post_id", postIds)
          .gte("created_at", since)
          .limit(2000),
      ]);

      const tally = new Map<string, { likes: number; comments: number }>();
      for (const r of (likesRes.data ?? []) as Array<{ user_id: string }>) {
        if (!r.user_id || r.user_id === creatorId) continue;
        const cur = tally.get(r.user_id) ?? { likes: 0, comments: 0 };
        cur.likes += 1;
        tally.set(r.user_id, cur);
      }
      for (const r of (commentsRes.data ?? []) as Array<{ user_id: string }>) {
        if (!r.user_id || r.user_id === creatorId) continue;
        const cur = tally.get(r.user_id) ?? { likes: 0, comments: 0 };
        cur.comments += 1;
        tally.set(r.user_id, cur);
      }

      const scored = [...tally.entries()]
        .map(([id, c]) => ({ id, ...c, score: c.likes + c.comments * COMMENT_WEIGHT }))
        .filter((e) => e.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      if (scored.length === 0) return [];

      // 3) Hydrate profiles in one query.
      const ids = scored.map((s) => s.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", ids);
      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null; is_verified: boolean | null }>();
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_verified: boolean | null }>) {
        profileById.set(p.id, p);
      }

      return scored
        .map<Fan | null>((s) => {
          const p = profileById.get(s.id);
          if (!p) return null;
          return {
            id: s.id,
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            isVerified: p.is_verified,
            likes: s.likes,
            comments: s.comments,
            score: s.score,
          };
        })
        .filter((f): f is Fan => f !== null);
    },
  });

  if (fans.length === 0) return null;
  const totalLikes = fans.reduce((sum, fan) => sum + fan.likes, 0);
  const totalComments = fans.reduce((sum, fan) => sum + fan.comments, 0);
  const topScore = fans[0]?.score ?? 0;
  const champion = fans[0] ?? null;
  const championName = champion?.fullName || "Fan";
  const championSignal = champion
    ? champion.comments > 0
      ? `${champion.comments} comment${champion.comments === 1 ? "" : "s"}`
      : `${champion.likes} like${champion.likes === 1 ? "" : "s"}`
    : "";
  const totalSignal = totalLikes + totalComments * COMMENT_WEIGHT;
  const conversationShare = totalSignal > 0 ? Math.round(((totalComments * COMMENT_WEIGHT) / totalSignal) * 100) : 0;
  const fanPulse = conversationShare >= 50
    ? "Conversation-led"
    : totalLikes > totalComments
      ? "Like-led"
      : "Balanced";

  return (
    <section
      aria-label={title}
      className={"zivo-social-top-fans rounded-[1.25rem] px-3 py-3 " + (className ?? "")}
    >
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-top-fans-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-extrabold text-foreground">{title}</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">Likes and comments from the last 30 days</p>
          </div>
        </div>
        <span className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-primary">
          {fans.length}
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{topScore}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Top score</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{totalLikes}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Likes</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{totalComments}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Comments</span>
          </span>
        </div>
      </div>
      {champion && (
        <button
          type="button"
          onClick={() => navigate(`/user/${champion.id}`)}
          aria-label={`Open top fan ${championName}, ${champion.score} points`}
          className="zivo-social-share-preview mb-2.5 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-transform active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="zivo-social-avatar-ring h-9 w-9 shrink-0">
              <AvatarImage src={optimizeAvatar(champion.avatarUrl, 40)} alt="" loading="lazy" />
              <AvatarFallback className="bg-transparent text-xs font-bold text-primary">
                {initialsOf(champion.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Fan champion
              </span>
              <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-foreground">
                <span className="truncate">{championName}</span>
                {isBlueVerified(champion.isVerified) && <VerifiedBadge size={11} interactive={false} />}
              </span>
            </span>
          </div>
          <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
            {championSignal || `${champion.score} pts`}
          </span>
        </button>
      )}
      <div className="zivo-social-module-tile mb-2.5 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <Gauge className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Fan pulse
            </span>
            <span className="block truncate text-xs font-black text-foreground">{fanPulse}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Conversation
            </span>
            <span className="block truncate text-xs font-black text-foreground">{conversationShare}% weighted</span>
          </span>
        </div>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {fans.map((f, idx) => {
          const name = f.fullName || "Fan";
          const engagementLabel =
            f.comments > 0 && f.likes > 0
              ? `${f.likes} like${f.likes === 1 ? "" : "s"}, ${f.comments} comment${f.comments === 1 ? "" : "s"}`
              : f.comments > 0
              ? `${f.comments} comment${f.comments === 1 ? "" : "s"}`
              : `${f.likes} like${f.likes === 1 ? "" : "s"}`;
          return (
            <li key={f.id} className="w-[106px] shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/user/${f.id}`)}
                className="zivo-social-top-fan-card group relative flex min-h-[150px] w-full flex-col items-center justify-between gap-1 overflow-hidden rounded-2xl px-2 py-2.5 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                aria-label={`${name} — ${engagementLabel}, score ${f.score}`}
              >
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <div className="relative">
                  <Avatar className="zivo-social-avatar-ring h-12 w-12">
                    <AvatarImage src={optimizeAvatar(f.avatarUrl, 48)} alt="" loading="lazy" />
                    <AvatarFallback className="text-white text-sm font-bold bg-foreground">
                      {initialsOf(f.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {idx < 3 && (
                    <span
                      className={
                        "zivo-social-top-rank absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold text-white " +
                        (idx === 0 ? "zivo-social-top-rank-gold" : idx === 1 ? "zivo-social-top-rank-silver" : "zivo-social-top-rank-bronze")
                      }
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>
                  )}
                  {idx === 0 && (
                    <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-primary text-white shadow-lg shadow-primary/20" aria-hidden="true">
                      <Sparkles className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-1 inline-flex items-center justify-center gap-0.5 w-full">
                  <span className="truncate">{name.split(/\s+/)[0]}</span>
                  {isBlueVerified(f.isVerified) && <VerifiedBadge size={10} interactive={false} />}
                </p>
                <p className="zivo-social-top-fan-metrics inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold leading-tight text-muted-foreground">
                  {f.likes > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5" aria-hidden="true" /> {f.likes}
                    </span>
                  )}
                  {f.comments > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <MessageCircle className="h-2.5 w-2.5" aria-hidden="true" /> {f.comments}
                    </span>
                  )}
                </p>
                <span className="zivo-social-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black text-primary">
                  <BarChart3 className="h-2.5 w-2.5" aria-hidden="true" />
                  {f.score} pts
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
