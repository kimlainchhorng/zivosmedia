/** i18n with persistent language state — translations lazy-loaded */
import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  applyLanguageToDocument,
  cacheLanguage,
  rememberLanguageChoice,
  resolveInitialLanguage,
  syncAccountLanguage,
  upgradeLegacyLanguageChoice,
} from "@/lib/i18n/languagePreference";

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

/** Every code the app can render; a stored or linked choice may be any of them. */
const SUPPORTED_CODES = LANGUAGES.map((language) => language.code);

/* ── Shared reactive store so all components see the same language ── */
function readInitialLanguage() {
  const query = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("lang");
  return resolveInitialLanguage({ query, supported: SUPPORTED_CODES });
}
const _initial = readInitialLanguage();
// Persist the pre-marker inference once here, so resolveInitialLanguage stays a
// pure read everywhere else (it runs during render on the public hub).
upgradeLegacyLanguageChoice();
let _lang = _initial.code;
// Cache, but do not mark as chosen: writing the storage key on boot is what made
// the very first visit look like a decision and kept the browser locale from
// ever being consulted again.
cacheLanguage(_lang);
const _listeners = new Set<() => void>();

function applyLang(code: string, chosenHere: boolean) {
  _lang = code;
  ensureLocaleLoaded(code);
  // Selecting a language is a decision; from here on the browser locale is not
  // consulted, so choosing English on a Khmer phone sticks. A preference merely
  // read back from the account is NOT such a decision — stamping it here would
  // silence the browser locale on a device the user never chose anything on
  // (a shared phone, the next person to sign in), which is the very failure the
  // marker exists to prevent. It is also already the higher-authority source
  // and is re-read on every load, so it has nothing to gain from the marker.
  if (chosenHere) rememberLanguageChoice(code);
  else cacheLanguage(code);
  applyLanguageToDocument(code);
  window.dispatchEvent(new CustomEvent("zivo-lang-change", { detail: code }));
  window.dispatchEvent(new CustomEvent("zivo:lang-change", { detail: code }));
  // Only a real choice is worth writing back; echoing the value we just read
  // would be a pointless round trip.
  if (chosenHere) void saveAccountLanguage(code);
  _listeners.forEach((l) => l());
}

/**
 * The account copy of the preference. It lives on user_personalization_settings
 * — `profiles` has no `preferred_language` column at all, so the previous
 * `profiles.update({ preferred_language })` failed with Postgres 42703 on every
 * single call, and the `.catch(() => undefined)` swallowed it. The setting
 * looked like it persisted and never did.
 *
 * Upsert rather than update: a user who has never opened personalization
 * settings has no row, and an `update` matching nothing reports success.
 */
async function saveAccountLanguage(code: string) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    // PostgREST resolves rather than rejects, so the failure arrives in `error`
    // and a bare `await` throws it away. Discarding it is precisely how the
    // profiles.update version stayed broken for so long: log it, so the next
    // occurrence is visible in DevTools instead of being invisible for months.
    const { error } = await supabase
      .from("user_personalization_settings")
      .upsert({ user_id: userId, preferred_language: code }, { onConflict: "user_id" });
    if (error) console.error("[useI18n] could not save the account language preference:", error.message);
  } catch (error) {
    // A device that cannot reach the account keeps its local choice.
    console.error("[useI18n] account language preference save did not reach the server:", error);
  }
}

/** The public switch: everything a user clicks lands here. */
function setGlobalLang(code: string) {
  applyLang(code, true);
}

/** The account preference arriving over the network, which is not a local choice. */
function adoptAccountLang(code: string) {
  applyLang(code, false);
}

applyLanguageToDocument(_lang);

function subscribe(cb: () => void) {
  _listeners.add(cb);
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    // The public hub dispatches this too, so a switch made there lands here
    // without a reload.
    _lang = typeof detail === "string" ? detail : readInitialLanguage().code;
    applyLanguageToDocument(_lang);
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

// The account preference is what makes the choice follow the person to a new
// device instead of living in one browser's storage. It must not override a
// `?lang=` link or a selection already made in this session, which is what the
// resolved source is for.
if (typeof window !== "undefined") {
  void syncAccountLanguage({
    current: _lang,
    source: _initial.source,
    supported: SUPPORTED_CODES,
    load: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user?.id) return null;
      const { data: settings, error } = await supabase
        .from("user_personalization_settings")
        .select("preferred_language")
        .eq("user_id", data.user.id)
        .maybeSingle();
      // No row is normal — someone who has never set a preference. A real error
      // is not, and gets said out loud rather than read as "no preference".
      if (error) console.error("[useI18n] could not read the account language preference:", error.message);
      return settings?.preferred_language ?? null;
    },
    apply: adoptAccountLang,
  });
}


export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
