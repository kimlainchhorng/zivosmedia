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
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!open) return;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            Likes{typeof totalCount === "number" && totalCount > 0 ? ` · ${totalCount}` : ""}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No likes yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 mt-2">
            {rows.map((r) => {
              const isSelf = user?.id === r.user_id;
              return (
                <li key={r.user_id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/u/${r.username ?? r.user_id}`);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                      {r.avatar_url ? (
	                        <img src={r.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                          {(r.full_name ?? r.username ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
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
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50 ${
                        r.is_following
                          ? "bg-muted border-border text-foreground"
                          : "bg-primary border-primary text-primary-foreground"
                      }`}
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
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
