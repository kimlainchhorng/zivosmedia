/**
 * useCaptionTranslation — AI-powered caption translation for Reels
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useCaptionTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(async (text: string, targetLang = "en"): Promise<string> => {
    if (!text?.trim()) return text;
    const cacheKey = `${text.slice(0, 100)}_${targetLang}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-caption", {
        body: { text, targetLang },
      });
      if (error) throw error;
      const translated = data?.translated || text;
      cache.set(cacheKey, translated);
      return translated;
    } catch {
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return { translate, isTranslating };
}
