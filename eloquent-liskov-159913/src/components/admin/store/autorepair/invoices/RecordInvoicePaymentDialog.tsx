/**
 * Record a payment against an invoice.
 * Auto-fills the remaining balance, validates against overpayment.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { recordInvoicePayment } from "@/lib/admin/invoiceActions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  invoice: {
    id: string;
    number: string;
    customer: string;
    totalCents: number;
    amountPaidCents: number;
  } | null;
  onSaved: () => void;
}

const METHODS = ["cash", "card", "check", "bank_transfer", "other"];

export default function RecordInvoicePaymentDialog({
  open, onOpenChange, storeId, invoice, onSaved,
}: Props) {
  const remaining = invoice ? Math.max(0, invoice.totalCents - invoice.amountPaidCents) : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setAmount((remaining / 100).toFixed(2));
      setMethod("cash");
      setReference("");
      setNotes("");
    }
  }, [open, invoice, remaining]);

  if (!invoice) return null;

  const handleSave = async () => {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!cents || cents <= 0) { toast.error("Enter an amount greater than zero"); return; }
    if (cents > remaining) {
      toast.error(`Amount exceeds remaining balance ($${(remaining / 100).toFixed(2)})`);
      return;
    }
    setSaving(true);
    try {
      const { newStatus } = await recordInvoicePayment({
        storeId,
        invoiceId: invoice.id,
        amountCents: cents,
        method,
        reference,
        notes,
        totalCents: invoice.totalCents,
        alreadyPaidCents: invoice.amountPaidCents,
      });
      toast.success(newStatus === "paid" ? "Invoice marked as paid" : "Payment recorded");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Could not save payment: ${e?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment · {invoice.number}</DialogTitle>
          <DialogDescription>
            {invoice.customer} · Remaining ${(remaining / 100).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ref" className="text-xs">Reference (optional)</Label>
            <Input
              id="ref"
              placeholder="Check #, transaction ID…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pn" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="pn"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
