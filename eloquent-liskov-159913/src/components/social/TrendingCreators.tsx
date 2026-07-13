/**
 * TrendingCreators — weekly leaderboard of fastest-growing creators on ZIVO.
 *
 * Computes the ranking from the last 7 days of `user_followers` inserts,
 * filters out the viewer + people they already follow, hydrates the top
 * profiles, and renders a horizontal carousel with a one-tap follow CTA.
 *
 * Self-hides when there's no signal — never displays a fabricated list.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { formatCount } from "@/lib/social/formatCount";
import { toast } from "sonner";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";

interface TrendingCreator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  newFollowers: number;
}

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function initialsOf(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TrendingCreators() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [optimisticallyFollowed, setOptimisticallyFollowed] = useState<Set<string>>(new Set());

  const { data: creators = [] } = useQuery<TrendingCreator[]>({
    queryKey: ["trending-creators-7d", user?.id],
    staleTime: 5 * 60_000,
    refetchInterval: 30 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();

      // Pull recent follow events. We deliberately ignore `follower_id` here
      // because we're scoring the *target* (creator gaining followers).
      const [recentRes, myFollowsRes] = await Promise.all([
        (supabase as any)
          .from("user_followers")
          .select("following_id")
          .gte("created_at", since)
          .limit(2000),
        user
          ? (supabase as any)
              .from("user_followers")
              .select("following_id")
              .eq("follower_id", user.id)
          : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
      ]);

      const tally = new Map<string, number>();
      for (const r of (recentRes.data ?? []) as Array<{ following_id: string }>) {
        if (!r.following_id) continue;
        tally.set(r.following_id, (tally.get(r.following_id) ?? 0) + 1);
      }
      if (tally.size === 0) return [];

      const myFollowing = new Set<string>(
        ((myFollowsRes.data ?? []) as Array<{ following_id: string }>).map((r) => r.following_id),
      );

      const ranked = [...tally.entries()]
        .filter(([id, count]) => count >= 2 && id !== user?.id && !myFollowing.has(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
      if (ranked.length === 0) return [];

      const ids = ranked.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", ids);

      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null; is_verified: boolean | null }>();
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_verified: boolean | null }>) {
        profileById.set(p.id, p);
      }

      return ranked
        .map(([id, count]) => {
          const p = profileById.get(id);
          if (!p) return null;
          return {
            id,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            is_verified: p.is_verified,
            newFollowers: count,
          } as TrendingCreator;
        })
        .filter((c): c is TrendingCreator => c !== null)
        .slice(0, 8);
    },
  });

  const handleFollow = async (targetId: string, targetName: string | null) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setOptimisticallyFollowed((prev) => new Set(prev).add(targetId));
    try {
      await (supabase as any)
        .from("user_followers")
        .insert({ follower_id: user.id, following_id: targetId })
        .throwOnError();
      toast.success(`Following ${targetName?.split(/\s+/)[0] ?? "creator"}`);
      queryClient.invalidateQueries({ queryKey: ["follow-suggestions", user.id] });
      queryClient.invalidateQueries({ queryKey: ["mutual-follows"] });
    } catch (err) {
      setOptimisticallyFollowed((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      toast.error("Couldn't follow — please try again");
    }
  };

  if (creators.length === 0) return null;

  return (
    <section
      aria-label="Trending creators this week"
      className="bg-card border-b border-border/10 px-3 py-3"
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Trending this week
        </h3>
        <button
          type="button"
          onClick={() => navigate("/explore")}
          className="text-[12px] font-semibold text-primary active:opacity-70"
        >
          See all
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {creators.map((c, idx) => {
          const followed = optimisticallyFollowed.has(c.id);
          const name = c.full_name || "Creator";
          return (
            <li key={c.id} className="shrink-0 w-[110px]">
              <div className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30 border border-border/20">
                <span
                  className="absolute top-1.5 left-1.5 h-5 min-w-[20px] px-1 rounded-full bg-amber-500/95 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                  aria-label={`Rank ${idx + 1}`}
                >
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/user/${c.id}`)}
                  className="flex flex-col items-center gap-1 active:opacity-70"
                  aria-label={`View ${name}'s profile`}
                >
                  <Avatar className="h-12 w-12 border-2 border-amber-500/40">
                    <AvatarImage src={optimizeAvatar(c.avatar_url, 48)} alt="" loading="lazy" />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
                      {initialsOf(c.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2 inline-flex items-center justify-center gap-0.5 w-full">
                    <span className="truncate">{name}</span>
                    {isBlueVerified(c.is_verified) && <VerifiedBadge size={10} interactive={false} />}
                  </p>
                  <p className="text-[9px] text-muted-foreground text-center leading-tight">
                    +{formatCount(c.newFollowers)} followers
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => !followed && handleFollow(c.id, c.full_name)}
                  disabled={followed}
                  aria-label={followed ? `Following ${name}` : `Follow ${name}`}
                  className={
                    "w-full py-1 rounded-full text-[10px] font-bold text-center active:opacity-70 transition-colors flex items-center justify-center gap-1 " +
                    (followed
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground")
                  }
                >
                  {followed ? (
                    <>
                      <UserCheck className="h-2.5 w-2.5" aria-hidden="true" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-2.5 w-2.5" aria-hidden="true" /> Follow
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
