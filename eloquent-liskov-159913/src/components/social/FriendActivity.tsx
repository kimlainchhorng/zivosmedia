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
import Heart from "lucide-react/dist/esm/icons/heart";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";

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

  return (
    <section
      aria-label="Friend activity"
      className="bg-card border-b border-border/10 px-3 py-3"
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-foreground" aria-hidden="true" />
          Friend Activity
        </h3>
        <button
          type="button"
          onClick={() => navigate("/activity")}
          className="text-[12px] font-semibold text-primary active:opacity-70"
        >
          See all
        </button>
      </div>
      <ul className="space-y-2.5">
        {activity.map((a) => {
          const verb = a.kind === "like" ? "liked a post" : "started following someone new";
          return (
            <li key={a.key}>
              <button
                type="button"
                onClick={() => navigate(`/user/${a.actorId}`)}
                className="w-full flex items-center gap-2.5 text-left active:opacity-70 transition-opacity"
                aria-label={`${a.actorName} ${verb}`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={a.actorAvatar || undefined} alt="" />
                    <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                      {initialsOf(a.actorName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={
                      "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-card " +
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
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
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
