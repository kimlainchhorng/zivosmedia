import { supabase } from "@/integrations/supabase/client";

let cachedMapsKey: string | null = null;
let mapsKeyPromise: Promise<string> | null = null;

export const resolveMapsKey = (): Promise<string> => {
  if (cachedMapsKey !== null) return Promise.resolve(cachedMapsKey);
  if (mapsKeyPromise) return mapsKeyPromise;
  const envKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  if (envKey) { cachedMapsKey = envKey; return Promise.resolve(envKey); }
  mapsKeyPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("maps-api-key");
      const key = (!error && (data as { key?: string } | null)?.key) || "";
      cachedMapsKey = key;
      return key;
    } catch {
      cachedMapsKey = "";
      return "";
    }
  })();
  return mapsKeyPromise;
};
