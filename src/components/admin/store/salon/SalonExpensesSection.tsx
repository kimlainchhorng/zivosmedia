/**
 * SalonExpensesSection — outgoing money ledger.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, Plus, Loader2, AlertCircle, Edit, Trash2, Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface SalonExpense {
  id: string;
  store_id: string;
  expense_date: string;
  amount_cents: number;
  category: string;
  vendor: string | null;
  description: string;
  notes: string | null;
  is_recurring: boolean;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

interface SalonExpensesSectionProps {
  storeId: string;
}

const SUGGESTED_CATEGORIES = ["Supplies", "Rent", "Utilities", "Marketing", "Software", "Equipment", "Maintenance", "Insurance", "Taxes", "Other"];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

interface DraftState {
  expense_date: string;
  amount_dollars: string;
  category: string;
  vendor: string;
  description: string;
  notes: string;
  is_recurring: boolean;
  recurrence: string;
}

const EMPTY: DraftState = {
  expense_date: todayIso(),
  amount_dollars: "",
  category: "Supplies",
  vendor: "",
  description: "",
  notes: "",
  is_recurring: false,
  recurrence: "",
};

export default function SalonExpensesSection({ storeId }: SalonExpensesSectionProps) {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SalonExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // `load` (re-)fetches the date-bounded expense list. Used both by the
  // initial-mount/date-change effect (with cancellation) and by post-mutation
  // refreshes (where we want the latest state regardless of dependency churn).
  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_expenses")
      .select("*")
      .eq("store_id", storeId)
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[SalonExpenses] load failed", err);
      setError("Couldn't load expenses.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as SalonExpense[]);
    setLoading(false);
  };

  // Cancellation guard so a rapid From/To change can't land an older response
  // over a newer one. Matches the pattern in Income, Reports, Commissions, etc.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("salon_expenses")
        .select("*")
        .eq("store_id", storeId)
        .gte("expense_date", from)
        .lte("expense_date", to)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) {
        console.error("[SalonExpenses] load failed", err);
        setError("Couldn't load expenses.");
        setLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as SalonExpense[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [storeId, from, to]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      (r.vendor || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, r) => sum + r.amount_cents, 0);
    const byCategory = new Map<string, number>();
    filtered.forEach((r) => byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount_cents));
    const top = Array.from(byCategory.entries()).map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents).slice(0, 4);
    return { total, top };
  }, [filtered]);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (e: SalonExpense) => {
    setEditingId(e.id);
    setDraft({
      expense_date: e.expense_date,
      amount_dollars: (e.amount_cents / 100).toFixed(2),
      category: e.category,
      vendor: e.vendor ?? "",
      description: e.description,
      notes: e.notes ?? "",
      is_recurring: e.is_recurring,
      recurrence: e.recurrence ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cents = Math.round(Number(draft.amount_dollars) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Amount must be greater than $0.");
      return;
    }
    if (!draft.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (draft.is_recurring && !draft.recurrence) {
      // Recurring expenses without a frequency are useless — the column
      // would save as NULL and the "recurring (?)" label would render
      // weird. Force the owner to pick before continuing.
      toast.error("Pick a frequency for this recurring expense.");
      return;
    }
    setSaving(true);
    const payload = {
      store_id: storeId,
      expense_date: draft.expense_date,
      amount_cents: cents,
      category: draft.category.trim() || "Other",
      vendor: draft.vendor.trim() || null,
      description: draft.description.trim(),
      notes: draft.notes.trim() || null,
      is_recurring: draft.is_recurring,
      recurrence: draft.is_recurring && draft.recurrence ? draft.recurrence : null,
    };
    if (editingId) {
      const { error: err } = await supabase.from("salon_expenses").update(payload as never).eq("id", editingId);
      if (err) { setError("Couldn't save changes."); setSaving(false); return; }
      toast.success("Expense updated.");
    } else {
      // Author tagging — useful when multiple staff log expenses.
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from("salon_expenses").insert({ ...payload, created_by_user_id: user?.id ?? null } as never);
      if (err) { setError("Couldn't add expense."); setSaving(false); return; }
      toast.success("Expense added.");
    }
    setSaving(false);
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setSaving(true);
    const { error: err } = await supabase.from("salon_expenses").delete().eq("id", confirmDeleteId);
    setSaving(false);
    if (err) { setError("Couldn't delete."); return; }
    setConfirmDeleteId(null);
    toast.success("Expense removed.");
    await load();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" /> Expenses & Bills
          </CardTitle>
          <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add expense</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="expFrom">From</Label>
              {/* Bound the range so the owner can't construct an inverted
                  window (from > to silently returns zero rows). The `to`
                  upper bound is today since we don't expect future-dated
                  expenses to be filterable. */}
              <Input id="expFrom" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expTo">To</Label>
              <Input id="expTo" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="expSearch">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="expSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description, vendor, category…" className="h-9 pl-9" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total spent</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">{formatPrice(totals.total)}</p>
            </div>
            {totals.top.slice(0, 3).map((t) => (
              <div key={t.category} className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{t.category}</p>
                <p className="mt-0.5 text-xl font-bold text-foreground">{formatPrice(t.cents)}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No expenses in this window</p>
              <p className="mt-1 text-xs text-muted-foreground">Add supplies, rent, utilities, and other costs to track your overhead.</p>
              <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Add expense</Button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((e) => (
                <div key={e.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{e.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(e.expense_date)} · {e.category}{e.vendor ? ` · ${e.vendor}` : ""}
                      {e.is_recurring && e.recurrence ? ` · recurring (${e.recurrence})` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatPrice(e.amount_cents)}</span>
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)} disabled={saving} aria-label="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(e.id)} disabled={saving} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exDate">Date *</Label>
                <Input id="exDate" type="date" value={draft.expense_date} onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exAmount">Amount (USD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input id="exAmount" type="number" min={0} step="0.01" value={draft.amount_dollars} onChange={(e) => setDraft({ ...draft, amount_dollars: e.target.value })} className="pl-7" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exDesc">Description *</Label>
              <Input id="exDesc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Acetone restock" maxLength={200} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exCategory">Category</Label>
                <Input id="exCategory" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Supplies" maxLength={40} list="salon-expense-categories" />
                <datalist id="salon-expense-categories">
                  {SUGGESTED_CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exVendor">Vendor</Label>
                <Input id="exVendor" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="CosmoProf, Sally, etc." maxLength={80} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exNotes">Notes</Label>
              <Textarea id="exNotes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Receipt number, payment method…" rows={2} maxLength={1000} />
            </div>

            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Tag as a recurring bill</p>
                <p className="text-xs text-muted-foreground">
                  Labels this expense as a regularly-occurring bill (rent, subscriptions) so it stands out in the ledger.
                  This doesn't auto-create future entries — you'll still log each one as it's paid.
                </p>
              </div>
              <input
                type="checkbox"
                checked={draft.is_recurring}
                onChange={(e) => setDraft({ ...draft, is_recurring: e.target.checked })}
                className="h-4 w-4"
              />
            </label>

            {draft.is_recurring && (
              <div className="space-y-1.5">
                <Label htmlFor="exRecurrence">Frequency</Label>
                <select
                  id="exRecurrence"
                  value={draft.recurrence}
                  onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pick frequency…</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep expense</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
