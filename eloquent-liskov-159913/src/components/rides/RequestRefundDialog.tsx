import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rideRequestId: string;
  tripTotalCents: number;
  onSubmitted?: () => void;
}

export default function RequestRefundDialog({ open, onOpenChange, rideRequestId, tripTotalCents, onSubmitted }: Props) {
  const [category, setCategory] = useState<string>("overcharge");
  const [description, setDescription] = useState("");
  const [amountDollars, setAmountDollars] = useState((tripTotalCents / 100).toFixed(2));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const amountCents = Math.round(Number(amountDollars) * 100);
    if (!amountCents || amountCents <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!confirmContentSafe(description, "refund details")) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-refund-request", {
      body: { ride_request_id: rideRequestId, reason_category: category, description: description.slice(0, 500), requested_amount_cents: Math.min(amountCents, tripTotalCents) },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not submit");
      return;
    }
    toast.success("Refund request submitted");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overcharge">Overcharged</SelectItem>
                <SelectItem value="no_service">Service not provided</SelectItem>
                <SelectItem value="safety">Safety concern</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input type="number" step="0.01" max={(tripTotalCents / 100).toFixed(2)} value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Max ${(tripTotalCents / 100).toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea maxLength={500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us what happened..." />
            <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
