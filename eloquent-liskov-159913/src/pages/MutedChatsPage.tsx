/**
 * MutedChatsPage — Chats you've muted (notifications silenced).
 * Backed by `muted_conversations` (orphan, user-managed).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, VolumeX, Sparkles, Clock, Volume2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MuteRow {
  id: string;
  user_id: string;
  conversation_id: string;
  muted_until: string | null;
  created_at: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const future = ms > 0;
  if (abs < 3_600_000) return `${future ? "in " : ""}${Math.floor(abs / 60_000)}m${future ? "" : " ago"}`;
  if (abs < 86_400_000) return `${future ? "in " : ""}${Math.floor(abs / 3_600_000)}h${future ? "" : " ago"}`;
  return `${future ? "in " : ""}${Math.floor(abs / 86_400_000)}d${future ? "" : " ago"}`;
}

export default function MutedChatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: mutes = [], isLoading } = useQuery({
    queryKey: ["muted-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MuteRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: MuteRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("muted_conversations").select("id, user_id, conversation_id, muted_until, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: mutes.length,
      indefinite: mutes.filter((m) => !m.muted_until).length,
      expiring: mutes.filter((m) => m.muted_until && new Date(m.muted_until).getTime() > now).length,
      expired: mutes.filter((m) => m.muted_until && new Date(m.muted_until).getTime() < now).length,
    };
  }, [mutes]);

  const unmute = async (id: string) => {
    qc.setQueryData<MuteRow[]>(["muted-conversations", user?.id], (old) => (old ?? []).filter((m) => m.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("muted_conversations").delete().eq("id", id);
    if (error) { toast.error("Couldn't unmute"); qc.invalidateQueries({ queryKey: ["muted-conversations", user?.id] }); }
    else toast.success("Unmuted");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Muted Chats · ZIVO" description="Chats with notifications silenced." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <VolumeX className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Muted Chats</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Silenced</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.indefinite} forever · {stats.expiring} timed</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && mutes.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><VolumeX className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">Nothing muted</p>
            <p className="text-xs text-muted-foreground">Long-press any chat to mute notifications without leaving the group.</p>
          </div>
        )}

        {!isLoading && mutes.length > 0 && (
          <div className="space-y-2">
            {mutes.map((m, idx) => {
              const expired = m.muted_until && new Date(m.muted_until).getTime() < Date.now();
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <VolumeX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1 inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {m.conversation_id.slice(0, 18)}…</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {!m.muted_until ? "Muted forever" : expired ? "Expired" : `Until ${formatRelative(m.muted_until)}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => unmute(m.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all">
                    <Volume2 className="h-3 w-3" /> Unmute
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
