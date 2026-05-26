/**
 * MutedBlockedUsersPage — Manage muted + blocked users.
 * Backed by `user_safety_actions` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldOff, Sparkles, VolumeX, Ban, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Action = "mute" | "block";
type Tab = "all" | Action;

interface ActionRow {
  id: string;
  user_id: string;
  target_user_id: string;
  action: Action;
  created_at: string;
}

interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MutedBlockedUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["user-safety-actions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ActionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ActionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("user_safety_actions").select("id, user_id, target_user_id, action, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const targetIds = useMemo(() => Array.from(new Set(actions.map((a) => a.target_user_id))), [actions]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["user-safety-profiles", targetIds.join(",")],
    queryFn: async () => {
      if (targetIds.length === 0) return [] as UserProfile[];
      const csv = targetIds.join(",");
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => Promise<{ data: UserProfile[] | null }> } } };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: targetIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  const stats = useMemo(() => ({
    muted: actions.filter((a) => a.action === "mute").length,
    blocked: actions.filter((a) => a.action === "block").length,
  }), [actions]);

  const filtered = useMemo(() => tab === "all" ? actions : actions.filter((a) => a.action === tab), [actions, tab]);

  const undo = async (id: string) => {
    qc.setQueryData<ActionRow[]>(["user-safety-actions", user?.id], (old) => (old ?? []).filter((a) => a.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("user_safety_actions").delete().eq("id", id);
    if (error) { toast.error("Couldn't undo"); qc.invalidateQueries({ queryKey: ["user-safety-actions", user?.id] }); }
    else toast.success("Restored");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Muted & Blocked · ZIVO" description="Manage muted and blocked users." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldOff className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Muted & Blocked</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Restricted</p>
          <p className="text-3xl font-bold mt-1">{actions.length}</p>
          <p className="text-sm text-white/80 mt-1">{stats.muted} muted · {stats.blocked} blocked</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All</button>
          <button type="button" onClick={() => setTab("mute")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "mute" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Muted ({stats.muted})</button>
          <button type="button" onClick={() => setTab("block")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "block" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Blocked ({stats.blocked})</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><ShieldOff className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No restrictions</p>
            <p className="text-xs text-muted-foreground">When you mute or block someone, they'll show up here so you can undo.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((a, idx) => {
              const p = profileMap.get(a.target_user_id);
              const name = p?.full_name?.trim() || "User";
              const isBlock = a.action === "block";
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="shrink-0 h-10 w-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                      <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", isBlock ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                        {isBlock ? <Ban className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
                        {isBlock ? "Blocked" : "Muted"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(a.created_at)}</p>
                  </div>
                  <button type="button" onClick={() => undo(a.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all">
                    <RotateCcw className="h-3 w-3" /> Undo
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
