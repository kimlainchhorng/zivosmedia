/**
 * LodgingAutoPayoutLedger
 * -----------------------
 * Read-only view of the `lodge_payout_ledger` for a partner store. Shows every
 * automatic Stripe Connect transfer (and any reversals on refund) so the host
 * can see exactly what landed in their bank account, when, and why.
 *
 * Auto-transfers are created by stripe-lodging-webhook on `payment_intent.succeeded`
 * for Stripe-paid lodging bookings whose store has Connect onboarded and
 * auto_payout_enabled = true. Reversals fire on refund/dispute.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, ArrowUpRight, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { money } from "./LodgingOperationsShared";

interface Props {
  storeId: string;
}

interface LedgerRow {
  id: string;
  reservation_id: string;
  store_id: string;
  stripe_account_id: string;
  direction: "transfer" | "reversal";
  amount_cents: number;
  commission_cents: number;
  commission_rate: number | null;
  stripe_transfer_id: string | null;
  stripe_reversal_id: string | null;
  status: "queued" | "created" | "failed";
  error_message: string | null;
  created_at: string;
  reservation_number?: string | null;
}

const STATUS_TONE: Record<LedgerRow["status"], string> = {
  queued: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  created: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
};

const DIRECTION_TONE: Record<LedgerRow["direction"], string> = {
  transfer: "text-emerald-600 dark:text-emerald-400",
  reversal: "text-rose-600 dark:text-rose-400",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function stripeUrl(transferId: string) {
  return `https://dashboard.stripe.com/connect/transfers/${transferId}`;
}

export default function LodgingAutoPayoutLedger({ storeId }: Props) {
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["lodge-payout-ledger", storeId],
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data: ledger, error: lErr } = await (supabase
        .from("lodge_payout_ledger") as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (lErr) throw lErr;
      const list = (ledger || []) as LedgerRow[];
      if (list.length === 0) return list;
      // Hydrate reservation numbers for nicer display.
      const ids = Array.from(new Set(list.map((r) => r.reservation_id)));
      const { data: reservations } = await (supabase
        .from("lodge_reservations") as any)
        .select("id, number")
        .in("id", ids);
      const map = new Map<string, string>((reservations || []).map((r: any) => [r.id, r.number]));
      return list.map((r) => ({ ...r, reservation_number: map.get(r.reservation_id) ?? null }));
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

  const totals = useMemo(() => {
    let netReceived = 0;
    let totalCommission = 0;
    let pendingCount = 0;
    let failedCount = 0;
    for (const r of rows) {
      if (r.status === "created") {
        netReceived += r.direction === "transfer" ? r.amount_cents : -r.amount_cents;
        if (r.direction === "transfer") totalCommission += r.commission_cents || 0;
      }
      if (r.status === "queued") pendingCount++;
      if (r.status === "failed") failedCount++;
    }
    return { netReceived, totalCommission, pendingCount, failedCount };
  }, [rows]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <ArrowDownUp className="h-3.5 w-3.5 text-primary" />
            Automatic transfers
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Stripe Connect transfers we send to your bank when guests pay by card. Reversals run automatically on refund.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Net received: <span className="ml-1 font-bold tabular-nums">{money(totals.netReceived)}</span></Badge>
            <Badge variant="outline" className="text-[10px]">Commission: {money(totals.totalCommission)}</Badge>
            {totals.pendingCount > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">{totals.pendingCount} pending</Badge>}
            {totals.failedCount > 0 && <Badge variant="outline" className="text-[10px] border-border text-foreground dark:text-foreground">{totals.failedCount} failed</Badge>}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading transfer history…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-3 text-xs text-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Could not load transfer history.
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          No automatic transfers yet. Once a guest pays by card and your Stripe account is connected, your share will land here automatically.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b border-border/60">
              <tr>
                <th className="text-left font-medium pb-2 pr-3">When</th>
                <th className="text-left font-medium pb-2 pr-3">Reservation</th>
                <th className="text-right font-medium pb-2 pr-3">Amount</th>
                <th className="text-right font-medium pb-2 pr-3">Commission</th>
                <th className="text-left font-medium pb-2 pr-3">Status</th>
                <th className="text-left font-medium pb-2">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r) => {
                const ref = r.stripe_reversal_id || r.stripe_transfer_id;
                const url = r.stripe_transfer_id ? stripeUrl(r.stripe_transfer_id) : null;
                const sign = r.direction === "transfer" ? "+" : "−";
                return (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono">{r.reservation_number ?? r.reservation_id.slice(0, 8)}</td>
                    <td className={`py-2 pr-3 text-right font-bold tabular-nums ${DIRECTION_TONE[r.direction]}`}>
                      {sign}{money(r.amount_cents)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {r.commission_cents > 0 ? money(r.commission_cents) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${STATUS_TONE[r.status]}`}>
                        {r.status === "created" && <CheckCircle2 className="h-3 w-3" />}
                        {r.status === "queued" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {r.status === "failed" && <AlertTriangle className="h-3 w-3" />}
                        {r.status}
                      </span>
                      {r.error_message && (
                        <p className="mt-1 text-[10px] text-foreground max-w-[220px] line-clamp-2" title={r.error_message}>
                          {r.error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-2 align-middle">
                      {ref ? (
                        url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                          >
                            {ref.slice(0, 14)}…
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">{ref.slice(0, 14)}…</span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 50 && (
        <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" /> Showing the most recent 50 transfers.
        </p>
      )}
    </div>
  );
}
