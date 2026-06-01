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
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Flame from "lucide-react/dist/esm/icons/flame";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import Target from "lucide-react/dist/esm/icons/target";

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
  const topGain = creators[0]?.newFollowers ?? 0;
  const totalNewFollowers = creators.reduce((sum, creator) => sum + creator.newFollowers, 0);
  const leader = creators[0] ?? null;
  const averageGain = creators.length > 0 ? Math.round(totalNewFollowers / creators.length) : 0;
  const verifiedCount = creators.filter((creator) => isBlueVerified(creator.is_verified)).length;
  const velocityLabel = topGain >= averageGain * 2 && averageGain > 0
    ? "Breakout week"
    : totalNewFollowers >= 25
      ? "Fast climb"
      : "Organic lift";

  return (
    <section
      aria-label="Trending creators this week"
      className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3"
    >
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-foreground">Trending this week</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Fastest-growing creators right now
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/explore")}
          aria-label="Open creator explore"
          className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Flame className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{formatCount(topGain)}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Top gain</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{formatCount(totalNewFollowers)}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Growth</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{creators.length}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Creators</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
            <Clock3 className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">7d</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Window</span>
          </span>
        </div>
      </div>
      {leader && (
        <div className="zivo-social-share-preview mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Weekly leader
              </p>
              <p className="truncate text-sm font-bold text-foreground">{leader.full_name || "Creator"}</p>
            </div>
          </div>
          <span className="zivo-social-chip-active shrink-0 rounded-full px-3 py-1 text-[11px] font-black tabular-nums">
            +{formatCount(leader.newFollowers)}
          </span>
        </div>
      )}
      <div className="zivo-social-module-tile mb-2.5 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            <Target className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Trend velocity
            </span>
            <span className="block truncate text-xs font-black text-foreground">{velocityLabel}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Avg gain
            </span>
            <span className="block truncate text-xs font-black text-foreground">
              +{formatCount(averageGain)} / creator
            </span>
          </span>
        </div>
        {verifiedCount > 0 && (
          <span className="zivo-social-chip col-span-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black text-primary">
            <BadgeCheck className="h-3 w-3" aria-hidden="true" />
            {verifiedCount} verified in the trend
          </span>
        )}
      </div>
      <ul className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {creators.map((c, idx) => {
          const followed = optimisticallyFollowed.has(c.id);
          const name = c.full_name || "Creator";
          const isTopThree = idx < 3;
          return (
            <li key={c.id} className="w-[132px] shrink-0">
              <div className="zivo-social-module-tile group relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:-translate-y-0.5">
                <span
                  className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/95 px-1 text-[10px] font-bold leading-none text-white shadow-[0_8px_18px_rgba(245,158,11,0.32)]"
                  aria-label={`Rank ${idx + 1}`}
                  title={`Rank ${idx + 1}`}
                >
                  {idx + 1}
                </span>
                {isTopThree && (
                  <span className="absolute right-2 top-2 zivo-social-chip flex h-6 items-center gap-1 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.08em] text-amber-600">
                    <Flame className="h-3 w-3" />
                    Hot
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/user/${c.id}`)}
                  className="flex flex-col items-center gap-1 active:opacity-70"
                  aria-label={`View ${name}'s profile`}
                >
                  <Avatar className="zivo-social-avatar-ring h-14 w-14 transition-transform group-hover:scale-105">
                    <AvatarImage src={optimizeAvatar(c.avatar_url, 48)} alt="" loading="lazy" />
                    <AvatarFallback className="bg-transparent text-primary text-sm font-bold">
                      {initialsOf(c.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2 inline-flex items-center justify-center gap-0.5 w-full">
                    <span className="truncate">{name}</span>
                    {isBlueVerified(c.is_verified) && <VerifiedBadge size={10} interactive={false} />}
                  </p>
                  <p className="zivo-social-chip rounded-full px-2 py-0.5 text-center text-[9px] font-bold leading-tight text-muted-foreground">
                    +{formatCount(c.newFollowers)} followers
                  </p>
                  <span className="w-full overflow-hidden rounded-full bg-muted/70">
                    <span
                      className="block h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-primary to-fuchsia-500"
                      style={{ width: `${Math.max(16, Math.min(100, Math.round((c.newFollowers / Math.max(topGain, 1)) * 100)))}%` }}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => !followed && handleFollow(c.id, c.full_name)}
                  disabled={followed}
                  aria-label={followed ? `Following ${name}` : `Follow ${name}`}
                  className={
                    "flex min-h-[32px] w-full items-center justify-center gap-1 rounded-full py-1 text-center text-[10px] font-bold transition-colors active:scale-95 " +
                    (followed
                      ? "zivo-social-chip text-muted-foreground"
                      : "zivo-social-chip-active")
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
