/**
 * AppLockGate — overlays the app when passcode-lock is armed.
 * - Locks immediately on first mount if enabled
 * - Locks again after `auto_lock_minutes` of inactivity
 * - Locks on `visibilitychange` -> hidden, unlocks via PIN when foregrounded
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePasscode } from "@/hooks/usePasscode";
import PasscodeKeypad from "@/components/chat/settings/PasscodeKeypad";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const LAST_ACTIVE_KEY = "zivo_app_last_active";

export default function AppLockGate() {
  const { row, isEnabled, verify, loading } = usePasscode();
  const [locked, setLocked] = useState(false);
  const [reset, setReset] = useState(0);
  const wentHiddenAt = useRef<number | null>(null);

  // Initial lock when feature loads
  useEffect(() => {
    if (loading || !isEnabled) return;
    const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? 0);
    const minutes = row?.auto_lock_minutes ?? 5;
    if (!last || Date.now() - last > minutes * 60_000) setLocked(true);
  }, [loading, isEnabled, row?.auto_lock_minutes]);

  // Heartbeat activity timestamp
  useEffect(() => {
    if (!isEnabled) return;
    const tick = () => localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    tick();
    const events: (keyof DocumentEventMap)[] = ["click", "keydown", "touchstart", "scroll"];
    events.forEach((e) => document.addEventListener(e, tick, { passive: true }));
    return () => events.forEach((e) => document.removeEventListener(e, tick));
  }, [isEnabled]);

  // Background -> lock after auto_lock_minutes
  useEffect(() => {
    if (!isEnabled) return;
    const onVis = () => {
      const minutes = row?.auto_lock_minutes ?? 5;
      if (document.hidden) {
        wentHiddenAt.current = Date.now();
      } else if (wentHiddenAt.current) {
        const elapsed = Date.now() - wentHiddenAt.current;
        if (elapsed > minutes * 60_000) setLocked(true);
        wentHiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isEnabled, row?.auto_lock_minutes]);

  const onComplete = useCallback(async (pin: string) => {
    const ok = await verify(pin);
    if (ok) {
      setLocked(false);
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    } else {
      toast.error("Wrong PIN");
      setReset((r) => r + 1);
    }
  }, [verify]);

  if (!isEnabled || !locked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-6 pt-[var(--zivo-safe-top-sticky)] pb-[var(--zivo-safe-bottom,0px)]">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <PasscodeKeypad
        length={4}
        title="Enter passcode"
        subtitle="Locked for your privacy"
        onComplete={onComplete}
        resetSignal={reset}
      />
    </div>
  );
}
