/**
 * Auto Repair Finance — Tax & Payouts
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeSensitive } from "@/lib/security/sensitiveInvoke";
import { useStepUpMfa } from "@/hooks/useStepUpMfa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { collectedTaxCents } from "@/lib/admin/pnlCalculations";

interface Props { storeId: string }
const fmt = (cents: number) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Local YYYY-MM-DD (browser runs in Cambodia, UTC+7, no DST). toISOString() is the
// UTC day, which from 00:00–06:59 ICT is still yesterday — so the payout-date
// default would pre-fill, and the recorded payout carry, yesterday before dawn.
// Mirrors ymdLocal in paymentsCalculations.ts.
const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function FinanceTaxPayoutsSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ payout_date: ymdLocal(new Date()), amount: "", source: "Bank deposit", reference: "" });

  // ar-payout-record is enforceAal2-gated: it answers 403
  // {"code":"mfa_required"} to any session below AAL2. A plain invoke surfaced
  // that as supabase-js's generic "Edge Function returned a non-2xx status
  // code", so recording or deleting a payout just failed with no way forward.
  // invokeSensitive catches the code, runs the challenge, and retries.
  const { ensureAal2, dialog: mfaDialog } = useStepUpMfa();

  const { data: invoices = [] } = useQuery({
    queryKey: ["ar-fin-tax-invoices", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices" as any).select("tax_cents,total_cents,amount_paid_cents,status,created_at").eq("store_id", storeId);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["ar-fin-payouts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_payouts" as any).select("*").eq("store_id", storeId).order("payout_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const cents = Math.round((parseFloat(form.amount) || 0) * 100);
      if (cents <= 0) throw new Error("Amount must be greater than zero");
      const { data, error } = await invokeSensitive<{ error?: string }>("ar-payout-record", {
        body: {
          action: "create",
          store_id: storeId,
          payout_date: form.payout_date,
          amount_cents: cents,
          source: form.source || null,
          reference: form.reference || null,
        },
        headers: {
          "Idempotency-Key": `ar-payout-${storeId}-${form.payout_date}-${cents}-${crypto.randomUUID()}`,
        },
      }, ensureAal2, "Confirm payout record");
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed to record payout");
      }
    },
    onSuccess: () => {
      toast.success("Payout recorded");
      setOpen(false);
      setForm({ ...form, amount: "", reference: "" });
      qc.invalidateQueries({ queryKey: ["ar-fin-payouts", storeId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await invokeSensitive<{ error?: string }>("ar-payout-record", {
        body: { action: "delete", payout_id: id },
      }, ensureAal2, "Confirm payout record");
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed to delete payout");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-fin-payouts", storeId] }),
  });

  const stats = useMemo(() => {
    // Cash basis: tax collected is each invoice's tax pro-rated by amount paid,
    // so partial payments (deposits) accrue their share of tax too.
    const taxCollected = invoices.reduce((s, i: any) => s + collectedTaxCents(i), 0);
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const ytdRevenue = invoices
      .filter((i: any) => i.status === "paid" && i.created_at >= yearStart)
      .reduce((s, i: any) => s + (i.total_cents ?? 0), 0);
    // Rough self-employment quarterly tax estimate (15.3% SE + 12% federal effective = ~27%)
    const quarterlyTaxEst = Math.round(ytdRevenue * 0.27 / 4);
    return { taxCollected, ytdRevenue, quarterlyTaxEst };
  }, [invoices]);

  const totalPayouts = payouts.reduce((s, p: any) => s + (p.amount_cents ?? 0), 0);

  return (
    <>
    {mfaDialog}
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Tax & Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Sales tax collected (cash basis)</div>
              <div className="text-xl font-semibold">{fmt(stats.taxCollected)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">YTD revenue</div>
              <div className="text-xl font-semibold">{fmt(stats.ytdRevenue)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Est. quarterly tax (≈27%)</div>
              <div className="text-xl font-semibold">{fmt(stats.quarterlyTaxEst)}</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Tax estimate is a rough rule of thumb. Always confirm with your CPA — actual rates depend on your state, deductions, and entity type.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payout history</CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Record payout</Button>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-2">Total: <span className="font-medium text-foreground">{fmt(totalPayouts)}</span></div>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No payouts recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {payouts.map((p: any) => (
                <li key={p.id} className="py-2 flex justify-between gap-3 text-sm">
                  <div>
                    <div className="font-medium">{p.source || "Payout"}</div>
                    <div className="text-xs text-muted-foreground">{p.payout_date} {p.reference && `· ${p.reference}`}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{fmt(p.amount_cents)}</span>
                    <Button size="icon" aria-label="Delete" variant="ghost" className="h-7 w-7" onClick={() => remove.mutate(p.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payout</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.payout_date} onChange={(e) => setForm({ ...form, payout_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Amount (USD)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Source</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Bank deposit, Stripe" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Reference</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
