/**
 * Wraps a dynamic import with retry + cache-bust logic so stale chunks
 * (common after deploys) recover automatically instead of crashing.
 *
 * Shares the RELOAD key with lazyWithRetry + ErrorBoundary to avoid reload loops.
 */
const RELOAD_KEY = "zivo_chunk_reload";

export function lazyRetry<T extends { default: unknown }>(
  importFn: () => Promise<T>,
  retries = 2,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number) => {
      importFn()
        .then((mod) => {
          try { sessionStorage.removeItem(RELOAD_KEY); } catch {}
          resolve(mod);
        })
        .catch((error: unknown) => {
          if (remaining > 0) {
            setTimeout(() => attempt(remaining - 1), 500);
          } else {
            try {
              if (!sessionStorage.getItem(RELOAD_KEY)) {
                sessionStorage.setItem(RELOAD_KEY, "1");
                window.location.reload();
                return;
              }
            } catch {}
            reject(error);
          }
        });
    };
    attempt(retries);
  });
}
