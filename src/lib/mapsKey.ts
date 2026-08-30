import { supabase } from "@/integrations/supabase/client";

let cachedMapsKey: string | null = null;
let mapsKeyPromise: Promise<string> | null = null;
let lastFailedAt = 0;
const RETRY_COOLDOWN_MS = 30_000;

export const resolveMapsKey = (): Promise<string> => {
  if (cachedMapsKey !== null) return Promise.resolve(cachedMapsKey);
  if (mapsKeyPromise) return mapsKeyPromise;
  const envKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  if (envKey) { cachedMapsKey = envKey; return Promise.resolve(envKey); }
  // A transient failure must NOT be cached as the key. supabase-js returns
  // { error } (it does not throw) for non-2xx/network failures, so the old code
  // ran `cachedMapsKey = "" ` and — because the first line returns the cached
  // value forever — one blip disabled every map preview for the whole session.
  // Only an authoritative response is cached (even "" = maps not configured);
  // on failure we clear the promise and back off briefly so a flaky edge
  // function isn't re-hit by every location bubble that mounts.
  if (lastFailedAt && Date.now() - lastFailedAt < RETRY_COOLDOWN_MS) {
    return Promise.resolve("");
  }
  mapsKeyPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("maps-api-key");
      if (error) {
        lastFailedAt = Date.now();
        mapsKeyPromise = null;
        return "";
      }
      const key = (data as { key?: string } | null)?.key || "";
      cachedMapsKey = key;
      return key;
    } catch {
      lastFailedAt = Date.now();
      mapsKeyPromise = null;
      return "";
    }
  })();
  return mapsKeyPromise;
};
