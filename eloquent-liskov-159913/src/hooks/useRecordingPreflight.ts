/**
 * useRecordingPreflight — Lightweight check that the recordings storage
 * bucket is reachable. Surfaces a status so the lobby can tell the host
 * whether enabling cloud recording will work.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RecordingBucketStatus = "checking" | "ready" | "unavailable";

export function useRecordingPreflight(enabled: boolean) {
  const [status, setStatus] = useState<RecordingBucketStatus>("checking");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        // Cheap probe — RLS lets the host list their own folder.
        const { error } = await supabase.storage
          .from("call-recordings")
          .list("", { limit: 1 });
        if (cancelled) return;
        if (error) {
          setStatus("unavailable");
          setMessage(error.message);
        } else {
          setStatus("ready");
        }
      } catch (e) {
        if (cancelled) return;
        setStatus("unavailable");
        setMessage(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { status, message };
}
