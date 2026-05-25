/**
 * CarRentalPromotionsSection — promo codes CRUD.
 */
import { useState } from "react";
import {
  Tag, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Copy, Calendar, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useCarRentalPromotions, type CarRentalPromotion, type CarRentalPromotionDraft, type CarRentalPromoKind,
} from "@/hooks/car-rental/useCarRentalPromotions";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const EMPTY: CarRentalPromotionDraft = {
  code: "",
  description: "",
  kind: "percent",
  amount: 10,
  min_rental_days: 1,
  min_amount_cents: 0,
  is_active: true,
};

const randomCode = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalPromotionsSection({ storeId }: Props) {
  const { promos, loading, saving, error, create, update, remove } = useCarRentalPromotions(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalPromotion | null>(null);
  const [draft, setDraft] = useState<CarRentalPromotionDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setDraft({ ...EMPTY, code: randomCode() }); setDialogOpen(true); };
  const openEdit = (p: CarRentalPromotion) => {
    setEditing(p);
    setDraft({
      code: p.code, description: p.description, kind: p.kind, amount: p.amount,
      min_rental_days: p.min_rental_days, min_amount_cents: p.min_amount_cents,
      max_redemptions: p.max_redemptions, max_per_customer: p.max_per_customer,
      starts_at: p.starts_at, ends_at: p.ends_at, is_active: p.is_active,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!draft.code.trim() || draft.amount <= 0) return;
    if (editing) await update(editing.id, draft);
    else await create(draft);
    setDialogOpen(false);
  };

  const formatAmount = (p: CarRentalPromotion) =>
    p.kind === "percent" ? `${p.amount}% off` : `${formatMoney(p.amount)} off`;

  const isExpired = (p: CarRentalPromotion) => p.ends_at && new Date(p.ends_at) < new Date();
  const isMaxed = (p: CarRentalPromotion) =>
    p.max_redemptions !== null && p.current_redemptions >= (p.max_redemptions ?? Infinity);

  const copyCode = (code: string, id: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-5 w-5 text-primary" /> Promotions & codes
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {promos.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New code
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : promos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Tag className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No promo codes yet. Create one to offer discounts on the booking flow.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {promos.map((p) => {
                const expired = isExpired(p);
                const maxed = isMaxed(p);
                const usagePct = p.max_redemptions ? Math.round((p.current_redemptions / p.max_redemptions) * 100) : null;
                return (
                  <li key={p.id} className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => copyCode(p.code, p.id)} className="inline-flex items-center gap-1 font-mono text-sm font-bold tracking-wider text-foreground hover:text-primary">
                            {p.code}
                            {copiedId === p.id ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />}
                          </button>
                          {!p.is_active && <Pill tone="muted">Off</Pill>}
                          {expired && <Pill tone="destructive">Expired</Pill>}
                          {maxed && <Pill tone="destructive">Maxed out</Pill>}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-primary">{formatAmount(p)}</p>
                        {p.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{p.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          {p.ends_at && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Until {new Date(p.ends_at).toLocaleDateString()}
                            </span>
                          )}
                          {p.min_rental_days > 1 && (
                            <span>Min {p.min_rental_days} days</span>
                          )}
                          {p.min_amount_cents > 0 && (
                            <span>Min {formatMoney(p.min_amount_cents)}</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {p.current_redemptions}{p.max_redemptions ? ` / ${p.max_redemptions}` : ""} redeemed
                          </span>
                        </div>
                        {usagePct !== null && (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full", usagePct >= 100 ? "bg-destructive" : "bg-primary/70")} style={{ width: `${Math.min(100, usagePct)}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promotion" : "New promotion"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Code *">
              <div className="flex gap-1.5">
                <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="SUMMER10" className="font-mono" />
                {!editing && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ ...draft, code: randomCode() })}>
                    Random
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Discount type">
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as CarRentalPromoKind, amount: v === "percent" ? 10 : 1000 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage off</SelectItem>
                  <SelectItem value="flat">Flat dollar amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={draft.kind === "percent" ? "Percent off (1-100)" : "Amount off ($)"}>
              <Input type="number" min={draft.kind === "percent" ? 1 : 0.01} max={draft.kind === "percent" ? 100 : undefined} step={draft.kind === "percent" ? 1 : 0.01}
                value={draft.kind === "percent" ? draft.amount : draft.amount / 100}
                onChange={(e) => setDraft({ ...draft, amount: draft.kind === "percent" ? Number(e.target.value || 1) : Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Optional public description shown at checkout" />
            </Field>
            <Field label="Min rental days">
              <Input type="number" min={1} value={draft.min_rental_days ?? 1} onChange={(e) => setDraft({ ...draft, min_rental_days: Math.max(1, Number(e.target.value || 1)) })} />
            </Field>
            <Field label="Min order amount ($)">
              <Input type="number" min={0} step="0.01" value={(draft.min_amount_cents ?? 0) / 100} onChange={(e) => setDraft({ ...draft, min_amount_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Max total redemptions">
              <Input type="number" min={1} placeholder="Unlimited" value={draft.max_redemptions ?? ""} onChange={(e) => setDraft({ ...draft, max_redemptions: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Max per customer">
              <Input type="number" min={1} placeholder="Unlimited" value={draft.max_per_customer ?? ""} onChange={(e) => setDraft({ ...draft, max_per_customer: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Starts (optional)">
              <Input type="datetime-local" value={draft.starts_at ? toLocal(draft.starts_at) : ""} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </Field>
            <Field label="Ends (optional)">
              <Input type="datetime-local" value={draft.ends_at ? toLocal(draft.ends_at) : ""} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Active (renters can apply)</Label>
              <Switch checked={draft.is_active ?? true} onCheckedChange={(c) => setDraft({ ...draft, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.code.trim() || draft.amount <= 0}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save" : "Create code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete promo code?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Past redemptions stay on the reservations they applied to.</p>
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

function toLocal(iso: string) {
  // Convert ISO to "yyyy-MM-ddTHH:mm" for datetime-local input.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "muted" | "destructive" }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
      tone === "muted" ? "bg-muted text-muted-foreground border-border" : "bg-destructive/10 text-destructive border-destructive/30"
    )}>
      {children}
    </span>
  );
}
