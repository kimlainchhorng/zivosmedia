/**
 * P&L Expense breakdown — toggle by Category / Vendor / Method, with drill-down drawer.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Wallet, Receipt } from "lucide-react";
import { fmtMoney, type ExpenseRow } from "@/lib/admin/pnlCalculations";

interface Props { expenses: ExpenseRow[] }

type Mode = "category" | "vendor" | "method";

export default function PnLExpenseBreakdown({ expenses }: Props) {
  const [drillKey, setDrillKey] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("category");

  const grouped = useMemo(() => {
    const keyOf = (e: ExpenseRow) =>
      mode === "category" ? (e.category || "Uncategorized")
      : mode === "vendor" ? (e.vendor || "Unknown vendor")
      : (e.payment_method || "Unknown");
    const map: Record<string, number> = {};
    expenses.forEach((e) => { const k = keyOf(e); map[k] = (map[k] || 0) + (e.amount_cents ?? 0); });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [expenses, mode]);

  const total = grouped.reduce((s, [, v]) => s + v, 0);
  const drillRows = useMemo(() => {
    if (!drillKey) return [];
    return expenses.filter((e) =>
      mode === "category" ? (e.category || "Uncategorized") === drillKey
      : mode === "vendor" ? (e.vendor || "Unknown vendor") === drillKey
      : (e.payment_method || "Unknown") === drillKey
    ).sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [drillKey, expenses, mode]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-foreground" /> Expense breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="h-8">
            <TabsTrigger value="category" className="text-xs h-7">Category</TabsTrigger>
            <TabsTrigger value="vendor" className="text-xs h-7">Vendor</TabsTrigger>
            <TabsTrigger value="method" className="text-xs h-7">Method</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-3">
            {grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses in this period.</p>
            ) : (
              <ul className="space-y-2">
                {grouped.map(([k, v]) => {
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <li key={k}>
                      <button type="button"
                        onClick={() => setDrillKey(k)}
                        className="w-full text-left hover:bg-muted/40 rounded p-1 -m-1 transition-colors"
                      >
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize truncate">{k}</span>
                          <span className="tabular-nums text-muted-foreground">{fmtMoney(v)} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Sheet open={!!drillKey} onOpenChange={(o) => !o && setDrillKey(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base capitalize">{drillKey}</SheetTitle>
            <p className="text-xs text-muted-foreground">{drillRows.length} {drillRows.length === 1 ? "expense" : "expenses"}</p>
          </SheetHeader>
          <ul className="mt-4 space-y-2">
            {drillRows.map((e, i) => (
              <li key={e.id ?? i} className="rounded-md border p-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{e.vendor || e.description || "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {e.expense_date} · {e.payment_method || "—"} · <span className="capitalize">{e.category || "uncategorized"}</span>
                  </div>
                  {e.description && e.vendor && (
                    <div className="text-[11px] text-muted-foreground mt-1 truncate">{e.description}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(e.amount_cents)}</div>
                  {e.receipt_url && (
                    <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary inline-flex items-center gap-0.5 mt-0.5">
                      <Receipt className="w-3 h-3" /> Receipt
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
