import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PasscodeKeypad from "@/components/chat/settings/PasscodeKeypad";
import { usePasscode } from "@/hooks/usePasscode";
import { toast } from "sonner";

const LOCK_OPTIONS = [
  { value: 1, label: "After 1 minute" },
  { value: 5, label: "After 5 minutes" },
  { value: 15, label: "After 15 minutes" },
  { value: 60, label: "After 1 hour" },
  { value: 240, label: "After 4 hours" },
  { value: 0, label: "Immediately" },
];

export default function PasscodeSetupPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { row, isEnabled, setPasscode, updateOptions, disable, loading } = usePasscode();

  const [step, setStep] = useState<"enter" | "confirm" | "done">("enter");
  const [first, setFirst] = useState("");
  const [reset, setReset] = useState(0);
  const [disablePin, setDisablePin] = useState("");

  const onFirst = (pin: string) => { setFirst(pin); setStep("confirm"); setReset((r) => r + 1); };
  const onConfirm = async (pin: string) => {
    if (pin !== first) {
      toast.error("PINs don't match — try again");
      setStep("enter"); setFirst(""); setReset((r) => r + 1);
      return;
    }
    try {
      await setPasscode(pin, 5, false);
      toast.success("Passcode set");
      setFirst(""); setStep("done");
    } catch (e) { toast.error((e as Error).message); }
  };

  const onDisable = async () => {
    try {
      await disable(disablePin);
      toast.success("Passcode removed");
      setDisablePin("");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">App passcode</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !isEnabled ? (
          <>
            <div className="flex flex-col items-center text-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Lock the app with a 4-digit PIN. You'll need to enter it when reopening the app.
              </p>
            </div>
            {step === "enter" && (
              <PasscodeKeypad title="Set a 4-digit PIN" onComplete={onFirst} resetSignal={reset} />
            )}
            {step === "confirm" && (
              <PasscodeKeypad title="Re-enter PIN" subtitle="Confirm your new passcode" onComplete={onConfirm} resetSignal={reset} />
            )}
            {step === "done" && (
              <div className="text-center text-sm text-muted-foreground">Passcode set ✓</div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium">Auto-lock</div>
                <div className="text-xs text-muted-foreground">Lock the app after inactivity</div>
              </div>
              <Select
                value={String(row?.auto_lock_minutes ?? 5)}
                onValueChange={(v) => void updateOptions({ auto_lock_minutes: Number(v) })}
              >
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCK_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium">Unlock with biometrics</div>
                <div className="text-xs text-muted-foreground">Face ID / Touch ID when available</div>
              </div>
              <Switch
                checked={!!row?.biometric_enabled}
                onCheckedChange={(v) => void updateOptions({ biometric_enabled: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dis">Enter current PIN to remove</Label>
              <input
                id="dis"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={disablePin}
                onChange={(e) => setDisablePin(e.target.value.replace(/\D/g, ""))}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-base"
                placeholder="••••"
              />
            </div>
            <Button variant="destructive" onClick={onDisable} disabled={disablePin.length < 4} className="w-full">
              Remove passcode
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
