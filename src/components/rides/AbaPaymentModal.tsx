/**
 * AbaPaymentModal - shows a Bakong KHQR that customers scan to pay for a ride.
 *
 * The ride only continues after a verifier confirms the KHQR transaction. The
 * verifier can be the Bakong Open API by QR MD5, or the Telegram receipt bridge
 * already configured in Supabase Edge Functions.
 */
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDynamicKhqr, formatBakongBillId, getKhqrMerchantName } from "@/lib/khqr";
import { supabase } from "@/integrations/supabase/client";

const USD_TO_KHR = 4062.5;
const QR_EXPIRES_SECONDS = 300;
const POLL_INTERVAL_MS = 4000;
const MERCHANT_NAME = getKhqrMerchantName();

type PaymentVerificationChannel = "Bakong" | "Telegram";

export interface AbaKhqrPaymentReceipt {
  reference: string;
  amountUsd: number;
  amountKhr: number;
  currency: "KHR";
  qr: string;
  openedAtSec: number;
  verifiedBy: PaymentVerificationChannel;
  verifiedAt: string;
}

interface AbaPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountUsd: number;
  reference: string;
  onConfirmed: (receipt: AbaKhqrPaymentReceipt) => void;
  onRenew?: () => void;
}

export default function AbaPaymentModal({
  open,
  onOpenChange,
  amountUsd,
  reference,
  onConfirmed,
  onRenew,
}: AbaPaymentModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRES_SECONDS);
  const [confirming, setConfirming] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [verifiedBy, setVerifiedBy] = useState<PaymentVerificationChannel | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const confirmSentRef = useRef(false);
  const verifyInFlightRef = useRef(false);

  const amountKhr = useMemo(() => Math.round(amountUsd * USD_TO_KHR), [amountUsd]);
  const qrString = useMemo(
    () => buildDynamicKhqr(amountKhr, "KHR", reference),
    [amountKhr, reference]
  );
  const openedAtSec = useMemo(() => Math.floor(Date.now() / 1000), [open, reference]);

  const buildReceipt = useCallback((channel: PaymentVerificationChannel): AbaKhqrPaymentReceipt => ({
    reference,
    amountUsd,
    amountKhr,
    currency: "KHR",
    qr: qrString,
    openedAtSec,
    verifiedBy: channel,
    verifiedAt: new Date().toISOString(),
  }), [amountKhr, amountUsd, openedAtSec, qrString, reference]);

  const finishVerified = useCallback((channel: PaymentVerificationChannel): boolean => {
    if (confirmSentRef.current) return false;
    confirmSentRef.current = true;
    setVerifiedBy(channel);
    toast.success(channel === "Bakong" ? "Bakong payment received." : "Payment receipt found.");
    onConfirmed(buildReceipt(channel));
    return true;
  }, [buildReceipt, onConfirmed]);

  const verifyPayment = useCallback(async (manual = false): Promise<PaymentVerificationChannel | null> => {
    if (confirmSentRef.current || verifyInFlightRef.current) return null;
    verifyInFlightRef.current = true;

    if (manual) {
      setConfirming(true);
      setVerifyError(null);
    } else {
      setAutoChecking(true);
    }

    try {
      const [bakong, telegram] = await Promise.allSettled([
        supabase.functions.invoke("bakong-verify", {
          body: { qr: qrString, reference, amount: amountKhr, currency: "KHR", sinceSec: openedAtSec },
        }),
        supabase.functions.invoke("verify-aba-telegram", {
          body: { reference, amount: amountKhr, currency: "KHR", sinceSec: openedAtSec },
        }),
      ]);

      if (bakong.status === "fulfilled" && !bakong.value.error && bakong.value.data?.ok && bakong.value.data?.paid) {
        return finishVerified("Bakong") ? "Bakong" : null;
      }

      if (telegram.status === "fulfilled" && !telegram.value.error && telegram.value.data?.ok && telegram.value.data?.paid) {
        return finishVerified("Telegram") ? "Telegram" : null;
      }

      if (manual) {
        setVerifyError("Payment not found yet. Keep this QR open after the customer pays, then check again.");
        toast.info("Payment not found yet.");
      }
      return null;
    } catch (err) {
      if (manual) {
        const message = err instanceof Error ? err.message : "Payment verification failed";
        setVerifyError(message);
        toast.error(message);
      }
      return null;
    } finally {
      setLastCheckedAt(new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
      if (manual) setConfirming(false);
      else setAutoChecking(false);
      verifyInFlightRef.current = false;
    }
  }, [amountKhr, finishVerified, openedAtSec, qrString, reference]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSecondsLeft(QR_EXPIRES_SECONDS);
    setConfirming(false);
    setAutoChecking(false);
    setLastCheckedAt(null);
    setVerifiedBy(null);
    setVerifyError(null);
    confirmSentRef.current = false;
    verifyInFlightRef.current = false;

    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [open, reference]);

  useEffect(() => {
    if (!open || verifiedBy) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (cancelled) return;
      if (Math.floor(Date.now() / 1000) - openedAtSec >= QR_EXPIRES_SECONDS) {
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
        return;
      }
      const channel = await verifyPayment(false);
      if (channel) {
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
      }
    };

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") void poll();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void poll();
        startPolling();
      } else {
        stopPolling();
      }
    };

    void poll();
    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [open, openedAtSec, verifiedBy, verifyPayment]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft <= 0;
  const amountKhrLabel = amountKhr.toLocaleString();
  const billId = useMemo(() => formatBakongBillId(reference) || reference.toUpperCase(), [reference]);

  const handleCopyRef = async () => {
    await navigator.clipboard.writeText(reference);
    toast.success("Reference copied");
  };

  const handleCopyBillId = async () => {
    await navigator.clipboard.writeText(billId);
    toast.success("Bill ID copied");
  };

  const handleRenew = () => {
    setVerifyError(null);
    setVerifiedBy(null);
    setConfirming(false);
    setAutoChecking(false);
    setLastCheckedAt(null);
    setSecondsLeft(QR_EXPIRES_SECONDS);
    confirmSentRef.current = false;
    verifyInFlightRef.current = false;
    if (onRenew) {
      onRenew();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Bakong KHQR Payment</DialogTitle>
        <div className="bg-gradient-to-b from-[#003c71] to-[#0066b3] px-5 py-4 text-white text-center">
          <p className="text-xs opacity-90">Bakong KHQR</p>
          <p className="text-base font-bold mt-1">Customer scans to pay</p>
        </div>

        <div className="px-5 py-5 bg-white text-center space-y-3">
          <div className="inline-block p-3 rounded-2xl bg-white border-2 border-border/20">
            <QRCodeSVG value={qrString} size={200} level="M" />
          </div>
          <p className="text-sm font-bold text-foreground">{MERCHANT_NAME}</p>

          <div className="rounded-xl bg-muted/40 px-4 py-3 text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Amount</span>
              <span className="text-sm font-bold text-foreground">
                {amountKhrLabel} KHR <span className="text-muted-foreground font-normal">(${amountUsd.toFixed(2)})</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Bill ID</span>
              <button
                onClick={handleCopyBillId}
                className="flex items-center gap-1 text-sm font-bold font-mono tracking-wide text-foreground hover:text-primary"
                type="button"
              >
                <span>{billId}</span>
                <Copy className="w-3 h-3 shrink-0" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Full ref</span>
              <button
                onClick={handleCopyRef}
                className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary truncate"
                type="button"
              >
                <span className="truncate">{reference}</span>
                <Copy className="w-3 h-3 shrink-0" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expires in</span>
              <span className={`text-sm font-bold ${expired ? "text-destructive" : "text-foreground"}`}>
                {expired ? "Expired" : `${mins}:${secs}`}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-left">
            <p className="text-[11px] font-semibold text-blue-950 leading-snug">
              Open Bakong, ABA, Wing, ACLEDA, or any KHQR-supported banking app and choose Scan.
            </p>
            <p className="text-[11px] text-blue-900 leading-snug mt-0.5">
              The ride starts only after the payment is verified. Phone cameras do not pay KHQR codes.
            </p>
          </div>

          <div className="rounded-xl bg-muted/40 border border-border/40 px-3 py-2 text-left">
            <div className="flex items-center gap-2">
              {verifiedBy ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : autoChecking ? (
                <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              ) : expired ? (
                <RefreshCw className="w-3.5 h-3.5 text-destructive shrink-0" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <p className="text-[11px] font-semibold text-foreground leading-snug">
                {verifiedBy
                  ? `Verified by ${verifiedBy}`
                  : expired
                    ? "QR expired"
                    : autoChecking
                      ? "Checking payment automatically..."
                      : "Waiting for customer payment"}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {verifiedBy
                ? "Creating the ride now."
                : expired
                  ? "Generate a new QR before the customer pays."
                  : lastCheckedAt
                    ? `Last checked ${lastCheckedAt}. You can also tap Check payment.`
                    : "We check every few seconds while this screen is open."}
            </p>
          </div>

          {expired && !verifiedBy && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-left">
              <p className="text-[11px] text-destructive leading-snug">
                This QR expired. Generate a new QR before the customer pays.
              </p>
            </div>
          )}

          {verifyError && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-left">
              <p className="text-[11px] text-amber-900 leading-snug">{verifyError}</p>
            </div>
          )}

          <Button
            onClick={() => expired && !verifiedBy ? handleRenew() : void verifyPayment(true)}
            disabled={confirming || autoChecking || !!verifiedBy}
            className="w-full h-12 rounded-xl font-bold gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            {confirming || autoChecking ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                Checking payment...
              </span>
            ) : verifiedBy ? (
              <>
                <Check className="w-4 h-4" />
                Payment verified
              </>
            ) : expired ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate new QR
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Check payment
              </>
            )}
          </Button>
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Secured by Bakong KHQR verification</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
