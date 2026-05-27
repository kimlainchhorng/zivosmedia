/**
 * LiveChatSessionsPage — Live-chat sessions you've had with support agents.
 * Backed by `live_chat_sessions` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Sparkles, Clock, CheckCircle2, Hourglass, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Status = "waiting" | "active" | "ended";
type Tab = "all" | "active" | "ended";

interface SessionRow {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  status: Status;
  agent_id: string | null;
  agent_joined_at: string | null;
  ended_at: string | null;
  ended_by: string | null;
  context_type: string | null;
  created_at?: string;
}

const STATUS_META: Record<Status, { label: string; tone: string; bg: string; icon: typeof CheckCircle2 }> = {
  waiting: { label: "Waiting", tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",   icon: Hourglass },
  active:  { label: "Active",  tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", icon: Loader2 },
  ended:   { label: "Ended",   tone: "text-muted-foreground",                  bg: "bg-secondary",      icon: CheckCircle2 },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function durationStr(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const min = Math.floor((e - s) / 60_000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function LiveChatSessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["live-chat-sessions-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as SessionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: SessionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("live_chat_sessions").select("id, user_id, guest_name, status, agent_id, agent_joined_at, ended_at, ended_by, context_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: sessions.length,
    active: sessions.filter((s) => s.status === "active" || s.status === "waiting").length,
    ended: sessions.filter((s) => s.status === "ended").length,
  }), [sessions]);

  const filtered = useMemo(() => {
    if (tab === "active") return sessions.filter((s) => s.status === "active" || s.status === "waiting");
    if (tab === "ended") return sessions.filter((s) => s.status === "ended");
    return sessions;
  }, [sessions, tab]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Live Chats · ZIVO" description="Your live chat sessions." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Live Chats</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Sessions</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.active} active · {stats.ended} ended</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
          <button type="button" onClick={() => setTab("active")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
          <button type="button" onClick={() => setTab("ended")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Ended</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Headphones className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">{sessions.length === 0 ? "No live chats" : "Nothing in this tab"}</p>
            {sessions.length === 0 && <p className="text-xs text-muted-foreground">Open a live chat with our support team from the Help Center.</p>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((s, idx) => {
              const meta = STATUS_META[s.status];
              const Icon = meta.icon;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.03 }} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.tone, s.status === "active" && "animate-spin")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground line-clamp-1 capitalize">{s.context_type?.replace(/_/g, " ") ?? "Support"}</p>
                      <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(s.created_at ?? s.agent_joined_at)}</span>
                      {s.agent_joined_at && (<><span>·</span><span>Lasted {durationStr(s.agent_joined_at, s.ended_at)}</span></>)}
                      {s.ended_by && (<><span>·</span><span className="capitalize">Ended by {s.ended_by}</span></>)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
