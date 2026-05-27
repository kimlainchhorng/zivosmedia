import { FileText, Loader2, Mail, RefreshCw, Share2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReceiptHistoryItem {
  id: string;
  filename: string;
  created_at: string;
  reservation_number?: string | null;
}

interface Props {
  reservationId: string;
  receipts: ReceiptHistoryItem[];
}

export default function ReceiptHistoryCard({ reservationId, receipts }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const redownload = async (receipt: ReceiptHistoryItem) => {
    setLoadingId(receipt.id);
    toast("Preparing PDF…");
    const { data, error } = await supabase.functions.invoke("lodging-reservation-receipt", {
      body: { reservation_id: reservationId, receipt_id: receipt.id },
    });
    setLoadingId(null);
    if (error || !data) {
      toast.error(error?.message || "Could not re-download receipt");
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = receipt.filename || `ZIVO-reservation-${receipt.reservation_number || "receipt"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  const shareReceipt = async (receipt: ReceiptHistoryItem) => {
    setLoadingId(`share-${receipt.id}`);
    toast("Preparing PDF…");
    const { data, error } = await supabase.functions.invoke("lodging-reservation-receipt", { body: { reservation_id: reservationId, receipt_id: receipt.id } });
    setLoadingId(null);
    if (error || !data) return toast.error(error?.message || "Could not share receipt");
    const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
    const file = new File([blob], receipt.filename || "ZIVO-receipt.pdf", { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      toast("Opening share sheet…");
      await navigator.share({ files: [file], title: "ZIVO lodging receipt" });
      toast.success("Receipt shared");
    }
    else {
      await navigator.clipboard?.writeText(`ZIVO lodging receipt ${receipt.reservation_number || ""}`);
      toast.success("Receipt summary copied");
    }
  };

  const emailReceipt = async (receipt: ReceiptHistoryItem) => {
    setLoadingId(`email-${receipt.id}`);
    toast("Preparing receipt email…");
    const { data, error } = await supabase.functions.invoke("share-lodging-receipt", { body: { receipt_id: receipt.id } });
    setLoadingId(null);
    if (error || data?.error) return toast.error(data?.error || error?.message || "Could not email receipt");
    toast.success("Receipt email queued");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Receipt history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!receipts.length ? (
          <p className="text-sm text-muted-foreground">No receipts downloaded yet.</p>
        ) : receipts.map((receipt) => (
          <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{receipt.filename}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(receipt.created_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => redownload(receipt)} disabled={loadingId === receipt.id}>
                {loadingId === receipt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-download
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => shareReceipt(receipt)} disabled={loadingId === `share-${receipt.id}`}>
                {loadingId === `share-${receipt.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />} Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => emailReceipt(receipt)} disabled={loadingId === `email-${receipt.id}`}>
                {loadingId === `email-${receipt.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Email
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
