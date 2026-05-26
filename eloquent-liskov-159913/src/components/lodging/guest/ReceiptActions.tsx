/**
 * ReceiptActions — download PDF receipt + .ics calendar export.
 */
import { Button } from "@/components/ui/button";
import { FileText, CalendarPlus, Loader2, Mail, Share2, History } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildBookingIcs, downloadIcsFile } from "@/lib/lodging/ics";

interface Props {
  reservationNumber: string;
  reservationId: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  roomName?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  totalText?: string | null;
  cancellationText?: string | null;
  latestReceiptId?: string | null;
  receiptHistoryLoading?: boolean;
  onReceiptDownloaded?: () => Promise<unknown> | void;
}

export default function ReceiptActions(props: Props) {
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [lastReceiptBlob, setLastReceiptBlob] = useState<Blob | null>(null);
  const [actionState, setActionState] = useState<"share" | "email" | null>(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  useEffect(() => {
    if (!followUpVisible || props.latestReceiptId || props.receiptHistoryLoading) return;
    let cancelled = false;
    setSavingReceipt(true);
    Promise.resolve(props.onReceiptDownloaded?.()).finally(() => {
      if (!cancelled) setSavingReceipt(false);
    });
    return () => {
      cancelled = true;
    };
  }, [followUpVisible, props.latestReceiptId, props.receiptHistoryLoading, props.onReceiptDownloaded]);
  const downloadIcs = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Phnom_Penh";
    const ics = buildBookingIcs({
      reference: props.reservationNumber,
      storeName: props.propertyName,
      roomName: props.roomName || "Assigned room",
      guestName: props.guestName || "Guest",
      guestEmail: props.guestEmail,
      checkIn: props.checkIn,
      checkOut: props.checkOut,
      checkInTime: props.checkInTime || "15:00",
      checkOutTime: props.checkOutTime || "11:00",
      timezone,
      totalText: props.totalText,
      cancellationText: props.cancellationText || undefined,
    });
    downloadIcsFile(props.reservationNumber, ics);
  };

  const downloadReceipt = async () => {
    setLoadingReceipt(true);
    const { data, error } = await supabase.functions.invoke("lodging-reservation-receipt", {
      body: { reservation_id: props.reservationId },
    });
    setLoadingReceipt(false);
    if (error || !data) {
      toast.error(error?.message || "Could not download receipt");
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
    setLastReceiptBlob(blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ZIVO-reservation-${props.reservationNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setFollowUpVisible(true);
    toast.success("Receipt downloaded", { description: "Receipt saved to history." });
    setSavingReceipt(true);
    await props.onReceiptDownloaded?.();
    setSavingReceipt(false);
  };

  const shareReceipt = async () => {
    setActionState("share");
    toast("Preparing PDF…");
    try {
      const blob = lastReceiptBlob || new Blob([`ZIVO lodging receipt ${props.reservationNumber}`], { type: "text/plain" });
      const file = new File([blob], `ZIVO-reservation-${props.reservationNumber}.pdf`, { type: blob.type || "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        toast("Opening share sheet…");
        await navigator.share({ files: [file], title: "ZIVO lodging receipt", text: `${props.propertyName} · ${props.reservationNumber}` });
        toast.success("Receipt shared");
      } else {
        await navigator.clipboard?.writeText(`${props.propertyName} receipt ${props.reservationNumber} · ${props.totalText || ""}`);
        toast.success("Receipt summary copied");
      }
    } catch (e) {
      toast.error("Could not share receipt");
    } finally {
      setActionState(null);
    }
  };

  const emailReceipt = async () => {
    if (!props.latestReceiptId || props.receiptHistoryLoading || savingReceipt) {
      toast("Receipt history is updating");
      setSavingReceipt(true);
      await props.onReceiptDownloaded?.();
      setSavingReceipt(false);
      return;
    }
    setActionState("email");
    const { data, error } = await supabase.functions.invoke("share-lodging-receipt", { body: { receipt_id: props.latestReceiptId } });
    setActionState(null);
    if (error || data?.error) return toast.error(data?.error || error?.message || "Could not email receipt");
    toast.success("Receipt email queued");
  };

  const viewHistory = () => document.querySelector("#receipt-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const emailDisabled = Boolean(actionState) || props.receiptHistoryLoading || savingReceipt || !props.latestReceiptId;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={downloadReceipt} disabled={loadingReceipt} className="gap-2">
          {loadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Receipt
        </Button>
        <Button variant="outline" size="sm" onClick={downloadIcs} className="gap-2">
          <CalendarPlus className="w-4 h-4" /> Add to calendar
        </Button>
      </div>
      {followUpVisible && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium">Receipt saved to history</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={shareReceipt} disabled={!!actionState}>
              {actionState === "share" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />} Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={emailReceipt} disabled={emailDisabled}>
              {actionState === "email" || props.receiptHistoryLoading || savingReceipt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} {actionState === "email" ? "Preparing email…" : props.receiptHistoryLoading || savingReceipt || !props.latestReceiptId ? "Saving receipt…" : "Email"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={viewHistory}>
              <History className="w-3.5 h-3.5" /> View history
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
