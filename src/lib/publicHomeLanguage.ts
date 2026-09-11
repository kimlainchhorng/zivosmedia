import {
  applyLanguageToDocument,
  cacheLanguage,
  rememberLanguageChoice,
  resolveInitialLanguage,
} from "@/lib/i18n/languagePreference";

export type PublicHomeLanguage = 'en' | 'km';

/** The public hub has its own copy; it does not need the full app translation catalog. */
const PUBLIC_HOME_LANGUAGES = ['en', 'km'] as const;

/**
 * Resolution is shared with the signed-in app so the hub and the app never
 * disagree — including honouring the browser locale on a first ever visit,
 * which is why a Khmer speaker used to land on the English hub.
 */
export function publicHomeLanguage(query: string | null): PublicHomeLanguage {
  const { code } = resolveInitialLanguage({ query, supported: PUBLIC_HOME_LANGUAGES });
  return code === 'km' ? 'km' : 'en';
}

/**
 * `explicit` marks a language the visitor actually asked for — a click on the
 * switch, or a `?lang=` link they followed. Without it the browser locale would
 * stop being consulted after the first render, which is the bug this pair of
 * functions exists to avoid.
 */
export function syncPublicHomeLanguage(language: PublicHomeLanguage, explicit = false) {
  if (explicit) rememberLanguageChoice(language);
  else cacheLanguage(language);
  applyLanguageToDocument(language);
  // Existing app and lazily loaded consent components share these language events.
  window.dispatchEvent(new CustomEvent('zivo-lang-change', { detail: language }));
  window.dispatchEvent(new CustomEvent('zivo:lang-change', { detail: language }));
}
