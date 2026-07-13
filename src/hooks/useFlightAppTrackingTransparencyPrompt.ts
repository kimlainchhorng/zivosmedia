import { useEffect } from "react";

const REQUESTED_FLAG = "zivo:att:requested";

export function useFlightAppTrackingTransparencyPrompt(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      void import("@capacitor/core")
        .then(({ Capacitor }) => {
          if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;
          if (localStorage.getItem(REQUESTED_FLAG) === "1") return;

          return import("capacitor-plugin-app-tracking-transparency").then(
            async ({ AppTrackingTransparency }) => {
              if (cancelled) return;

              try {
                const { status } = await AppTrackingTransparency.getStatus();
                if (cancelled) return;

                if (status !== "notDetermined") {
                  localStorage.setItem(REQUESTED_FLAG, "1");
                  return;
                }

                const result = await AppTrackingTransparency.requestPermission();
                if (cancelled) return;

                localStorage.setItem(REQUESTED_FLAG, "1");
                (window as any).__zivoAttStatus = result.status;
              } catch {
                /* Plugin missing in this binary or unavailable on this OS. */
              }
            },
          );
        })
        .catch(() => {});
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled]);
}
