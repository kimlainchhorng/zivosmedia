import "./lib/randomUUID-polyfill";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/toastErrorFilter";

// Dev mode only: unregister any service worker left over from a previous
// prod build and wipe its caches, so HMR updates show up on refresh instead
// of being intercepted by a stale SW. No-op in production where the PWA SW
// is intentional.
if (import.meta.env.DEV && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then(() => "caches" in window ? caches.keys() : Promise.resolve([]))
    .then((keys) => Promise.all((keys as string[]).map((k) => caches.delete(k))))
    .catch(() => { /* best-effort cleanup */ });
}

// Surface boot-time crashes on screen instead of failing silently into a white
// webview — without this, any sync throw in App's import chain is invisible
// because global error handlers don't load until requestIdleCallback fires.
//
// Once React has mounted the root, runtime errors and unhandled rejections must
// flow through the React error boundary and the deferred error reporter — never
// through innerHTML replacement, which nukes React's DOM and triggers cascading
// `removeChild — The object can not be found here` from the reconciler.
let booted = false;
function paintBootError(err: unknown) {
  if (booted) return;
  const root = document.getElementById("root");
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}` : String(err);
  const html = `<div style="padding:16px;font:13px/1.4 -apple-system,monospace;color:#fff;background:#0D0D0F;min-height:100vh;white-space:pre-wrap;word-break:break-word;overflow:auto"><b style="color:#ff6b6b">App failed to start</b>\n\n${msg.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]!))}</div>`;
  if (root) root.innerHTML = html; else document.body.innerHTML = html;
}
const onBootError = (e: ErrorEvent) => paintBootError(e.error ?? e.message);
const onBootRejection = (e: PromiseRejectionEvent) => paintBootError(e.reason);
window.addEventListener("error", onBootError);
window.addEventListener("unhandledrejection", onBootRejection);

try {
  createRoot(document.getElementById("root")!).render(<App />);
  booted = true;
  window.removeEventListener("error", onBootError);
  window.removeEventListener("unhandledrejection", onBootRejection);

  // Hide the native iOS/Android splash screen after React mounts.
  // capacitor.config.ts uses launchAutoHide:false so the splash stays up
  // until this fires — closing the white-blank-gap that appeared on cold
  // start when the splash auto-hid before the JS bundle was parsed.
  //
  // IMPORTANT: do not schedule via requestAnimationFrame here.
  // On iOS Capacitor, rAF is paused while the native splash occludes the
  // WebView, so a rAF-scheduled hide() never fires and the splash gets
  // stuck on screen. setTimeout runs on the JS event loop regardless of
  // WebView visibility, so it always fires.
  setTimeout(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) =>
          SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}),
        )
        .catch(() => {});
    });
  }, 50);
} catch (err) {
  paintBootError(err);
}

// Notify Capgo OTA updater that this version loaded successfully.
// Must be called after render; if omitted Capgo rolls back to the previous bundle.
import("@capacitor/core").then(({ Capacitor }) => {
  if (!Capacitor.isNativePlatform()) return;
  import("@capgo/capacitor-updater").then(({ CapacitorUpdater }) => {
    CapacitorUpdater.notifyAppReady();
  });
});

// Defer non-critical setup to after first paint
const idle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
idle(() => {
  import("@/lib/security/errorReporting").then(m => m.setupGlobalErrorHandlers());
  import("@/lib/perf/webVitals").then(m => m.startWebVitals());
  
  import("@capacitor/core").then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) return;
    const isNativeIOS = Capacitor.getPlatform() === "ios";
    if (!isNativeIOS) return;
    
    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      const getStyle = () => {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.classList.contains("dark");
        // Use Light icons over the cover photo (dark scrim) regardless of theme
        // so the clock/battery stay legible like Facebook on iOS.
        return Style.Light;
      };
      // Edge-to-edge: webview crosses behind the status bar so cover photos /
      // gradients reach the very top of the screen. Interactive controls use
      // var(--zivo-safe-top,0px) to stay clear of the notch / Dynamic Island.
      void StatusBar.setOverlaysWebView({ overlay: true });
      void StatusBar.setStyle({ style: getStyle() });
      
      const update = () => void StatusBar.setStyle({ style: getStyle() });
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", update);
      new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });

    // Hide the iOS keyboard accessory bar ("Done / < / >") that sits above
    // the keyboard. Looks dated above message inputs / search / forms — the
    // composer's own Send button covers that affordance. Also wire body
    // class toggles on keyboard show/hide so the app can pad sticky bars
    // without polling for the keyboard height.
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => { /* older iOS versions */ });
      Keyboard.addListener("keyboardWillShow", (info) => {
        document.documentElement.classList.add("kb-open");
        document.documentElement.style.setProperty("--zivo-kb-height", `${info.keyboardHeight}px`);
      });
      Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.classList.remove("kb-open");
        document.documentElement.style.setProperty("--zivo-kb-height", "0px");
      });
    }).catch(() => { /* plugin not in this binary yet */ });

  });
});
