/**
 * Shared language preference resolution — the one module the ZIVO apps agree on.
 *
 * The same defect had three shapes across the estate: zivosmedia never honoured
 * the browser locale, zivobusiness only translated with `?lang=km` in the URL,
 * and zivoemployee persisted the choice on the device only, so a Khmer speaker
 * signing in on a new phone got English. ride.zivosmedia.com and zivodriver.com
 * already behave correctly; this is that behaviour, extracted.
 *
 * Deliberately free of app imports (no supabase, no router, no React) so it can
 * be dropped into the other two apps unchanged. Account persistence is injected
 * — see `syncAccountLanguage` — because each app reaches its own backend.
 *
 * Resolution order, highest priority first:
 *   1. an explicit `?lang=` in the URL           (a shared or bookmarked link)
 *   2. a language the user has actually chosen   (device cache; account wins later)
 *   3. the browser's own locale                  (first ever visit)
 *   4. the fallback, English
 *
 * Step 2 is why `LANGUAGE_EXPLICIT_KEY` exists. `zivo_lang` alone cannot carry
 * this: the app writes it on every boot, so one visit makes the default look
 * like a decision and the browser locale is never consulted again. Only an
 * actual selection sets the explicit marker.
 */

export const LANGUAGE_STORAGE_KEY = "zivo_lang";
export const LANGUAGE_EXPLICIT_KEY = "zivo_lang_explicit";

/** Locales whose catalogue ships in the entry bundle. */
export const BUNDLED_LANGUAGES = ["en", "km"] as const;
export const FALLBACK_LANGUAGE = "en";

export type LanguageSource = "query" | "account" | "chosen" | "browser" | "fallback";

function safeRead(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeWrite(key: string, value: string) {
  // Private mode and locked-down webviews throw here. A visitor who cannot
  // persist a choice must still be able to make one for this session.
  try { localStorage.setItem(key, value); } catch { /* preference is in-memory only */ }
}

/**
 * The visitor's preferred language according to the browser.
 *
 * Reads `navigator.languages` as strings and prefix-matches. It deliberately
 * does NOT go through `Intl`: Chromium ships no Khmer ICU data, so
 * `Intl.DateTimeFormat().resolvedOptions().locale` silently resolves `km-KH` to
 * `en-US` and this check would report English for exactly the users it exists
 * to serve. `navigator.languages` reports the raw tags and stays correct.
 */
export function browserLanguage(supported: readonly string[] = BUNDLED_LANGUAGES): string | null {
  if (typeof navigator === "undefined") return null;
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    if (typeof tag !== "string" || !tag) continue;
    // "km-KH" -> "km"; an exact tag such as "km" matches on the same path.
    const base = tag.toLowerCase().split("-")[0];
    const match = supported.find((code) => code.toLowerCase() === base);
    if (match) return match;
  }
  return null;
}

/**
 * True once the visitor has actually selected a language themselves.
 *
 * Migration: visitors from before the explicit marker existed have a
 * `zivo_lang` but no marker. Their stored value is still readable as intent,
 * because the old code only ever auto-wrote the fallback — it seeded `"en"` on
 * every boot and never seeded anything else. So a stored language that is not
 * the fallback can only have come from the switch, and is honoured and upgraded
 * to a marked choice. A stored `"en"` stays ambiguous and yields to the browser
 * locale, which is the bug being fixed: a Khmer phone that was silently pinned
 * to English by its own first page load.
 */
export function hasExplicitLanguageChoice(): boolean {
  if (safeRead(LANGUAGE_EXPLICIT_KEY) === "1") return true;
  const stored = safeRead(LANGUAGE_STORAGE_KEY);
  return Boolean(stored) && stored !== FALLBACK_LANGUAGE;
}

/**
 * Persists the inference above, once, so the predicate stays a pure read.
 *
 * It matters that this is separate: `resolveInitialLanguage` runs from a React
 * render on the public hub and from every language-change event, and a
 * read-named function that writes to storage in those paths is a trap for
 * whoever touches it next. Call this from app boot instead.
 */
