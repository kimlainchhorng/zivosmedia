/**
 * FollowSuggestions — "People you may know" carousel
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Compass, Handshake, Sparkles, UserCheck, UserPlus, UsersRound, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { useState } from "react";
import { toast } from "sonner";
import { MutualFollowsBadge } from "./MutualFollowsBadge";
import { useMutualFollows } from "@/hooks/useMutualFollows";

export default function FollowSuggestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["follow-suggestions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get profiles excluding self and already-followed
      const { data: following } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = (following || []).map((f: any) => f.following_id);
      const excludeIds = [user.id, ...followingIds];

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const followUser = async (targetId: string) => {
    if (!user) return;
    await (supabase as any).from("user_followers").insert({ follower_id: user.id, following_id: targetId });
    toast.success("Following!");
    setDismissed((p) => [...p, targetId]);
    try {
      const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
      await supabase.functions.invoke("send-push-notification", {
        body: { user_id: targetId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
      });
    } catch {}
  };

  const visible = suggestions.filter((s: any) => !dismissed.includes(s.id));
  const { data: mutualMap } = useMutualFollows(visible.map((s: any) => s.id));
  if (visible.length === 0) return null;
  const verifiedCount = visible.filter((s: any) => isBlueVerified(s.is_verified)).length;
  const dismissedCount = dismissed.length;
  const topPick = visible[0];
  const topPickMutual = topPick ? mutualMap?.get(topPick.id) : null;
  const mutualTotal = visible.reduce((sum: number, suggestion: any) => sum + (mutualMap?.get(suggestion.id)?.total ?? 0), 0);
  const qualityLabel = mutualTotal > 0
    ? `${mutualTotal} mutual links`
    : verifiedCount > 0
      ? `${verifiedCount} verified matches`
      : "Fresh discovery";
  const qualityIcon = mutualTotal > 0 ? Handshake : verifiedCount > 0 ? UserCheck : Compass;
  const QualityIcon = qualityIcon;

  return (
    <div className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3">
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-foreground">Suggested for you</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">People to add to your circle</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/explore")}
          aria-label="Open people explore"
          className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersRound className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{visible.length}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Matches</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{verifiedCount}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Verified</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black tabular-nums text-foreground">{dismissedCount}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Skipped</span>
          </span>
        </div>
      </div>
      {topPick && (
        <button
          type="button"
          onClick={() => navigate(`/profile/${topPick.id}`)}
          aria-label={`Open top suggestion ${topPick.full_name || "user"}`}
          className="zivo-social-share-preview mb-2.5 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-transform active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="zivo-social-avatar-ring h-9 w-9 shrink-0">
              <AvatarImage src={optimizeAvatar(topPick.avatar_url, 40)} alt="" loading="lazy" />
              <AvatarFallback className="bg-transparent text-xs font-bold text-primary">
                {(topPick.full_name || "U")[0]}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Top pick
              </span>
              <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-foreground">
                <span className="truncate">{topPick.full_name || "User"}</span>
                {isBlueVerified(topPick.is_verified) && <VerifiedBadge size={11} interactive={false} />}
              </span>
            </span>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            {topPickMutual?.total ? `${topPickMutual.total} mutual` : "Fresh match"}
          </span>
        </button>
      )}
      <div className="zivo-social-module-tile mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <QualityIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Match signal
            </span>
            <span className="block truncate text-xs font-black text-foreground">{qualityLabel}</span>
          </span>
        </span>
        <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
          Ready
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {visible.map((s: any) => (
          <div key={s.id} className="zivo-social-module-tile group relative w-[144px] shrink-0 rounded-2xl p-3 text-center transition-all hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <button type="button"
              onClick={() => setDismissed((p) => [...p, s.id])}
              aria-label={`Dismiss ${s.full_name || "suggestion"}`}
              className="zivo-social-icon-button absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${s.id}`)}
              aria-label={`Open ${s.full_name || "user"} profile`}
              className="mx-auto mb-2 block rounded-full active:scale-95"
            >
              <Avatar className="zivo-social-avatar-ring h-16 w-16 cursor-pointer transition-transform group-hover:scale-105">
                <AvatarImage src={optimizeAvatar(s.avatar_url, 64)} loading="lazy" />
                <AvatarFallback className="bg-transparent font-bold text-primary">{(s.full_name || "U")[0]}</AvatarFallback>
              </Avatar>
            </button>
            <p className="text-xs font-medium text-foreground truncate mb-1 inline-flex items-center justify-center gap-1 w-full">
              <span className="truncate">{s.full_name || "User"}</span>
              {isBlueVerified(s.is_verified) && <VerifiedBadge size={11} interactive={false} />}
            </p>
            <MutualFollowsBadge mutual={mutualMap?.get(s.id)} className="mb-2 text-center" />
            <div className="mb-2 flex justify-center gap-1">
              <span className="zivo-social-chip rounded-full px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                Fresh
              </span>
              {isBlueVerified(s.is_verified) && (
                <span className="zivo-social-chip rounded-full px-2 py-0.5 text-[9px] font-bold text-primary">
                  Verified
                </span>
              )}
            </div>
            <button type="button"
              onClick={() => followUser(s.id)}
              aria-label={`Follow ${s.full_name || "user"}`}
              className="zivo-social-chip-active flex min-h-[34px] w-full items-center justify-center gap-1 rounded-full py-1.5 text-xs font-semibold shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              <UserPlus className="h-3 w-3" /> Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
