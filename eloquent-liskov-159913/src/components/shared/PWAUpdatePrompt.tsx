/**
 * PWA Update Prompt
 * Shows a toast when a new app version is available.
 * Auto-applies the update after 10 seconds if the user doesn't interact.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { RefreshCw, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function PWAUpdatePrompt() {
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const { needRefresh, updateSW } = usePWAUpdate();
  const autoUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authRoutes = ['/login', '/signup', '/verify-email', '/verify-otp', '/verify-new-device', '/forgot-password', '/reset-password', '/setup'];
  const onAuthRoute = authRoutes.some((route) => location.pathname.startsWith(route));

  useEffect(() => {
    // Never auto-update — wait for user to tap "Update" so we don't reload
    // the page out from under an interaction.
    if (isNative || onAuthRoute || !needRefresh) return;
    return () => {
      if (autoUpdateTimer.current) {
        clearTimeout(autoUpdateTimer.current);
      }
    };
  }, [needRefresh, updateSW, isNative, onAuthRoute]);

  if (!needRefresh || isNative || onAuthRoute) return null;

  const handleUpdate = () => {
    if (autoUpdateTimer.current) clearTimeout(autoUpdateTimer.current);
    updateSW(true);
  };

  const handleDismiss = () => {
    if (autoUpdateTimer.current) clearTimeout(autoUpdateTimer.current);
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-200"
      style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 5rem)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/95 border border-border/50 shadow-2xl backdrop-blur-xl max-w-sm">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">New version available</p>
          <p className="text-xs text-muted-foreground">Tap update to refresh</p>
        </div>
        <button type="button"
          onClick={handleUpdate}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 flex-shrink-0 active:scale-[0.95] touch-manipulation"
        >
          Update
        </button>
        <button type="button"
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
