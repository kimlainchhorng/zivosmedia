/**
 * openDirections — launch the user's preferred maps app for a destination.
 * Android: geo: intent → Google/Waze chooser. iOS: maps:// → Apple Maps.
 * Web/desktop: Google Maps directions URL.
 */
import { Capacitor } from "@capacitor/core";
import { openExternalUrl } from "@/lib/openExternalUrl";

export interface DirectionsTarget {
  lat: number;
  lng: number;
  label?: string;
  address?: string | null;
}

function detectPlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* noop */
  }
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

export async function openDirections(target: DirectionsTarget): Promise<void> {
  const { lat, lng, label, address } = target;
  const platform = detectPlatform();
  const q = encodeURIComponent(address || label || `${lat},${lng}`);
  let url: string;

  if (platform === "ios") {
    url = `https://maps.apple.com/?daddr=${lat},${lng}&q=${q}`;
  } else if (platform === "android") {
    url = `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  try {
    await openExternalUrl(url);
  } catch {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}
