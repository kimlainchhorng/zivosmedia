/**
 * useShakeToReport — listens for device-motion shake gesture and fires
 * a callback (e.g. open bug-report sheet). No-ops gracefully where the
 * DeviceMotion API is unavailable or permission was denied.
 */
import { useEffect } from "react";

interface Options {
  onShake: () => void;
  /** g-force threshold; default 18 (one firm shake). */
  threshold?: number;
  enabled?: boolean;
}

export function useShakeToReport({ onShake, threshold = 18, enabled = true }: Options) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return;

    let lastTrigger = 0;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const total = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      if (total > threshold && Date.now() - lastTrigger > 1500) {
        lastTrigger = Date.now();
        onShake();
      }
    };

    // iOS 13+ requires explicit permission; we attach lazily and silently
    // skip if not granted so we don't disrupt the app.
    type IOSMotionAPI = { requestPermission: () => Promise<"granted" | "denied"> };
    const requestable = DeviceMotionEvent as unknown as IOSMotionAPI;
    if (typeof requestable.requestPermission === "function") {
      requestable.requestPermission().then((p) => {
        if (p === "granted") window.addEventListener("devicemotion", handler);
      }).catch(() => {});
    } else {
      window.addEventListener("devicemotion", handler);
    }
    return () => window.removeEventListener("devicemotion", handler);
  }, [enabled, onShake, threshold]);
}
