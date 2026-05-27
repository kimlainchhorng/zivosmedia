/**
 * Dealership expenses tracker.
 */
import { memo, useMemo, useRef, useState } from "react";
import {
  Plus, Wallet, Pencil, Trash2, Loader2, Receipt, Upload, X, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useDealershipExpenses,
  type DealershipExpense,
  type DealershipExpenseDraft,
  type DealershipExpenseCategory,
} from "@/hooks/car-dealership/useDealershipExpenses";
import VehiclePicker from "./VehiclePicker";
import { useVehicleOptions } from "@/hooks/car-dealership/useVehicleOptions";
import { uploadExpenseReceipt, deleteExpenseReceipt } from "@/lib/car-dealership/uploadExpenseReceipt";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB
const RECEIPT_ACCEPT = "image/*,application/pdf";

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  return cleaned ? Math.round(parseFloat(cleaned) * 100) : 0;
};
const toDollars = (cents: number) => (cents / 100).toString();

const CATEGORY_LABEL: Record<DealershipExpenseCategory, string> = {
  acquisition: "Acquisition",
  reconditioning: "Reconditioning",
  detailing: "Detailing",
  transport: "Transport",
  parts: "Parts",
  advertising: "Advertising",
  rent: "Rent",
  utilities: "Utilities",
  insurance: "Insurance",
  payroll: "Payroll",
  licensing: "Licensing",
  general: "General",
};

const emptyDraft = (): DealershipExpenseDraft => ({
  vehicle_id: null,
  category: "general",
  description: "",
  amount_cents: 0,
  vendor: null,
  paid_at: new Date().toISOString().slice(0, 10),
  receipt_url: null,
  notes: null,
});

interface Props { storeId: string; }

function CarDealershipExpensesSectionInner({ storeId }: Props) {
  const { expenses, loading, saving, create, update, remove } = useDealershipExpenses(storeId);
  const { options: vehicleOptions } = useVehicleOptions(storeId);
  const vehicleMap = useMemo(
    () => new Map(vehicleOptions.map((v) => [v.id, v.label])),
    [vehicleOptions],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipExpense | null>(null);
  const [draft, setDraft] = useState<DealershipExpenseDraft>(emptyDraft());
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const monthTotal = useMemo(() => {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    return expenses
      .filter((e) => new Date(e.paid_at).getTime() >= startOfMonth.getTime())
      .reduce((sum, e) => sum + e.amount_cents, 0);
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount_cents;
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [expenses]);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (e: DealershipExpense) => {
    setEditing(e);
    const { id, store_id, created_at, updated_at, ...rest } = e;
    setDraft(rest);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.description.trim() || draft.amount_cents <= 0) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Expense updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Expense added."); setDialogOpen(false); }
      else toast.error("Couldn't add expense.");
    }
  };

  const handleDelete = async (e: DealershipExpense) => {
    if (!window.confirm(`Delete "${e.description}"?`)) return;
    const ok = await remove(e.id);
    if (ok) toast.success("Expense removed.");
    else toast.error("Couldn't delete.");
  };

  const handleReceiptPick = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("Receipt must be under 10 MB.");
      return;
    }
    setUploadingReceipt(true);
    const prevUrl = draft.receipt_url;
    try {
      const { publicUrl } = await uploadExpenseReceipt({ storeId, file });
      setDraft((d) => ({ ...d, receipt_url: publicUrl }));
      // Best-effort delete of the replaced receipt
      if (prevUrl) void deleteExpenseReceipt(prevUrl);
    } catch (err) {
      console.error("[expense-receipt] upload failed", err);
      toast.error(err instanceof Error ? err.message : "Couldn't upload receipt.");
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  };

  const clearReceipt = () => {
    const url = draft.receipt_url;
    setDraft((d) => ({ ...d, receipt_url: null }));
    if (url) void deleteExpenseReceipt(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Expenses & Bills</h2>
          <p className="text-sm text-muted-foreground">
            {expenses.length} entries · {formatPrice(monthTotal)} this month
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add expense</Button>
      </div>

      {byCategory.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">By category</p>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(([cat, cents]) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {CATEGORY_LABEL[cat as DealershipExpenseCategory] || cat}: {formatPrice(cents)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-10 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No expenses yet</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Add expense</Button>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3">
                {e.receipt_url ? (
                  <a
                    href={e.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View receipt"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                  >
                    <Receipt className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{e.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{CATEGORY_LABEL[e.category]}</span>
                    {e.vendor && <span>· {e.vendor}</span>}
                    <span>· {new Date(e.paid_at).toLocaleDateString()}</span>
                    {e.vehicle_id && vehicleMap.get(e.vehicle_id) && (
                      <span className="text-primary/70">· {vehicleMap.get(e.vehicle_id)}</span>
                    )}
                  </div>
                </div>
                <p className="font-bold shrink-0">{formatPrice(e.amount_cents)}</p>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(e)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What was this for?" />
            </div>
            <VehiclePicker
              storeId={storeId}
              vehicleId={draft.vehicle_id}
              vehicleLabel=""
              onSelect={(v) => setDraft({ ...draft, vehicle_id: v?.id ?? null })}
              onLabelChange={() => setDraft({ ...draft, vehicle_id: null })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($) *</Label>
                <Input inputMode="decimal" value={toDollars(draft.amount_cents)} onChange={(e) => setDraft({ ...draft, amount_cents: fromDollars(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={draft.paid_at} onChange={(e) => setDraft({ ...draft, paid_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as DealershipExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as DealershipExpenseCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Input value={draft.vendor ?? ""} onChange={(e) => setDraft({ ...draft, vendor: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt</Label>
              <input
                ref={receiptInputRef}
                type="file"
                accept={RECEIPT_ACCEPT}
                className="hidden"
                onChange={(e) => void handleReceiptPick(e.target.files?.[0] ?? null)}
              />
              {draft.receipt_url ? (
                <div className="flex items-center gap-3 rounded-md border border-border p-2.5">
                  {isImageUrl(draft.receipt_url) ? (
                    <a href={draft.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img
                        src={draft.receipt_url}
                        alt="Receipt"
                        className="h-12 w-12 rounded object-cover border border-border"
                      />
                    </a>
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={draft.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View receipt <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[10px] text-muted-foreground">
                      Attached. Picking a new file replaces it.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={uploadingReceipt}
                      title="Replace"
                    >
                      {uploadingReceipt
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Upload className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearReceipt}
                      disabled={uploadingReceipt}
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={uploadingReceipt}
                >
                  {uploadingReceipt ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-1.5" />Attach receipt (image or PDF)</>
                  )}
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.description.trim() || draft.amount_cents <= 0}>
              {saving ? "Saving..." : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipExpensesSection = memo(CarDealershipExpensesSectionInner);
export default CarDealershipExpensesSection;
