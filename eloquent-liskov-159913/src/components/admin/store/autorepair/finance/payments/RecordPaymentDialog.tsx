/**
 * Smart Record Payment dialog — searchable invoice picker, autofill balance, overpayment confirm.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, PAYMENT_METHODS, type PaymentInvoiceLite } from "@/lib/admin/paymentsCalculations";
import { nativeConfirm } from "@/lib/native/dialog";

interface Props {
  storeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoices: PaymentInvoiceLite[];
  presetInvoiceId?: string | null;
}

export default function RecordPaymentDialog({ storeId, open, onOpenChange, invoices, presetInvoiceId }: Props) {
  const qc = useQueryClient();
  const [outstandingOnly, setOutstandingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");

  const filteredInvoices = useMemo(() => {
    let arr = invoices;
    if (outstandingOnly) arr = arr.filter((i) => i.status !== "paid" && i.status !== "void" && (i.total_cents - i.amount_paid_cents) > 0);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((i) =>
      (i.number ?? "").toLowerCase().includes(q) ||
      (i.customer_name ?? "").toLowerCase().includes(q) ||
      (i.vehicle_label ?? "").toLowerCase().includes(q)
    );
    return arr.slice(0, 50);
  }, [invoices, outstandingOnly, search]);

  const selected = useMemo(() => invoices.find((i) => i.id === invoiceId) || null, [invoices, invoiceId]);
  const balance = selected ? Math.max(0, selected.total_cents - selected.amount_paid_cents) : 0;

  // Open with preset
  useEffect(() => {
    if (open) {
      setInvoiceId(presetInvoiceId || "");
      setAmount("");
      setReference("");
      setSearch("");
      setOutstandingOnly(true);
    }
  }, [open, presetInvoiceId]);

  // Autofill amount when invoice picked
  useEffect(() => {
    if (selected && !amount) setAmount((balance / 100).toFixed(2));
  }, [selected, balance]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: async () => {
      const cents = Math.round((parseFloat(amount) || 0) * 100);
      if (!invoiceId) throw new Error("Pick an invoice");
      if (cents <= 0) throw new Error("Amount must be greater than zero");
      if (selected && cents > balance) {
        const ok = await nativeConfirm(`Amount $${(cents / 100).toFixed(2)} exceeds balance ${fmtMoney(balance)}. Record as overpayment?`);
        if (!ok) throw new Error("Cancelled");
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_invoice_payments" as any).insert({
        store_id: storeId,
        invoice_id: invoiceId,
        amount_cents: cents,
        method,
        reference: reference || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["ar-payments-list", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-payments-invoices", storeId] });
    },
    onError: (e: any) => { if (e?.message !== "Cancelled") toast.error(e.message || "Failed"); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch id="outstanding-only" checked={outstandingOnly} onCheckedChange={setOutstandingOnly} />
            <Label htmlFor="outstanding-only" className="text-xs">Outstanding only</Label>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search invoice # / customer / vehicle" value={search}
              onChange={(e) => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredInvoices.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">No matching invoices.</div>
                ) : filteredInvoices.map((i) => {
                  const bal = Math.max(0, i.total_cents - i.amount_paid_cents);
                  return (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number || i.id.slice(0, 8)} · {i.customer_name || "—"} · {fmtMoney(bal)} due
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="rounded-lg border bg-muted/30 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selected.customer_name || "Unknown"}</span>
                <Badge variant="outline" className="text-[10px] h-5">{selected.status}</Badge>
              </div>
              <div className="text-muted-foreground">{selected.vehicle_label || "—"}</div>
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">Balance due</span>
                <span className="font-semibold tabular-nums">{fmtMoney(balance)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (USD)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Reference (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Check #, txn ID, etc" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
