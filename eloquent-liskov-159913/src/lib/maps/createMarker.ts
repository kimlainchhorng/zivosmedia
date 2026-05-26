/**
 * createMapMarker — drop-in replacement for `new google.maps.Marker(...)`.
 *
 * Uses google.maps.marker.AdvancedMarkerElement when available (the modern,
 * non-deprecated marker API); falls back to legacy Marker otherwise so calls
 * never break in environments where the `marker` library wasn't loaded.
 *
 * Returned object exposes the subset of Marker's API used across the app:
 *   - setMap(map)
 *   - setPosition(pos)
 *   - getPosition()
 *   - addListener(event, handler)
 *   - get raw(): the underlying instance for advanced operations
 *
 * NOTE: AdvancedMarkerElement requires the host Map to be created with a
 * `mapId`. If you don't pass a mapId, Google falls back to a basic pin.
 */

type LatLngLike = google.maps.LatLng | google.maps.LatLngLiteral;

interface MarkerOptions {
  map: google.maps.Map;
  position: LatLngLike;
  title?: string;
  /** Legacy Marker icon (used as fallback). */
  icon?: google.maps.Icon | google.maps.Symbol | string;
  /** AdvancedMarkerElement content (HTML element). When provided, prefers AdvancedMarker. */
  content?: HTMLElement;
  /** Whether the marker is draggable. */
  draggable?: boolean;
  /** zIndex (works on both APIs). */
  zIndex?: number;
}

export interface MapMarker {
  setMap: (map: google.maps.Map | null) => void;
  setPosition: (pos: LatLngLike) => void;
  getPosition: () => google.maps.LatLng | null;
  addListener: (event: string, handler: (...args: unknown[]) => void) => google.maps.MapsEventListener | undefined;
  raw: unknown;
}

const advancedAvailable = (): boolean => {
  // Defensive checks — the `marker` library may not be loaded.
  const g = (typeof window !== "undefined" && (window as unknown as { google?: typeof google }).google) || undefined;
  return !!g?.maps?.marker?.AdvancedMarkerElement;
};

export function createMapMarker(opts: MarkerOptions): MapMarker {
  if (advancedAvailable() && opts.content) {
    const adv = new google.maps.marker.AdvancedMarkerElement({
      map: opts.map,
      position: opts.position,
      title: opts.title,
      content: opts.content,
      gmpDraggable: opts.draggable,
      zIndex: opts.zIndex,
    });
    return {
      setMap: (m) => { adv.map = m; },
      setPosition: (p) => { adv.position = p; },
      getPosition: () => {
        const p = adv.position;
        if (!p) return null;
        return p instanceof google.maps.LatLng ? p : new google.maps.LatLng(p as google.maps.LatLngLiteral);
      },
      addListener: (event, handler) => adv.addListener(event, handler),
      raw: adv,
    };
  }

  // Legacy fallback — keeps working everywhere.
  const m = new google.maps.Marker({
    map: opts.map,
    position: opts.position,
    title: opts.title,
    icon: opts.icon,
    draggable: opts.draggable,
    zIndex: opts.zIndex,
  });
  return {
    setMap: (map) => m.setMap(map),
    setPosition: (p) => m.setPosition(p),
    getPosition: () => m.getPosition() ?? null,
    addListener: (event, handler) => m.addListener(event, handler),
    raw: m,
  };
}
