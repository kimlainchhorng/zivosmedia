/**
 * lazyWithRetry — React.lazy with automatic retry for transient chunk-load
 * failures. After exhausted retries, triggers a one-time hard reload to pull
 * the latest chunk hashes from a new deploy.
 *
 * Uses a SHARED reload key with lazyRetry + ErrorBoundary so we never reload
 * twice in a row for the same broken deploy.
 */
import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "zivo_chunk_reload";

function isChunkError(err: unknown): boolean {
  const msg = (err as Error)?.message || String(err);
  return (
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("error loading dynamically imported module")
  );
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delayMs = 400,
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        const mod = await factory();
        try { sessionStorage.removeItem(RELOAD_KEY); } catch {}
        return mod;
      } catch (err) {
        lastErr = err;
        if (!isChunkError(err)) throw err;
        if (i < retries) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        }
      }
    }
    try {
      if (typeof window !== "undefined") {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
        // Allow another auto-reload attempt after 30s (handles fresh deploys
        // that arrive after the first reload also missed the chunk).
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          return new Promise(() => {}) as never;
        }
      }
    } catch {}
    throw lastErr;
  });
}
