/**
 * P&L Accounts Receivable — total outstanding, aging buckets, top unpaid customers.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";
import { fmtMoney, type ArAging } from "@/lib/admin/pnlCalculations";

interface Props { aging: ArAging; onOpenInvoice?: (id: string) => void }

export default function PnLArAging({ aging, onOpenInvoice }: Props) {
  const buckets = [
    { label: "Current", value: aging.current, color: "bg-emerald-500" },
    { label: "1–30 days", value: aging.d30, color: "bg-amber-400" },
    { label: "31–60 days", value: aging.d60, color: "bg-amber-500" },
    { label: "61–90 days", value: aging.d90, color: "bg-orange-500" },
    { label: "90+ days", value: aging.d90Plus, color: "bg-rose-600" },
  ];
  const total = aging.total || 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" /> Accounts Receivable</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-bold tabular-nums">{fmtMoney(aging.total)}</div>
        </div>

        <div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {buckets.map((b) => (
              <div key={b.label} className={b.color} style={{ width: `${(b.value / total) * 100}%` }} title={`${b.label}: ${fmtMoney(b.value)}`} />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 mt-2 text-[10px]">
            {buckets.map((b) => (
              <div key={b.label} className="text-center">
                <div className="text-muted-foreground truncate">{b.label}</div>
                <div className="font-semibold tabular-nums">{fmtMoney(b.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {aging.topUnpaid.length > 0 && (
          <div>
            <div className="text-[11px] text-muted-foreground mb-1.5">Top unpaid customers</div>
            <ul className="space-y-1.5">
              {aging.topUnpaid.map((u) => (
                <li key={u.id}>
                  <button type="button"
                    onClick={() => onOpenInvoice?.(u.id)}
                    className="w-full text-left flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{u.customer}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {u.daysOverdue > 0 ? `${u.daysOverdue} days overdue` : "Not yet due"}
                      </div>
                    </div>
                    <div className="text-xs font-semibold tabular-nums text-foreground">{fmtMoney(u.outstanding)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
