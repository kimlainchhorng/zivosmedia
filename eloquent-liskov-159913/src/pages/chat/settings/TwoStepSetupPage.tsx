import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTwoStep } from "@/hooks/useTwoStep";
import { toast } from "sonner";

export default function TwoStepSetupPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { isEnabled, row, enable, disable, loading } = useTwoStep();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [hint, setHint] = useState("");
  const [recovery, setRecovery] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [busy, setBusy] = useState(false);

  const onEnable = async () => {
    if (pw1.length < 6) return toast.error("Use at least 6 characters");
    if (pw1 !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await enable(pw1, hint || undefined, recovery || undefined);
      toast.success("Two-step verification enabled");
      setPw1(""); setPw2(""); setHint(""); setRecovery("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const onDisable = async () => {
    setBusy(true);
    try {
      await disable(currentPw);
      toast.success("Two-step verification disabled");
      setCurrentPw("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Two-step verification</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Add an extra password required for sensitive actions like changing your username, revoking other devices, or deleting your account.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !isEnabled ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw1">New password</Label>
              <Input id="pw1" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hint">Hint (optional)</Label>
              <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="A reminder for yourself" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec">Recovery email (optional)</Label>
              <Input id="rec" type="email" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button onClick={onEnable} disabled={busy} className="w-full">Enable two-step</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card border border-border p-4 text-sm">
              <div className="font-medium text-foreground">Two-step is on</div>
              {row?.hint && <div className="text-xs text-muted-foreground mt-1">Hint: {row.hint}</div>}
              {row?.recovery_email && <div className="text-xs text-muted-foreground">Recovery: {row.recovery_email}</div>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="curr">Current password</Label>
              <Input id="curr" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <Button variant="destructive" onClick={onDisable} disabled={busy || currentPw.length < 1} className="w-full">
              Disable two-step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
