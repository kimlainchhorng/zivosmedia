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
import { MutualFollowsBadge, useMutualFollows } from "./MutualFollowsBadge";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
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
          .eq("following_id", creatorId);
      } else {
        await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: creatorId,
        });
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

  return (
    <div
      className={
        fullBleed
          ? "w-full h-full snap-start flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black px-4 py-8 justify-center"
          : "w-full px-4 py-3"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow tracking-tight">
            Featured Creators ✨
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-0.5">People worth following on ZIVO</p>
        </div>
        <button type="button"
          onClick={() => navigate("/explore")}
          className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-semibold hover:text-emerald-300 px-3 py-2 sm:p-0 rounded-full sm:rounded-none active:scale-95 transition-transform"
        >
          See all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {creators === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {creators.map((c) => {
            const isFollowing = followingIds.has(c.id);
            const isPending   = pending.has(c.id);
            const initials = (c.fullName ?? c.username ?? "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <motion.div
                key={c.id}
                whileTap={{ scale: 0.97 }}
                className="relative shrink-0 snap-center w-44 sm:w-48 md:w-52 rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm p-4 sm:p-5 flex flex-col items-center text-center transition-transform hover:-translate-y-1"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/user/${c.id}`)}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-white/10 ring-2 ring-emerald-500/40">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-semibold text-white truncate">
                        {c.fullName ?? c.username}
                      </span>
                      {c.isVerified && <VerifiedBadge size={12} interactive={false} />}
                    </div>
                    {c.username && (
                      <span className="text-[11px] text-white/60 truncate block">@{c.username}</span>
                    )}
                    <span className="mt-1 text-[11px] text-white/70 block">
                      {formatFollowers(c.followers)} followers
                    </span>
                    <MutualFollowsBadge mutual={mutualMap?.get(c.id)} className="text-[10px] text-white/60 text-center mt-0.5" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFollow(c.id)}
                  disabled={isPending}
                  className={
                    isFollowing
                      ? "mt-3 w-full rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15 active:scale-95 transition-all"
                      : "mt-3 w-full rounded-full bg-ig-gradient px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all"
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
      )}
    </div>
  );
}
