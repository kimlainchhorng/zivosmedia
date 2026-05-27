import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSubmitLodgingRefundDispute } from "@/hooks/lodging/useLodgingRefundDisputes";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  maxAmountCents: number;
}

export default function RefundDisputeSheet({ open, onOpenChange, reservationId, maxAmountCents }: Props) {
  const [reason, setReason] = useState("refund_amount");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(Math.max(0, maxAmountCents / 100).toFixed(2));
  const submit = useSubmitLodgingRefundDispute(reservationId);

  const send = async () => {
    if (description.trim().length < 12) {
      toast.error("Add a short explanation before submitting.");
      return;
    }
    if (!confirmContentSafe(description, "refund explanation")) return;
    try {
      await submit.mutateAsync({ reason_category: reason, description: description.trim(), requested_amount_cents: Math.round(Number(amount || 0) * 100) });
      toast.success("Refund request submitted");
      setDescription("");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request a refund review</SheetTitle>
          <SheetDescription>Share what happened and the amount you want reviewed.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="refund_amount">Refund amount</SelectItem>
                <SelectItem value="policy_exception">Policy exception</SelectItem>
                <SelectItem value="host_issue">Property or host issue</SelectItem>
                <SelectItem value="payment_issue">Payment issue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Requested amount</label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Maximum review amount: ${(maxAmountCents / 100).toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain why you want this refund reviewed." />
          </div>
          <div className="flex gap-2 sticky bottom-0 bg-background pt-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
            <Button className="flex-1" onClick={send} disabled={submit.isPending}>{submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
