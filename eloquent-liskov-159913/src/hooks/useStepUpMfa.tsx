/**
 * useStepUpMfa — request a fresh MFA challenge before a sensitive action.
 *
 * Usage:
 *   const { ensureAal2, dialog } = useStepUpMfa();
 *
 *   async function withdrawFunds() {
 *     const ok = await ensureAal2("Confirm withdrawal");
 *     if (!ok) return;
 *     await supabase.functions.invoke("process-withdrawal", { body: { ... } });
 *   }
 *
 *   return <>{dialog}<Button onClick={withdrawFunds}>Withdraw</Button></>;
 *
 * Behaviour:
 *  - If the session is already AAL2, resolves true immediately
 *  - Else if user has TOTP enrolled, opens dialog and resolves on verify
 *  - Else (no factor enrolled) returns false — caller should redirect to
 *    /account/security to enroll, or fall back to email OTP
 */
import { useCallback, useRef, useState } from "react";
import { isAal2, startStepUpChallenge, verifyMfaChallenge, type MfaState } from "@/lib/security/mfa";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PendingResolver {
  resolve: (ok: boolean) => void;
}

export function useStepUpMfa() {
  const [open, setOpen]               = useState(false);
  const [title, setTitle]             = useState("Confirm with 2FA");
  const [challenge, setChallenge]     = useState<MfaState | null>(null);
  const [code, setCode]               = useState("");
  const [verifying, setVerifying]     = useState(false);
  const pendingRef                    = useRef<PendingResolver | null>(null);

  const resolveAndClose = useCallback((ok: boolean) => {
    if (pendingRef.current) {
      pendingRef.current.resolve(ok);
      pendingRef.current = null;
    }
    setOpen(false);
    setCode("");
    setChallenge(null);
  }, []);

  const ensureAal2 = useCallback(async (label = "Confirm with 2FA"): Promise<boolean> => {
    // Already at AAL2 — no challenge needed
    if (await isAal2()) return true;

    const c = await startStepUpChallenge();
    if (!c) {
      toast.error("Two-factor authentication is not enabled. Enable it in Account Security.");
      return false;
    }

    setTitle(label);
    setChallenge(c);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      pendingRef.current = { resolve };
    });
  }, []);

  const handleVerify = useCallback(async () => {
    if (!challenge?.factorId || !challenge?.challengeId || verifying) return;
    setVerifying(true);
    const err = await verifyMfaChallenge(challenge.factorId, challenge.challengeId, code.trim());
    setVerifying(false);
    if (err) {
      toast.error(err.message || "Invalid code");
      setCode("");
      return;
    }
    toast.success("Verified");
    resolveAndClose(true);
  }, [challenge, code, verifying, resolveAndClose]);

  const dialog = (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resolveAndClose(false); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to authorize this action.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="step-up-code">Authenticator code</Label>
          <Input
            id="step-up-code"
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
          <Button variant="outline" onClick={() => resolveAndClose(false)} disabled={verifying}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ensureAal2, dialog };
}
