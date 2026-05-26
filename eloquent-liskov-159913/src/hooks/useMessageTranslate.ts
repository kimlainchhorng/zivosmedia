/**
 * useMessageTranslate — Translate a chat message and cache in message_translations
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCaptionTranslation } from "@/hooks/useCaptionTranslation";

export function useMessageTranslate() {
  const { translate, isTranslating } = useCaptionTranslation();
  const [cache, setCache] = useState<Record<string, { text: string; lang: string }>>({});

  const translateMessage = useCallback(
    async (messageId: string, text: string, targetLang = navigator.language?.split("-")[0] || "en") => {
      const key = `${messageId}_${targetLang}`;
      if (cache[key]) return cache[key];

      // Try DB cache first
      const { data: existing } = await (supabase as any)
        .from("message_translations")
        .select("translated_text, source_language")
        .eq("message_id", messageId)
        .eq("target_language", targetLang)
        .maybeSingle();

      if (existing?.translated_text) {
        const result = { text: existing.translated_text, lang: existing.source_language || "auto" };
        setCache((c) => ({ ...c, [key]: result }));
        return result;
      }

      const translated = await translate(text, targetLang);
      const result = { text: translated, lang: "auto" };
      setCache((c) => ({ ...c, [key]: result }));

      await (supabase as any).from("message_translations").insert({
        message_id: messageId,
        target_language: targetLang,
        translated_text: translated,
        source_language: "auto",
      });

      return result;
    },
    [cache, translate],
  );

  return { translateMessage, isTranslating };
}
