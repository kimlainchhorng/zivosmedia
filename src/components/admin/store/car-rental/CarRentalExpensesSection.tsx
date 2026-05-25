/**
 * CarRentalExpensesSection — categorized expense log.
 */
import { useMemo, useState } from "react";
import {
  Wallet, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useCarRentalExpenses, type CarRentalExpense, type CarRentalExpenseDraft, type CarRentalExpenseCategory,
} from "@/hooks/car-rental/useCarRentalExpenses";
import { useCarRentalVehicles } from "@/hooks/car-rental/useCarRentalVehicles";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const CATEGORIES: { value: CarRentalExpenseCategory; label: string; color: string }[] = [
  { value: "fuel", label: "Fuel", color: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "insurance", label: "Insurance", color: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  { value: "maintenance", label: "Maintenance", color: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "cleaning", label: "Cleaning", color: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  { value: "lot_rent", label: "Lot rent", color: "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  { value: "registration", label: "Registration", color: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  { value: "taxes", label: "Taxes", color: "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/30" },
  { value: "parts", label: "Parts", color: "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { value: "tires", label: "Tires", color: "bg-stone-500/12 text-stone-700 dark:text-stone-300 border-stone-500/30" },
  { value: "office", label: "Office", color: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "marketing", label: "Marketing", color: "bg-pink-500/12 text-pink-700 dark:text-pink-300 border-pink-500/30" },
  { value: "other", label: "Other", color: "bg-muted text-muted-foreground border-border" },
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EMPTY: CarRentalExpenseDraft = {
  vehicle_id: null,
  category: "fuel",
  description: "",
  amount_cents: 0,
  expense_date: todayIso(),
  is_recurring: false,
};

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalExpensesSection({ storeId }: Props) {
  const { expenses, loading, saving, error, create, update, remove } = useCarRentalExpenses(storeId);
  const { vehicles } = useCarRentalVehicles(storeId);
  const [categoryFilter, setCategoryFilter] = useState<CarRentalExpenseCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalExpense | null>(null);
  const [draft, setDraft] = useState<CarRentalExpenseDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount_cents, 0), [filtered]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount_cents);
    return CATEGORIES.map((c) => ({ ...c, cents: map.get(c.value) ?? 0 })).filter((x) => x.cents > 0).sort((a, b) => b.cents - a.cents);
  }, [expenses]);

  const openCreate = () => { setEditing(null); setDraft({ ...EMPTY }); setDialogOpen(true); };
  const openEdit = (e: CarRentalExpense) => {
    setEditing(e);
    setDraft({
      vehicle_id: e.vehicle_id, category: e.category, description: e.description,
      notes: e.notes, amount_cents: e.amount_cents, paid_to: e.paid_to,
      payment_method: e.payment_method, expense_date: e.expense_date, is_recurring: e.is_recurring,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!draft.description.trim()) return;
    if (editing) await update(editing.id, draft);
    else await create(draft);
    setDialogOpen(false);
  };

  const catMeta = (c: string) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
  const labelFor = (vid: string | null) => {
    if (!vid) return null;
    const v = vehicles.find((x) => x.id === vid);
    return v ? `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}` : null;
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" /> Expenses
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {filtered.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add expense
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {byCategory.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCategoryFilter("all")} className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                categoryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}>
                All · {formatMoney(expenses.reduce((s, e) => s + e.amount_cents, 0))}
              </button>
              {byCategory.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategoryFilter(c.value)} className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                  categoryFilter === c.value ? "bg-primary text-primary-foreground border-primary" : c.color,
                )}>
                  {c.label} · {formatMoney(c.cents)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Wallet className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {expenses.length === 0 ? "No expenses yet. Add fuel, insurance, repair bills, etc." : "No expenses in this category."}
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {filtered.map((e) => {
                  const cat = catMeta(e.category);
                  return (
                    <li key={e.id} className="group flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
                        <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", cat.color)}>
                          {cat.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{e.description}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {new Date(e.expense_date).toLocaleDateString()}
                            {e.paid_to ? ` · ${e.paid_to}` : ""}
                            {labelFor(e.vehicle_id) ? ` · ${labelFor(e.vehicle_id)}` : ""}
                            {e.is_recurring ? " · recurring" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <span className="text-sm font-bold text-foreground">{formatMoney(e.amount_cents)}</span>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-end gap-3 pt-2 text-sm">
                <span className="text-muted-foreground">Filtered total:</span>
                <span className="font-bold text-foreground">{formatMoney(total)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Category">
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as CarRentalExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={draft.expense_date} onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} />
            </Field>
            <Field label="Description *" className="sm:col-span-2">
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <Field label="Amount ($)">
              <Input type="number" min={0} step="0.01" value={draft.amount_cents / 100} onChange={(e) => setDraft({ ...draft, amount_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Paid to">
              <Input value={draft.paid_to ?? ""} onChange={(e) => setDraft({ ...draft, paid_to: e.target.value })} placeholder="Vendor / shop / utility" />
            </Field>
            <Field label="Vehicle (optional)" className="sm:col-span-2">
              <Select value={draft.vehicle_id ?? "none"} onValueChange={(v) => setDraft({ ...draft, vehicle_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Fleet-wide / not vehicle-specific —</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.year ? `${v.year} ` : ""}{v.make} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.description.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete expense?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the expense entry permanently.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
