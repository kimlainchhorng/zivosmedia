/**
 * CreatorTipsLedger
 * -----------------
 * Read-only view of the creator's tips with multi-rail status badges.
 * Mirrors the lodging/eats payout ledger pattern but for `creator_tips`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, CheckCircle2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Props {
  creatorId: string;
}

interface TipRow {
  id: string;
  creator_id: string;
  tipper_id: string;
  amount_cents: number;
  message: string | null;
  is_anonymous: boolean;
  status: string;
  payment_provider: string | null;
  paypal_capture_id: string | null;
  paypal_order_id: string | null;
  square_payment_id: string | null;
  payment_intent_id: string | null;
  last_payment_error: string | null;
  created_at: string;
  tipper_name?: string | null;
  tipper_avatar?: string | null;
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  processing: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  succeeded: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
  cancelled: "bg-zinc-500/10 text-zinc-700 border-zinc-500/30 dark:text-zinc-300",
  refunded: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Card",
  paypal: "PayPal",
  square: "Square",
  wallet: "Wallet",
};

const PROVIDER_TONE: Record<string, string> = {
  stripe: "border-violet-500/40 text-violet-700 dark:text-violet-300",
  paypal: "border-[#FFC439]/60 text-[#003087] dark:text-[#79b7ff]",
  square: "border-slate-500/40 text-slate-700 dark:text-slate-300",
  wallet: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function CreatorTipsLedger({ creatorId }: Props) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["creator-tips-ledger", creatorId],
    queryFn: async (): Promise<TipRow[]> => {
      const { data, error: tErr } = await (supabase.from("creator_tips") as any)
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (tErr) throw tErr;
      const list = (data || []) as TipRow[];
      // Hydrate tipper names for non-anonymous tips
      const ids = Array.from(new Set(list.filter((r) => !r.is_anonymous).map((r) => r.tipper_id)));
      if (ids.length > 0) {
        const { data: profiles } = await (supabase.from("profiles") as any)
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const map = new Map<string, { name: string; avatar: string }>(
          (profiles || []).map((p: any) => [p.user_id, { name: p.full_name, avatar: p.avatar_url }]),
        );
        return list.map((r) => ({
          ...r,
          tipper_name: r.is_anonymous ? null : map.get(r.tipper_id)?.name ?? null,
          tipper_avatar: r.is_anonymous ? null : map.get(r.tipper_id)?.avatar ?? null,
        }));
      }
      return list;
    },
    enabled: !!creatorId,
    staleTime: 30_000,
  });

  const totals = useMemo(() => {
    let earned = 0;
    let pending = 0;
    let failed = 0;
    let refunded = 0;
    const byProvider: Record<string, number> = {};
    for (const r of rows) {
      if (r.status === "succeeded") {
        earned += r.amount_cents;
        const p = r.payment_provider || "stripe";
        byProvider[p] = (byProvider[p] || 0) + r.amount_cents;
      } else if (r.status === "pending" || r.status === "processing") pending++;
      else if (r.status === "failed") failed++;
      else if (r.status === "refunded") refunded += r.amount_cents;
    }
    return { earned, pending, failed, refunded, byProvider };
  }, [rows]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-foreground" />
            Tips received
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Per-tip breakdown across Card, PayPal, Square, and Wallet rails.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Earned: <span className="ml-1 font-bold tabular-nums">{money(totals.earned)}</span></Badge>
            {totals.refunded > 0 && <Badge variant="outline" className="text-[10px] border-border text-foreground dark:text-foreground">{money(totals.refunded)} refunded</Badge>}
            {totals.pending > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">{totals.pending} pending</Badge>}
            {totals.failed > 0 && <Badge variant="outline" className="text-[10px] border-border text-foreground dark:text-foreground">{totals.failed} failed</Badge>}
          </div>
        )}
      </div>

      {/* Provider breakdown chips */}
      {Object.keys(totals.byProvider).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
          {Object.entries(totals.byProvider).map(([provider, cents]) => (
            <span key={provider} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${PROVIDER_TONE[provider] || "border-border"}`}>
              {PROVIDER_LABELS[provider] || provider}: <span className="tabular-nums">{money(cents)}</span>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tips…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-3 text-xs text-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Could not load tips.
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 opacity-50" />
          <p>No tips yet. Once fans tip you, every transaction shows up here with the rail it came in on.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/30">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(340 75% 55% / 0.15)" }}>
                <Heart className="w-3.5 h-3.5" style={{ color: "hsl(340 75% 55%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold tabular-nums">
                    {money(r.amount_cents)}
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      from {r.is_anonymous ? "Anonymous" : (r.tipper_name || "Someone")}
                    </span>
                  </p>
                  <div className="flex items-center gap-1">
                    {r.payment_provider && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold ${PROVIDER_TONE[r.payment_provider] || "border-border"}`}>
                        {PROVIDER_LABELS[r.payment_provider] || r.payment_provider}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${STATUS_TONE[r.status] || "border-border"}`}>
                      {r.status === "succeeded" && <CheckCircle2 className="h-2.5 w-2.5" />}
                      {(r.status === "pending" || r.status === "processing") && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                      {r.status === "failed" && <AlertTriangle className="h-2.5 w-2.5" />}
                      {r.status}
                    </span>
                  </div>
                </div>
                {r.message && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 italic">"{r.message}"</p>
                )}
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  {r.last_payment_error && (
                    <span className="ml-1.5 text-foreground" title={r.last_payment_error}>· {r.last_payment_error.slice(0, 40)}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
