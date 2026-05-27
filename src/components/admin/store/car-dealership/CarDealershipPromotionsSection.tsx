import { memo, useState } from "react";
import { Tag, Plus, Pencil, Trash2, Loader2, Copy, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipPromotions,
  type DealershipPromotion,
  type DealershipPromotionDraft,
  type DealershipPromoType,
  type DealershipDiscountType,
  type DealershipPromoAppliesTo,
} from "@/hooks/car-dealership/useDealershipPromotions";

const PROMO_TYPE_LABELS: Record<DealershipPromoType, string> = {
  discount: "Cash / Discount",
  financing: "Special Financing",
  lease: "Lease Special",
  trade_in_bonus: "Trade-in Bonus",
  event: "Sales Event",
};

const PROMO_TYPE_COLORS: Record<DealershipPromoType, string> = {
  discount: "bg-blue-500/15 text-blue-700",
  financing: "bg-violet-500/15 text-violet-700",
  lease: "bg-emerald-500/15 text-emerald-700",
  trade_in_bonus: "bg-amber-500/15 text-amber-700",
  event: "bg-rose-500/15 text-rose-700",
};

const formatMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const formatPromoValue = (p: DealershipPromotion): string => {
  switch (p.promo_type) {
    case "discount":
      if (p.discount_type === "percent") return `${p.discount_amount}% off`;
      if (p.discount_type === "flat") return `${formatMoney(p.discount_amount)} off`;
      return "Discount";
    case "financing":
      if (p.financing_apr_bps != null && p.financing_term_months) {
        const apr = (p.financing_apr_bps / 100).toFixed(p.financing_apr_bps % 100 === 0 ? 0 : 2);
        return `${apr}% APR / ${p.financing_term_months} mo`;
      }
      return "Special financing";
    case "lease":
      if (p.financing_term_months) return `Lease — ${p.financing_term_months} mo`;
      return "Lease special";
    case "trade_in_bonus":
      if (p.discount_amount > 0) return `+${formatMoney(p.discount_amount)} bonus`;
      return "Trade-in bonus";
    case "event":
      return "Sales event";
    default:
      return "";
  }
};

const toLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyDraft = (): DealershipPromotionDraft => ({
  title: "",
  description: null,
  promo_type: "discount",
  discount_type: "percent",
  discount_amount: 5,
  applies_to: "all",
  applies_to_make: null,
  applies_to_model: null,
  financing_apr_bps: null,
  financing_term_months: null,
  code: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
  is_featured: false,
});

interface Props { storeId: string; }

