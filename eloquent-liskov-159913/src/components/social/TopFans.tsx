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
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";

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

  return (
    <section
      aria-label={title}
      className={"bg-card border border-border/40 rounded-2xl px-3 py-3 " + (className ?? "")}
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-foreground" aria-hidden="true" fill="currentColor" />
          {title}
        </h3>
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
            <li key={f.id} className="shrink-0 w-[88px]">
              <button
                type="button"
                onClick={() => navigate(`/user/${f.id}`)}
                className="w-full flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                aria-label={`${name} — ${engagementLabel}`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={optimizeAvatar(f.avatarUrl, 48)} alt="" loading="lazy" />
                    <AvatarFallback className="text-white text-sm font-bold bg-foreground">
                      {initialsOf(f.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {idx < 3 && (
                    <span
                      className={
                        "absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-card " +
                        (idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : "bg-orange-700")
                      }
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-1 inline-flex items-center justify-center gap-0.5 w-full">
                  <span className="truncate">{name.split(/\s+/)[0]}</span>
                  {isBlueVerified(f.isVerified) && <VerifiedBadge size={10} interactive={false} />}
                </p>
                <p className="text-[9px] text-muted-foreground inline-flex items-center gap-1 leading-tight">
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
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
