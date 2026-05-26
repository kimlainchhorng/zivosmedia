/**
 * geocodeCache — Persistent reverse-geocode cache + geo helpers.
 * Two layers:
 *   1. In-memory Map for the current session (instant lookup)
 *   2. localStorage for cross-session persistence (7-day TTL, 200-entry cap)
 *
 * Coordinates are quantised to 4 decimal places (~11 m) so nearby points
 * share the same cache entry.
 */
const STORAGE_KEY = "zivo:geocode-cache:v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

interface Entry { addr: string; ts: number; }

const memory = new Map<string, Entry>();
let hydrated = false;

const quant = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Entry>;
    const now = Date.now();
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v.addr === "string" && now - v.ts < TTL_MS) {
        memory.set(k, v);
      }
    }
  } catch { /* corrupted cache — ignore */ }
}

function persist() {
  try {
    if (memory.size > MAX_ENTRIES) {
      const sorted = [...memory.entries()].sort((a, b) => b[1].ts - a[1].ts);
      memory.clear();
      sorted.slice(0, MAX_ENTRIES).forEach(([k, v]) => memory.set(k, v));
    }
    const obj: Record<string, Entry> = {};
    memory.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* quota — ignore */ }
}

export function getCachedAddress(lat: number, lng: number): string | null {
  hydrate();
  const hit = memory.get(quant(lat, lng));
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    memory.delete(quant(lat, lng));
    return null;
  }
  return hit.addr;
}

export function setCachedAddress(lat: number, lng: number, addr: string) {
  hydrate();
  memory.set(quant(lat, lng), { addr, ts: Date.now() });
  persist();
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const cached = getCachedAddress(lat, lng);
  if (cached) return cached;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address || {};
    const line =
      [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.country]
        .filter(Boolean)
        .join(", ") || j.display_name;
    if (line) {
      setCachedAddress(lat, lng, line);
      return line;
    }
    return null;
  } catch {
    return null;
  }
}

/** Haversine distance in metres */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/** Rough driving ETA at 50 km/h average. Returns "X min" or "X h Y min". */
export function formatDriveEta(m: number): string {
  const minutes = Math.max(1, Math.round((m / 1000) / 50 * 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}
