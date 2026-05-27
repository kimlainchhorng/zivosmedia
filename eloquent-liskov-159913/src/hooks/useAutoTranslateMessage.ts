/**
 * useAutoTranslateMessage
 * -----------------------
 * Lazy translation for an inbound chat message body. When `enabled` is true
 * and the message looks like it isn't already in the user's locale, calls the
 * `translate-caption` edge function and returns the translated text.
 *
 * Behaviour:
 *  - No-ops when `enabled` is false, when the message is empty, or when the
 *    text already looks Latin/short (avoids translating "ok" or single emoji).
 *  - In-memory cache by raw `message` string so re-mounts and scroll-back
 *    don't re-spend the model on the same text.
 *  - Targets the browser's primary language (e.g. en, km, zh) — falls back
 *    to "en" when the locale is non-standard.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "loading" | "done" | "skipped" | "error";

const CACHE = new Map<string, string>();
const SUPPORTED = new Set(["en", "km", "zh", "ja", "ko", "fr", "es", "th", "vi"]);

function detectTargetLang(): string {
  if (typeof navigator === "undefined") return "en";
  const raw = (navigator.language || "en").toLowerCase();
  const base = raw.split("-")[0];
  return SUPPORTED.has(base) ? base : "en";
}

function looksAlreadyInTarget(text: string, target: string): boolean {
  // Cheap heuristic: if the user's target is English and the text is mostly
  // ASCII letters, skip. Same idea for Khmer / CJK targets — if the script
  // matches what the locale expects, no translation needed.
  if (text.length < 4) return true;
  const stripped = text.replace(/[\s\p{P}\p{S}\d]/gu, "");
  if (!stripped) return true;
  const ascii = stripped.replace(/[^a-zA-Z]/g, "").length / stripped.length;
  if (target === "en") return ascii > 0.7;
  // For non-English targets we can't cheaply detect — let the edge fn decide.
  // The edge fn returns the same text unchanged when source==target.
  return false;
}

export function useAutoTranslateMessage(message: string, enabled: boolean) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [targetLang, setTargetLang] = useState<string>(detectTargetLang());
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    if (!enabled || !message || message.length > 1500) {
      setTranslated(null);
      setStatus("skipped");
      return () => { aborted.current = true; };
    }

    const target = detectTargetLang();
    setTargetLang(target);

    if (looksAlreadyInTarget(message, target)) {
      setStatus("skipped");
      setTranslated(null);
      return () => { aborted.current = true; };
    }

    const cacheKey = `${target}::${message}`;
    if (CACHE.has(cacheKey)) {
      setTranslated(CACHE.get(cacheKey) ?? null);
      setStatus("done");
      return () => { aborted.current = true; };
    }

    setStatus("loading");
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("translate-caption", {
          body: { text: message, targetLang: target },
        });
        if (aborted.current) return;
        if (error) throw error;
        const out = (data as any)?.translated as string | undefined;
        if (!out || out.trim() === message.trim()) {
          setStatus("skipped");
          setTranslated(null);
          return;
        }
        CACHE.set(cacheKey, out);
        setTranslated(out);
        setStatus("done");
      } catch {
        if (aborted.current) return;
        setStatus("error");
      }
    })();

    return () => { aborted.current = true; };
  }, [message, enabled]);

  return { translated, status, targetLang };
}
