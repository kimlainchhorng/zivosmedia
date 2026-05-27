/**
 * SalonMembershipsSection — owner-side tier catalog + active members list.
 * Tier "Save" calls the sync-salon-membership-tier edge function so the
 * Stripe Product + Price are kept in lock-step with the DB row.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Crown, Plus, Loader2, Edit, Trash2, AlertCircle, ExternalLink, RefreshCw, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SalonMembershipsSectionProps {
  storeId: string;
}

interface Tier {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  billing_interval: "month" | "year";
  service_discount_percent: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
  id: string;
  client_id: string;
  tier_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  started_at: string | null;
  // Joined fields.
  client_display_name: string | null;
  client_email: string | null;
  tier_name: string | null;
}

interface TierDraft {
  id: string | null;
  name: string;
  description: string;
  monthly_price_dollars: string;
  billing_interval: "month" | "year";
  service_discount_percent: number;
  is_active: boolean;
}

const blankDraft: TierDraft = {
  id: null,
  name: "",
  description: "",
  monthly_price_dollars: "",
  billing_interval: "month",
  service_discount_percent: 10,
  is_active: true,
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300" },
  trialing: { label: "Trial", tone: "border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-300" },
  past_due: { label: "Past due", tone: "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300" },
  cancelled: { label: "Cancelled", tone: "border-border bg-muted text-muted-foreground" },
  paused: { label: "Paused", tone: "border-border bg-muted text-muted-foreground" },
  incomplete: { label: "Pending", tone: "border-border bg-muted text-muted-foreground" },
};

export default function SalonMembershipsSection({ storeId }: SalonMembershipsSectionProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<TierDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingTierId, setSyncingTierId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [tiersRes, membersRes] = await Promise.all([
      supabase
        .from("salon_membership_tiers")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true }),
      // Join clients + tiers to surface names directly. PostgREST's nested
      // select keeps it to one round-trip.
      supabase
        .from("salon_client_memberships")
        .select("id, client_id, tier_id, status, current_period_end, cancel_at_period_end, started_at, salon_clients(display_name, email), salon_membership_tiers(name)")
        .eq("store_id", storeId)
        .in("status", ["active", "trialing", "past_due", "paused", "incomplete"])
        .order("started_at", { ascending: false })
        .limit(100),
    ]);
    if (tiersRes.error) {
      console.error("[SalonMemberships] tiers load failed", tiersRes.error);
      setError("Couldn't load tiers.");
      setLoading(false);
      return;
    }
    setTiers((tiersRes.data ?? []) as unknown as Tier[]);
    if (membersRes.error) {
      console.error("[SalonMemberships] members load failed", membersRes.error);
    } else {
      const rows = ((membersRes.data ?? []) as unknown as Array<MemberRow & { salon_clients?: { display_name: string | null; email: string | null }; salon_membership_tiers?: { name: string | null } }>).map((r) => ({
        ...r,
        client_display_name: r.salon_clients?.display_name ?? null,
        client_email: r.salon_clients?.email ?? null,
        tier_name: r.salon_membership_tiers?.name ?? null,
      }));
      setMembers(rows);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const openCreate = () => setDialog({ ...blankDraft });
  const openEdit = (t: Tier) => setDialog({
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    monthly_price_dollars: (t.monthly_price_cents / 100).toFixed(2),
    billing_interval: t.billing_interval,
    service_discount_percent: t.service_discount_percent,
    is_active: t.is_active,
  });

  const closeDialog = () => { if (!saving) setDialog(null); };

  const syncTier = async (tierId: string) => {
    setSyncingTierId(tierId);
    const { data, error: err } = await supabase.functions.invoke("sync-salon-membership-tier", {
      body: { tier_id: tierId },
    });
    setSyncingTierId(null);
    if (err) {
      const msg = (err as { message?: string }).message || "Sync failed.";
      toast.error(msg);
      return false;
    }
    const payload = data as { synced?: boolean; error?: string } | null;
    if (payload?.error) { toast.error(payload.error); return false; }
    if (payload?.synced) toast.success("Synced to Stripe.");
    return true;
  };

  const submitDialog = async () => {
    if (!dialog) return;
    const cleanName = dialog.name.trim();
    if (!cleanName) { toast.error("Name is required."); return; }
    const priceCents = Math.round(Number(dialog.monthly_price_dollars) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      toast.error("Price must be greater than $0.");
      return;
    }
    setSaving(true);
    const payload = {
      store_id: storeId,
      name: cleanName,
      description: dialog.description.trim() || null,
      monthly_price_cents: priceCents,
      billing_interval: dialog.billing_interval,
      service_discount_percent: Math.max(0, Math.min(100, Math.round(dialog.service_discount_percent))),
      is_active: dialog.is_active,
    };

    let tierId = dialog.id;
    if (tierId) {
      const { error: err } = await supabase
        .from("salon_membership_tiers")
        .update(payload as never)
        .eq("id", tierId);
      if (err) {
        setSaving(false);
        toast.error(err.message);
        return;
      }
    } else {
      // sort_order — append. Trivially racy but doesn't matter (manual
      // re-order is a future feature).
      const sort_order = tiers.length > 0 ? Math.max(...tiers.map((t) => t.sort_order)) + 10 : 0;
      const { data, error: err } = await supabase
        .from("salon_membership_tiers")
        .insert({ ...payload, sort_order } as never)
        .select("id")
        .single();
      if (err) {
        setSaving(false);
        toast.error(err.message);
        return;
      }
      tierId = (data as { id: string }).id;
    }

    // Sync to Stripe immediately so the tier is subscribable. Failure here
    // doesn't undo the DB row — the owner can click "Sync to Stripe" later.
    await syncTier(tierId);
    setSaving(false);
    setDialog(null);
    await load();
  };

  const removeTier = async (t: Tier) => {
    if (!window.confirm(`Delete "${t.name}"? Existing subscribers stay billed via Stripe — cancel them from the active members table first.`)) return;
    const { error: err } = await supabase.from("salon_membership_tiers").delete().eq("id", t.id);
    if (err) { toast.error(err.message); return; }
    toast.success("Tier removed.");
    await load();
  };

  const signupUrl = useMemo(() => `${typeof window !== "undefined" ? window.location.origin : ""}/salon/${storeId}/membership`, [storeId]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-primary" />
            Tiers
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Add tier
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : tiers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No tiers yet. Add one to start accepting memberships.
            </p>
          ) : (
            <ul className="space-y-2">
              {tiers.map((t) => (
                <li
                  key={t.id}
                  className={cn("flex items-start gap-3 rounded-xl border p-3", t.is_active ? "border-border bg-card" : "border-border/60 bg-muted/30")}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm font-semibold", !t.is_active && "text-muted-foreground")}>{t.name}</p>
                      <span className="text-sm font-bold text-foreground">{formatPrice(t.monthly_price_cents)}/{t.billing_interval}</span>
                      {t.service_discount_percent > 0 && (
                        <span className="rounded-full bg-emerald-500/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          {t.service_discount_percent}% off services
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hidden</span>
                      )}
                      {t.stripe_price_id ? (
                        <span title={`Stripe price: ${t.stripe_price_id}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Stripe synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          <AlertCircle className="h-3 w-3" /> Needs Stripe sync
                        </span>
                      )}
                    </div>
                    {t.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => void syncTier(t.id).then(() => load())}
                      disabled={syncingTierId === t.id}
                      title="Re-sync to Stripe (idempotent)"
                    >
                      {syncingTierId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} aria-label="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => void removeTier(t)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tiers.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Share your signup link:</span>
              <code className="truncate text-foreground/85">{signupUrl}</code>
              <Button
                size="sm" variant="ghost" className="ml-auto h-6 text-[11px]"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(signupUrl);
                    toast.success("Copied.");
                  } catch {
                    toast.info(signupUrl);
                  }
                }}
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Active members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No active members yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tier</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Next billing</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const sm = STATUS_LABEL[m.status] ?? STATUS_LABEL.incomplete;
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-foreground">{m.client_display_name ?? "—"}</p>
                          {m.client_email && <p className="text-[11px] text-muted-foreground">{m.client_email}</p>}
                        </td>
                        <td className="px-3 py-2 text-foreground/85">{m.tier_name ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", sm.tone)}>
                            {sm.label}
                          </span>
                          {m.cancel_at_period_end && (
                            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-300">cancels at period end</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-foreground/85">
                          {m.current_period_end
                            ? new Date(m.current_period_end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.id ? "Edit tier" : "New tier"}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tierName">Name</Label>
                <Input id="tierName" value={dialog.name} onChange={(e) => setDialog({ ...dialog, name: e.target.value })} placeholder="e.g. Color Club" maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tierDesc">Description (optional)</Label>
                <Textarea id="tierDesc" value={dialog.description} onChange={(e) => setDialog({ ...dialog, description: e.target.value })} rows={2} maxLength={500} placeholder="What does this tier include?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tierPrice">Price ($)</Label>
                  <Input id="tierPrice" type="number" min={0} step="0.01" value={dialog.monthly_price_dollars} onChange={(e) => setDialog({ ...dialog, monthly_price_dollars: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tierInterval">Billing</Label>
                  <Select value={dialog.billing_interval} onValueChange={(v) => setDialog({ ...dialog, billing_interval: v as "month" | "year" })}>
                    <SelectTrigger id="tierInterval"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tierDiscount">Service discount %</Label>
                <Input id="tierDiscount" type="number" min={0} max={100} step={1} value={dialog.service_discount_percent} onChange={(e) => setDialog({ ...dialog, service_discount_percent: Number(e.target.value) || 0 })} />
                <p className="text-[11px] text-muted-foreground">Applied to the service subtotal at checkout. Tip and retail are not discounted.</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
                <span className="text-sm">Active (visible on signup page)</span>
                <Switch checked={dialog.is_active} onCheckedChange={(v) => setDialog({ ...dialog, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submitDialog()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save & sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
