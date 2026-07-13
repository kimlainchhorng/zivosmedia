/**
 * LodgingPayoutHistoryTable
 * -------------------------
 * Reads `lodge_payout_requests` for a store and renders the full status flow:
 *   pending → approved → paid    (success path)
 *           → rejected            (failure path, with reason)
 *           → cancelled           (host cancelled)
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2, Banknote, ShieldCheck, Wallet, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { money } from "./LodgingOperationsShared";
import { RAIL_LABELS, type PayoutRail } from "@/lib/payouts/payoutRails";

interface Props { storeId: string; }

interface PayoutRow {
  id: string;
  amount_cents: number;
  currency: string;
  rail: string;
  status: string;
  reference: string | null;
  failure_reason: string | null;
  admin_note: string | null;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  payout_method?: { label: string | null; method_type: string; account_number: string | null; aba_account_id: string | null; bank_name: string | null } | null;
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Requested",  className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  approved:  { label: "Processing", className: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  paid:      { label: "Completed",  className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  rejected:  { label: "Failed",     className: "bg-red-500/15 text-red-700 border-red-500/30" },
  cancelled: { label: "Cancelled",  className: "bg-muted text-muted-foreground border-border" },
};

const RAIL_ICON: Record<PayoutRail, typeof Banknote> = {
  stripe: ShieldCheck, aba: Banknote, bank_wire: Landmark, paypal: Wallet, square: Wallet, mercury: Landmark,
};

export default function LodgingPayoutHistoryTable({ storeId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lodge-payout-history", storeId],
    queryFn: async (): Promise<PayoutRow[]> => {
      const { data, error } = await (supabase
        .from("lodge_payout_requests") as any)
        .select("*, payout_method:customer_payout_methods(label, method_type, account_number, aba_account_id, bank_name)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as PayoutRow[];
    },
    enabled: !!storeId,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Payout history</p>
        <Badge variant="outline">{rows.length}</Badge>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />Loading payout history…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payout requests yet. Click "Request payout" to send one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">Requested</th>
                <th className="py-2 font-medium">Method</th>
                <th className="py-2 font-medium text-right">Amount</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Reference / Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const Icon = RAIL_ICON[(r.rail as PayoutRail)] || Banknote;
                const s = STATUS[r.status] || STATUS.pending;
                const m = r.payout_method;
                const methodSummary = m
                  ? (m.method_type === "aba" ? `ABA ${m.aba_account_id || ""}`
                    : m.method_type === "paypal" ? (m.account_number || "PayPal")
                    : `${m.bank_name || "Bank"} ···${(m.account_number || "").slice(-4)}`)
                  : RAIL_LABELS[r.rail as PayoutRail] || r.rail;
                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 align-top">
                    <td className="py-2">
                      <div className="font-medium">{new Date(r.created_at).toLocaleDateString()}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{RAIL_LABELS[r.rail as PayoutRail] || r.rail}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{methodSummary}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right font-semibold">{money(r.amount_cents)}</td>
                    <td className="py-2">
                      <Badge className={s.className}>{s.label}</Badge>
                      {r.status === "paid" && r.paid_at && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(r.paid_at).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="py-2 text-[11px] text-muted-foreground max-w-[220px]">
                      {r.status === "rejected"
                        ? <span className="text-red-700">{r.failure_reason || r.admin_note || "Payout failed"}</span>
                        : r.reference
                          ? <span className="font-mono">{r.reference}</span>
                          : <span>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
