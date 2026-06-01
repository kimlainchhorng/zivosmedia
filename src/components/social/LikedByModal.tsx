/**
 * LikedByModal
 * ------------
 * IG/FB-style "people who liked this" sheet. Tap from a post's engagement bar
 * to see avatars + names of everyone who liked the post, with follow/unfollow
 * shortcuts inline.
 *
 * Source-aware: queries `post_likes` for user posts and `store_post_likes`
 * for store posts. Joins to public_profiles for the display data.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, Search, Sparkles, UserCheck, UserPlus, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Liker {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_following?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  source: "user" | "store";
  totalCount?: number;
}

export default function LikedByModal({ open, onOpenChange, postId, source, totalCount }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const table = source === "user" ? "post_likes" : "store_post_likes";
        const { data: likes, error } = await (supabase as any)
          .from(table)
          .select("user_id, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const userIds = Array.from(new Set((likes ?? []).map((l: any) => l.user_id)));
        if (userIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const { data: profiles } = await (supabase as any)
          .from("public_profiles")
          .select("user_id, full_name, avatar_url, username")
          .in("user_id", userIds);

        // Optional: who am I following?
        let followingSet = new Set<string>();
        if (user?.id) {
          const { data: follows } = await (supabase as any)
            .from("user_followers")
            .select("followed_id")
            .eq("follower_id", user.id)
            .in("followed_id", userIds);
          followingSet = new Set((follows ?? []).map((f: any) => f.followed_id));
        }

        const map = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
        const ordered: Liker[] = (likes ?? []).map((l: any) => {
          const p = map.get(l.user_id) ?? {};
          return {
            user_id: l.user_id,
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
            username: p.username ?? null,
            is_following: followingSet.has(l.user_id),
          };
        });
        if (!cancelled) setRows(ordered);
      } catch (e) {
        console.error("[LikedByModal] load failed", e);
        if (!cancelled) toast.error("Could not load likes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, postId, source, user?.id]);

  async function toggleFollow(targetId: string, currentlyFollowing: boolean) {
    if (!user?.id) {
      toast.error("Sign in to follow");
      return;
    }
    setBusyId(targetId);
    try {
      if (currentlyFollowing) {
        await (supabase as any)
          .from("user_followers")
          .delete()
          .eq("follower_id", user.id)
          .eq("followed_id", targetId);
      } else {
        await (supabase as any)
          .from("user_followers")
          .insert({ follower_id: user.id, followed_id: targetId });
      }
      setRows((prev) =>
        prev.map((r) => (r.user_id === targetId ? { ...r, is_following: !currentlyFollowing } : r))
      );
    } catch (e) {
      toast.error("Could not update follow");
    } finally {
      setBusyId(null);
    }
  }

  const filteredRows = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [row.full_name, row.username]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(needle));
  });
  const searchActive = query.trim().length > 0;
  const followingCount = rows.filter((row) => row.is_following).length;
  const displayCount = typeof totalCount === "number" && totalCount > 0 ? totalCount : rows.length;
  const circleShare = rows.length > 0 ? Math.round((followingCount / rows.length) * 100) : 0;
  const likeSignal =
    followingCount > 0
      ? { label: "Circle signal", detail: `${circleShare}% from people you follow`, width: `${Math.max(18, circleShare)}%` }
      : displayCount >= 25
        ? { label: "Discovery lift", detail: "Reaching beyond your circle", width: "82%" }
        : { label: "Early spark", detail: "Reaction momentum is starting", width: "42%" };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="zivo-social-sheet-panel flex max-h-[72vh] flex-col overflow-hidden rounded-t-[1.75rem] px-0 pb-0">
        <SheetHeader className="zivo-social-header-glass m-2 rounded-[1.25rem] px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2.5 text-base">
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </span>
            <span className="min-w-0">
              <span className="block truncate leading-tight">Likes</span>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">
                {displayCount > 0 ? `${displayCount} people reacted` : "People who liked this post"}
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-3 pb-2 pt-1">
          {!loading && rows.length > 0 && (
            <>
              <div className="mb-2 grid grid-cols-3 gap-2">
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                    <Heart className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{displayCount}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Likes</p>
                  </div>
                </div>
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UsersRound className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{rows.length}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Loaded</p>
                  </div>
                </div>
                <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <UserCheck className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black leading-none text-foreground">{followingCount}</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Following</p>
                  </div>
                </div>
              </div>
              <div className="zivo-social-module-tile mb-2 rounded-[1.25rem] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{likeSignal.label}</p>
                      <p className="truncate text-[11px] font-semibold text-muted-foreground">{likeSignal.detail}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                    Live
                  </span>
                </div>
                <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-400 via-fuchsia-500 to-primary transition-[width] duration-300"
                    style={{ width: likeSignal.width }}
                  />
                </div>
              </div>
            </>
          )}
          <div className="zivo-social-search relative rounded-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search likes"
              aria-label="Search people who liked this post"
              className="h-10 w-full rounded-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="zivo-social-chip border-white/10 bg-white/[0.04] text-foreground/65">
              {searchActive
                ? `${filteredRows.length} ${filteredRows.length === 1 ? "match" : "matches"}`
                : `${rows.length} loaded`}
            </span>
            <span className="zivo-social-chip border-white/10 bg-white/[0.04] text-foreground/65">
              {source === "store" ? "Store post" : "Creator post"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="zivo-social-module mx-3 my-3 flex flex-col items-center justify-center rounded-[1.25rem] px-4 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="mt-3 text-xs font-semibold">Loading likes</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="zivo-social-module mx-3 my-3 flex flex-col items-center rounded-[1.25rem] px-6 py-10 text-center">
            <span className="zivo-social-share-orb mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Heart className="h-5 w-5 text-primary" />
            </span>
            <p className="text-sm font-semibold text-foreground">No likes yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Likes will show up here as people react.</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="zivo-social-module mx-3 my-3 flex flex-col items-center rounded-[1.25rem] px-6 py-10 text-center">
            <span className="zivo-social-share-orb mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Search className="h-5 w-5 text-primary" />
            </span>
            <p className="text-sm font-semibold text-foreground">No match found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try another name or username.</p>
          </div>
        ) : (
          <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-[max(1rem,var(--zivo-safe-bottom,0px))] pt-1 scrollbar-none">
            {filteredRows.map((r) => {
              const isSelf = user?.id === r.user_id;
              return (
                <li key={r.user_id} className="zivo-social-sheet-row flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all hover:-translate-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/u/${r.username ?? r.user_id}`);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
                  >
                    <div className="zivo-social-avatar-ring relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                          {(r.full_name ?? r.username ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-white">
                        <Heart className="h-2.5 w-2.5 fill-current" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {r.full_name ?? r.username ?? "User"}
                      </p>
                      {r.username && (
                        <p className="text-xs text-muted-foreground truncate">@{r.username}</p>
                      )}
                    </div>
                  </button>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => toggleFollow(r.user_id, !!r.is_following)}
                      disabled={busyId === r.user_id}
                      aria-label={
                        r.is_following
                          ? `Unfollow ${r.full_name || r.username || "this person"}`
                          : `Follow ${r.full_name || r.username || "this person"}`
                      }
                      className={cn(
                        "min-w-[94px] rounded-full px-3 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50",
                        r.is_following
                          ? "zivo-social-chip text-foreground"
                          : "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                      )}
                    >
                      {busyId === r.user_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : r.is_following ? (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Following
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" /> Follow
                        </span>
                      )}
                    </button>
                  )}
                  {isSelf && (
                    <span className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      You
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
