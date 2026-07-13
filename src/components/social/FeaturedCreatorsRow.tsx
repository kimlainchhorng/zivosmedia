/**
 * FeaturedCreatorsRow — full-bleed feed card showing the most-followed
 * creators, with one-tap follow buttons. Inserted into the snap-scroll feed
 * every Nth card (mirrors `ReelsPreviewRow`).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useHaptic } from "@/hooks/useHaptic";
import VerifiedBadge from "@/components/VerifiedBadge";
import { MutualFollowsBadge } from "./MutualFollowsBadge";
import { useMutualFollows } from "@/hooks/useMutualFollows";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import UsersRound from "lucide-react/dist/esm/icons/users-round";
import Target from "lucide-react/dist/esm/icons/target";
import Handshake from "lucide-react/dist/esm/icons/handshake";
import { toast } from "sonner";

interface Creator {
  id: string;          // user_id (auth)
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  followers: number;
}

interface Props {
  /** When true, renders inside the snap-scroll viewport (full-bleed dark). */
  fullBleed?: boolean;
}

export default function FeaturedCreatorsRow({ fullBleed = true }: Props) {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const haptic = useHaptic();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Hydrate the caller's existing follows so we don't show "Follow" on people
  // they already follow.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", userId);
      if (cancelled) return;
      setFollowingIds(new Set((data ?? []).map((r: any) => r.following_id)));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Pull featured creators by follower count.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Counts per creator
      const { data: counts } = await (supabase as any)
        .from("user_followers")
        .select("following_id");
      if (cancelled) return;
      const tally = new Map<string, number>();
      for (const r of counts ?? []) {
        tally.set(r.following_id, (tally.get(r.following_id) ?? 0) + 1);
      }
      const top = Array.from(tally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);
      const ids = top.map(([id]) => id);
      if (ids.length === 0) { setCreators([]); return; }

      // 2) Profile join
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, username, full_name, avatar_url, bio, is_verified")
        .or(`user_id.in.(${ids.join(",")}),id.in.(${ids.join(",")})`);

      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => {
        if (p.user_id) profileMap.set(p.user_id, p);
        if (p.id) profileMap.set(p.id, p);
      });

      const out: Creator[] = top
        .map(([id, n]) => {
          const p = profileMap.get(id);
          if (!p) return null;
          return {
            id,
            username:   p.username ?? "",
            fullName:   p.full_name,
            avatarUrl:  p.avatar_url,
            bio:        p.bio,
            isVerified: !!p.is_verified,
            followers:  n,
          } as Creator;
        })
        .filter((c): c is Creator => c !== null);

      if (!cancelled) setCreators(out);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFollow = async (creatorId: string) => {
    if (!userId) {
      toast.error("Sign in to follow people");
      return;
    }
    if (pending.has(creatorId)) return;
    setPending((p) => new Set(p).add(creatorId));
    const isFollowing = followingIds.has(creatorId);
    haptic(isFollowing ? "light" : "medium");

    // Optimistic
    setFollowingIds((s) => {
      const next = new Set(s);
      if (isFollowing) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    try {
      if (isFollowing) {
        await (supabase as any)
          .from("user_followers")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", creatorId)
          .throwOnError();
      } else {
        await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: creatorId,
        }).throwOnError();
      }
    } catch {
      // Roll back
      setFollowingIds((s) => {
        const next = new Set(s);
        if (isFollowing) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
      toast.error(isFollowing ? "Couldn't unfollow" : "Couldn't follow");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(creatorId);
        return next;
      });
    }
  };

  const { data: mutualMap } = useMutualFollows((creators ?? []).map((c) => c.id));

  if (creators !== null && creators.length === 0) return null;

  const formatFollowers = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
    : String(n);
  const totalFollowers = creators?.reduce((sum, creator) => sum + creator.followers, 0) ?? 0;
  const topFollowers = creators?.[0]?.followers ?? 0;
  const verifiedCount = creators?.filter((creator) => creator.isVerified).length ?? 0;
  const topCreator = creators?.[0] ?? null;
  const topCreatorName = topCreator?.fullName ?? topCreator?.username ?? "Creator";
  const topCreatorMutual = topCreator ? mutualMap?.get(topCreator.id) : null;
  const averageFollowers = creators && creators.length > 0 ? Math.round(totalFollowers / creators.length) : 0;
  const mutualTotal = creators?.reduce((sum, creator) => sum + (mutualMap?.get(creator.id)?.total ?? 0), 0) ?? 0;
  const networkSignal = mutualTotal > 0 ? `${mutualTotal} mutual links` : verifiedCount > 0 ? `${verifiedCount} verified picks` : "Fresh creator pool";

  return (
    <div
      className={
        fullBleed
          ? "relative w-full h-full snap-start flex flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_18%,rgba(16,185,129,0.26),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(59,130,246,0.20),transparent_28%),linear-gradient(180deg,#050505,#09090b_46%,#020617)] px-4 py-8 justify-center"
          : "zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3"
      }
    >
      {fullBleed && (
        <>
          <div className="pointer-events-none absolute inset-x-6 top-10 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="pointer-events-none absolute -left-24 bottom-12 h-48 w-48 rounded-full border border-emerald-300/15" />
        </>
      )}
      <div className={fullBleed ? "relative mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.07] px-3 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-2xl" : "zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5"}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={fullBleed ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-emerald-300 shadow-[0_12px_28px_rgba(16,185,129,0.18)]" : "zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"}>
            {fullBleed ? (
              <TrendingUp className="h-[18px] w-[18px]" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className={fullBleed ? "text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow tracking-tight" : "truncate text-[13px] font-bold text-foreground tracking-tight"}>
              Featured Creators
            </h2>
            <p className={fullBleed ? "text-xs sm:text-sm text-white/60 mt-0.5" : "truncate text-[11px] font-medium text-muted-foreground"}>People worth following on ZIVO</p>
          </div>
        </div>
        <button type="button"
          onClick={() => navigate("/explore")}
          aria-label="Open featured creators explore"
          className={fullBleed ? "shrink-0 flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-semibold hover:text-emerald-300 px-3 py-2 sm:p-0 rounded-full sm:rounded-none active:scale-95 transition-transform" : "zivo-social-chip shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95 transition-transform"}
        >
          See all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {creators === null ? (
        <div className={fullBleed ? "relative flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.06] py-12 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl" : "zivo-social-module-tile flex items-center justify-center rounded-2xl py-10"}>
          <div className={fullBleed ? "flex flex-col items-center gap-3 text-white/70" : ""}>
            <Loader2 className={fullBleed ? "h-6 w-6 animate-spin text-emerald-300" : "h-5 w-5 animate-spin text-primary"} />
            {fullBleed && <span className="text-xs font-semibold">Loading creator signal</span>}
          </div>
        </div>
      ) : (
        <>
        <div className={fullBleed ? "relative mb-3 grid grid-cols-3 gap-2" : "mb-3 grid grid-cols-3 gap-2"}>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"}>
                <UsersRound className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{creators.length}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>Creators</span>
              </span>
            </div>
          </div>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500"}>
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{formatFollowers(topFollowers)}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>Top reach</span>
              </span>
            </div>
          </div>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-300/10 text-fuchsia-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500"}>
                <BadgeCheck className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{verifiedCount || formatFollowers(totalFollowers)}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>{verifiedCount ? "Verified" : "Reach"}</span>
              </span>
            </div>
          </div>
        </div>
        {topCreator && (
          <button
            type="button"
            onClick={() => navigate(`/user/${topCreator.id}`)}
            aria-label={`Open spotlight creator ${topCreatorName}`}
            className={
              fullBleed
                ? "relative mb-3 flex w-full items-center justify-between gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.075] px-3 py-2.5 text-left shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition-transform active:scale-[0.99]"
                : "zivo-social-share-preview mb-3 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-transform active:scale-[0.99]"
            }
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={fullBleed ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-[10px] font-black uppercase tracking-[0.08em] text-white/55" : "block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground"}>
                  Creator spotlight
                </span>
                <span className={fullBleed ? "flex min-w-0 items-center gap-1 text-sm font-bold text-white" : "flex min-w-0 items-center gap-1 text-sm font-bold text-foreground"}>
                  <span className="truncate">{topCreatorName}</span>
                  {topCreator.isVerified && <VerifiedBadge size={11} interactive={false} />}
                </span>
              </span>
            </div>
            <span className={fullBleed ? "shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/75" : "zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground"}>
              {topCreatorMutual?.total ? `${topCreatorMutual.total} mutual` : `${formatFollowers(topCreator.followers)} followers`}
            </span>
          </button>
        )}
        <div className={fullBleed ? "relative mb-3 grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.075] px-3 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-2xl" : "zivo-social-module-tile mb-3 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2"}>
          <div className="flex min-w-0 items-center gap-2">
            <span className={fullBleed ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"}>
              <Target className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={fullBleed ? "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/55" : "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"}>
                Avg reach
              </span>
              <span className={fullBleed ? "block truncate text-xs font-black text-white" : "block truncate text-xs font-black text-foreground"}>
                {formatFollowers(averageFollowers)}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className={fullBleed ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500"}>
              <Handshake className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={fullBleed ? "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/55" : "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"}>
                Network
              </span>
              <span className={fullBleed ? "block truncate text-xs font-black text-white" : "block truncate text-xs font-black text-foreground"}>
                {networkSignal}
              </span>
            </span>
          </div>
        </div>
        <div
          className={fullBleed ? "flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6" : "flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory"}
          style={{ scrollbarWidth: "none" }}
        >
          {creators.map((c, index) => {
            const isFollowing = followingIds.has(c.id);
            const isPending   = pending.has(c.id);
            const initials = (c.fullName ?? c.username ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <motion.div
                key={c.id}
                whileTap={{ scale: 0.97 }}
                className={fullBleed ? "relative shrink-0 snap-center w-44 sm:w-48 md:w-52 rounded-[1.35rem] overflow-hidden bg-white/[0.07] border border-white/10 backdrop-blur-xl p-4 sm:p-5 flex flex-col items-center text-center shadow-[0_22px_50px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-1" : "zivo-social-module-tile group relative flex w-40 shrink-0 snap-center flex-col items-center overflow-hidden rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5 sm:w-44"}
              >
                {fullBleed && <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />}
                <span className={fullBleed ? "absolute left-3 top-3 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black text-white/80 backdrop-blur-xl" : "zivo-social-chip absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-black text-primary"}>
                  #{index + 1}
                </span>
                {c.isVerified && (
                  <span className={fullBleed ? "absolute right-3 top-3 rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[10px] font-black text-sky-100 backdrop-blur-xl" : "zivo-social-chip absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-black text-primary"}>
                    Verified
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/user/${c.id}`)}
                  aria-label={`Open ${c.fullName ?? c.username ?? "creator"} profile`}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <div className={fullBleed ? "h-16 w-16 rounded-full overflow-hidden bg-white/10 ring-2 ring-emerald-300/45 shadow-[0_16px_34px_rgba(16,185,129,0.18)]" : "zivo-social-avatar-ring h-16 w-16 overflow-hidden rounded-full transition-transform group-hover:scale-105"}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className={fullBleed ? "flex h-full w-full items-center justify-center text-white font-bold" : "flex h-full w-full items-center justify-center bg-transparent font-bold text-primary"}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-center gap-1">
                      <span className={fullBleed ? "text-sm font-semibold text-white truncate" : "text-sm font-semibold text-foreground truncate"}>
                        {c.fullName ?? c.username}
                      </span>
                      {c.isVerified && <VerifiedBadge size={12} interactive={false} />}
                    </div>
                    {c.username && (
                      <span className={fullBleed ? "text-[11px] text-white/60 truncate block" : "text-[11px] text-muted-foreground truncate block"}>@{c.username}</span>
                    )}
                    <span className={fullBleed ? "mt-1 text-[11px] text-white/70 block" : "mt-1 text-[11px] text-muted-foreground block"}>
                      {formatFollowers(c.followers)} followers
                    </span>
                    <MutualFollowsBadge mutual={mutualMap?.get(c.id)} className={fullBleed ? "text-[10px] text-white/60 text-center mt-0.5" : "text-[10px] text-muted-foreground text-center mt-0.5"} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFollow(c.id)}
                  disabled={isPending}
                  aria-label={
                    isPending
                      ? `Updating ${c.fullName ?? c.username ?? "creator"} follow status`
                      : isFollowing
                        ? `Unfollow ${c.fullName ?? c.username ?? "creator"}`
                        : `Follow ${c.fullName ?? c.username ?? "creator"}`
                  }
                  className={
                    isFollowing
                      ? fullBleed
                        ? "mt-3 w-full rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15 active:scale-95 transition-all"
                        : "zivo-social-chip mt-3 min-h-[34px] w-full rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground active:scale-95 transition-all"
                      : fullBleed
                        ? "mt-3 w-full rounded-full bg-ig-gradient px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all"
                        : "zivo-social-chip-active mt-3 min-h-[34px] w-full rounded-full px-3 py-1.5 text-xs font-bold active:scale-95 transition-all"
                  }
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                  ) : isFollowing ? (
                    <span className="flex items-center justify-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> Following
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <UserPlus className="h-3.5 w-3.5" /> Follow
                    </span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
