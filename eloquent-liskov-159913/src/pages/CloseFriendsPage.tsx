/**
 * CloseFriendsPage — Instagram-style close-friends list.
 * Manages who can see stories you mark as "close friends only."
 * Backed by the real `close_friends` table.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, Search, Check, X, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Friend {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface CloseFriendRow {
  id: string;
  friend_id: string;
}

export default function CloseFriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Real friendships query (people the user follows, mutual or one-way).
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["close-friends-pool", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Friend[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              limit: (n: number) => Promise<{ data: { following_id: string }[] | null }>;
            };
          };
        };
      };
      const { data: followingRows } = await sb
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id)
        .limit(200);
      const ids = (followingRows ?? []).map((r) => r.following_id);
      if (ids.length === 0) return [];
      const sbProfiles = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: Friend[] | null }>;
          };
        };
      };
      const { data: profiles } = await sbProfiles
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", ids);
      return profiles ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Current close-friends rows.
  const { data: closeFriends = [] } = useQuery({
    queryKey: ["close-friends-list", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CloseFriendRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => Promise<{ data: CloseFriendRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("close_friends")
        .select("id, friend_id")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const closeFriendIdSet = useMemo(() => new Set(closeFriends.map((c) => c.friend_id)), [closeFriends]);

  const addMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("close_friends").insert({ user_id: user.id, friend_id: friendId });
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setPendingId(id),
    onSettled: () => {
      setPendingId(null);
      qc.invalidateQueries({ queryKey: ["close-friends-list", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not add"),
  });

  const removeMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => {
              eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
      };
      const { error } = await sb.from("close_friends").delete().eq("user_id", user.id).eq("friend_id", friendId);
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setPendingId(id),
    onSettled: () => {
      setPendingId(null);
      qc.invalidateQueries({ queryKey: ["close-friends-list", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove"),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      (f.full_name ?? "").toLowerCase().includes(q) ||
      (f.username ?? "").toLowerCase().includes(q),
    );
  }, [friends, query]);

  // Sort: close-friends first, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aIn = closeFriendIdSet.has(a.user_id) ? 0 : 1;
      const bIn = closeFriendIdSet.has(b.user_id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return (a.full_name ?? a.username ?? "").localeCompare(b.full_name ?? b.username ?? "");
    });
  }, [filtered, closeFriendIdSet]);

  const toggle = (id: string) => {
    if (pendingId) return;
    if (closeFriendIdSet.has(id)) removeMutation.mutate(id);
    else addMutation.mutate(id);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Close Friends · ZIVO" description="Pick who sees the stories you share privately." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Star className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Close Friends</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Lock className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Close friends only</p>
          <p className="text-3xl font-bold mt-1">
            {closeFriends.length} {closeFriends.length === 1 ? "person" : "people"}
          </p>
          <p className="text-sm text-white/80 mt-1">
            Stories you share to close friends are hidden from everyone else.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name or username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {/* List */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="h-11 w-11 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && friends.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Follow a few people first</p>
            <p className="text-xs text-muted-foreground mb-4">
              Once you're following accounts, you can pick who sees your private stories.
            </p>
            <Button
              onClick={() => navigate("/feed")}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              Browse feed
            </Button>
          </div>
        )}

        {!isLoading && friends.length > 0 && sorted.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No friends match your search.</p>
        )}

        {!isLoading && sorted.length > 0 && (
          <div className="space-y-1">
            {sorted.map((f, idx) => {
              const isCF = closeFriendIdSet.has(f.user_id);
              const initial = (f.full_name?.[0] ?? f.username?.[0] ?? "Z").toUpperCase();
              return (
                <motion.button
                  key={f.user_id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  onClick={() => toggle(f.user_id)}
                  disabled={pendingId === f.user_id}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left active:scale-[0.98]",
                    isCF ? "bg-secondary/40" : "hover:bg-secondary/40",
                  )}
                  aria-pressed={isCF}
                >
                  <div className={cn(
                    "shrink-0 rounded-full p-[2px]",
                    isCF ? "bg-ig-gradient" : "bg-transparent",
                  )}>
                    <Avatar className="h-11 w-11 ring-2 ring-background">
                      <AvatarImage src={f.avatar_url ?? undefined} alt={f.full_name ?? "User"} />
                      <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{f.full_name ?? "—"}</p>
                    {f.username && (
                      <p className="text-xs text-muted-foreground line-clamp-1">@{f.username}</p>
                    )}
                  </div>
                  <div className={cn(
                    "shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all",
                    isCF
                      ? "bg-ig-gradient text-white shadow-sm"
                      : "border-2 border-muted-foreground/30",
                  )}>
                    {isCF && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    {pendingId === f.user_id && !isCF && (
                      <span className="block h-2.5 w-2.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {!isLoading && closeFriends.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1 pt-2">
            <X className="h-3 w-3" />
            <span>Tap a friend with a green check to remove them from the list.</span>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
