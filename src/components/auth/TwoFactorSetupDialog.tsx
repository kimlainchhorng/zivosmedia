/**
 * Two-Factor Authentication Setup Dialog
 * Uses Supabase Auth's built-in MFA (TOTP) — no custom secret storage needed.
 * Flow: enroll → show QR → user scans in Authenticator app → verify 6-digit code → done.
 */
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";
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
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

export default function TwoFactorSetupDialog({ open, onOpenChange, onEnrolled }: Props) {
  const [step, setStep] = useState<"loading" | "scan" | "verify">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state on close
      setStep("loading");
      setFactorId(null);
      setQrSvg("");
      setSecret("");
      setCode("");
      return;
    }
    enroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function enroll() {
    try {
      // Clean up any half-finished factors first
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.totp ?? []) {
        if ((f.status as string) !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `ZIVO ${new Date().toLocaleDateString()}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("scan");
    } catch (e: any) {
      toast.error(e.message || "Could not start 2FA setup");
      onOpenChange(false);
    }
  }

  async function verify() {
    if (!factorId || code.length !== 6) {
      toast.error("Enter the 6-digit code from your app");
      return;
    }
    setVerifying(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code,
      });
      if (error) throw error;
      toast.success("Two-factor authentication enabled");
      onEnrolled();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Invalid code, try again");
    } finally {
      setVerifying(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Set up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with Google Authenticator, Authy, or 1Password, then enter the 6-digit code.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {(step === "scan" || step === "verify") && (
          <div className="space-y-4">
            <div className="flex justify-center bg-card rounded-xl p-3 border border-border">
              {qrSvg.startsWith("<svg") ? (
                <div
                  className="w-44 h-44"
                  // QR is a Supabase-generated SVG string
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
	                <img
	                  src={qrSvg}
	                  alt="2FA QR code"
	                  className="w-44 h-44"
	                  loading="lazy"
	                  decoding="async"
	                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Or enter this key manually</Label>
              <div className="flex gap-2">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copySecret}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totp-code">6-digit code from your app</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="one-time-code"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={verify} disabled={verifying || code.length !== 6}>
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & enable"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
