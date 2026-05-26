/**
 * Password Change Verification Dialog
 * Forces the user to verify identity via Email OTP or SMS OTP before
 * the password change is committed. Defense-in-depth against session hijack.
 */
import { useEffect, useState } from "react";
import { Loader2, Mail, Smartphone, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
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
import { useSendPhoneOTP, useVerifyPhoneOTP } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the user has successfully verified — proceed with password update */
  onVerified: () => void;
  email: string;
  phoneE164?: string;
  phoneVerified?: boolean;
}

type Method = "email" | "sms";
type Step = "choose" | "code";

const RESEND_COOLDOWN = 30;

export default function PasswordChangeVerifyDialog({
  open,
  onOpenChange,
  onVerified,
  email,
  phoneE164,
  phoneVerified,
}: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("email");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendSms = useSendPhoneOTP();
  const verifySms = useVerifyPhoneOTP();

  const smsAvailable = !!phoneE164 && !!phoneVerified;

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setMethod("email");
      setCode("");
      setCooldown(0);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (m: Method) => {
    setSending(true);
    try {
      if (m === "email") {
        const { error } = await supabase.functions.invoke("send-otp-email", {
          body: { email },
        });
        if (error) throw error;
        toast.success(`Code sent to ${email}`);
      } else {
        if (!phoneE164) {
          toast.error("No verified phone on file");
          return;
        }
        await sendSms.mutateAsync(phoneE164);
      }
      setMethod(m);
      setStep("code");
      setCode("");
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      toast.error(e?.message || "Could not send verification code");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      if (method === "email") {
        const { data, error } = await supabase.functions.invoke("verify-otp-code", {
          body: { email, code },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
      } else {
        await verifySms.mutateAsync({ phoneE164: phoneE164!, code });
      }
      toast.success("Identity verified");
      onVerified();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Invalid or expired code");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2}).*(@.*)/, "$1•••$2")
    : "your email";
  const maskedPhone = phoneE164
    ? phoneE164.replace(/^(\+\d{1,3})(.*)(\d{2})$/, "$1•••$3")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {step === "choose" ? "Verify it's you" : "Enter verification code"}
          </DialogTitle>
          <DialogDescription>
            {step === "choose"
              ? "For your security, confirm your identity before changing your password."
              : method === "email"
              ? `We sent a 6-digit code to ${maskedEmail}.`
              : `We sent a 6-digit code to ${maskedPhone}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 py-2">
            <button
              type="button"
              onClick={() => sendCode("email")}
              disabled={sending}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:bg-accent/50 active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Email</p>
                <p className="text-xs text-muted-foreground truncate">{maskedEmail}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => smsAvailable && sendCode("sms")}
              disabled={!smsAvailable || sending}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:bg-accent/50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">SMS text message</p>
                <p className="text-xs text-muted-foreground truncate">
                  {smsAvailable
                    ? maskedPhone
                    : "Add and verify a phone number to enable"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {sending && (
              <div className="flex items-center justify-center text-sm text-muted-foreground gap-2 pt-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending code…
              </div>
            )}
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="verify-code">6-digit code</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change method
              </button>
              <button
                type="button"
                onClick={() => sendCode(method)}
                disabled={cooldown > 0 || sending}
                className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                {sending
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
          {step === "code" && (
            <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify & continue"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
