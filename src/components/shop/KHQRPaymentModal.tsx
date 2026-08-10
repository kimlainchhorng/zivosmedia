/**
 * KHQRPaymentModal — Dynamic QR code payment for ABA PayWay
 * Shows a provider-issued QR and waits for a separately verified payment result.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, XCircle, QrCode, RefreshCw } from "lucide-react";

interface KHQRPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: "USD" | "KHR";
  description?: string;
  reference?: string;
  sourceTable?: string;
  sourceId?: string;
  /**
   * Kept for call-site compatibility. A browser QR acknowledgement must never
   * invoke it; completion needs a separately server-verified provider result.
   */
  onSuccess?: (transactionId: string) => void;
  onCancel?: () => void;
}

type PaymentStatus = "generating" | "pending" | "failed" | "expired";

export default function KHQRPaymentModal(props: KHQRPaymentModalProps) {
  const {
    open,
    onOpenChange,
    amount,
    currency = "USD",
    description = "ZIVO Payment",
    reference,
    onCancel,
  } = props;
  const [status, setStatus] = useState<PaymentStatus>("generating");
  const [qrData, setQrData] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const generateQR = useCallback(async () => {
    stopWaiting();
    setStatus("generating");
    setQrData(null);
    setDeepLink(null);
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

      // A deep link is not a KHQR payload. Never invent a QR or local transaction
      // reference when the provider response is incomplete.
      const providerQr = typeof data?.qr_string === "string" ? data.qr_string.trim() : "";
      if (!providerQr) {
        throw new Error("ABA did not return a usable payment QR. Please try again.");
      }

      const providerDeepLink = typeof data?.abapay_deeplink === "string"
        ? data.abapay_deeplink.trim()
        : "";
      setQrData(providerQr);
      setDeepLink(providerDeepLink || null);
      setStatus("pending");

      // Auto-expire after 10 minutes
      timeoutRef.current = setTimeout(() => {
        setStatus("expired");
        stopWaiting();
      }, 10 * 60 * 1000);
    } catch (err) {
      console.error("KHQR generation failed:", err);
      setStatus("failed");
    }
  }, [amount, currency, description, reference, stopWaiting]);

  useEffect(() => {
    if (open) {
      generateQR();
    }
    return () => stopWaiting();
  }, [open, generateQR, stopWaiting]);

  const handleClose = () => {
    stopWaiting();
    onCancel?.();
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
                Waiting for ABA verification...
              </Badge>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Scan this QR code with your ABA Mobile or any KHQR-supported banking app
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Payment will be confirmed only after ABA verifies it.
              </p>
              {deepLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(deepLink, "_blank", "noopener,noreferrer")}
                  className="text-xs"
                >
                  Open ABA Mobile App
                </Button>
              )}
            </>
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
