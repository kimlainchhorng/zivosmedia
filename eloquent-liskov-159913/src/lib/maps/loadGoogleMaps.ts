/**
 * Unified Google Maps JS SDK loader.
 *
 * One promise-cached loader for the entire app. All callers receive the same
 * script (always requesting `marker,places` libraries with `loading=async`)
 * so the browser caches a single SDK fetch site-wide instead of refetching
 * ~400 KB whenever a different component uses a slightly different URL.
 *
 * Handles `gm_authFailure` by resetting state after 10s and emitting
 * `gmaps-auth-failure` / `gmaps-auth-retry` window events (preserves the
 * behavior previously implemented inside RideMap).
 */

type GoogleWindow = Window & {
  google?: { maps?: { places?: unknown; marker?: unknown } };
  gm_authFailure?: () => void;
};

const LIBRARIES = "marker,places";

let promise: Promise<void> | null = null;
let loaded = false;
let authFailed = false;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;

function installAuthHandler() {
  const w = window as GoogleWindow;
  if (w.gm_authFailure) return;
  w.gm_authFailure = () => {
    authFailed = true;
    console.error(
      "[GoogleMaps] Auth failure. Check API key restrictions, Maps JS API enablement, and billing.",
    );
    window.dispatchEvent(new CustomEvent("gmaps-auth-failure"));
    if (!authRetryTimer) {
      authRetryTimer = setTimeout(() => {
        authFailed = false;
        promise = null;
        loaded = false;
        authRetryTimer = null;
        window.dispatchEvent(new CustomEvent("gmaps-auth-retry"));
      }, 10_000);
    }
  };
}

export function isGoogleMapsLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as GoogleWindow).google?.maps;
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (authFailed) return Promise.reject(new Error("Google Maps auth failed"));
  if (loaded && isGoogleMapsLoaded()) return Promise.resolve();
  if (promise) return promise;
  if (!apiKey) return Promise.reject(new Error("no maps key"));

  installAuthHandler();

  promise = new Promise<void>((resolve, reject) => {
    // Adopt any pre-existing script tag (different param order is fine —
    // first script wins, subsequent loaders piggy-back).
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        loaded = true;
        resolve();
      });
      existing.addEventListener("error", () => {
        promise = null;
        reject(new Error("Google Maps script failed"));
      });
      // Already loaded synchronously?
      if (isGoogleMapsLoaded()) {
        loaded = true;
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${LIBRARIES}&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.zivoMaps = "1";
    script.onload = () => {
      // Small delay so gm_authFailure (if it fires) wins the race.
      setTimeout(() => {
        if (authFailed) {
          reject(new Error("Google Maps auth failed"));
        } else {
          loaded = true;
          resolve();
        }
      }, 250);
    };
    script.onerror = () => {
      promise = null;
      reject(new Error("Google Maps script failed"));
    };
    document.head.appendChild(script);
  });

  return promise;
}
