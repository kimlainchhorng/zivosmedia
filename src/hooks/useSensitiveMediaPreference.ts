import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SENSITIVE_MEDIA_PREF_EVENT,
  getSensitiveMediaPreferenceKey,
} from "@/lib/social/sensitiveContent";

export type SensitiveMediaPreference = {
  blurSensitiveMedia: boolean;
  setBlurSensitiveMedia: (next: boolean) => Promise<void>;
};

const readStoredPreference = (userId?: string | null): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(getSensitiveMediaPreferenceKey(userId));
    return stored === null ? true : stored !== "false";
  } catch {
    return true;
  }
};

const writeStoredPreference = (userId: string | null | undefined, value: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSensitiveMediaPreferenceKey(userId), String(value));
    window.dispatchEvent(new CustomEvent(SENSITIVE_MEDIA_PREF_EVENT, {
      detail: { userId: userId || null, blurSensitiveMedia: value },
    }));
  } catch {
    // Private browsing / locked storage: the in-memory state still updates.
  }
};

export function useSensitiveMediaPreference(userId?: string | null): SensitiveMediaPreference {
  const [blurSensitiveMedia, setBlurSensitiveMediaState] = useState(() => readStoredPreference(userId));

  useEffect(() => {
    setBlurSensitiveMediaState(readStoredPreference(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("privacy_settings")
          .select("blur_sensitive_media")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled || error || typeof data?.blur_sensitive_media !== "boolean") return;
        setBlurSensitiveMediaState(data.blur_sensitive_media);
        writeStoredPreference(userId, data.blur_sensitive_media);
      } catch {
        // Column may not exist until the migration is deployed.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string | null; blurSensitiveMedia?: boolean }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (typeof detail?.blurSensitiveMedia === "boolean") {
        setBlurSensitiveMediaState(detail.blurSensitiveMedia);
      }
    };
    const onStorage = () => setBlurSensitiveMediaState(readStoredPreference(userId));
    window.addEventListener(SENSITIVE_MEDIA_PREF_EVENT, onPreferenceChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SENSITIVE_MEDIA_PREF_EVENT, onPreferenceChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const setBlurSensitiveMedia = useCallback(async (next: boolean) => {
    setBlurSensitiveMediaState(next);
    writeStoredPreference(userId, next);

    if (!userId) return;
    try {
      const { data: existing } = await (supabase as any)
        .from("privacy_settings")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      const payload = { blur_sensitive_media: next, updated_at: new Date().toISOString() };
      if (existing?.user_id) {
        await (supabase as any).from("privacy_settings").update(payload).eq("user_id", userId);
      } else {
        await (supabase as any).from("privacy_settings").insert({ user_id: userId, ...payload });
      }
    } catch {
      // The migration may not be deployed yet. Local preference still works.
    }
  }, [userId]);

  return { blurSensitiveMedia, setBlurSensitiveMedia };
}
