/** CancelReservationSheet — server-authoritative refund preview + reason capture. */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { useReservationActions } from "@/hooks/lodging/useReservationChangeRequests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservationId: string;
  checkIn: string;
  totalCents: number;
  paidCents: number;
}

type Preview = {
  policy_label: string;
  policy_window: string;
  refund_percent: number;
  refundable_cents: number;
  non_refundable_cents: number;
  total_paid_cents: number;
  payment_method_outcome: string;
  payment_intent_status?: string | null;
};

const REASONS = ["Plans changed", "Found alternative", "Property issue", "Travel restrictions", "Other"];
const money = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;

export default function CancelReservationSheet({ open, onOpenChange, reservationId, paidCents }: Props) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { requestCancel } = useReservationActions(reservationId);

  useEffect(() => {
    if (!open || !reservationId) return;
    let cancelled = false;
    setLoadingPreview(true);
    supabase.functions.invoke("cancel-lodging-reservation", { body: { reservation_id: reservationId, preview: true } }).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingPreview(false);
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Could not preview cancellation policy");
        return;
      }
      setPreview(data as Preview);
    });
    return () => {
      cancelled = true;
    };
  }, [open, reservationId]);

  const refundable = preview?.refundable_cents ?? 0;
  const totalPaid = preview?.total_paid_cents ?? paidCents;
  const refundablePct = totalPaid > 0 ? Math.min(100, Math.max(0, (refundable / totalPaid) * 100)) : 0;

  const submit = async () => {
    try {
      const fullReason = details ? `${reason} — ${details}` : reason;
      const res = await requestCancel.mutateAsync({ reason: fullReason });
      const msg = res.refund_cents > 0 ? `Cancelled. Refund status: ${res.payment_status || "refund pending"}.` : "Cancelled. No refund is due under the policy.";
      setResult(msg);
      toast.success(msg);
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Could not cancel");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> Cancel reservation</SheetTitle>
          <SheetDescription>Review the exact refund and saved-card outcome before cancelling.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Calculating policy…</div>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Total paid</span><span>{money(totalPaid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active window</span><span className="text-xs font-medium">{preview?.policy_window || "Standard policy"}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-destructive/20 flex" aria-label="Refund split">
                  <div className="bg-primary" style={{ width: `${refundablePct}%` }} />
                  <div className="bg-destructive/60 flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Refundable</p><p className="font-bold text-primary">{money(refundable)}</p></div>
                  <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">Non-refundable</p><p className="font-bold text-destructive">{money(preview?.non_refundable_cents || 0)}</p></div>
                </div>
                <div className="flex justify-between border-t pt-2 text-base"><span className="font-semibold">{preview?.policy_label || "Policy preview"}</span><span className="font-bold">{preview?.refund_percent ?? 0}%</span></div>
              </>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="w-4 h-4" /> What happens to my saved payment method</div>
            <p className="text-xs text-muted-foreground">{preview?.payment_method_outcome || "We’ll calculate the saved-card outcome before cancellation."}</p>
            {preview?.payment_intent_status && <p className="text-[11px] text-muted-foreground">Stripe status: {preview.payment_intent_status.replace(/_/g, " ")}</p>}
          </div>

          {(preview?.refundable_cents || 0) === 0 && !loadingPreview && (
            <Alert variant="destructive"><AlertTriangle className="w-4 h-4" /><AlertDescription>You are within the no-refund window. Cancelling now will forfeit the refundable balance shown above.</AlertDescription></Alert>
          )}

          <div><Label>Reason</Label><Select value={reason} onValueChange={setReason}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="details">More details (optional)</Label><Textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="mt-1.5" /></div>
          {result && <Alert aria-live="polite"><AlertDescription>{result}</AlertDescription></Alert>}

          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Keep reservation</Button><Button variant="destructive" className="flex-1" disabled={requestCancel.isPending || loadingPreview} onClick={() => setConfirmOpen(true)}>{requestCancel.isPending ? "Cancelling…" : "Confirm cancellation"}</Button></div>
        </div>
      </SheetContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm cancellation</DialogTitle><DialogDescription>This will cancel the reservation and process the refund outcome shown in the policy breakdown. The server recalculates the policy before applying it.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Go back</Button><Button variant="destructive" disabled={requestCancel.isPending || !reason} onClick={submit}>{requestCancel.isPending ? "Cancelling…" : "Cancel reservation"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
