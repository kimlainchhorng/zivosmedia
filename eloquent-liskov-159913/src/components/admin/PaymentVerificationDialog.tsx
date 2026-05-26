import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

interface PaymentVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onVerified: () => void;
}

export default function PaymentVerificationDialog({
  open,
  onOpenChange,
  storeId,
  onVerified,
}: PaymentVerificationDialogProps) {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep("send");
      setCode("");
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-verification", {
        body: { action: "send", store_id: storeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setMaskedEmail(data.email || "your email");
      setStep("verify");
      setCountdown(60);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-verification", {
        body: { action: "verify", store_id: storeId, code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Verified successfully!");
      onVerified();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify to Update Payment
          </DialogTitle>
        </DialogHeader>

        {step === "send" ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              For security, we need to verify your identity before changing payment details. 
              We'll send a 6-digit code to your registered email.
            </p>
            <DialogFooter>
              <Button onClick={handleSendCode} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Verification Code
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{maskedEmail}</span>
            </p>
            <div className="flex justify-center">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono max-w-[200px]"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={countdown > 0}
                className="text-xs text-muted-foreground"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify & Continue
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
