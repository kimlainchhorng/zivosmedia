/**
 * 4-card KPI strip above the Estimates/Invoices list.
 * Outstanding · Paid this month · Overdue · Avg ticket.
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Wallet, CheckCircle2, AlertCircle, Receipt } from "lucide-react";

type Invoice = {
  total_cents: number;
  amount_paid_cents: number | null;
  status: string;
  due_at?: string | null;
  paid_at?: string | null;
  created_at: string;
};

interface Props {
  invoices: Invoice[];
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function InvoiceKpiStrip({ invoices }: Props) {
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let outstanding = 0;
    let paidThisMonth = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let totalTicket = 0;
    let count = 0;

    for (const inv of invoices) {
      const total = inv.total_cents ?? 0;
      const paid = inv.amount_paid_cents ?? 0;
      totalTicket += total;
      count += 1;

      if (inv.status !== "paid") {
        outstanding += Math.max(0, total - paid);
      }

      if (inv.paid_at && new Date(inv.paid_at) >= monthStart) {
        paidThisMonth += paid;
      }

      if (inv.due_at && inv.status !== "paid" && new Date(inv.due_at) < now) {
        overdueCount += 1;
        overdueAmount += Math.max(0, total - paid);
      }
    }

    return {
      outstanding,
      paidThisMonth,
      overdueCount,
      overdueAmount,
      avg: count ? Math.round(totalTicket / count) : 0,
    };
  }, [invoices]);

  const cards = [
    { label: "Outstanding", value: fmt(kpis.outstanding), icon: Wallet, tone: "text-amber-500" },
    { label: "Paid this month", value: fmt(kpis.paidThisMonth), icon: CheckCircle2, tone: "text-emerald-500" },
    {
      label: "Overdue",
      value: kpis.overdueCount > 0 ? `${kpis.overdueCount} · ${fmt(kpis.overdueAmount)}` : "0",
      icon: AlertCircle,
      tone: kpis.overdueCount > 0 ? "text-red-500" : "text-muted-foreground",
    },
    { label: "Avg ticket", value: fmt(kpis.avg), icon: Receipt, tone: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-2.5 flex items-center gap-2.5 border-border/60">
            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${c.tone}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
              <p className="text-sm font-bold truncate">{c.value}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
