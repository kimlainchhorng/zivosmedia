/**
 * PhoneVerificationDialog Component
 * OTP input modal for phone number verification
 */

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, CheckCircle2 } from "lucide-react";
import { useSendPhoneOTP, useVerifyPhoneOTP } from "@/hooks/useNotificationPreferences";
import { cn } from "@/lib/utils";

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onVerified: () => void;
}

export function PhoneVerificationDialog({
  open,
  onOpenChange,
  phoneNumber,
  onVerified,
}: PhoneVerificationDialogProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOTP = useSendPhoneOTP();
  const verifyOTP = useVerifyPhoneOTP();

  // Send OTP when dialog opens
  useEffect(() => {
    if (open && phoneNumber) {
      handleSendOTP();
    }
  }, [open, phoneNumber]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCode(["", "", "", "", "", ""]);
      setIsVerified(false);
    }
  }, [open]);

  const handleSendOTP = async () => {
    try {
      await sendOTP.mutateAsync(phoneNumber);
      setResendCooldown(60);
    } catch {
      // Error handled in hook
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (codeStr: string) => {
    try {
      await verifyOTP.mutateAsync({ phoneE164: phoneNumber, code: codeStr });
      setIsVerified(true);
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
      }, 1500);
    } catch {
      // Error handled in hook, clear code for retry
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {isVerified ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : (
              <Phone className="w-6 h-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {isVerified ? "Phone Verified!" : "Verify Your Phone"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isVerified ? (
              "Your phone number has been verified successfully."
            ) : (
              <>
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{phoneNumber}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="space-y-6 py-4">
            {/* OTP Input */}
            <div>
              <Label className="sr-only">Verification code</Label>
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={verifyOTP.isPending}
                    className={cn(
                      "w-12 h-14 text-center text-2xl font-semibold",
                      "focus:ring-2 focus:ring-primary"
                    )}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleVerify(code.join(""))}
              disabled={code.some((d) => !d) || verifyOTP.isPending}
              className="w-full h-12 rounded-xl font-semibold shadow-md active:scale-[0.97] transition-all duration-200 touch-manipulation"
            >
              {verifyOTP.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Phone Number"
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend code in {resendCooldown}s
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOTP}
                  disabled={sendOTP.isPending}
                >
                  {sendOTP.isPending ? "Sending..." : "Resend Code"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
