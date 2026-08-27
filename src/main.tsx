import "./lib/randomUUID-polyfill";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/zivo-travel-3d.css";
import "./lib/toastErrorFilter";
import { setupGlobalErrorHandlers } from "@/lib/security/errorReporting";
import { installMarketingRuntimeConfig } from "@/config/marketingRuntimeConfig";
import { isZivoInstalledShell } from "@/lib/zivoHeaderSafeArea";

// Ordinary mobile browsers should keep each header's compact web rhythm. The
// conservative 64px fallback remains reserved for installed/native shells,
// where a broken safe-area inset could otherwise place controls under a notch.
document.documentElement.classList.toggle(
  "zivo-browser-shell",
  !isZivoInstalledShell(),
);

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
// through destructive root replacement, which nukes React's DOM and triggers cascading
// `removeChild — The object can not be found here` from the reconciler.
let booted = false;
const NATIVE_BOOT_SHELL_HANDOFF_MS = 350;
const bootShell = document.querySelector<HTMLElement>("[data-zivo-boot-shell]");
let bootShellObserver: MutationObserver | null = null;

function removeBootShell(immediately = false) {
  if (!bootShell?.isConnected) return;
  bootShellObserver?.disconnect();
  bootShellObserver = null;

  if (immediately) {
    bootShell.remove();
    return;
  }

  bootShell.setAttribute("data-zivo-boot-shell-hidden", "");
  window.setTimeout(() => bootShell.remove(), 180);
}

function notifyNativeAppReady() {
  import("@capacitor/core").then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capgo/capacitor-updater").then(({ CapacitorUpdater }) => {
      CapacitorUpdater.notifyAppReady();
    });
  });
}

function finishBoot() {
  if (booted) return;
  booted = true;
  if (isZivoInstalledShell()) {
    // HTML parsing, React's first commit, and splash auto-hide can all finish
    // inside one WebView frame. Keep the branded shell for a short handoff so
    // native users never see the unpainted white frame between them.
    window.setTimeout(removeBootShell, NATIVE_BOOT_SHELL_HANDOFF_MS);
  } else {
    removeBootShell();
  }
  window.removeEventListener("error", onBootError);
  window.removeEventListener("unhandledrejection", onBootRejection);
  notifyNativeAppReady();
}

function removeBootShellAfterFirstAppPaint(root: HTMLElement) {
  if (root.childElementCount > 0) {
    finishBoot();
    return;
  }

  bootShellObserver = new MutationObserver(() => {
    if (root.childElementCount === 0) return;
    bootShellObserver?.disconnect();
    bootShellObserver = null;
    // Mutation callbacks run after React's DOM commit. Fading the sibling
    // shell now reveals a real app element on the very next paint, never a
    // cleared root or an iOS-paused animation-frame callback.
    finishBoot();
  });
  bootShellObserver.observe(root, { childList: true });
}

function paintBootError(err: unknown) {
  if (booted) return;
  booted = true;
  bootShellObserver?.disconnect();
  bootShellObserver = null;
  window.removeEventListener("error", onBootError);
  window.removeEventListener("unhandledrejection", onBootRejection);
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}` : String(err);
  const panel = document.createElement("div");
  panel.setAttribute("role", "alert");
  panel.setAttribute("aria-live", "assertive");
  panel.style.cssText = "position:fixed;inset:0;z-index:2147483647;padding:16px;font:13px/1.4 -apple-system,monospace;color:#fff;background:#0D0D0F;min-height:100vh;white-space:pre-wrap;word-break:break-word;overflow:auto";

  const title = document.createElement("strong");
  title.style.color = "#ff6b6b";
  title.textContent = "App failed to start";

  const details = document.createElement("div");
  details.textContent = `\n\n${msg}`;

  panel.append(title, details);
  if (bootShell?.isConnected) {
    bootShell.replaceWith(panel);
  } else {
    document.body.append(panel);
  }
}
const onBootError = (e: ErrorEvent) => paintBootError(e.error ?? e.message);
const onBootRejection = (e: PromiseRejectionEvent) => paintBootError(e.reason);
window.addEventListener("error", onBootError);
window.addEventListener("unhandledrejection", onBootRejection);
installMarketingRuntimeConfig();

const LEGACY_CANONICAL_HOSTS = new Set([
  "zivollc.com",
  "www.zivollc.com",
]);

if (
  typeof window !== "undefined" &&
  LEGACY_CANONICAL_HOSTS.has(window.location.hostname.toLowerCase())
) {
  window.location.replace(
    `https://zivosmedia.com${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

try {
  const root = document.getElementById("root")!;
  removeBootShellAfterFirstAppPaint(root);
  createRoot(root, { onUncaughtError: paintBootError }).render(<App />);
} catch (err) {
  paintBootError(err);
} finally {
  // Hide the native splash whether or not React mounted.
  //
  // This used to sit inside the try, after render(). A synchronous throw from
  // createRoot().render() therefore jumped straight to catch and never
  // scheduled the hide, so paintBootError painted its diagnostic panel
  // UNDERNEATH a native splash that (with the old launchAutoHide:false) never
  // came down. The user — and Google's reviewer on 2026-07-29 — saw the ZIVO
  // logo on a blank screen and nothing else, which is how this app got pulled
  // under the Broken Functionality policy.
  //
  // Showing a failure is a far better outcome than showing a frozen logo: the
  // error panel is diagnosable and the app visibly "opens". So the hide runs in
  // finally, on every path.
  //
  // IMPORTANT: do not schedule via requestAnimationFrame here. On iOS
  // Capacitor, rAF is paused while the native splash occludes the WebView, so
  // a rAF-scheduled hide() never fires and the splash gets stuck on screen.
  // setTimeout runs on the JS event loop regardless of WebView visibility, so
  // it always fires.
  setTimeout(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) =>
          SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {}),
        )
        .catch(() => {});
    }).catch(() => {});
  }, 50);
}

// Defer non-critical setup to after first paint
const idle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
idle(() => {
  setupGlobalErrorHandlers();
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
