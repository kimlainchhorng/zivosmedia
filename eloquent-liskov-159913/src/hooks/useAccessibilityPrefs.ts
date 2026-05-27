import { useCallback, useEffect, useState } from "react";

export type FontScale = "sm" | "md" | "lg" | "xl";

export interface AccessibilityPrefs {
  reducedMotion: boolean;
  highContrast: boolean;
  fontScale: FontScale;
  underlineLinks: boolean;
}

const STORAGE_KEY = "zivo_accessibility_prefs";

const defaults: AccessibilityPrefs = {
  reducedMotion: false,
  highContrast: false,
  fontScale: "md",
  underlineLinks: false,
};

const SCALE_MAP: Record<FontScale, string> = {
  sm: "0.92",
  md: "1",
  lg: "1.1",
  xl: "1.2",
};

function load(): AccessibilityPrefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<AccessibilityPrefs>) };
  } catch {
    return defaults;
  }
}

function applyToDocument(prefs: AccessibilityPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--font-scale", SCALE_MAP[prefs.fontScale]);
  root.classList.toggle("reduce-motion", prefs.reducedMotion);
  root.classList.toggle("high-contrast", prefs.highContrast);
  root.classList.toggle("underline-links", prefs.underlineLinks);
}

export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(load);

  useEffect(() => {
    applyToDocument(prefs);
  }, [prefs]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(<K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  return { prefs, update };
}
