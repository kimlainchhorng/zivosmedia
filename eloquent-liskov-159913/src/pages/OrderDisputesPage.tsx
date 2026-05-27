/**
 * OrderDisputesPage — Disputes you've opened on food orders.
 * Backed by `order_disputes` (orphan). RLS: customer + merchant + admin.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gavel, Sparkles, Clock, DollarSign, AlertCircle, Loader2, CheckCircle2, XCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Status = "open" | "under_review" | "resolved" | "rejected" | "escalated";
type Tab = "all" | "open" | "resolved";

interface DisputeRow {
  id: string;
  order_id: string;
  created_by: string | null;
  created_role: string | null;
  reason: string;
  description: string | null;
  status: Status;
  priority: string | null;
  requested_refund_amount: number | null;
  approved_refund_amount: number | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<Status, { label: string; tone: string; bg: string; icon: typeof AlertCircle }> = {
  open:         { label: "Open",          tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",     icon: AlertCircle },
  under_review: { label: "Under review",  tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",    icon: Loader2     },
  resolved:     { label: "Resolved",      tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15",  icon: CheckCircle2 },
  rejected:     { label: "Rejected",      tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",     icon: XCircle     },
  escalated:    { label: "Escalated",     tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",     icon: ArrowUpCircle },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function OrderDisputesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["order-disputes-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DisputeRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: DisputeRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("order_disputes")
        .select("id, order_id, created_by, created_role, reason, description, status, priority, requested_refund_amount, approved_refund_amount, resolution_notes, resolved_at, created_at, updated_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: disputes.length,
    open: disputes.filter((d) => d.status === "open" || d.status === "under_review" || d.status === "escalated").length,
    refunded: disputes.reduce((s, d) => s + Number(d.approved_refund_amount ?? 0), 0),
  }), [disputes]);

  const filtered = useMemo(() => {
    if (tab === "open") return disputes.filter((d) => ["open", "under_review", "escalated"].includes(d.status));
    if (tab === "resolved") return disputes.filter((d) => ["resolved", "rejected"].includes(d.status));
    return disputes;
  }, [disputes, tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",      label: "All",      count: stats.total },
    { id: "open",     label: "Open",     count: stats.open  },
    { id: "resolved", label: "Resolved", count: disputes.filter((d) => ["resolved", "rejected"].includes(d.status)).length },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Order Disputes · ZIVO" description="Disputes on your orders." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Gavel className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Order Disputes</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Disputes</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.open} open · ${stats.refunded.toFixed(2)} refunded</p>
        </motion.div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Gavel className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">{disputes.length === 0 ? "No disputes filed" : "Nothing in this tab"}</p>
            {disputes.length === 0 && <p className="text-xs text-muted-foreground">If something goes wrong with an order, open a dispute from your order details.</p>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((d, idx) => {
              const meta = STATUS_META[d.status];
              const Icon = meta.icon;
              const requested = Number(d.requested_refund_amount ?? 0);
              const approved = Number(d.approved_refund_amount ?? 0);
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.tone, d.status === "under_review" && "animate-spin")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground capitalize">{d.reason.replace(/_/g, " ")}</p>
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>{meta.label}</span>
                        {d.priority === "urgent" && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">Urgent</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(d.created_at)}
                      </p>
                      {d.description && <p className="text-xs text-foreground/85 line-clamp-2 mt-1">{d.description}</p>}
                    </div>
                    {requested > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-ig-gradient inline-flex items-center gap-0.5">
                          <DollarSign className="h-3 w-3" />{(approved > 0 ? approved : requested).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{approved > 0 ? "approved" : "requested"}</p>
                      </div>
                    )}
                  </div>
                  {d.resolution_notes && (
                    <div className={cn("mt-2.5 p-2.5 rounded-xl", meta.bg)}>
                      <p className={cn("text-[10px] font-extrabold uppercase tracking-wider", meta.tone)}>Resolution</p>
                      <p className="text-xs text-foreground/85 mt-0.5">{d.resolution_notes}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
