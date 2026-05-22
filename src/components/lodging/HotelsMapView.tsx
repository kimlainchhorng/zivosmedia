/**
 * HotelsMapView — Interactive Google Map with price-pill overlays.
 *
 * Users can pinch-zoom, drag, and tap the +/- controls. Each property is
 * rendered as a custom HTML pill (price or hotel icon) using an OverlayView
 * so styling stays consistent with the rest of the UI.
 */
/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { resolveMapsKey } from "@/lib/mapsKey";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import { useCurrency } from "@/contexts/CurrencyContext";

export interface MapHotel {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  banner_url: string | null;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  pricePerNightCents?: number | null;
  rating?: number | null;
  reviewCount?: number;
}

interface Props {
  hotels: MapHotel[];
  onSelect: (hotelId: string) => void;
  apiKey: string;
}

// ---- Shared script loader (delegates to unified loader) -------------------
const loadMapsScript = (apiKey: string) => loadGoogleMaps(apiKey);

// Pill CSS classes — kept in JS so we can toggle without rebuilding the DOM
const PILL_BASE =
  "pointer-events-auto rounded-full font-bold text-[11px] px-2.5 py-1 shadow-md whitespace-nowrap border transition-all duration-150 cursor-pointer";
const PILL_IDLE =
  "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-black/10 dark:border-white/15 hover:scale-105";
const PILL_ACTIVE =
  "bg-emerald-500 text-white border-emerald-600 scale-110 shadow-lg shadow-emerald-500/30";

