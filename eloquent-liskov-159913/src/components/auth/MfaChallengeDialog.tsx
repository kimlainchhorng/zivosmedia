/**
 * MFA Challenge Dialog — shown after sign-in when the user has TOTP enrolled
 * and the session is at AAL1. Verifying the code steps the session up to AAL2.
 *
 * Mount this once near the app root. It auto-opens when AuthContext.mfaPending
 * is set and closes when the challenge is verified.
 */
import { useState, useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

export default function MfaChallengeDialog() {
  const { mfaPending, verifyMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const open = !!mfaPending?.required && !!mfaPending?.factorId && !!mfaPending?.challengeId;

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  async function handleVerify() {
    if (verifying) return;
    setVerifying(true);
    const { error } = await verifyMfa(code.trim());
    setVerifying(false);
    if (error) {
      toast.error(error.message || "Invalid code");
      setCode("");
      return;
    }
    toast.success("Verified");
  }

  async function handleCancel() {
    // Cancelling drops the partial AAL1 session — user must restart sign-in
    await signOut();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) void handleCancel(); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-factor verification
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to finish signing in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="mfa-code">Authenticator code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) void handleVerify(); }}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={verifying}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
