/**
 * FriendRequestsPage — Manage incoming + outgoing friend requests.
 * Backed by `friendships` (orphan-tracked). RLS: user_id or friend_id sees
 * the row; friend_id can UPDATE (accept), either side can DELETE.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, Sparkles, Check, X, Clock, ArrowDownLeft, ArrowUpRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function FriendRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as FriendshipRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              or: (f: string) => Promise<{ data: FriendshipRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("friendships")
        .select("id, user_id, friend_id, status, created_at, accepted_at")
        .eq("status", "pending")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const otherIds = useMemo(() => {
    if (!user?.id) return [];
    const ids = new Set<string>();
    requests.forEach((r) => { ids.add(r.user_id === user.id ? r.friend_id : r.user_id); });
    return Array.from(ids);
  }, [requests, user?.id]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["friend-requests-profiles", otherIds.join(",")],
    queryFn: async () => {
      if (otherIds.length === 0) return [] as UserProfile[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => Promise<{ data: UserProfile[] | null }>;
          };
        };
      };
      const csv = otherIds.join(",");
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: otherIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  const incoming = useMemo(() => requests.filter((r) => r.friend_id === user?.id), [requests, user?.id]);
  const outgoing = useMemo(() => requests.filter((r) => r.user_id === user?.id), [requests, user?.id]);

  const accept = async (id: string) => {
    qc.setQueryData<FriendshipRow[]>(["friend-requests", user?.id], (old) => (old ?? []).filter((r) => r.id !== id));
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      };
    };
    const { error } = await sb.from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Couldn't accept"); qc.invalidateQueries({ queryKey: ["friend-requests", user?.id] }); }
    else toast.success("Friend request accepted");
  };

  const decline = async (id: string) => {
    qc.setQueryData<FriendshipRow[]>(["friend-requests", user?.id], (old) => (old ?? []).filter((r) => r.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("friendships").delete().eq("id", id);
    if (error) { toast.error("Couldn't decline"); qc.invalidateQueries({ queryKey: ["friend-requests", user?.id] }); }
    else toast.success("Request removed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Friend Requests · ZIVO" description="Pending friend requests." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Friend Requests</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Pending</p>
          <p className="text-3xl font-bold mt-1">{incoming.length} incoming</p>
          <p className="text-sm text-white/80 mt-1">{outgoing.length} sent waiting for response</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && incoming.length === 0 && outgoing.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No pending requests</p>
            <p className="text-xs text-muted-foreground">When someone sends you a friend request, it'll show up here.</p>
          </div>
        )}

        {!isLoading && incoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Incoming ({incoming.length})</h2>
            </div>
            <div className="space-y-2">
              {incoming.map((r, idx) => {
                const p = profileMap.get(r.user_id);
                const name = p?.full_name?.trim() || "Someone";
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 12) * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="shrink-0 h-10 w-10 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(r.created_at)}</p>
                    </div>
                    <button type="button" aria-label="Accept" onClick={() => accept(r.id)} className="h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Decline" onClick={() => decline(r.id)} className="h-9 w-9 rounded-full bg-secondary text-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center justify-center active:scale-95 transition-all">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && outgoing.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Sent ({outgoing.length})</h2>
            </div>
            <div className="space-y-2">
              {outgoing.map((r, idx) => {
                const p = profileMap.get(r.friend_id);
                const name = p?.full_name?.trim() || "Someone";
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 12) * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="shrink-0 h-10 w-10 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <div className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                      <p className="text-[11px] text-muted-foreground">Waiting · {formatRelative(r.created_at)}</p>
                    </div>
                    <button type="button" aria-label="Cancel" onClick={() => decline(r.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all">
                      Cancel
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
