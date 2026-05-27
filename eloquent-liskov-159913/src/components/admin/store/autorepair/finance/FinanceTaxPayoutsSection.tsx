/**
 * Auto Repair Finance — Tax & Payouts
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }
const fmt = (cents: number) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinanceTaxPayoutsSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ payout_date: new Date().toISOString().slice(0, 10), amount: "", source: "Bank deposit", reference: "" });

  const { data: invoices = [] } = useQuery({
    queryKey: ["ar-fin-tax-invoices", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices" as any).select("tax_cents,total_cents,status,created_at").eq("store_id", storeId);
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_payouts" as any).insert({
        store_id: storeId,
        payout_date: form.payout_date,
        amount_cents: cents,
        source: form.source || null,
        reference: form.reference || null,
        created_by: user?.id,
      });
      if (error) throw error;
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
      const { error } = await supabase.from("ar_payouts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-fin-payouts", storeId] }),
  });

  const stats = useMemo(() => {
    const taxCollected = invoices.filter((i: any) => i.status === "paid").reduce((s, i: any) => s + (i.tax_cents ?? 0), 0);
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
              <div className="text-xs text-muted-foreground">Sales tax collected (paid invoices)</div>
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove.mutate(p.id)}>
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
  );
}
