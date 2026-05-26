/**
 * useHaptics - Native haptic feedback for iOS/Android via Capacitor
 * Falls back to no-op on web/PWA
 */
import { useCallback } from 'react';

let Haptics: any = null;
let ImpactStyle: any = null;
let NotificationType: any = null;

// Lazy load Capacitor Haptics only on native
const loadHaptics = async () => {
  if (Haptics) return;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
  } catch {
    // Not available (web/PWA)
  }
};

// Pre-load on module init
loadHaptics();

export function useHaptics() {
  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!Haptics) return;
    try {
      const styleMap = {
        light: ImpactStyle?.Light,
        medium: ImpactStyle?.Medium,
        heavy: ImpactStyle?.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] || ImpactStyle?.Light });
    } catch {}
  }, []);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!Haptics) return;
    try {
      const typeMap = {
        success: NotificationType?.Success,
        warning: NotificationType?.Warning,
        error: NotificationType?.Error,
      };
      await Haptics.notification({ type: typeMap[type] || NotificationType?.Success });
    } catch {}
  }, []);

  const selectionChanged = useCallback(async () => {
    if (!Haptics) return;
    try {
      await Haptics.selectionChanged();
    } catch {}
  }, []);

  const selectionStart = useCallback(async () => {
    if (!Haptics) return;
    try {
      await Haptics.selectionStart();
    } catch {}
  }, []);

  const selectionEnd = useCallback(async () => {
    if (!Haptics) return;
    try {
      await Haptics.selectionEnd();
    } catch {}
  }, []);

  return { impact, notification, selectionChanged, selectionStart, selectionEnd };
}