function CarDealershipPromotionsSectionInner({ storeId }: Props) {
  const { promotions, loading, saving, error, create, update, remove } = useDealershipPromotions(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipPromotion | null>(null);
  const [draft, setDraft] = useState<DealershipPromotionDraft>(emptyDraft());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (p: DealershipPromotion) => {
    setEditing(p);
    const { id, store_id, created_at, updated_at, ...rest } = p;
    setDraft(rest);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.title.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Promotion updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Promotion created."); setDialogOpen(false); }
      else toast.error("Couldn't create.");
    }
  };

  const handleDelete = async (p: DealershipPromotion) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    const ok = await remove(p.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  const copyCode = (code: string, id: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isExpired = (p: DealershipPromotion) => !!p.ends_at && new Date(p.ends_at) < new Date();

  const showDiscountFields = draft.promo_type === "discount" || draft.promo_type === "trade_in_bonus";
  const showFinancingFields = draft.promo_type === "financing" || draft.promo_type === "lease";
  const showAppliesTo = draft.promo_type === "discount" || draft.promo_type === "financing" || draft.promo_type === "lease";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Promotions & Specials</h2>
          <p className="text-sm text-muted-foreground">
            {promotions.length} promotions · {promotions.filter((p) => p.is_active && !isExpired(p)).length} active
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New promotion</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : promotions.length === 0 ? (
        <Card className="p-10 text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No promotions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add discounts, special financing, lease deals, and sales events.</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New promotion</Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {promotions.map((p) => {
            const expired = isExpired(p);
            return (
              <Card key={p.id} className={cn("p-4 group relative", (!p.is_active || expired) && "opacity-60")}>
                {p.is_featured && (
                  <Star className="absolute top-3 right-12 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("border-0 text-[10px]", PROMO_TYPE_COLORS[p.promo_type])}>
                        {PROMO_TYPE_LABELS[p.promo_type]}
                      </Badge>
                      {!p.is_active && <Badge variant="secondary" className="text-[10px]">Off</Badge>}
                      {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                    </div>
                    <p className="mt-1.5 font-semibold leading-tight">{p.title}</p>
                    <p className="text-sm font-medium text-primary">{formatPromoValue(p)}</p>
                    {p.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      {p.applies_to !== "all" && (
                        <span className="capitalize">{p.applies_to.replace(/_/g, " ")}
                          {p.applies_to_make ? ` — ${p.applies_to_make}` : ""}
                          {p.applies_to_model ? ` ${p.applies_to_model}` : ""}
                        </span>
                      )}
                      {p.ends_at && (
                        <span>Until {new Date(p.ends_at).toLocaleDateString()}</span>
                      )}
                      {p.code && (
                        <button
                          type="button"
                          onClick={() => copyCode(p.code!, p.id)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-foreground hover:text-primary"
                        >
                          {p.code}
                          {copiedId === p.id
                            ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            : <Copy className="h-3 w-3 opacity-60" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit promotion" : "New promotion"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Summer Savings Event"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Promotion type</Label>
              <Select
                value={draft.promo_type}
                onValueChange={(v) => setDraft({ ...draft, promo_type: v as DealershipPromoType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Cash / Discount</SelectItem>
                  <SelectItem value="financing">Special Financing</SelectItem>
                  <SelectItem value="lease">Lease Special</SelectItem>
                  <SelectItem value="trade_in_bonus">Trade-in Bonus</SelectItem>
                  <SelectItem value="event">Sales Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDiscountFields && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{draft.promo_type === "trade_in_bonus" ? "Bonus type" : "Discount type"}</Label>
                  <Select
                    value={draft.discount_type ?? "percent"}
                    onValueChange={(v) => setDraft({ ...draft, discount_type: v as DealershipDiscountType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="flat">Flat amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{draft.discount_type === "flat" ? "Amount ($)" : "Percent off"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={draft.discount_type === "flat" ? "100" : "1"}
                    value={draft.discount_type === "flat" ? (draft.discount_amount ?? 0) / 100 : (draft.discount_amount ?? 0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setDraft({ ...draft, discount_amount: draft.discount_type === "flat" ? Math.round(v * 100) : Math.round(v) });
                    }}
                  />
                </div>
              </div>
            )}

            {showFinancingFields && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>APR (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={draft.financing_apr_bps != null ? (draft.financing_apr_bps / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/[^\d.]/g, ""));
                      setDraft({ ...draft, financing_apr_bps: isNaN(v) ? null : Math.round(v * 100) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Term (months)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.financing_term_months ?? ""}
                    onChange={(e) => setDraft({ ...draft, financing_term_months: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </div>
              </div>
            )}

            {showAppliesTo && (
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <Select
                  value={draft.applies_to ?? "all"}
                  onValueChange={(v) => setDraft({ ...draft, applies_to: v as DealershipPromoAppliesTo, applies_to_make: null, applies_to_model: null })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vehicles</SelectItem>
                    <SelectItem value="new">New vehicles only</SelectItem>
                    <SelectItem value="used">Used vehicles only</SelectItem>
                    <SelectItem value="certified">Certified pre-owned</SelectItem>
                    <SelectItem value="specific_make">Specific make</SelectItem>
                    <SelectItem value="specific_model">Specific make & model</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(draft.applies_to === "specific_make" || draft.applies_to === "specific_model") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input
                    value={draft.applies_to_make ?? ""}
                    placeholder="Toyota"
                    onChange={(e) => setDraft({ ...draft, applies_to_make: e.target.value || null })}
                  />
                </div>
                {draft.applies_to === "specific_model" && (
                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Input
                      value={draft.applies_to_model ?? ""}
                      placeholder="Camry"
                      onChange={(e) => setDraft({ ...draft, applies_to_model: e.target.value || null })}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Promo code (optional)</Label>
              <Input
                className="font-mono"
                value={draft.code ?? ""}
                placeholder="SUMMER25"
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() || null })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={draft.starts_at ? toLocal(draft.starts_at) : ""}
                  onChange={(e) => setDraft({ ...draft, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={draft.ends_at ? toLocal(draft.ends_at) : ""}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={draft.description ?? ""}
                placeholder="Details shown to customers..."
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2.5">
              <Label className="text-sm">Active (visible to customers)</Label>
              <Switch
                checked={draft.is_active ?? true}
                onCheckedChange={(c) => setDraft({ ...draft, is_active: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2.5">
              <Label className="text-sm">Featured (highlight on listings)</Label>
              <Switch
                checked={draft.is_featured ?? false}
                onCheckedChange={(c) => setDraft({ ...draft, is_featured: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.title.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipPromotionsSection = memo(CarDealershipPromotionsSectionInner);
export default CarDealershipPromotionsSection;
