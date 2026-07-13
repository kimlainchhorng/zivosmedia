/**
 * useStorePins — shared query for active store pins
 * Used by StoreMapPage (pins) and StoresListPage (full list).
 * Adds localStorage cache + offline fallback so the list paints
 * instantly on weak/offline connections.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StorePin {
  id: string;
  name: string;
  slug: string;
  category: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  rating: number | null;
  logo_url: string | null;
  banner_url?: string | null;
  gallery_images?: unknown;
  latitude: number;
  longitude: number;
  created_at?: string;
}

const CACHE_KEY = "zivo:stores:cache:v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CachedStores {
  data: StorePin[];
  ts: number;
}

function readCache(): CachedStores | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedStores;
    if (!parsed?.data || !Array.isArray(parsed.data)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: StorePin[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* quota or private mode — best effort */
  }
}

const STORE_PIN_SELECT = "id, name, slug, category, address, phone, hours, rating, logo_url, banner_url, gallery_images, latitude, longitude, created_at";
const STORE_PIN_PAGE_SIZE = 1000;

export async function fetchActiveStorePins(): Promise<StorePin[]> {
  const rows: StorePin[] = [];
  let from = 0;

  while (true) {
    const to = from + STORE_PIN_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("store_profiles")
      .select(STORE_PIN_SELECT)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = (data || []) as StorePin[];
    rows.push(...page);
    if (page.length < STORE_PIN_PAGE_SIZE) break;
    from += STORE_PIN_PAGE_SIZE;
  }

  return rows;
}

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useStorePins() {
  const online = useOnline();
  const cached = useMemo(() => readCache(), []);
  const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL ? cached.data : undefined;

  const query = useQuery({
    queryKey: ["store-map-all"],
    queryFn: async () => {
      const rows = await fetchActiveStorePins();
      writeCache(rows);
      return rows;
    },
    staleTime: 60_000,
    placeholderData: cacheFresh,
    retry: online ? 2 : 0,
  });

  // Always attempt a live refresh; use the local cache only when the live query
  // has not produced rows yet. Some webviews report navigator.onLine=false
  // while localhost/network requests still work, which otherwise leaves the map
  // stuck on an older cache shape without richer image fields.
  const effectiveData = query.data ?? cached?.data;

  const stores = useMemo(
    () =>
      (effectiveData || []).filter((s) => s.latitude != null && s.longitude != null),
    [effectiveData]
  );

  const isOffline = !online && !query.isFetching && !query.data;
  const cacheAgeMs = cached ? Date.now() - cached.ts : null;

  return {
    ...query,
    data: effectiveData,
    stores,
    allStores: (effectiveData || []) as StorePin[],
    isOffline,
    cacheAgeMs,
  };
}

/** Haversine distance in miles. */
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
