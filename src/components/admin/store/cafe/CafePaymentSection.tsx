/**
 * CafePaymentSection — overview of accepted tenders and last 30-day totals
 * by payment method. Stripe / processor connection is shared with the rest
 * of the platform (settings tab) — this view only shows what's flowing.
 */
import { useMemo } from "react";
import { Banknote, CreditCard, QrCode, Wallet, Coffee, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCafeOrders } from "@/hooks/cafe/useCafeOrders";
import CafeTillCard from "./CafeTillCard";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CafePaymentSection({ storeId }: Props) {
  const { paymentsByOrder, orders } = useCafeOrders(storeId);

  const summary = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const totals: Record<string, { count: number; gross: number; tip: number; refunded: number }> = {};
    let totalGross = 0, totalTips = 0, totalRefunds = 0, totalCount = 0;
    for (const o of orders) {
      if (new Date(o.placed_at).getTime() < cutoff) continue;
      for (const p of paymentsByOrder[o.id] ?? []) {
        if (!totals[p.method]) totals[p.method] = { count: 0, gross: 0, tip: 0, refunded: 0 };
        totals[p.method].count++;
        totals[p.method].gross += p.amount_cents;
        totals[p.method].tip += p.tip_cents;
        totals[p.method].refunded += p.refunded_cents;
        totalGross += p.amount_cents;
        totalTips += p.tip_cents;
        totalRefunds += p.refunded_cents;
        totalCount++;
      }
    }
    return { totals, totalGross, totalTips, totalRefunds, totalCount };
  }, [paymentsByOrder, orders]);

  const ALL_METHODS = [
    { key: "cash", label: "Cash", Icon: Banknote, color: "text-emerald-600" },
    { key: "card", label: "Card", Icon: CreditCard, color: "text-blue-600" },
    { key: "qr", label: "QR / KHQR", Icon: QrCode, color: "text-violet-600" },
    { key: "wallet", label: "Wallet", Icon: Wallet, color: "text-amber-600" },
    { key: "gift_card", label: "Gift card", Icon: Coffee, color: "text-pink-600" },
    { key: "other", label: "Other", Icon: DollarSign, color: "text-muted-foreground" },
  ] as const;

  return (
    <div className="space-y-4">
      <CafeTillCard storeId={storeId} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Gross</p>
              <p className="text-xl font-bold tabular-nums">{fmt(summary.totalGross)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tips</p>
              <p className="text-xl font-bold tabular-nums">{fmt(summary.totalTips)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Refunds</p>
              <p className="text-xl font-bold tabular-nums">{fmt(summary.totalRefunds)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Payments</p>
              <p className="text-xl font-bold tabular-nums">{summary.totalCount}</p>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {ALL_METHODS.map(({ key, label, Icon, color }) => {
              const t = summary.totals[key] ?? { count: 0, gross: 0, tip: 0, refunded: 0 };
              return (
                <li key={key} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </span>
                  <span className="flex items-center gap-4 text-sm">
                    <span className="text-[11px] text-muted-foreground tabular-nums">{t.count} txn</span>
                    <span className="tabular-nums w-20 text-right">{fmt(t.gross - t.refunded)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accepted payment methods</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
          <p>All six tenders are available out of the box on every ticket. To connect a card processor or KHQR account for automatic capture, head to <span className="font-medium text-foreground">Settings → Payments</span>.</p>
          <p>Split tender is supported — staff can record multiple payments on a single ticket and partial refunds flow through automatically.</p>
        </CardContent>
      </Card>
    </div>
  );
}