// ---- Component -------------------------------------------------------------
export default function HotelsMapView({ hotels, onSelect, apiKey }: Props) {
  const { format: fmtCurrency } = useCurrency();
  const formatPrice = (cents?: number | null) =>
    typeof cents === "number" && cents > 0 ? fmtCurrency(Math.round(cents / 100), "USD") : null;

  const [resolvedKey, setResolvedKey] = useState<string>(apiKey || "");
  useEffect(() => {
    if (apiKey) { setResolvedKey(apiKey); return; }
    let cancelled = false;
    void resolveMapsKey().then((k) => { if (!cancelled) setResolvedKey(k); });
    return () => { cancelled = true; };
  }, [apiKey]);

  const valid = useMemo(
    () =>
      hotels.filter(
        (h) =>
          typeof h.latitude === "number" &&
          typeof h.longitude === "number" &&
          Number.isFinite(h.latitude) &&
          Number.isFinite(h.longitude),
      ),
    [hotels],
  );

  const [activeId, setActiveId] = useState<string | null>(valid[0]?.id ?? null);
  useEffect(() => {
    if (!valid.find((h) => h.id === activeId)) setActiveId(valid[0]?.id ?? null);
  }, [valid, activeId]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  // Store both the overlay instance and its DOM element for fast class toggling
  const overlaysRef = useRef<Map<string, { overlay: google.maps.OverlayView; el: HTMLElement }>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // Refs keep click handlers stable so overlays don't need re-creating when
  // activeId / onSelect change — see the diff-based pill effect below.
  const activeIdRef = useRef<string | null>(activeId);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const focusCard = (id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  // Pan map to a hotel's position
  const panToHotel = (hotel: MapHotel) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: hotel.latitude, lng: hotel.longitude });
    }
  };

  // Initialize the interactive map once the script is loaded
  useEffect(() => {
    if (!resolvedKey || !mapContainerRef.current || valid.length === 0) return;
    let cancelled = false;
    loadMapsScript(resolvedKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: { lat: valid[0].latitude, lng: valid[0].longitude },
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            styles: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
              { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          });
        }
        setMapReady(true);
      })
      .catch(() => { /* noop — fallback UI shown below */ });
    return () => { cancelled = true; };
  }, [resolvedKey, valid.length]);

  // Fit bounds to all hotels when the set changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || valid.length === 0) return;
    if (valid.length === 1) {
      mapRef.current.setCenter({ lat: valid[0].latitude, lng: valid[0].longitude });
      mapRef.current.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    valid.forEach((h) => bounds.extend({ lat: h.latitude, lng: h.longitude }));
    mapRef.current.fitBounds(bounds, 48);
  }, [mapReady, valid]);

  // Re-evaluate which hotels are within the current viewport (capped to 40).
  // We keep an ordered array (best-price first) so the carousel can render
  // exactly the hotels visible on the map — drops carousel DOM from 200 → ~40.
  const [visibleHotels, setVisibleHotels] = useState<MapHotel[]>(() => valid.slice(0, 40));
  const visibleIds = useMemo(() => new Set(visibleHotels.map((h) => h.id)), [visibleHotels]);

  // Keep the carousel populated before the map script finishes loading.
  useEffect(() => {
    if (mapReady) return;
    setVisibleHotels((prev) => {
      const next = valid.slice(0, 40);
      if (prev.length === next.length && prev.every((h, i) => h.id === next[i].id)) return prev;
      return next;
    });
  }, [valid, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    let raf = 0;

    const recompute = () => {
      const bounds = map.getBounds();
      let next: MapHotel[];
      if (!bounds) {
        next = valid.slice(0, 40);
      } else {
        const inView = valid.filter((h) => bounds.contains({ lat: h.latitude, lng: h.longitude }));
        next = inView
          .slice()
          .sort((a, b) => {
            const pa = a.pricePerNightCents ?? Number.POSITIVE_INFINITY;
            const pb = b.pricePerNightCents ?? Number.POSITIVE_INFINITY;
            if (pa !== pb) return pa - pb;
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
          .slice(0, 40);
        const currentActive = activeIdRef.current;
        if (currentActive && !next.some((h) => h.id === currentActive)) {
          const active = valid.find((h) => h.id === currentActive);
          if (active) next.push(active);
        }
      }
      setVisibleHotels((prev) => {
        if (prev.length === next.length && prev.every((h, i) => h.id === next[i].id)) return prev;
        return next;
      });
    };

    const onIdle = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(recompute);
    };

    recompute();
    const listener = map.addListener("idle", onIdle);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      listener.remove();
    };
  }, [mapReady, valid]);

  // Build price-pill overlays — only for visible (viewport-capped) hotels.
  // Diffs add/remove from the previous set instead of rebuilding everything,
  // so a small pan doesn't tear down 39 unchanged overlays.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    class PillOverlay extends google.maps.OverlayView {
      private pos: google.maps.LatLng;
      private el: HTMLElement;
      constructor(pos: google.maps.LatLng, el: HTMLElement) {
        super();
        this.pos = pos;
        this.el = el;
      }
      onAdd() {
        const panes = this.getPanes();
        if (panes) panes.floatPane.appendChild(this.el);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj) return;
        const p = proj.fromLatLngToDivPixel(this.pos);
        if (!p) return;
        this.el.style.position = "absolute";
        this.el.style.left = `${p.x}px`;
        this.el.style.top = `${p.y}px`;
        this.el.style.transform = "translate(-50%, -100%)";
      }
      onRemove() {
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
      }
    }

    // Remove overlays no longer visible
    for (const [id, { overlay }] of overlaysRef.current) {
      if (!visibleIds.has(id)) {
        overlay.setMap(null);
        overlaysRef.current.delete(id);
      }
    }

    // Add overlays for newly-visible hotels
    visibleHotels.forEach((h) => {
      if (overlaysRef.current.has(h.id)) return;
      const isActive = h.id === activeIdRef.current;
      const priceLabel = formatPrice(h.pricePerNightCents);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_IDLE}`;
      el.innerHTML = priceLabel
        ? priceLabel
        : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>';
      el.setAttribute("aria-label", `${h.name}${priceLabel ? ` from ${priceLabel} per night` : ""}`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (h.id === activeIdRef.current) {
          onSelectRef.current(h.id);
        } else {
          setActiveId(h.id);
          focusCard(h.id);
          panToHotel(h);
        }
      });
      const overlay = new PillOverlay(new google.maps.LatLng(h.latitude, h.longitude), el);
      overlay.setMap(map);
      overlaysRef.current.set(h.id, { overlay, el });
    });

    return () => {
      // Only clear all on unmount — visibleHotels changes don't trigger this
      // path because React keeps the same effect instance running.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, visibleHotels]);

  // Unmount cleanup: drop all overlays when the component leaves the tree.
  useEffect(() => {
    return () => {
      overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
      overlaysRef.current.clear();
    };
  }, []);

  // Toggle active class on pill elements without rebuilding overlays
  useEffect(() => {
    overlaysRef.current.forEach(({ el }, id) => {
      const isActive = id === activeId;
      el.className = `${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_IDLE}`;
    });
  }, [activeId]);

  if (valid.length === 0) {
    return (
      <div className="h-[60vh] rounded-2xl border border-border bg-card flex flex-col items-center justify-center text-center px-6">
        <MapPin className="w-10 h-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-semibold">No mapped properties yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Switch to the list view to browse hotels without a fixed location.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      {/* Interactive map — taller on mobile for better usability */}
      <div className="relative h-[52vw] min-h-[220px] max-h-[420px] w-full bg-muted overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <MapPin className="w-10 h-10 text-muted-foreground/40 animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading map…</p>
          </div>
        )}
        {/* Top-right counter pill */}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold shadow-md pointer-events-none">
          <MapPin className="w-3 h-3 text-emerald-600" />
          {valid.length} {valid.length === 1 ? "property" : "properties"}
        </div>
      </div>

      {/* Horizontal card carousel */}
      <div className="relative">
        {visibleHotels.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll left"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/95 border border-border shadow-md hover:bg-background"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll right"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/95 border border-border shadow-md hover:bg-background"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleHotels.map((h) => {
            const priceLabel = formatPrice(h.pricePerNightCents);
            const isActive = h.id === activeId;
            const hasRating = typeof h.rating === "number";
            return (
              <button
                key={h.id}
                ref={(el) => { cardRefs.current[h.id] = el; }}
                type="button"
                onClick={() => onSelect(h.id)}
                onFocus={() => {
                  setActiveId(h.id);
                  panToHotel(h);
                }}
                onMouseEnter={() => {
                  setActiveId(h.id);
                  panToHotel(h);
                }}
                className={
                  "snap-start shrink-0 w-[280px] text-left rounded-2xl border bg-card overflow-hidden transition active:scale-[0.99] " +
                  (isActive ? "border-emerald-500 shadow-md shadow-emerald-500/10" : "border-border hover:border-foreground/20")
                }
              >
                <div className="flex">
                  <div className="w-24 h-24 shrink-0 bg-muted relative overflow-hidden">
                    {(h.banner_url || h.logo_url) ? (
                      <img
                        src={h.banner_url || h.logo_url || ""}
	                        alt={h.name}
	                        loading="lazy"
	                        decoding="async"
	                        className="w-full h-full object-cover"
	                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Hotel className="w-7 h-7 text-primary/40" />
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 ring-2 ring-inset ring-emerald-500/60 rounded-none pointer-events-none" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 p-2.5">
                    <p className="text-[13px] font-bold truncate">{h.name}</p>
                    {h.address && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{h.address}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {hasRating ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {(h.rating as number).toFixed(1)}
                          {h.reviewCount ? <span className="font-normal opacity-70">({h.reviewCount})</span> : null}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          New
                        </span>
                      )}
                      {priceLabel && (
                        <span className="text-[11px] font-bold whitespace-nowrap">
                          from <span className="text-emerald-600">{priceLabel}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[10px] font-semibold text-emerald-600">
                      Tap to book →
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
