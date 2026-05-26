import { useEffect, useRef } from "react";
import { toast } from "sonner";

function errorToMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "unknown");
  }
}

export default function RuntimeSecurityGuard() {
  const lastNoticeAtRef = useRef(0);
  const reloadedChunkRef = useRef(false);

  useEffect(() => {
    const canNotify = () => {
      const now = Date.now();
      if (now - lastNoticeAtRef.current < 5000) return false;
      lastNoticeAtRef.current = now;
      return true;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = errorToMessage(event.reason).toLowerCase();

      if (msg.includes("loading chunk") || msg.includes("failed to fetch dynamically imported module")) {
        if (!reloadedChunkRef.current) {
          reloadedChunkRef.current = true;
          toast.warning("A module failed to load. Refreshing app...");
          window.location.reload();
        }
        return;
      }

      // Suppress noisy transient rejections (network blips, AbortError from
      // unmounted queries, third-party SDK quirks). Log to console for devs,
      // but don't surface a generic toast that the user can't act on.
      const transient =
        msg.includes("aborterror") ||
        msg.includes("abort") ||
        msg.includes("networkerror") ||
        msg.includes("failed to fetch") ||
        msg.includes("load failed") ||
        msg.includes("the operation was aborted") ||
        // Google Maps SDK auth/billing errors — not actionable for the user,
        // and the StoreMap page already shows its own "Map unavailable" state.
        msg.includes("google maps") ||
        msg.includes("maps api") ||
        msg.includes("apinotactivatedmaperror") ||
        msg.includes("billingnotenabled") ||
        msg.includes("invalidkeymaperror") ||
        msg.includes("referernotallowedmaperror");
      // Keep unexpected background promise failures visible to developers
      // without showing a generic, non-actionable toast on normal page loads.
      if (!transient) canNotify();
      console.error("[RuntimeSecurityGuard] Unhandled rejection:", event.reason);
    };

    const onWindowError = (event: ErrorEvent) => {
      const msg = (event.message || "").toLowerCase();

      if (msg.includes("resizeobserver loop limit exceeded")) {
        return;
      }

      if (canNotify()) {
        toast.error("A runtime issue occurred. The app prevented a hard crash.");
      }
      console.error("[RuntimeSecurityGuard] Window error:", event.error || event.message);
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  return null;
}
