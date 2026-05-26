/**
 * useHaptic — tiny tactile-feedback helper.
 *
 * Calls Capacitor's Haptics plugin when running natively, falls back to
 * navigator.vibrate() in the browser, and silently no-ops otherwise. Safe to
 * call on every tap — the underlying APIs are sync and cheap.
 *
 * Usage:
 *   const haptic = useHaptic();
 *   <button onClick={() => { haptic("light"); ... }} />
 */
import { useCallback, useRef } from "react";

export type HapticStrength = "light" | "medium" | "heavy" | "selection";

interface CapacitorHaptics {
  impact?: (opts: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
  selectionStart?: () => Promise<void>;
}

declare global {
  interface Window {
    Capacitor?: { Plugins?: { Haptics?: CapacitorHaptics } };
  }
}

const VIBRATION_MS: Record<HapticStrength, number> = {
  light:     8,
  medium:    16,
  heavy:     30,
  selection: 4,
};

const STYLE_MAP: Record<Exclude<HapticStrength, "selection">, "LIGHT" | "MEDIUM" | "HEAVY"> = {
  light:  "LIGHT",
  medium: "MEDIUM",
  heavy:  "HEAVY",
};

export function useHaptic() {
  const lastFiredAt = useRef(0);

  return useCallback((strength: HapticStrength = "light") => {
    // Throttle to once per 60ms — multiple onClick handlers + onPointerDown
    // can fire in rapid succession, and stacked vibrations feel awkward.
    const now = Date.now();
    if (now - lastFiredAt.current < 60) return;
    lastFiredAt.current = now;

    try {
      const haptics = (typeof window !== "undefined" ? window.Capacitor?.Plugins?.Haptics : undefined);
      if (haptics) {
        if (strength === "selection" && haptics.selectionStart) {
          void haptics.selectionStart();
          return;
        }
        if (haptics.impact && strength !== "selection") {
          void haptics.impact({ style: STYLE_MAP[strength] });
          return;
        }
      }

      // Web fallback
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(VIBRATION_MS[strength]);
      }
    } catch {
      // Haptic feedback is best-effort — never throw from a tap handler.
    }
  }, []);
}
