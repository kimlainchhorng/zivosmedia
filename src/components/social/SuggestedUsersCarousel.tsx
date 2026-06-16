/**
 * SuggestedUsersCarousel — Discover people you might want to follow
 * Instagram/Facebook "new account" style discover cards
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Compass, Handshake, Sparkles, UserCheck, X, Users } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { MutualFollowsBadge } from "./MutualFollowsBadge";
import { useMutualFollows } from "@/hooks/useMutualFollows";
import { useState, memo, forwardRef } from "react";
import SafeCaption from "@/components/social/SafeCaption";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedUsersCarouselProps {
  /** Compact inline version for between-post injection */
  variant?: "default" | "inline";
}

// Compact follower counts. Stored counts reach millions for popular creators,
// so a thousands-only format would render "5200.0k" instead of "5.2M".
function formatFollowerCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}k`;
  return String(count);
}

const SuggestedUsersCarousel = memo(forwardRef<HTMLDivElement, SuggestedUsersCarouselProps>(function SuggestedUsersCarousel({ variant = "default" }, ref) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const { data: suggestions = [] } = useQuery({
    queryKey: ["suggested-users", user?.id],
    queryFn: async () => {
      // Pull the user's existing follows first so we can exclude them.
      // Otherwise "Suggested for you" surfaces people the user already
      // follows, which feels broken.
      const { data: follows } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", user?.id || "");
      const followedIds = new Set<string>((follows || []).map((r: any) => r.following_id));

      // Over-fetch so we still get 12 even if many results are filtered out.
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_verified, follower_count, posts_count")
        .neq("id", user?.id || "")
        .limit(40);
      if (error) throw error;
      const filtered = (data || []).filter((p: any) => !followedIds.has(p.id));
      // Fisher-Yates shuffle — `sort(() => Math.random() - 0.5)` is biased
      // (V8 in particular pins elements and produces non-uniform orderings).
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
      return filtered.slice(0, 12);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const handleFollow = async (profileId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from("user_followers").insert({
        follower_id: user.id,
        following_id: profileId,
      });
      if (error && !error.message?.includes("duplicate")) throw error;
      setFollowing((prev) => new Set([...prev, profileId]));
      toast.success("Following!");
      try {
        const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
        await supabase.functions.invoke("send-push-notification", {
          body: { user_id: profileId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
        });
      } catch {}
    } catch {
      toast.error("Failed to follow");
    }
  };

  const visible = suggestions.filter((s: any) => !dismissed.has(s.id));
  const { data: mutualMap } = useMutualFollows(visible.map((s: any) => s.id));

  if (!user || visible.length === 0) return null;

  const followCount = following.size;
  const dismissedCount = dismissed.size;
  const verifiedCount = visible.filter((profile: any) => isBlueVerified(profile.is_verified)).length;
  const mutualTotal = visible.reduce((sum: number, profile: any) => sum + (mutualMap?.get(profile.id)?.total ?? 0), 0);
  const matchSignal = mutualTotal > 0
    ? `${mutualTotal} mutual links`
    : verifiedCount > 0
      ? `${verifiedCount} verified picks`
      : "Fresh discovery";
  const SignalIcon = mutualTotal > 0 ? Handshake : verifiedCount > 0 ? UserCheck : Compass;

  // Inline variant — compact row for between-post injection
  if (variant === "inline") {
    const inlineVisible = visible.slice(0, 5);
    return (
      <div className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3">
        <div className="zivo-social-header-glass mb-3 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <Users className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-foreground">People you may know</h3>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {inlineVisible.length} fresh account{inlineVisible.length === 1 ? "" : "s"} to follow
              </p>
            </div>
          </div>
          <span className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-primary">
            {followCount > 0 ? <UserCheck className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {followCount > 0 ? `${followCount} added` : "New"}
          </span>
        </div>
        <div className="zivo-social-module-tile mb-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <SignalIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Match signal</span>
              <span className="block truncate text-xs font-black text-foreground">{matchSignal}</span>
            </span>
          </span>
          <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
            {inlineVisible.length} ready
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          <AnimatePresence>
            {inlineVisible.map((profile: any) => (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="zivo-social-module-tile group flex min-w-[200px] flex-shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all hover:-translate-y-0.5"
              >
                <div onClick={() => navigate(`/user/${profile.id}`)} className="cursor-pointer">
                  <Avatar className="zivo-social-avatar-ring h-11 w-11 transition-transform group-hover:scale-105">
                    <AvatarImage src={optimizeAvatar(profile.avatar_url, 40)} loading="lazy" />
                    <AvatarFallback className="bg-transparent text-primary font-bold text-sm">
                      {profile.full_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0" onClick={() => navigate(`/user/${profile.id}`)}>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {profile.full_name || "User"}
                    </p>
                    {isBlueVerified(profile.is_verified) && <VerifiedBadge size={12} interactive={false} />}
                  </div>
                  <MutualFollowsBadge mutual={mutualMap?.get(profile.id)} className="mt-0.5" />
                </div>
                <button type="button"
                  onClick={() => handleFollow(profile.id)}
                  disabled={following.has(profile.id)}
                  aria-label={
                    following.has(profile.id)
                      ? `Already following ${profile.full_name || "this user"}`
                      : `Follow ${profile.full_name || "this user"}`
                  }
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 ${
                    following.has(profile.id)
                      ? "zivo-social-chip text-muted-foreground"
                      : "zivo-social-chip-active"
                  }`}
                >
                  {following.has(profile.id) ? (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Added
                    </span>
                  ) : "Follow"}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Default — full "Suggested for you" section
  return (
    <div className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3">
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <Users className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-foreground">Suggested for you</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {visible.length} account{visible.length === 1 ? "" : "s"} matched to your activity
            </p>
          </div>
        </div>
        <button type="button" className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95">
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2.5 grid grid-cols-4 gap-2">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{visible.length}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Matches</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{followCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Added</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{verifiedCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Verified</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{dismissedCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Skipped</p>
          </div>
        </div>
      </div>

      <div className="zivo-social-module-tile mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <SignalIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Match signal</span>
            <span className="block truncate text-xs font-black text-foreground">{matchSignal}</span>
          </span>
        </span>
        <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
          Fresh set
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
        <AnimatePresence>
          {visible.map((profile: any) => (
            <motion.div
              key={profile.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="zivo-social-module-tile group relative w-[140px] flex-shrink-0 overflow-hidden rounded-2xl p-3 text-center transition-all hover:-translate-y-0.5"
            >
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              {/* Dismiss */}
              <button type="button"
                onClick={() => setDismissed((prev) => new Set([...prev, profile.id]))}
                aria-label={`Dismiss ${profile.full_name || "this suggestion"}`}
                className="zivo-social-icon-button absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              {isBlueVerified(profile.is_verified) && (
                <span className="zivo-social-chip absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-primary">
                  Verified
                </span>
              )}

              {/* Avatar */}
              <div
                onClick={() => navigate(`/user/${profile.id}`)}
                className="cursor-pointer"
              >
                <Avatar className="zivo-social-avatar-ring mx-auto mb-2 h-16 w-16 transition-transform group-hover:scale-105">
                  <AvatarImage src={optimizeAvatar(profile.avatar_url, 48)} loading="lazy" />
                  <AvatarFallback className="bg-transparent text-primary font-bold text-sm">
                    {profile.full_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="mb-0.5 flex items-center justify-center gap-0.5">
                  <p className="text-[10px] font-semibold text-foreground truncate max-w-[90px]">
                    {profile.full_name || "User"}
                  </p>
                  {isBlueVerified(profile.is_verified) && <VerifiedBadge size={11} interactive={false} />}
                </div>

                {profile.bio && (
                  <p className="text-[9px] text-muted-foreground line-clamp-2 mb-1.5 leading-tight">
                    <SafeCaption text={profile.bio} />
                  </p>
                )}

                {/* Follower / posts hint */}
                <p className="zivo-social-chip mx-auto mb-1 mt-1 w-fit rounded-full px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {profile.follower_count > 0
                    ? `${formatFollowerCount(profile.follower_count)} followers`
                    : profile.posts_count > 0
                    ? `${profile.posts_count} posts`
                    : "New member"}
                </p>
                <MutualFollowsBadge mutual={mutualMap?.get(profile.id)} className="mb-1.5 text-center text-[9px]" />
              </div>

              {/* Follow button */}
              <button type="button"
                onClick={() => handleFollow(profile.id)}
                disabled={following.has(profile.id)}
                aria-label={
                  following.has(profile.id)
                    ? `Already following ${profile.full_name || "this user"}`
                    : `Follow ${profile.full_name || "this user"}`
                }
                className={`w-full rounded-full py-1.5 text-[10px] font-black transition-all active:scale-95 ${
                  following.has(profile.id)
                    ? "zivo-social-chip text-muted-foreground"
                    : "zivo-social-chip-active"
                }`}
              >
                {following.has(profile.id) ? (
                  <span className="inline-flex items-center justify-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Added
                  </span>
                ) : "Follow"}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}));

export default SuggestedUsersCarousel;
