/**
 * PWA Update Detection Hook
 * Registers the service worker via vite-plugin-pwa and detects updates.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: (reloadPage?: boolean) => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let updateInterval: number | null = null;
    let visibilityHandler: (() => void) | null = null;

    const registerAppSW = async () => {
      try {
        // Dynamic import to avoid SSR issues and handle environments where the virtual module doesn't exist
        const { registerSW } = await import('virtual:pwa-register');

        const updateFn = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (!cancelled) {
              console.debug('[PWA] New content available, update ready');
              setNeedRefresh(true);
            }
          },
          onOfflineReady() {
            console.debug('[PWA] App ready to work offline');
          },
          onRegisteredSW(swUrl, registration) {
            console.debug('[PWA] Service worker registered:', swUrl);

            if (!registration) return;

            const checkForUpdate = async () => {
              try {
                await registration.update();
              } catch (error) {
                console.debug('[PWA] Service worker update check skipped:', error);
              }
            };

            if (registration.waiting) {
              console.debug('[PWA] Waiting service worker found, update ready');
              setNeedRefresh(true);
              return;
            }

            void checkForUpdate();

            updateInterval = window.setInterval(() => {
              void checkForUpdate();
            }, 60 * 1000);

            visibilityHandler = () => {
              if (document.visibilityState === 'visible') {
                void checkForUpdate();
              }
            };

            document.addEventListener('visibilitychange', visibilityHandler);
          },
          onRegisterError(error) {
            console.error('[PWA] Service worker registration error:', error);
          },
        });

        updateSWRef.current = updateFn;
      } catch (e) {
        // In dev mode or if PWA plugin isn't active, this is expected
        console.debug('[PWA] Service worker registration skipped:', e);
      }
    };

    void registerAppSW();

    return () => {
      cancelled = true;

      if (updateInterval) {
        window.clearInterval(updateInterval);
      }

      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, []);

  const updateSW = useCallback((reloadPage = true) => {
    if (updateSWRef.current) {
      // Apply the SW update without letting vite-plugin-pwa reload —
      // a normal window.location.reload() keeps Capacitor inside its WebView,
      // whereas the plugin's built-in reload can open Safari.
      updateSWRef.current(false)
        .then(() => {
          if (reloadPage) {
            window.location.reload();
          }
        })
        .catch((error) => {
          console.error('[PWA] Failed to apply service worker update:', error);
          if (reloadPage) {
            window.location.reload();
          }
        });
      return;
    }

    if (reloadPage) {
      window.location.reload();
    }
  }, []);

  return { needRefresh, updateSW };
}
