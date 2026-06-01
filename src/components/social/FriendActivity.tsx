/**
 * FriendActivity — recent activity from people the current user follows.
 * Shows likes + new follows from the last 24h, top 5 most recent.
 *
 * Replaces the previous hardcoded mock that shipped with fabricated names
 * (Sarah K., James P., Alex C.).
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Heart from "lucide-react/dist/esm/icons/heart";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UsersRound from "lucide-react/dist/esm/icons/users-round";

type ActivityKind = "like" | "follow";

interface ActivityItem {
  key: string;
  kind: ActivityKind;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  createdAt: string;
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeShort(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: false })
      .replace(" seconds", "s")
      .replace(" second", "s")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d");
  } catch {
    return "";
  }
}

export default function FriendActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["feed-friend-activity", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      if (!user) return [];

      // 1) Who do I follow?
      const { data: followsRaw } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", user.id);
      const friendIds: string[] = (followsRaw ?? [])
        .map((r: { following_id: string }) => r.following_id)
        .filter((id: string) => id && id !== user.id);
      if (friendIds.length === 0) return [];

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 2) Recent likes + follows by those friends, in parallel.
      const [likesRes, followsRes] = await Promise.all([
        (supabase as any)
          .from("post_likes")
          .select("user_id, created_at")
          .in("user_id", friendIds)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),
        (supabase as any)
          .from("user_followers")
          .select("follower_id, following_id, created_at")
          .in("follower_id", friendIds)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const events: Array<{ kind: ActivityKind; actorId: string; createdAt: string; key: string }> = [];
      for (const r of (likesRes.data ?? []) as Array<{ user_id: string; created_at: string }>) {
        if (!r.user_id || !r.created_at) continue;
        events.push({ kind: "like", actorId: r.user_id, createdAt: r.created_at, key: `like:${r.user_id}:${r.created_at}` });
      }
      for (const r of (followsRes.data ?? []) as Array<{ follower_id: string; following_id: string; created_at: string }>) {
        if (!r.follower_id || !r.created_at) continue;
        if (r.following_id === user.id) continue; // skip "they followed me" — that's a notification, not feed gossip
        events.push({ kind: "follow", actorId: r.follower_id, createdAt: r.created_at, key: `follow:${r.follower_id}:${r.created_at}` });
      }

      events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const top = events.slice(0, 5);
      if (top.length === 0) return [];

      // 3) Hydrate actor profiles in one batch.
      const actorIds = Array.from(new Set(top.map((e) => e.actorId)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", actorIds);
      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      }

      return top.map<ActivityItem>((e) => {
        const p = profileById.get(e.actorId);
        return {
          key: e.key,
          kind: e.kind,
          actorId: e.actorId,
          actorName: p?.full_name || "Someone",
          actorAvatar: p?.avatar_url ?? null,
          createdAt: e.createdAt,
        };
      });
    },
  });

  if (!user || activity.length === 0) return null;

  const likeCount = activity.filter((item) => item.kind === "like").length;
  const followCount = activity.filter((item) => item.kind === "follow").length;
  const activeFriendCount = new Set(activity.map((item) => item.actorId)).size;
  const newestActivity = activity[0];
  const circlePulse =
    likeCount > followCount
      ? "Like-heavy"
      : followCount > likeCount
        ? "Follow-heavy"
        : "Balanced";
  const freshnessScore = activity.length > 0
    ? Math.round((activeFriendCount / activity.length) * 100)
    : 0;

  return (
    <section
      aria-label="Friend activity"
      className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3"
    >
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-foreground">Friend Activity</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {activity.length} recent {activity.length === 1 ? "move" : "moves"} from people you follow
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/activity")}
          aria-label="Open full friend activity"
          className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Heart className="h-3.5 w-3.5" fill="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{likeCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Likes</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{followCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Follows</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
            <Clock3 className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">24h</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Window</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none text-foreground">{activeFriendCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Active</p>
          </div>
        </div>
      </div>
      {newestActivity && (
        <div className="zivo-social-share-preview mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Latest move</p>
            <p className="truncate text-sm font-bold text-foreground">
              {newestActivity.actorName} {newestActivity.kind === "like" ? "liked a post" : "followed someone"}
            </p>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-primary">
            {relativeShort(newestActivity.createdAt)}
          </span>
        </div>
      )}
      <div className="zivo-social-module-tile mb-2.5 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <Gauge className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Circle pulse
            </span>
            <span className="block truncate text-xs font-black text-foreground">{circlePulse}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Freshness
            </span>
            <span className="block truncate text-xs font-black text-foreground">{freshnessScore}% unique</span>
          </span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {activity.map((a) => {
          const verb = a.kind === "like" ? "liked a post" : "started following someone new";
          const label = a.kind === "like" ? "Like" : "Follow";
          return (
            <li key={a.key}>
              <button
                type="button"
                onClick={() => navigate(`/user/${a.actorId}`)}
                className="zivo-social-module-tile group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
                aria-label={`Open ${a.actorName}'s profile. They ${verb} ${relativeShort(a.createdAt)} ago.`}
              >
                <div className="relative shrink-0">
                  <Avatar className="zivo-social-avatar-ring h-10 w-10 transition-transform group-hover:scale-105">
                    <AvatarImage src={a.actorAvatar || undefined} alt="" />
                    <AvatarFallback className="bg-transparent text-primary text-xs font-bold">
                      {initialsOf(a.actorName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={
                      "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-sm " +
                      (a.kind === "like" ? "bg-rose-500" : "bg-primary")
                    }
                    aria-hidden="true"
                  >
                    {a.kind === "like" ? (
                      <Heart className="h-2 w-2 text-white" fill="currentColor" />
                    ) : (
                      <UserPlus className="h-2 w-2 text-white" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-foreground leading-tight line-clamp-1">
                    <span className="font-semibold">{a.actorName}</span> {verb}
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span className="zivo-social-chip rounded-full px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {label}
                    </span>
                    <span className="truncate text-[10px] font-medium text-muted-foreground">
                      Tap to view profile
                    </span>
                  </div>
                </div>
                <span className="zivo-social-chip shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  {relativeShort(a.createdAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
