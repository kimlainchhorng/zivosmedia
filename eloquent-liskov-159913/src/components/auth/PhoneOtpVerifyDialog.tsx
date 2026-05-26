/**
 * Phone OTP Verification Dialog — adds SMS-based 2FA layer.
 * Uses existing send-otp-sms / verify-otp-sms edge functions (Twilio Verify).
 * Flow: enter phone → receive 6-digit SMS code → verify → phone marked verified.
 */
import { useEffect, useState } from "react";
import { Loader2, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import { useSendPhoneOTP, useVerifyPhoneOTP } from "@/hooks/useNotificationPreferences";
import { normalizePhoneE164 } from "@/lib/phone";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  initialPhone?: string;
}

const RESEND_COOLDOWN = 30;

export default function PhoneOtpVerifyDialog({ open, onOpenChange, onVerified, initialPhone }: Props) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(initialPhone || "");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const sendOtp = useSendPhoneOTP();
  const verifyOtp = useVerifyPhoneOTP();

  useEffect(() => {
    if (!open) {
      setStep("phone");
      setCode("");
      setCooldown(0);
    } else {
      setPhone(initialPhone || "");
    }
  }, [open, initialPhone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSend = async () => {
    const e164 = normalizePhoneE164(phone);
    if (!e164 || e164.length < 8) {
      toast.error("Please enter a valid phone number");
      return;
    }
    try {
      await sendOtp.mutateAsync(e164);
      setStep("code");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      /* toast handled in hook */
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    try {
      await verifyOtp.mutateAsync({ phoneE164: normalizePhoneE164(phone), code });
      onVerified();
      onOpenChange(false);
    } catch {
      setCode("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "phone" ? (
              <>
                <Smartphone className="w-5 h-5 text-primary" />
                Verify your phone number
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-primary" />
                Enter verification code
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "We'll send a 6-digit code via SMS to confirm this is your phone."
              : `Code sent to ${phone}. Enter it below to complete verification.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" && (
          <div className="space-y-3 py-2">
            <Label>Mobile number</Label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs text-muted-foreground">
              Standard SMS rates may apply. Carrier delivery times vary.
            </p>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sms-code">6-digit code</Label>
              <Input
                id="sms-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Didn't get it?{" "}
              <button
                type="button"
                onClick={handleSend}
                disabled={cooldown > 0 || sendOtp.isPending}
                className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                {sendOtp.isPending
                  ? "Sending…"
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
              </button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "phone" ? (
            <Button onClick={handleSend} disabled={sendOtp.isPending}>
              {sendOtp.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send code <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleVerify} disabled={verifyOtp.isPending || code.length !== 6}>
              {verifyOtp.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