export function upgradeLegacyLanguageChoice() {
  if (safeRead(LANGUAGE_EXPLICIT_KEY) === "1") return;
  const stored = safeRead(LANGUAGE_STORAGE_KEY);
  if (stored && stored !== FALLBACK_LANGUAGE) safeWrite(LANGUAGE_EXPLICIT_KEY, "1");
}

export function storedLanguage(supported: readonly string[] = BUNDLED_LANGUAGES): string | null {
  const stored = safeRead(LANGUAGE_STORAGE_KEY);
  return stored && supported.includes(stored) ? stored : null;
}

/**
 * The language to render on this load, and why. The `source` is what lets a
 * caller decide whether an account preference is allowed to override it: a
 * `query` choice is explicit and must win, a `browser` guess must not.
 */
export function resolveInitialLanguage(options: {
  query?: string | null;
  /** Every code the app can render. A stored or linked choice may be any of them. */
  supported?: readonly string[];
  /**
   * Codes worth auto-selecting from the browser locale. Defaults to the bundled
   * pair: auto-selecting a locale whose catalogue has to be fetched would show
   * English first and repaint, which is worse than not guessing at all. A user
   * who wants one of the other locales picks it, and that choice is honoured.
   */
  detectable?: readonly string[];
} = {}): { code: string; source: LanguageSource } {
  const supported = options.supported ?? BUNDLED_LANGUAGES;
  const detectable = options.detectable ?? BUNDLED_LANGUAGES;
  const query = options.query ?? null;
  if (query && supported.includes(query)) return { code: query, source: "query" };
  if (hasExplicitLanguageChoice()) {
    const stored = storedLanguage(supported);
    if (stored) return { code: stored, source: "chosen" };
  }
  const detected = browserLanguage(detectable);
  if (detected) return { code: detected, source: "browser" };
  return { code: FALLBACK_LANGUAGE, source: "fallback" };
}

/**
 * Applies the language to the document: the `lang` attribute assistive tech and
 * the CSS `:lang()` rules both read, plus the Khmer webfont, fetched only when
 * Khmer is actually being shown.
 */
export function applyLanguageToDocument(code: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", code);
  if (code !== "km" || document.getElementById("zivo-khmer-font")) return;
  const link = document.createElement("link");
  link.id = "zivo-khmer-font";
  link.rel = "stylesheet";
  link.href = "/fonts/noto-sans-khmer.css";
  document.head.appendChild(link);
}

/** Caches the active language without claiming the visitor chose it. */
export function cacheLanguage(code: string) {
  safeWrite(LANGUAGE_STORAGE_KEY, code);
}

/**
 * Records a language the visitor actually selected. From here on the browser
 * locale is no longer consulted, so choosing English on a Khmer device sticks.
 */
export function rememberLanguageChoice(code: string) {
  safeWrite(LANGUAGE_STORAGE_KEY, code);
  safeWrite(LANGUAGE_EXPLICIT_KEY, "1");
}

/**
 * Account-level persistence, so the choice follows the person to a new device
 * rather than living only in one browser's storage.
 *
 * `load` returns the language stored on the account (or null). `apply` is
 * called only when the account disagrees with what is already on screen AND the
 * current language is not itself an explicit signal — a `?lang=` link or a
 * selection made in this session must not be undone by a slower network read.
 */
export async function syncAccountLanguage(options: {
  current: string;
  source: LanguageSource;
  supported?: readonly string[];
  load: () => Promise<string | null | undefined>;
  apply: (code: string) => void;
}): Promise<void> {
  const supported = options.supported ?? BUNDLED_LANGUAGES;
  if (options.source === "query" || options.source === "chosen") return;
  let preferred: string | null | undefined;
  try {
    preferred = await options.load();
  } catch {
    return; // An unreachable profile must not disturb the rendered language.
  }
  if (!preferred || !supported.includes(preferred) || preferred === options.current) return;
  options.apply(preferred);
}
