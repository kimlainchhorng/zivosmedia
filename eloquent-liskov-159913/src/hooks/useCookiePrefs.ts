import { useCallback, useEffect, useState } from "react";

export interface CookiePrefs {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  updatedAt: string;
}

type WindowWithAnalyticsLoader = Window & {
  __zivoLoadAnalytics?: () => void;
};

const STORAGE_KEY = "zivo_cookie_consent";

const defaults: CookiePrefs = {
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
  personalization: false,
  updatedAt: "",
};

function load(): CookiePrefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<CookiePrefs>), necessary: true };
  } catch {
    return defaults;
  }
}

export function useCookiePrefs() {
  const [prefs, setPrefs] = useState<CookiePrefs>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(<K extends Exclude<keyof CookiePrefs, "necessary" | "updatedAt">>(
    key: K,
    value: CookiePrefs[K]
  ) => {
    setPrefs((prev) => {
      const next: CookiePrefs = { ...prev, [key]: value, updatedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (next.analytics) {
          (window as WindowWithAnalyticsLoader).__zivoLoadAnalytics?.();
        }
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const acceptAll = useCallback(() => {
    setPrefs((prev) => {
      const next: CookiePrefs = {
        ...prev,
        functional: true,
        analytics: true,
        marketing: true,
        personalization: true,
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        (window as WindowWithAnalyticsLoader).__zivoLoadAnalytics?.();
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const rejectAll = useCallback(() => {
    setPrefs((prev) => {
      const next: CookiePrefs = {
        ...prev,
        functional: false,
        analytics: false,
        marketing: false,
        personalization: false,
        updatedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  return { prefs, update, acceptAll, rejectAll };
}
