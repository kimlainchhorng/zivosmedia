/**
 * translateMessage — call the translate-caption edge function.
 * Used by long-press → "Translate" action in chat bubbles.
 *
 * Caches results per message id + target lang. The previous code invoked a
 * non-existent `translate-text` fn — every long-press translate silently
 * returned null and the bubble showed nothing.
 */
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export async function translateMessage(
  messageId: string,
  text: string,
  targetLang?: string,
): Promise<string | null> {
  const lang = targetLang || (typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en");
  const key = `${messageId}:${lang}`;
  if (cache.has(key)) return cache.get(key) || null;

  try {
    const { data, error } = await supabase.functions.invoke("translate-caption", {
      body: { text, targetLang: lang },
    });
    if (error) return null;
    // translate-caption returns { translated, targetLang }. Keep the legacy
    // field-name fallbacks so older callers (if any) still work.
    const d = data as { translated?: string; translated_text?: string; translation?: string; text?: string } | null;
    const out = d?.translated ?? d?.translated_text ?? d?.translation ?? d?.text ?? null;
    if (out) cache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

export function clearTranslationCache() {
  cache.clear();
}
