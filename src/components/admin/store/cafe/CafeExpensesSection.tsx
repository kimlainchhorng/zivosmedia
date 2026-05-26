/**
 * CafeExpensesSection — log expenses with category, vendor, payment method.
 * Includes month-to-date totals + a simple categorized roll-up.
 */
import { useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Loader2, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeExpenses, type CafeExpenseDraft } from "@/hooks/cafe/useCafeExpenses";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { toast } from "sonner";

interface Props { storeId: string }
const CATEGORIES = ["Beans", "Dairy", "Bakery", "Supplies", "Rent", "Utilities", "Marketing", "Equipment", "Repairs", "Other"];

const blankExpense = (): CafeExpenseDraft => ({
  category: "Beans",
  vendor: null,
  description: null,
  amount_cents: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  payment_method: "cash",
  is_recurring: false,
  receipt_url: null,
});

export default function CafeExpensesSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { expenses, loading, saving, create, remove } = useCafeExpenses(storeId);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState<CafeExpenseDraft>(blankExpense());

  const stats = useMemo(() => {
    const now = new Date();
    const mtdCutoff = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    let mtd = 0, ytd = 0;
    const byCat = new Map<string, number>();
    for (const e of expenses) {
      ytd += e.amount_cents;
      if (e.expense_date >= mtdCutoff) {
        mtd += e.amount_cents;
        byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount_cents);
      }
    }
    return { mtd, ytd, byCat: Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]) };
  }, [expenses]);

  const handleSave = async () => {
    if (draft.amount_cents <= 0) { toast.error("Amount required."); return; }
    const created = await create(draft);
    if (created) {
      toast.success("Logged.");
      setDialog(false);
      setDraft(blankExpense());
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Month to date</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(stats.mtd)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Year to date</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(stats.ytd)}</p>
        </CardContent></Card>
      </div>

      {stats.byCat.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">This month by category</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {stats.byCat.map(([cat, amt]) => {
                const pct = stats.mtd > 0 ? Math.round((amt / stats.mtd) * 100) : 0;
                return (
                  <li key={cat}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{cat}</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(amt)} <span className="text-[11px]">· {pct}%</span></span>
                    </div>
                    <div className="h-1 mt-0.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-rose-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Expense log</span>
            <Button size="sm" onClick={() => { setDraft(blankExpense()); setDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Log expense
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {expenses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No expenses logged yet — track beans, dairy, rent, utilities, and more.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {expenses.map((e) => (
                <li key={e.id} className="py-2.5 flex flex-wrap items-center gap-3">
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-20">{e.expense_date}</span>
                  <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.vendor || e.description || "—"}</p>
                    {e.description && e.vendor && <p className="text-[11px] text-muted-foreground truncate">{e.description}</p>}
                  </div>
                  {e.is_recurring && <Badge variant="outline" className="text-[10px]">recurring</Badge>}
                  {e.payment_method && <span className="text-[11px] text-muted-foreground uppercase">{e.payment_method}</span>}
                  <span className="tabular-nums font-semibold w-20 text-right">{fmt(e.amount_cents)}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this expense?")) remove(e.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" min="0" value={(draft.amount_cents / 100).toString()}
                  onChange={(e) => setDraft({ ...draft, amount_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={draft.expense_date}
                  onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment</Label>
                <Select value={draft.payment_method ?? "cash"} onValueChange={(v) => setDraft({ ...draft, payment_method: v as CafeExpenseDraft["payment_method"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="qr">QR</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Vendor (optional)</Label>
              <Input value={draft.vendor ?? ""} onChange={(e) => setDraft({ ...draft, vendor: e.target.value || null })} placeholder="ABC Coffee Co." />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /> Recurring (monthly)</span>
              <Switch checked={draft.is_recurring} onCheckedChange={(v) => setDraft({ ...draft, is_recurring: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>Log expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
