/**
 * Outstanding invoices side panel — top N unpaid sorted by days outstanding.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { fmtMoney, type OutstandingInvoice } from "@/lib/admin/paymentsCalculations";

interface Props {
  items: OutstandingInvoice[];
  onApply: (invoiceId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function PaymentsOutstandingPanel({ items, onApply, onOpenInvoice }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" /> Outstanding invoices
          <span className="text-[11px] font-normal text-muted-foreground">· {items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">All caught up — no outstanding invoices.</p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 10).map((it) => {
              const tone = it.daysOutstanding > 60 ? "bg-rose-100 text-rose-700 border-rose-200"
                : it.daysOutstanding > 30 ? "bg-amber-100 text-amber-700 border-amber-200"
                : it.daysOutstanding > 0 ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-muted text-muted-foreground border-border";
              return (
                <li key={it.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <button type="button" onClick={() => onOpenInvoice?.(it.id)} className="text-left min-w-0 flex-1 hover:underline">
                    <div className="font-medium truncate">{it.number || it.id.slice(0, 8)} · {it.customer}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{it.vehicle}</div>
                  </button>
                  <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{fmtMoney(it.balance)}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1 border ${tone}`}>
                      {it.daysOutstanding}d
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onApply(it.id)}>
                    Apply
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
