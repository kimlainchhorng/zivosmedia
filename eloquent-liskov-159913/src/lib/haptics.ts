/**
 * Haptics — tiny wrapper that uses Capacitor Haptics on native and the
 * Web Vibration API as a graceful fallback in the browser/PWA.
 *
 * Call `tap()` on every interactive press, `success()` on send, `warn()`
 * on validation errors. Silent fallback when neither API is available.
 */
import { Capacitor } from "@capacitor/core";

type Style = "light" | "medium" | "heavy";

let nativeHaptics: { impact: (opts: { style: string }) => Promise<void>; notification: (opts: { type: string }) => Promise<void> } | null | undefined;

const getNative = async () => {
  if (nativeHaptics !== undefined) return nativeHaptics;
  if (!Capacitor.isNativePlatform()) { nativeHaptics = null; return null; }
  try {
    const mod = await import("@capacitor/haptics");
    nativeHaptics = {
      impact: (opts) => mod.Haptics.impact({ style: opts.style as never }),
      notification: (opts) => mod.Haptics.notification({ type: opts.type as never }),
    };
  } catch {
    nativeHaptics = null;
  }
  return nativeHaptics;
};

export async function tap(style: Style = "light") {
  const h = await getNative();
  if (h) { await h.impact({ style: style.charAt(0).toUpperCase() + style.slice(1) }).catch(() => {}); return; }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(style === "heavy" ? 30 : style === "medium" ? 15 : 8);
  }
}

export async function success() {
  const h = await getNative();
  if (h) { await h.notification({ type: "SUCCESS" }).catch(() => {}); return; }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}

export async function warn() {
  const h = await getNative();
  if (h) { await h.notification({ type: "WARNING" }).catch(() => {}); return; }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([20, 30, 20]);
  }
}
