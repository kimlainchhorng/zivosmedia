import { useCallback, useEffect, useState } from "react";

export interface TranslationPrefs {
  autoTranslateMessages: boolean;
  autoTranslatePosts: boolean;
  showOriginalToggle: boolean;
  targetLanguage: string;
}

const STORAGE_KEY = "zivo_translation_prefs";

const defaults: TranslationPrefs = {
  autoTranslateMessages: false,
  autoTranslatePosts: false,
  showOriginalToggle: true,
  targetLanguage: "auto",
};

function load(): TranslationPrefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<TranslationPrefs>) };
  } catch {
    return defaults;
  }
}

export function useTranslationPrefs() {
  const [prefs, setPrefs] = useState<TranslationPrefs>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(<K extends keyof TranslationPrefs>(key: K, value: TranslationPrefs[K]) => {
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
