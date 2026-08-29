/** i18n with persistent language state — translations lazy-loaded */
import { useCallback, useSyncExternalStore } from "react";

/* ── Shared reactive store so all components see the same language ── */
let _lang = localStorage.getItem("zivo_lang") || "en";
const _listeners = new Set<() => void>();

function setGlobalLang(code: string) {
  _lang = code;
  ensureLocaleLoaded(code);
  localStorage.setItem("zivo_lang", code);
  document.documentElement.setAttribute("lang", code);
  window.dispatchEvent(new CustomEvent("zivo-lang-change", { detail: code }));
  window.dispatchEvent(new CustomEvent("zivo:lang-change", { detail: code }));
  _listeners.forEach((l) => l());
}

// Set initial lang attribute
document.documentElement.setAttribute("lang", _lang);

function subscribe(cb: () => void) {
  _listeners.add(cb);
  const handler = () => {
    _lang = localStorage.getItem("zivo_lang") || "en";
    cb();
  };
  window.addEventListener("zivo-lang-change", handler);
  return () => {
    _listeners.delete(cb);
    window.removeEventListener("zivo-lang-change", handler);
  };
}

function getSnapshot() { return _lang; }

/* ── Translations ──────────────────────────────────────────────────
 * en (the fallback every lookup ends at) and km (the primary market) are
 * bundled, so t() stays synchronous and neither audience ever sees a flash.
 * The other 35 locales were ~150 KB of the entry graph that almost nobody
 * used; they are fetched the first time someone actually selects one.
 */
import coreTranslations from "@/i18n/translations.core";

const _translations: Record<string, Record<string, string>> = { ...coreTranslations };

let _extraLoaded = false;
let _extraLoading: Promise<void> | null = null;

function ensureLocaleLoaded(code: string) {
  if (_extraLoaded || _translations[code] || typeof window === "undefined") return;
  if (!_extraLoading) {
    _extraLoading = import("@/i18n/translations.extra")
      .then((mod) => {
        Object.assign(_translations, mod.default);
        _extraLoaded = true;
        // Re-render subscribers now that the strings exist; until this
        // resolves they render English rather than raw keys.
        _listeners.forEach((l) => l());
      })
      .catch(() => {
        // Stay on the English fallback rather than breaking the screen.
        _extraLoading = null;
      });
  }
}

// A returning user whose stored language is not bundled needs it immediately.
ensureLocaleLoaded(_lang);

/* ── Available languages ── */
export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "am", label: "አማርኛ", flag: "🇪🇹" },
  { code: "km", label: "ភាសាខ្មែរ", flag: "🇰🇭" },
];

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getSnapshot);
  // Accepts an optional fallback string to render when the key is missing
  // from both the active locale and English. Without this, `t("foo") || "Bar"`
  // never falls back because the key string itself is truthy.
  const t = useCallback(
    (key: string, fallback?: string) =>
      _translations?.[locale]?.[key] ?? _translations?.en?.[key] ?? fallback ?? key,
    [locale]
  );
  return {
    locale,
    currentLanguage: locale,
    setLocale: setGlobalLang,
    changeLanguage: setGlobalLang,
    t,
  };
}

/** Alias for compatibility — namespace param is ignored (flat key lookup) */
export function useTranslation(_ns?: string) {
  return useI18n();
}
