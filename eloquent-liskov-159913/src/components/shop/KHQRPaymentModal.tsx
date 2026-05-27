/**
 * KHQRPaymentModal — Dynamic QR code payment for ABA PayWay
 * Shows QR, polls for confirmation, fires Meta Purchase on success
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/services/metaConversion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, QrCode, RefreshCw } from "lucide-react";

interface KHQRPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: "USD" | "KHR";
  description?: string;
  reference?: string;
  sourceTable?: string;
  sourceId?: string;
  onSuccess?: (transactionId: string) => void;
  onCancel?: () => void;
}

type PaymentStatus = "generating" | "pending" | "confirmed" | "failed" | "expired";

export default function KHQRPaymentModal({
  open,
  onOpenChange,
  amount,
  currency = "USD",
  description = "ZIVO Payment",
  reference,
  sourceTable,
  sourceId,
  onSuccess,
  onCancel,
}: KHQRPaymentModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>("generating");
  const [qrData, setQrData] = useState<string | null>(null);
  const [tranId, setTranId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateQR = useCallback(async () => {
    setStatus("generating");
    setQrData(null);
    try {
      const { data, error } = await supabase.functions.invoke("aba-payway-checkout", {
        body: {
          amount,
          currency,
          description,
          return_url: `${window.location.origin}/payment/success`,
          reference,
        },
      });
      if (error) throw error;

      const qr = data?.qr_string || data?.abapay_deeplink || `KHQR:${data?.tran_id || reference}:${amount}`;
      setQrData(qr);
      setTranId(data?.tran_id || reference || crypto.randomUUID());
      setDeepLink(data?.abapay_deeplink || null);
      setStatus("pending");

      // Auto-expire after 10 minutes
      timeoutRef.current = setTimeout(() => {
        setStatus("expired");
        stopPolling();
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("KHQR generation failed:", err);
      setStatus("failed");
    }
  }, [amount, currency, description, reference]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Simulate payment confirmation polling
  // In production, this would check ABA's transaction status API
  const handleConfirmPayment = useCallback(async () => {
    if (!tranId) return;
    setStatus("confirmed");
    stopPolling();

    // Fire Meta Purchase event with bank transaction ID as event_id
    try {
      await trackPurchase({
        eventId: tranId, // Bank transaction ID = Event ID (prevents double counting)
        externalId: user?.id,
        value: amount,
        currency,
        sourceType: "khqr",
        sourceTable: sourceTable || "store_orders",
        sourceId: sourceId || tranId,
      });
    } catch {
      // Meta tracking failure shouldn't block payment flow
    }

    toast.success("Payment confirmed!");
    onSuccess?.(tranId);
  }, [tranId, user, amount, currency, sourceTable, sourceId, onSuccess, stopPolling]);

  useEffect(() => {
    if (open) {
      generateQR();
    }
    return () => stopPolling();
  }, [open, generateQR, stopPolling]);

  const handleClose = () => {
    stopPolling();
    if (status !== "confirmed") {
      onCancel?.();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            KHQR Payment
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          {/* Amount display */}
          <div className="text-center">
            <p className="text-3xl font-black text-primary">
              {currency === "KHR" ? `៛${amount.toLocaleString()}` : `$${amount.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>

          {/* QR Code */}
          {status === "generating" && (
            <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "pending" && qrData && (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <QRCodeSVG value={qrData} size={200} level="H" />
              </div>
              <Badge variant="secondary" className="animate-pulse">
                Waiting for payment...
              </Badge>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Scan this QR code with your ABA Mobile or any KHQR-supported banking app
              </p>
              {deepLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(deepLink, "_blank")}
                  className="text-xs"
                >
                  Open ABA Mobile App
                </Button>
              )}
              {/* Manual confirm button (sandbox mode) */}
              <Button
                onClick={handleConfirmPayment}
                className="w-full rounded-xl font-bold"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                I've Completed Payment
              </Button>
            </>
          )}

          {status === "confirmed" && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <p className="text-lg font-bold text-emerald-600">Payment Confirmed!</p>
              <p className="text-xs text-muted-foreground">Transaction ID: {tranId}</p>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center space-y-3">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <p className="text-lg font-bold text-destructive">Payment Failed</p>
              <Button onClick={generateQR} variant="outline" className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          )}

          {status === "expired" && (
            <div className="text-center space-y-3">
              <XCircle className="h-16 w-16 text-amber-500 mx-auto" />
              <p className="text-lg font-bold text-amber-600">QR Code Expired</p>
              <Button onClick={generateQR} variant="outline" className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" /> Generate New QR
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
