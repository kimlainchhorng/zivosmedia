/**
 * useChatDraft — debounced cloud-synced composer draft for a single thread.
 * Backed by public.chat_drafts (existing schema: chat_partner_id, draft_text).
 *
 * Two call signatures supported for backwards-compat:
 *   useChatDraft(userId, partnerId)  → { draft, updateDraft, clearDraft, loaded }
 *   useChatDraft(threadId)           → { body, setBody, clear, loaded }
 *
 * `partnerId` may be any thread id ("dm:<uid>", "group:<gid>", "channel:<cid>") or a raw uid.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useChatDraft(arg1: string | null | undefined, arg2?: string | null) {
  const { user } = useAuth();
  // Two-arg form: (userId, partnerId). One-arg form: (threadId) — uses auth user.
  const explicitUserId = typeof arg2 !== "undefined" ? arg1 : null;
  const partnerId = typeof arg2 !== "undefined" ? arg2 : arg1;
  const userId = explicitUserId ?? user?.id ?? null;

  const [body, setBodyState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setBodyState("");
    if (!userId || !partnerId) {
      setLoaded(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("chat_drafts")
        .select("draft_text")
        .eq("user_id", userId)
        .eq("chat_partner_id", partnerId)
        .maybeSingle();
      if (cancelled) return;
      setBodyState((data?.draft_text as string) ?? "");
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, partnerId]);

  const flush = useCallback(
    async (value: string) => {
      if (!userId || !partnerId) return;
      if (value.trim().length === 0) {
        await supabase.from("chat_drafts").delete().eq("user_id", userId).eq("chat_partner_id", partnerId);
        return;
      }
      await supabase.from("chat_drafts").upsert(
        {
          user_id: userId,
          chat_partner_id: partnerId,
          draft_text: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chat_partner_id" },
      );
    },
    [userId, partnerId],
  );

  const update = useCallback(
    (value: string) => {
      setBodyState(value);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flush(value), 500);
    },
    [flush],
  );

  const clear = useCallback(async () => {
    setBodyState("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flush("");
  }, [flush]);

  return {
    // New API
    body,
    setBody: update,
    clear,
    loaded,
    // Legacy API
    draft: body,
    updateDraft: update,
    clearDraft: clear,
  };
}
