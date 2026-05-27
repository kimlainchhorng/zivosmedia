/**
 * SalonCommissionsSection — read-only payout report per stylist over a
 * date range. Derives from completed bookings × stylist commission %.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Banknote, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

type PayoutMethod = "cash" | "venmo" | "zelle" | "check" | "ach" | "stripe" | "other";

const METHOD_OPTIONS: { value: PayoutMethod; label: string; referenceHint: string }[] = [
  { value: "cash", label: "Cash", referenceHint: "Receipt #, witness, etc. (optional)" },
  { value: "venmo", label: "Venmo", referenceHint: "@handle or transaction id" },
  { value: "zelle", label: "Zelle", referenceHint: "Phone or email" },
  { value: "check", label: "Check", referenceHint: "Check #" },
  { value: "ach", label: "ACH / bank transfer", referenceHint: "Confirmation #" },
  { value: "stripe", label: "Stripe", referenceHint: "Stripe transfer / payout id" },
  { value: "other", label: "Other", referenceHint: "Describe…" },
];

/** CSV-escape: wrap in quotes and double up internal quotes. */
const csvCell = (raw: string | number | null | undefined): string => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename: string, header: string[], rows: (string | number | null | undefined)[][]) => {
  const lines = [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

interface SalonCommissionsSectionProps {
  storeId: string;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface StylistTotals {
  stylistId: string;
  name: string;
  commissionPercent: number;
  serviceCount: number;
  serviceRevenueCents: number;
  tipsCents: number;
  commissionEarnedCents: number;
}

export default function SalonCommissionsSection({ storeId }: SalonCommissionsSectionProps) {
  const { stylists } = useSalonStylists(storeId);
  const [from, setFrom] = useState<string>(daysAgoIso(7));
  const [to, setTo] = useState<string>(todayIso());
  const [rows, setRows] = useState<SalonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Array<{
    id: string;
    stylist_id: string;
    period_from: string;
    period_to: string;
    total_paid_cents: number;
    commission_cents: number;
    tips_cents: number;
    notes: string | null;
    method: PayoutMethod;
    reference: string | null;
    paid_at: string;
  }>>([]);
  const [payingStylistId, setPayingStylistId] = useState<string | null>(null);
  // Mark-paid dialog state. Opens when the owner clicks "Mark paid" on a row;
  // captures the method (cash / Venmo / Zelle / Stripe / etc.) + optional
  // reference so the stylist portal can show "you got paid via Zelle 555-1234".
  const [payoutDialog, setPayoutDialog] = useState<{
    totals: StylistTotals;
    method: PayoutMethod;
    reference: string;
    notes: string;
  } | null>(null);

  const stylistById = useMemo(() => new Map(stylists.map((s) => [s.id, s] as const)), [stylists]);

  const loadPayouts = async () => {
    const { data, error: err } = await supabase
      .from("salon_commission_payouts")
      .select("id, stylist_id, period_from, period_to, total_paid_cents, commission_cents, tips_cents, notes, method, reference, paid_at")
      .eq("store_id", storeId)
      .order("paid_at", { ascending: false })
      .limit(20);
    if (err) {
      console.error("[SalonCommissions] payouts load failed", err);
      return;
    }
    setPayouts((data ?? []) as unknown as typeof payouts);
  };
  useEffect(() => { void loadPayouts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  /** Open the "Mark paid" dialog. Default method picks Stripe when the
   *  stylist's connect account is active, else cash — matches the realistic
   *  workflow most owners use. */
  const openMarkPaid = (totals: StylistTotals) => {
    const stylist = stylistById.get(totals.stylistId);
    const defaultMethod: PayoutMethod =
      stylist?.stripe_connect_status === "active" ? "stripe" : "cash";
    setPayoutDialog({
      totals,
      method: defaultMethod,
      reference: "",
      notes: "",
    });
  };

  /** Confirm the dialog → insert the payout row. Duplicate check guards
   *  against accidental double-clicks on the same period. */
  const submitMarkPaid = async () => {
    if (!payoutDialog) return;
    const { totals, method, reference, notes } = payoutDialog;
    const payout = totals.commissionEarnedCents + totals.tipsCents;

    const dup = payouts.find((p) =>
      p.stylist_id === totals.stylistId && p.period_from === from && p.period_to === to
    );
    if (dup) {
      const ok = window.confirm(
        `You already recorded a payout to ${totals.name} for ${from} → ${to} ` +
        `(${formatPrice(dup.total_paid_cents)} on ${new Date(dup.paid_at).toLocaleDateString()}).\n\n` +
        `Record another ${formatPrice(payout)} payment anyway?`
      );
      if (!ok) return;
    }

    setPayingStylistId(totals.stylistId);
    const { data: { user } } = await supabase.auth.getUser();
    const cleanReference = reference.trim().slice(0, 200);
    const cleanNotes = notes.trim().slice(0, 500);
    const { error: err } = await supabase
      .from("salon_commission_payouts")
      .insert({
        store_id: storeId,
        stylist_id: totals.stylistId,
        period_from: from,
        period_to: to,
        services_count: totals.serviceCount,
        service_revenue_cents: totals.serviceRevenueCents,
        tips_cents: totals.tipsCents,
        commission_cents: totals.commissionEarnedCents,
        total_paid_cents: payout,
        method,
        reference: cleanReference || null,
        notes: cleanNotes || null,
        paid_by_user_id: user?.id ?? null,
      } as never);
    setPayingStylistId(null);
    if (err) {
      toast.error(`Couldn't record payout: ${err.message}`);
      return;
    }
    toast.success(`Recorded ${formatPrice(payout)} paid to ${totals.name}.`);
    setPayoutDialog(null);
    await loadPayouts();
  };

  const removePayout = async (id: string) => {
    if (!window.confirm("Delete this payout record? (This doesn't undo the actual payment — just removes the log entry.)")) return;
    const { error: err } = await supabase.from("salon_commission_payouts").delete().eq("id", id);
    if (err) { toast.error(err.message); return; }
    toast.success("Removed.");
    await loadPayouts();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      const { data, error: err } = await supabase
        .from("salon_bookings")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "completed")
        .gte("start_at", fromIso)
        .lte("start_at", toIso)
        .limit(500);
      if (cancelled) return;
      if (err) {
        console.error("[SalonCommissions] load failed", err);
        setError("Couldn't load payout data.");
        setLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as SalonBooking[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, from, to]);

  const totalsByStylist = useMemo<StylistTotals[]>(() => {
    const map = new Map<string, StylistTotals>();
    for (const st of stylists) {
      map.set(st.id, {
        stylistId: st.id,
        name: st.display_name,
        commissionPercent: st.commission_percent,
        serviceCount: 0,
        serviceRevenueCents: 0,
        tipsCents: 0,
        commissionEarnedCents: 0,
      });
    }
    for (const r of rows) {
      if (!r.stylist_id) continue;
      const t = map.get(r.stylist_id);
      if (!t) continue;
      t.serviceCount += 1;
      // Include add-on revenue — the stylist who performed the upsell earns
      // commission on it too. Rolled up by salon_booking_addons trigger.
      t.serviceRevenueCents += r.price_cents + (r.addons_total_cents ?? 0);
      t.tipsCents += r.tip_cents;
    }
    for (const t of map.values()) {
      t.commissionEarnedCents = Math.round(t.serviceRevenueCents * (t.commissionPercent / 100));
    }
    return Array.from(map.values())
      .filter((t) => t.serviceCount > 0 || t.commissionPercent > 0)
      .sort((a, b) => b.commissionEarnedCents - a.commissionEarnedCents);
  }, [rows, stylists]);

  const grandTotals = useMemo(() => {
    let revenue = 0, tips = 0, commission = 0, count = 0;
    for (const t of totalsByStylist) {
      revenue += t.serviceRevenueCents;
      tips += t.tipsCents;
      commission += t.commissionEarnedCents;
      count += t.serviceCount;
    }
    return { revenue, tips, commission, count };
  }, [totalsByStylist]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-primary" />
            Tips & Commissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="commFrom">From</Label>
              {/* Bind the range so an inverted window can't silently produce
                  $0 commission for the whole team. */}
              <Input id="commFrom" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commTo">To</Label>
              <Input id="commTo" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setFrom(daysAgoIso(7)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Last 7d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(30)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Last 30d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(90)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">90d</button>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                disabled={loading || totalsByStylist.length === 0}
                title="Per-stylist totals (one row per stylist) for the selected period"
                onClick={() => {
                  downloadCsv(
                    `commissions_summary_${from}_to_${to}.csv`,
                    ["Stylist", "Services", "Service Revenue ($)", "Tips ($)", "Commission %", "Commission ($)", "Payout ($)"],
                    totalsByStylist.map((t) => [
                      t.name,
                      t.serviceCount,
                      (t.serviceRevenueCents / 100).toFixed(2),
                      (t.tipsCents / 100).toFixed(2),
                      t.commissionPercent,
                      (t.commissionEarnedCents / 100).toFixed(2),
                      ((t.commissionEarnedCents + t.tipsCents) / 100).toFixed(2),
                    ])
                  );
                  toast.success(`Exported ${totalsByStylist.length} stylist totals.`);
                }}
              >
                <Download className="h-3.5 w-3.5" /> CSV: summary
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                disabled={loading || rows.length === 0}
                title="One row per completed visit — service, client, stylist, money breakdown"
                onClick={() => {
                  const stylistById = new Map(stylists.map((s) => [s.id, s] as const));
                  const lineItems = rows.map((r) => {
                    const st = r.stylist_id ? stylistById.get(r.stylist_id) : undefined;
                    const pct = st?.commission_percent ?? 0;
                    // Commission base = services + add-ons (matches the per-stylist
                    // summary above and SalonCommissionsSection's totalsByStylist).
                    const addons = r.addons_total_cents ?? 0;
                    const totalServiceCents = (r.price_cents ?? 0) + addons;
                    const commission = Math.round(totalServiceCents * (pct / 100));
                    return [
                      new Date(r.start_at).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }),
                      new Date(r.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      r.client_name,
                      r.service_name,
                      r.stylist_name ?? "",
                      (r.price_cents / 100).toFixed(2),
                      (addons / 100).toFixed(2),
                      (r.tip_cents / 100).toFixed(2),
                      (r.tax_cents / 100).toFixed(2),
                      pct,
                      (commission / 100).toFixed(2),
                      ((commission + r.tip_cents) / 100).toFixed(2),
                    ];
                  });
                  downloadCsv(
                    `commissions_detail_${from}_to_${to}.csv`,
                    ["Date", "Time", "Client", "Service", "Stylist", "Price ($)", "Add-ons ($)", "Tip ($)", "Tax ($)", "Commission %", "Commission ($)", "Stylist Payout ($)"],
                    lineItems
                  );
                  toast.success(`Exported ${rows.length} visits.`);
                }}
              >
                <Download className="h-3.5 w-3.5" /> CSV: detail
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCell label="Services done" value={String(grandTotals.count)} />
            <SummaryCell label="Service revenue" value={formatPrice(grandTotals.revenue)} />
            <SummaryCell label="Tips" value={formatPrice(grandTotals.tips)} />
            <SummaryCell label="Commissions owed" value={formatPrice(grandTotals.commission)} />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : totalsByStylist.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No completed services for any stylist in this window.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Stylist</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Services</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tips</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rate</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Commission</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payout</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {totalsByStylist.map((t) => (
                    <tr key={t.stylistId} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-foreground">{t.name}</td>
                      <td className="px-3 py-2 text-right text-foreground/85">{t.serviceCount}</td>
                      <td className="px-3 py-2 text-right text-foreground/85">{formatPrice(t.serviceRevenueCents)}</td>
                      <td className="px-3 py-2 text-right text-foreground/85">{formatPrice(t.tipsCents)}</td>
                      <td className="px-3 py-2 text-right text-foreground/85">{t.commissionPercent}%</td>
                      <td className="px-3 py-2 text-right text-foreground/85">{formatPrice(t.commissionEarnedCents)}</td>
                      <td className="px-3 py-2 text-right font-bold text-foreground">{formatPrice(t.commissionEarnedCents + t.tipsCents)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm" variant="outline" className="h-7 gap-1.5"
                          disabled={payingStylistId === t.stylistId || (t.commissionEarnedCents + t.tipsCents) === 0}
                          onClick={() => openMarkPaid(t)}
                        >
                          {payingStylistId === t.stylistId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark paid"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Payout = commission on service revenue + tips collected. Tips are paid through as-recorded; commission rate comes from each stylist's profile.
          </p>

          {payouts.length > 0 && (
            <div className="rounded-xl border border-border">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Payout history · last {Math.min(payouts.length, 20)}
              </div>
              <ul className="divide-y divide-border">
                {payouts.map((p) => {
                  const stylist = stylistById.get(p.stylist_id);
                  const methodLabel = METHOD_OPTIONS.find((m) => m.value === p.method)?.label ?? p.method;
                  return (
                    <li key={p.id} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {stylist?.display_name ?? "Unknown stylist"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(`${p.period_from}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(`${p.period_to}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}
                          paid {new Date(p.paid_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded-full bg-muted px-1.5 py-0.5 font-bold uppercase tracking-wider text-foreground">
                            {methodLabel}
                          </span>
                          {p.reference && (
                            <span className="truncate text-muted-foreground" title={p.reference}>
                              {p.reference}
                            </span>
                          )}
                          {p.notes && (
                            <span className="truncate text-muted-foreground" title={p.notes}>
                              · {p.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatPrice(p.total_paid_cents)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatPrice(p.commission_cents)} comm · {formatPrice(p.tips_cents)} tips
                        </p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => void removePayout(p.id)}
                      >
                        ×
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark-paid dialog — captures method + reference so the stylist
          portal can show "you got paid via Zelle 555-1234". */}
      <Dialog
        open={!!payoutDialog}
        onOpenChange={(open) => { if (!open) setPayoutDialog(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record payout</DialogTitle>
          </DialogHeader>
          {payoutDialog && (() => {
            const { totals, method, reference, notes } = payoutDialog;
            const payout = totals.commissionEarnedCents + totals.tipsCents;
            const hint = METHOD_OPTIONS.find((m) => m.value === method)?.referenceHint ?? "";
            const stylist = stylistById.get(totals.stylistId);
            const stripeReady = stylist?.stripe_connect_status === "active";
            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-sm font-semibold text-foreground">{totals.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {from} → {to} · {totals.serviceCount} service{totals.serviceCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{formatPrice(payout)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Commission {formatPrice(totals.commissionEarnedCents)} + tips {formatPrice(totals.tipsCents)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payoutMethod">Method</Label>
                  <Select
                    value={method}
                    onValueChange={(v) => setPayoutDialog({ ...payoutDialog, method: v as PayoutMethod })}
                  >
                    <SelectTrigger id="payoutMethod"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHOD_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                          {m.value === "stripe" && !stripeReady && " · stylist not connected"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {method === "stripe" && !stripeReady && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      This stylist hasn't connected Stripe yet. Send them their /stylist/… link so they can set up payouts.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payoutReference">Reference</Label>
                  <Input
                    id="payoutReference"
                    value={reference}
                    onChange={(e) => setPayoutDialog({ ...payoutDialog, reference: e.target.value })}
                    placeholder={hint}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payoutNotes">Notes (optional)</Label>
                  <Input
                    id="payoutNotes"
                    value={notes}
                    onChange={(e) => setPayoutDialog({ ...payoutDialog, notes: e.target.value })}
                    placeholder="Anything else worth remembering"
                    maxLength={500}
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayoutDialog(null)} disabled={!!payingStylistId}>
              Cancel
            </Button>
            <Button onClick={() => void submitMarkPaid()} disabled={!!payingStylistId}>
              {payingStylistId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
