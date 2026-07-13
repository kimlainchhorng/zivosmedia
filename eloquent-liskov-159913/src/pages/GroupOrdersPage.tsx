/**
 * GroupOrdersPage — Group food-order sessions you're hosting or in.
 * Backed by `group_order_sessions` joined w/ `restaurants` (food orders).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Sparkles, Clock, UtensilsCrossed, Crown, Hourglass, Lock, CheckCircle2, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "open" | "locked" | "checked_out" | "cancelled";
type Tab = "all" | "open" | "completed";

interface SessionRow {
  id: string;
  restaurant_id: string;
  host_user_id: string;
  invite_code: string;
  status: Status;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

interface RestaurantRow { id: string; name: string; logo_url: string | null; }

const STATUS_META: Record<Status, { label: string; tone: string; bg: string; icon: typeof Hourglass }> = {
  open:         { label: "Open",      tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15",  icon: Hourglass },
  locked:       { label: "Locked",    tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",    icon: Lock },
  checked_out:  { label: "Completed", tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",     icon: CheckCircle2 },
  cancelled:    { label: "Cancelled", tone: "text-muted-foreground",                  bg: "bg-secondary",       icon: XCircle },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const future = ms > 0;
  if (abs < 60_000) return future ? "soon" : "just now";
  if (abs < 3_600_000) return `${future ? "in " : ""}${Math.floor(abs / 60_000)}m${future ? "" : " ago"}`;
  if (abs < 86_400_000) return `${future ? "in " : ""}${Math.floor(abs / 3_600_000)}h${future ? "" : " ago"}`;
  return `${future ? "in " : ""}${Math.floor(abs / 86_400_000)}d${future ? "" : " ago"}`;
}

export default function GroupOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["group-orders-me", user?.id],
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
      const { data } = await sb
        .from("group_order_sessions")
        .select("id, restaurant_id, host_user_id, invite_code, status, deadline, created_at, updated_at")
        .eq("host_user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const restaurantIds = useMemo(() => Array.from(new Set(sessions.map((s) => s.restaurant_id))), [sessions]);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["group-orders-restaurants", restaurantIds.join(",")],
    queryFn: async () => {
      if (restaurantIds.length === 0) return [] as RestaurantRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: RestaurantRow[] | null }>;
          };
        };
      };
      const { data } = await sb.from("restaurants").select("id, name, logo_url").in("id", restaurantIds);
      return data ?? [];
    },
    enabled: restaurantIds.length > 0,
    staleTime: 60_000,
  });

  const restaurantMap = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);

  const stats = useMemo(() => ({
    total: sessions.length,
    open: sessions.filter((s) => s.status === "open" || s.status === "locked").length,
    completed: sessions.filter((s) => s.status === "checked_out").length,
  }), [sessions]);

  const filtered = useMemo(() => {
    if (tab === "open") return sessions.filter((s) => s.status === "open" || s.status === "locked");
    if (tab === "completed") return sessions.filter((s) => s.status === "checked_out" || s.status === "cancelled");
    return sessions;
  }, [sessions, tab]);

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied");
    } catch { toast.error("Couldn't copy"); }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Group Orders · ZIVO" description="Collaborative food orders." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Group Orders</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Hosting</p>
          <p className="text-3xl font-bold mt-1">{stats.open} active</p>
          <p className="text-sm text-white/80 mt-1">{stats.completed} completed · {stats.total} total</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
          <button type="button" onClick={() => setTab("open")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "open" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Open ({stats.open})</button>
          <button type="button" onClick={() => setTab("completed")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "completed" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Done</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">{sessions.length === 0 ? "No group orders yet" : "Nothing in this tab"}</p>
            {sessions.length === 0 && <p className="text-xs text-muted-foreground">Start a group order from any restaurant to invite friends to add items to one shared cart.</p>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((s, idx) => {
              const r = restaurantMap.get(s.restaurant_id);
              const meta = STATUS_META[s.status];
              const StatusIcon = meta.icon;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-start gap-3">
                    {r?.logo_url ? (
                      <img src={r.logo_url} alt="" className="shrink-0 h-10 w-10 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center">
                        <UtensilsCrossed className="h-4 w-4 text-ig-gradient" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground line-clamp-1">{r?.name ?? "Restaurant"}</p>
                        <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider", meta.bg, meta.tone)}>
                          <StatusIcon className="h-2.5 w-2.5" />{meta.label}
                        </span>
                        {s.host_user_id === user?.id && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Crown className="h-2.5 w-2.5" />Host
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(s.created_at)}</span>
                        {s.deadline && (<><span>·</span><span>Deadline {formatRelative(s.deadline)}</span></>)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] font-mono font-bold">{s.invite_code}</code>
                        <button type="button" aria-label="Copy invite code" onClick={() => copyInvite(s.invite_code)} className="h-7 w-7 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center transition-colors">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
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
