/**
 * StoreMapPage — Clean white map with store pins
 * Features: light tiles, category filters, user GPS dot, search bar,
 *           expandable nearby sheet, radius filter + map circle,
 *           today's hours, check-in counts,
 *           shopping trail planner, live pulse.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorePublicPath } from "@/lib/storeLink";
import { useSmartBack } from "@/lib/smartBack";
import SEOHead from "@/components/SEOHead";
import {
  MapPin, Clock, Star, Navigation, Store, ChevronRight, Search, X,
  Locate, Car, Phone, Wrench, List, Heart, Share2, MoreHorizontal,
  Route, Minus, Flame, Timer, CheckCircle2, ChevronUp, ChevronDown,
  Users, SlidersHorizontal, Layers, Tag, Sparkles, Plus, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import { toast } from "sonner";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import NavBar from "@/components/home/NavBar";
import { STORE_CATEGORY_OPTIONS } from "@/config/groceryStores";
import { trackInitiateCheckout } from "@/services/metaConversion";
import { buildShopDeepLink } from "@/lib/deepLinks";
import { isOpenNow } from "@/lib/store/storeHours";
import { optimizeImage } from "@/lib/optimizeImage";
import { resolveMapsKey } from "@/lib/mapsKey";
import { openInZivoMap } from "@/lib/maps/openInZivoMap";
import { shareStoreWithCard } from "@/lib/social/storeShareCard";
import { useStoreFavorites } from "@/hooks/useStoreFavorites";
import { distanceMiles, fetchActiveStorePins } from "@/hooks/useStorePins";
import StoreDetailsDrawer from "@/components/store/StoreDetailsDrawer";
import { MarkerClusterer, SuperClusterAlgorithm, type Cluster, type Marker as ClusterMarker } from "@googlemaps/markerclusterer";

type StoreSortMode = "distance" | "rating" | "newest";
const STORE_LIST_PAGE = 10;
const LOGO_MARKER_MAX_STORE_COUNT = 1200;
const FOCUSED_PHOTO_MARKER_LIMIT = 180;

const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 };
const EMPTY_LODGING_PRICE_MAP: Record<string, LodgingMapPrice> = {};

type LocationErrorCode = "denied" | "unavailable" | "timeout" | "unsupported" | null;

interface LocationHelpStep {
  label: string;
  detail?: string;
}
interface LocationHelpGuide {
  platform: string;
  browser: string;
  steps: LocationHelpStep[];
  settingsUrl?: string;
}

function detectLocationHelpGuide(): LocationHelpGuide {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
  const isWindows = /Windows/.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isChrome = !isEdge && /Chrome\//.test(ua) && !/OPR\//.test(ua);
  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !isChrome && !isEdge && !isFirefox;

  const platform = isIOS ? "iOS" : isAndroid ? "Android" : isMac ? "macOS" : isWindows ? "Windows" : "this device";
  const browser = isEdge ? "Edge" : isChrome ? "Chrome" : isFirefox ? "Firefox" : isSafari ? "Safari" : "this browser";

  const steps: LocationHelpStep[] = [];
  let settingsUrl: string | undefined;

  if (isIOS && isSafari) {
    steps.push({ label: "Open iPhone Settings → Apps → Safari → Location" });
    steps.push({ label: "Set to Ask or Allow" });
    steps.push({ label: "Also check Settings → Privacy & Security → Location Services is ON" });
  } else if (isIOS) {
    steps.push({ label: `Open iPhone Settings → ${browser} → Location → Allow` });
    steps.push({ label: "Then Settings → Privacy & Security → Location Services → ON" });
  } else if (isAndroid) {
    steps.push({ label: `In ${browser}, tap the lock icon next to the URL → Permissions → Location → Allow` });
    steps.push({ label: `Also check Android Settings → Apps → ${browser} → Permissions → Location` });
  } else if (isChrome || isEdge) {
    steps.push({ label: "Click the icon left of the URL", detail: "It looks like a lock, tune, or info icon" });
    steps.push({ label: "Set Location to Allow", detail: "Then reload the page" });
    if (isMac) {
      steps.push({
        label: "Also: macOS Settings → Privacy & Security → Location Services",
        detail: `Make sure it's on, and ${browser} is checked`,
      });
    } else if (isWindows) {
      steps.push({ label: "Also: Windows Settings → Privacy → Location → On" });
    }
    settingsUrl = isEdge ? "edge://settings/content/location" : "chrome://settings/content/location";
  } else if (isFirefox) {
    steps.push({ label: "Click the lock icon next to the URL → Permissions → Location" });
    steps.push({ label: "Remove Blocked and reload, then click Allow when prompted" });
  } else if (isSafari && isMac) {
    steps.push({ label: "Safari menu → Settings → Websites → Location" });
    steps.push({ label: "Set this site to Allow, then reload" });
    steps.push({
      label: "Also: macOS Settings → Privacy & Security → Location Services",
      detail: "Make sure it's on and Safari is checked",
    });
  } else {
    steps.push({ label: "Open your browser site settings and allow Location for this page" });
    steps.push({ label: "Reload the page, then click the locate button again" });
  }

  return { platform, browser, steps, settingsUrl };
}

const RADIUS_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "All", value: null },
  { label: "500 m", value: 0.5 },
  { label: "1 km", value: 1 },
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
];

interface StorePin {
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

interface StoreProduct {
  id: string;
  name: string;
  price: number;
}

interface LodgingRoomPreview {
  id: string;
  name: string;
  base_rate_cents: number | null;
  original_rate_cents: number | null;
  weekly_discount_pct: number | null;
  monthly_discount_pct: number | null;
  max_guests: number | null;
  beds: string | null;
  room_type: string | null;
  photos?: unknown;
  cover_photo_index?: number | null;
}

interface LodgingMapPrice {
  priceLabel: string | null;
  baseRateCents: number | null;
  originalRateCents: number | null;
  discountLabel: string | null;
}

interface MarkerIconSpec {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

// Cache the resolved API key for the lifetime of the page so navigating away
// and back to the map doesn't re-hit the supabase edge function (cold start
// could add 1–2s of blank screen). The promise itself is cached so concurrent
// map components share the same in-flight request.
let _apiKeyPromise: Promise<string> | null = null;

async function getApiKey(): Promise<string> {
  if (_apiKeyPromise) return _apiKeyPromise;
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  // If the env key is configured, use it directly. The Maps JS key is a
  // public token (it ships in the script URL) so the supabase round-trip
  // adds latency without adding security — referrer/origin restrictions on
  // the GCP side are what protect it.
  if (envKey) {
    _apiKeyPromise = Promise.resolve(envKey);
    return _apiKeyPromise;
  }
  _apiKeyPromise = resolveMapsKey().then((key) => {
    if (!key) _apiKeyPromise = null;
    return key;
  });
  return _apiKeyPromise;
}

// Cache the SDK-load promise too. Without this, two components mounting
// simultaneously can each append their own <script> tag, and rapid back/forward
// navigation re-runs the existing-script-wait branch every time.
let _mapsLoadPromise: Promise<boolean> | null = null;

function hasGoogleMapsConstructor(): boolean {
  return typeof (window as any).google?.maps?.Map === "function";
}

async function ensureGoogleMapsReady(): Promise<boolean> {
  const maps = (window as any).google?.maps;
  if (!maps) return false;

  if (typeof maps.importLibrary === "function") {
    try {
      await maps.importLibrary("maps");
      await maps.importLibrary("marker");
    } catch {
      return false;
    }
  }

  return hasGoogleMapsConstructor();
}

function isGoogleMapsErrorText(text: string): boolean {
  return (
    text.includes("This page can't load Google Maps correctly") ||
    text.includes("This page cannot load Google Maps correctly") ||
    text.includes("Do you own this website?")
  );
}

function dismissGoogleMapsErrorUi(container?: HTMLElement | null): boolean {
  if (typeof document === "undefined") return false;

  let removed = false;
  const candidates = [
    ...Array.from(document.querySelectorAll<HTMLElement>('[role="alertdialog"], .gm-err-container, .gm-err-message, .gm-err-title')),
    ...(container
      ? Array.from(container.querySelectorAll<HTMLElement>(".gm-err-container, .gm-err-message, .gm-err-title"))
      : []),
  ];

  candidates.forEach((element) => {
    const text = element.textContent || "";
    const isMapsError =
      isGoogleMapsErrorText(text) ||
      element.classList.contains("gm-err-container") ||
      element.classList.contains("gm-err-message") ||
      element.classList.contains("gm-err-title");

    if (!isMapsError) return;

    const removable =
      element.closest<HTMLElement>('[role="alertdialog"]') ||
      element.closest<HTMLElement>(".gm-err-container") ||
      element;
    removable.remove();
    removed = true;
  });

  return removed;
}

async function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if (hasGoogleMapsConstructor()) return true;
  if (_mapsLoadPromise) return _mapsLoadPromise;

  _mapsLoadPromise = (async () => {
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      await new Promise<void>((res) => {
        if (hasGoogleMapsConstructor()) return res();
        existing.addEventListener("load", () => res());
        setTimeout(() => res(), 8000);
      });
      const ok = await ensureGoogleMapsReady();
      if (!ok) _mapsLoadPromise = null;
      return ok;
    }
    return new Promise<boolean>((resolve) => {
      const callbackName = `__zivoStoreMapReady_${Date.now()}`;
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (!ok) _mapsLoadPromise = null;
        delete (window as any)[callbackName];
        resolve(ok);
      };
      (window as any)[callbackName] = async () => finish(await ensureGoogleMapsReady());
      script.onerror = () => finish(false);
      // Hard timeout — if Google Maps can't load in 15s (blocked, offline,
      // proxy issues), surface a Map-unavailable state instead of leaving
      // the user stuck on "Loading map…" forever.
      setTimeout(() => finish(false), 15000);
      document.head.appendChild(script);
    });
  })();

  return _mapsLoadPromise;
}

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8e8e8" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d6d6d6" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8fc" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7eadd4" }] },
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8b8b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d4d4d4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#636363" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3d5c" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1535" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d6398" }] },
];

const CATEGORY_ICONS: Record<string, string> = {
  "food-market": "🛒", "grocery": "🛒", "restaurant": "🍽️", "fashion": "👗",
  "drink": "🥤", "mall": "🏬", "supermarket": "🏪", "salon": "💇",
  "electronics": "📱", "pharmacy": "💊", "car-rental": "🚗", "car-dealership": "🚙",
  "auto-repair": "🔧", "tire-shop": "🛞", "auto-parts": "⚙️",
  "hotel": "🏨", "resort": "🏖️", "guesthouse": "🏠",
  "cafe": "☕", "bakery": "🥐", "convenience": "🏪", "gas-station": "⛽",
  "spa": "💆", "gym": "💪", "laundry": "🧺",
  "hardware": "🔨", "florist": "💐", "bookstore": "📚",
  "jewelry": "💎", "pet-shop": "🐾", "toys": "🧸",
  "furniture": "🛋️", "home-decor": "🏡", "sporting-goods": "⚽",
  "other": "📍", "default": "📍",
};

const CATEGORY_COLORS: Record<string, [string, string]> = {
  "food-market":    ["#16a34a", "#dcfce7"],
  "grocery":        ["#16a34a", "#dcfce7"],
  "restaurant":     ["#ea580c", "#fff7ed"],
  "fashion":        ["#9333ea", "#f3e8ff"],
  "drink":          ["#2563eb", "#dbeafe"],
  "mall":           ["#db2777", "#fce7f3"],
  "supermarket":    ["#0d9488", "#ccfbf1"],
  "salon":          ["#e11d48", "#ffe4e6"],
  "electronics":    ["#4f46e5", "#e0e7ff"],
  "pharmacy":       ["#059669", "#d1fae5"],
  "car-rental":     ["#7c3aed", "#ede9fe"],
  "car-dealership": ["#1d4ed8", "#dbeafe"],
  "auto-repair":    ["#b45309", "#fef3c7"],
  "tire-shop":      ["#374151", "#f3f4f6"],
  "auto-parts":     ["#64748b", "#f1f5f9"],
  "hotel":          ["#0ea5e9", "#e0f2fe"],
  "resort":         ["#06b6d4", "#cffafe"],
  "guesthouse":     ["#14b8a6", "#ccfbf1"],
  "cafe":           ["#92400e", "#fef3c7"],
  "bakery":         ["#d97706", "#fef9c3"],
  "convenience":    ["#0d9488", "#ccfbf1"],
  "gas-station":    ["#dc2626", "#fee2e2"],
  "spa":            ["#a855f7", "#f3e8ff"],
  "gym":            ["#f97316", "#fff7ed"],
  "laundry":        ["#3b82f6", "#dbeafe"],
  "hardware":       ["#78716c", "#f5f5f4"],
  "florist":        ["#ec4899", "#fce7f3"],
  "bookstore":      ["#7c3aed", "#ede9fe"],
  "jewelry":        ["#f59e0b", "#fef3c7"],
  "pet-shop":       ["#84cc16", "#f0fdf4"],
  "toys":           ["#ef4444", "#fee2e2"],
  "furniture":      ["#a16207", "#fef9c3"],
  "home-decor":     ["#0891b2", "#cffafe"],
  "sporting-goods": ["#16a34a", "#dcfce7"],
  "other":          ["#6b7280", "#f3f4f6"],
  "default":        ["#6b7280", "#f3f4f6"],
};

function getCategoryIcon(cat: string) { return CATEGORY_ICONS[cat] || CATEGORY_ICONS.default; }
function getCategoryColor(cat: string) { return (CATEGORY_COLORS[cat] || CATEGORY_COLORS.default)[0]; }
function getCategoryBg(cat: string) { return (CATEGORY_COLORS[cat] || CATEGORY_COLORS.default)[1]; }
function getCategoryLabel(cat: string) { return STORE_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label || cat; }

type CategoryGroup = { id: string; label: string; emoji: string; categories: string[] };

const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "stay",   label: "Hotel & Resort",  emoji: "🏨", categories: ["hotel", "resort", "guesthouse"] },
  { id: "eat",    label: "Eat & Drink",     emoji: "🍽️", categories: ["restaurant", "cafe", "bakery", "drink", "food-market"] },
  { id: "shop",   label: "Shop",            emoji: "🛍️", categories: ["fashion", "electronics", "mall", "supermarket", "convenience", "jewelry", "toys", "sporting-goods", "furniture", "home-decor", "bookstore", "florist", "hardware", "pet-shop"] },
  { id: "auto",   label: "Auto",            emoji: "🚗", categories: ["car-rental", "car-dealership", "auto-repair", "tire-shop", "auto-parts", "gas-station"] },
  { id: "wellness", label: "Wellness",      emoji: "💆", categories: ["spa", "salon", "gym", "pharmacy"] },
];

function shouldShowSelectedStoreCommerceSection(
  store: StorePin,
  productCount: number,
  isLive: boolean | undefined,
): boolean {
  if (store.category === "auto-repair") return true;
  return productCount > 0 || !!isLive;
}

type CityAnchor = { name: string; lat: number; lng: number };
type MapViewportBounds = { north: number; south: number; east: number; west: number };

const CHOSEN_CITY_KEY = "zivo:map:city";

const CITY_ANCHORS: CityAnchor[] = [
  { name: "Phnom Penh", lat: 11.5564, lng: 104.9282 },
  { name: "Siem Reap", lat: 13.3633, lng: 103.8564 },
  { name: "Sihanoukville", lat: 10.6271, lng: 103.5224 },
  { name: "Kampot", lat: 10.6101, lng: 104.1810 },
  { name: "Battambang", lat: 13.0957, lng: 103.2022 },
  { name: "Kep", lat: 10.4830, lng: 104.3160 },
];

function readSavedCityAnchor(): CityAnchor | null {
  if (typeof window === "undefined") return null;
  try {
    const name = localStorage.getItem(CHOSEN_CITY_KEY);
    return CITY_ANCHORS.find((city) => city.name === name) || null;
  } catch {
    return null;
  }
}

function writeSavedCityAnchor(city: CityAnchor | null) {
  try {
    if (city) localStorage.setItem(CHOSEN_CITY_KEY, city.name);
    else localStorage.removeItem(CHOSEN_CITY_KEY);
  } catch {
    /* noop */
  }
}

function isCambodiaMapCenter(center: { lat: number; lng: number } | null): center is { lat: number; lng: number } {
  if (!center) return false;
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return false;
  return center.lat >= 9 && center.lat <= 16 && center.lng >= 100 && center.lng <= 110;
}

function isStoreInsideBounds(store: StorePin, bounds: MapViewportBounds | null): boolean {
  if (!bounds) return true;
  const inLat = store.latitude >= bounds.south && store.latitude <= bounds.north;
  const inLng = bounds.west <= bounds.east
    ? store.longitude >= bounds.west && store.longitude <= bounds.east
    : store.longitude >= bounds.west || store.longitude <= bounds.east;
  return inLat && inLng;
}

function getDistKm(store: StorePin, ref: { lat: number; lng: number } | null): number | null {
  if (!ref) return null;
  return distanceMiles(ref, { lat: store.latitude, lng: store.longitude }) * 1.609344;
}

function formatDistLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatWalkMin(km: number): string {
  const mins = Math.ceil((km / 5) * 60);
  if (mins < 2) return "< 1 min";
  if (mins >= 60) return `~${Math.round(mins / 60)} h`;
  return `~${mins} min`;
}

function formatUsdCents(cents: number | null | undefined): string | null {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents <= 0) return null;
  const dollars = cents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

function getBestRoomPreview(rooms: LodgingRoomPreview[]): LodgingRoomPreview | null {
  if (!rooms.length) return null;
  const priced = rooms.filter((room) => typeof room.base_rate_cents === "number" && room.base_rate_cents > 0);
  return [...(priced.length ? priced : rooms)].sort((a, b) => (a.base_rate_cents || Infinity) - (b.base_rate_cents || Infinity))[0] || null;
}

function getRoomDiscountLabel(room: LodgingRoomPreview | null): string | null {
  if (!room) return null;
  if (
    typeof room.original_rate_cents === "number" &&
    typeof room.base_rate_cents === "number" &&
    room.original_rate_cents > room.base_rate_cents
  ) {
    const pct = Math.round(((room.original_rate_cents - room.base_rate_cents) / room.original_rate_cents) * 100);
    if (pct > 0) return `Save ${pct}%`;
  }
  const weekly = Number(room.weekly_discount_pct || 0);
  const monthly = Number(room.monthly_discount_pct || 0);
  if (monthly > 0) return `${monthly}% monthly`;
  if (weekly > 0) return `${weekly}% weekly`;
  return null;
}

function getLodgingMapPrice(room: Pick<LodgingRoomPreview, "base_rate_cents" | "original_rate_cents" | "weekly_discount_pct" | "monthly_discount_pct"> | null): LodgingMapPrice {
  if (!room) {
    return { priceLabel: null, baseRateCents: null, originalRateCents: null, discountLabel: null };
  }
  return {
    priceLabel: formatUsdCents(room.base_rate_cents),
    baseRateCents: room.base_rate_cents,
    originalRateCents: room.original_rate_cents,
    discountLabel: getRoomDiscountLabel({ ...room, id: "", name: "", max_guests: null, beds: null, room_type: null }),
  };
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function collectStoreImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(input)) return input.flatMap((item) => collectStoreImageUrls(item));
  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    return [
      ...collectStoreImageUrls(record.url),
      ...collectStoreImageUrls(record.src),
      ...collectStoreImageUrls(record.path),
      ...collectStoreImageUrls(record.publicUrl),
      ...collectStoreImageUrls(record.public_url),
      ...collectStoreImageUrls(record.imageUrl),
      ...collectStoreImageUrls(record.image_url),
      ...collectStoreImageUrls(record.photo_url),
      ...collectStoreImageUrls(record.thumbnail_url),
    ];
  }
  return [];
}

function uniqueStoreImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function getStoreImageCandidates(store: StorePin): string[] {
  return uniqueStoreImageUrls([
    ...collectStoreImageUrls(store.logo_url),
    ...collectStoreImageUrls(store.banner_url),
    ...collectStoreImageUrls(store.gallery_images),
  ]);
}

function isLodgingCategory(category: string | null | undefined): boolean {
  return ["hotel", "resort", "guesthouse", "guest-house", "hotel-resort"].includes(category || "");
}

async function fetchStoreImageFallbacks(store: StorePin): Promise<string[]> {
  const profileQuery = supabase
    .from("store_profiles")
    .select("logo_url, banner_url, gallery_images")
    .eq("id", store.id)
    .maybeSingle();

  const roomQuery = isLodgingCategory(store.category)
    ? supabase
        .from("lodge_rooms")
        .select("photos, cover_photo_index")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(4)
    : Promise.resolve({ data: [] as unknown[], error: null });

  const [{ data: profile }, { data: rooms }] = await Promise.all([profileQuery, roomQuery]);
  const roomPhotos = ((rooms || []) as Array<{ photos?: unknown; cover_photo_index?: number | null }>).flatMap((room) => {
    const photos = collectStoreImageUrls(room.photos);
    const cover = typeof room.cover_photo_index === "number" ? photos[room.cover_photo_index] : undefined;
    return uniqueStoreImageUrls([...(cover ? [cover] : []), ...photos]);
  });

  return uniqueStoreImageUrls([
    ...roomPhotos,
    ...getStoreImageCandidates({ ...store, ...((profile as Partial<StorePin> | null) || {}) }),
  ]);
}

function totalTripKm(stops: StorePin[], origin: { lat: number; lng: number } | null): number {
  let total = 0;
  const pts: { lat: number; lng: number }[] = [
    ...(origin ? [origin] : []),
    ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    total += distanceMiles(pts[i], pts[i + 1]) * 1.609344;
  }
  return total;
}

function formatTripEta(km: number): string {
  const mins = Math.ceil((km / 5) * 60);
  if (mins < 60) return `~${mins} min walk`;
  return `~${Math.round(mins / 60)}h ${mins % 60}min`;
}

function navigateShoppingTrail(stops: StorePin[], origin: { lat: number; lng: number } | null) {
  if (!stops.length) return;
  const parts: string[] = [];
  if (origin) parts.push(`${origin.lat},${origin.lng}`);
  stops.forEach((s) => parts.push(`${s.latitude},${s.longitude}`));
  window.open(`https://www.google.com/maps/dir/${parts.join("/")}`, "_blank");
}

/** Returns minutes until closing if store closes within 60 min, otherwise null */
function getClosingSoonMinutes(hours: string | null): number | null {
  const str = getTodayHours(hours);
  if (!str || /24.?hour|open.?all/i.test(str)) return null;
  const m = str.match(/[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2] || "0");
  const ap = (m[3] || "").toLowerCase();
  if (!ap && h < 8) h += 12;
  else if (ap === "pm" && h !== 12) h += 12;
  else if (ap === "am" && h === 12) h = 0;
  const now = new Date();
  const close = new Date(now);
  close.setHours(h, mn, 0, 0);
  const diffMin = (close.getTime() - now.getTime()) / 60000;
  return diffMin > 0 && diffMin <= 60 ? Math.round(diffMin) : null;
}

const RECENT_STORES_KEY = "zivo:map:recent";
const RECENT_SEARCHES_KEY = "zivo:map:searches";
function saveRecentSearch(q: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([q, ...arr.filter((x) => x !== q)].slice(0, 5)));
  } catch { /* noop */ }
}
function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"); }
  catch { return []; }
}
function saveRecentStore(id: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(RECENT_STORES_KEY) || "[]");
    localStorage.setItem(RECENT_STORES_KEY, JSON.stringify([id, ...arr.filter((x) => x !== id)].slice(0, 8)));
  } catch { /* noop */ }
}
function getRecentStoreIds(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_STORES_KEY) || "[]"); }
  catch { return []; }
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Returns the smart "best for this time of day" category set */
function getBestForNow(): { label: string; emoji: string; categories: string[] } {
  const h = new Date().getHours();
  if (h >= 5 && h < 10)  return { label: "Breakfast", emoji: "☕", categories: ["cafe", "bakery", "restaurant", "drink"] };
  if (h >= 10 && h < 14) return { label: "Lunch", emoji: "🍽️", categories: ["restaurant", "food-market", "grocery", "supermarket"] };
  if (h >= 14 && h < 18) return { label: "Shopping", emoji: "🛍️", categories: ["fashion", "electronics", "mall", "salon", "spa", "jewelry", "home-decor", "sporting-goods", "furniture"] };
  if (h >= 18 && h < 22) return { label: "Dinner & Drinks", emoji: "🍻", categories: ["restaurant", "drink", "cafe", "mall"] };
  return { label: "Night Out", emoji: "🌙", categories: ["drink", "restaurant"] };
}

/** Nearest-neighbour route optimizer for shopping trail stops */
function optimizeTrailStops(stops: StorePin[], origin: { lat: number; lng: number } | null): StorePin[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const optimized: StorePin[] = [];
  let cur = origin ?? { lat: stops[0].latitude, lng: stops[0].longitude };
  while (remaining.length > 0) {
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = distanceMiles(cur, { lat: s.latitude, lng: s.longitude });
      if (d < bestD) { bestD = d; best = i; }
    });
    optimized.push(remaining[best]);
    cur = { lat: remaining[best].latitude, lng: remaining[best].longitude };
    remaining.splice(best, 1);
  }
  return optimized;
}

/** Parse today's opening hours from a multi-line hours string */
function getTodayHours(hours: string | null): string | null {
  if (!hours) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date().getDay();
  const lines = hours.split(/\n|;/);
  const line = lines.find((l) =>
    l.toLowerCase().startsWith(days[d].toLowerCase()) ||
    l.toLowerCase().startsWith(short[d].toLowerCase())
  );
  if (!line) return null;
  return line.replace(/^[A-Za-z]+:?\s*/i, "").trim();
}

/** Extract opening time from today's hours string, e.g. "8:00 AM – 10:00 PM" → "8:00 AM" */
function getOpensAt(hours: string | null): string | null {
  const today = getTodayHours(hours);
  if (!today) return null;
  const m = today.match(/^(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  return m ? m[1].trim() : null;
}

function isNewStore(store: StorePin): boolean {
  if (!store.created_at) return false;
  return Date.now() - new Date(store.created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
}

/* ── SVG marker factories ── */
function makeMarkerIcon(_emoji: string, color: string, bgColor: string, isNew = false, hasDeal = false): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50">
      <defs><filter id="ds" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="${color}" flood-opacity="0.3"/>
      </filter></defs>
      <polygon points="21,48 16,36 26,36" fill="${color}"/>
      <circle cx="21" cy="20" r="19" fill="${color}" filter="url(#ds)"/>
      <circle cx="21" cy="20" r="16" fill="${bgColor}"/>
      <g fill="none" stroke="#0f172a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.5 18.5h17l-1.1-6.3H13.6l-1.1 6.3Z" fill="#fff"/>
        <path d="M14.5 18.5v10.3h13V18.5" fill="#fff"/>
        <path d="M18.8 28.8v-5.6h4.4v5.6"/>
        <path d="M12.5 18.5c.8 2.1 3.7 2.1 4.5 0 .8 2.1 3.7 2.1 4.5 0 .8 2.1 3.7 2.1 4.5 0 .8 2.1 3.7 2.1 4.5 0"/>
      </g>
      ${isNew ? `<circle cx="7" cy="7" r="7" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
      <text x="7" y="11" text-anchor="middle" font-size="6" fill="#fff" font-weight="bold" font-family="system-ui">NEW</text>` : ""}
      ${hasDeal ? `<circle cx="35" cy="7" r="7" fill="#16a34a" stroke="#fff" stroke-width="1.5"/>
      <text x="35" y="11.5" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold" font-family="system-ui">%</text>` : ""}
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function makePriceMarkerIcon(label: string, selected = false, hasDeal = false, isNew = false): MarkerIconSpec {
  const safeLabel = label.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
  const width = Math.max(selected ? 74 : 64, Math.min(110, 38 + safeLabel.length * 10));
  const pillHeight = selected ? 34 : 30;
  const height = selected ? 46 : 42;
  const fill = selected ? "#003b95" : "#ffffff";
  const stroke = selected ? "#00224f" : "#006ce4";
  const textColor = selected ? "#ffffff" : "#111827";
  const shadow = selected ? "rgba(0,53,128,0.36)" : "rgba(15,23,42,0.20)";
  const tailY = pillHeight + 1;
  const badge = isNew
    ? `<circle cx="${width - 8}" cy="7" r="6" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
       <text x="${width - 8}" y="9.4" text-anchor="middle" font-size="5.4" font-weight="800" fill="#fff" font-family="system-ui">NEW</text>`
    : hasDeal
      ? `<circle cx="${width - 8}" cy="7" r="6" fill="#16a34a" stroke="#fff" stroke-width="1.5"/>
         <text x="${width - 8}" y="10.5" text-anchor="middle" font-size="7.5" font-weight="900" fill="#fff" font-family="system-ui">%</text>`
      : "";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="pricePinShadow" x="-20%" y="-30%" width="140%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="${shadow}" flood-opacity="1"/>
        </filter>
      </defs>
      <path d="M${width / 2 - 7} ${tailY} L${width / 2} ${height - 4} L${width / 2 + 7} ${tailY}" fill="${fill}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 2}"/>
      <rect x="2" y="2" width="${width - 4}" height="${pillHeight}" rx="${pillHeight / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${selected ? 2.5 : 2}" filter="url(#pricePinShadow)"/>
      <text x="${width / 2}" y="${selected ? 24 : 22}" text-anchor="middle" font-size="${selected ? 15 : 14}" font-weight="900" fill="${textColor}" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">${safeLabel}</text>
      ${badge}
    </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    width,
    height,
    anchorX: width / 2,
    anchorY: height - 4,
  };
}

function makeTripStopIcon(num: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <defs><filter id="ts" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#4f46e5" flood-opacity="0.4"/>
      </filter></defs>
      <polygon points="20,46 15,34 25,34" fill="#4f46e5"/>
      <circle cx="20" cy="19" r="18" fill="#4f46e5" filter="url(#ts)"/>
      <circle cx="20" cy="19" r="14" fill="#ffffff"/>
      <text x="20" y="24" text-anchor="middle" font-size="13" font-weight="bold" fill="#4f46e5" font-family="system-ui">${num}</text>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function setClusterMarkerMap(marker: ClusterMarker, map: google.maps.Map | null) {
  const legacyMarker = marker as google.maps.Marker & { setMap?: (map: google.maps.Map | null) => void };
  if (typeof legacyMarker.setMap === "function") {
    legacyMarker.setMap(map);
    return;
  }
  (marker as google.maps.marker.AdvancedMarkerElement).map = map;
}

function canUseAdvancedMapMarkers(map: google.maps.Map | null): boolean {
  return !!(
    map &&
    google.maps.marker?.AdvancedMarkerElement &&
    map.getMapCapabilities?.().isAdvancedMarkersAvailable
  );
}

function createPhotoMarkerElement(
  imageUrls: string[],
  color: string,
  bgColor: string,
  _fallbackEmoji: string,
  isNew: boolean,
  hasDeal: boolean,
  title: string,
  selected = false,
): HTMLElement {
  const root = document.createElement("div");
  const rootWidth = selected ? 52 : 42;
  const rootHeight = selected ? 60 : 50;
  const shellSize = selected ? 48 : 38;
  const mediaSize = selected ? 38 : 30;
  root.setAttribute("role", "button");
  root.setAttribute("tabindex", "0");
  root.setAttribute("aria-label", `Open ${title}`);
  root.title = title;
  root.style.cssText = [
    "position:relative",
    `width:${rootWidth}px`,
    `height:${rootHeight}px`,
    "pointer-events:auto",
    "cursor:pointer",
    "touch-action:manipulation",
    "-webkit-tap-highlight-color:transparent",
    selected ? "transform:translate(-5px,-9px)" : "",
  ].filter(Boolean).join(";");

  const tail = document.createElement("div");
  tail.style.cssText = [
    "position:absolute",
    `left:${selected ? 20 : 16}px`,
    `top:${selected ? 42 : 34}px`,
    "width:0",
    "height:0",
    `border-left:${selected ? 6 : 5}px solid transparent`,
    `border-right:${selected ? 6 : 5}px solid transparent`,
    `border-top:${selected ? 16 : 14}px solid ${color}`,
    "filter:drop-shadow(0 2px 2px rgba(15,23,42,.18))",
  ].join(";");
  root.appendChild(tail);

  const shell = document.createElement("div");
  shell.style.cssText = [
    "position:absolute",
    "left:2px",
    "top:1px",
    `width:${shellSize}px`,
    `height:${shellSize}px`,
    "border-radius:999px",
    `background:${color}`,
    selected
      ? `box-shadow:0 0 0 3px #fff,0 0 0 6px ${color}55,0 14px 28px rgba(15,23,42,.26)`
      : `box-shadow:0 2px 8px ${color}55`,
  ].join(";");
  root.appendChild(shell);

  const media = document.createElement("div");
  media.style.cssText = [
    "position:absolute",
    "left:5px",
    "top:5px",
    `width:${mediaSize}px`,
    `height:${mediaSize}px`,
    "border-radius:999px",
    "overflow:hidden",
    `background:${bgColor}`,
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-size:14px",
    "line-height:1",
  ].join(";");
  shell.appendChild(media);

  const fallback = document.createElement("span");
  fallback.setAttribute("aria-hidden", "true");
  fallback.innerHTML = `
    <svg width="${selected ? 20 : 16}" height="${selected ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10h18l-1.5-6h-15L3 10Z" fill="#fff"/>
      <path d="M5 10v10h14V10" fill="#fff"/>
      <path d="M9 20v-6h6v6"/>
      <path d="M3 10c1 2 4 2 5 0 1 2 4 2 5 0 1 2 4 2 5 0 1 2 4 2 5 0"/>
    </svg>`;
  media.appendChild(fallback);

  const img = document.createElement("img");
  img.alt = `${title} photo`;
  img.loading = "lazy";
  img.decoding = "async";
  img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
  media.appendChild(img);

  let imageIndex = 0;
  const tryNextImage = () => {
    const nextUrl = imageUrls[imageIndex];
    imageIndex += 1;
    if (!nextUrl) {
      img.remove();
      fallback.style.display = "";
      return;
    }
    img.src = nextUrl;
  };
  img.onload = () => { fallback.style.display = "none"; };
  img.onerror = tryNextImage;
  tryNextImage();

  if (isNew) {
    const badge = document.createElement("div");
    badge.textContent = "NEW";
    badge.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "width:14px",
      "height:14px",
      "border-radius:999px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:#ef4444",
      "border:1.5px solid #fff",
      "color:#fff",
      "font:700 6px system-ui",
      "letter-spacing:0",
    ].join(";");
    root.appendChild(badge);
  }

  if (hasDeal) {
    const badge = document.createElement("div");
    badge.textContent = "%";
    badge.style.cssText = [
      "position:absolute",
      "right:0",
      "top:0",
      "width:14px",
      "height:14px",
      "border-radius:999px",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:#16a34a",
      "border:1.5px solid #fff",
      "color:#fff",
      "font:700 9px system-ui",
    ].join(";");
    root.appendChild(badge);
  }

  return root;
}

function setLegacyMarkerPhotoIcon(marker: google.maps.Marker, imageUrls: string[]) {
  let imageIndex = 0;
  const tryNextImage = () => {
    const nextUrl = imageUrls[imageIndex];
    imageIndex += 1;
    if (!nextUrl) return;
    const img = new Image();
    img.onload = () => {
      marker.setIcon({
        url: nextUrl,
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 36),
      });
    };
    img.onerror = tryNextImage;
    img.src = nextUrl;
  };
  tryNextImage();
}

function getEmptyReason(
  openNowOnly: boolean, trendingOnly: boolean, smartFilterActive: boolean,
  searchQuery: string, activeCategory: string, activeGroup: string, radiusKm: number | null
): { title: string; hint: string } {
  const groupLabel = activeGroup ? CATEGORY_GROUPS.find((g) => g.id === activeGroup)?.label : null;
  if (searchQuery.trim()) return { title: `No results for "${searchQuery.trim()}"`, hint: "Try a different search term or clear search" };
  if (openNowOnly) return { title: groupLabel ? `No open ${groupLabel}` : "No stores open right now", hint: "Turn off Open now to see more places" };
  if (trendingOnly) return { title: "No trending stores nearby", hint: "Trending updates every 60 seconds" };
  if (smartFilterActive) return { title: `No ${getBestForNow().label} spots nearby`, hint: "Try a different area or disable this filter" };
  if (radiusKm) return { title: `No stores within ${radiusKm < 1 ? radiusKm * 1000 + " m" : radiusKm + " km"}`, hint: "Try a larger radius or move the map" };
  if (groupLabel) return { title: `No ${groupLabel} stores here`, hint: "Try All or search another area" };
  if (activeCategory !== "all") return { title: "No stores in this category", hint: "Try All or a different area" };
  return { title: "No stores found", hint: "Try searching a different area" };
}

function makeUserDotIcon(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="13" fill="rgba(66,133,244,0.15)" stroke="none"/>
      <circle cx="14" cy="14" r="8" fill="#4285F4" stroke="#fff" stroke-width="3"/>
    </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function hashStorePosition(input: string, axis: "x" | "y"): number {
  let hash = axis === "x" ? 17 : 29;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 9973;
  }
  if (axis === "y") return 20 + (hash % 34);
  return 12 + (hash % 74);
}

function MapFallbackCanvas({
  stores,
  selectedStoreId,
  loading,
  zoom,
  onSelect,
}: {
  stores: StorePin[];
  selectedStoreId?: string | null;
  loading?: boolean;
  zoom: number;
  onSelect: (store: StorePin) => void;
}) {
  const pins = stores.slice(0, 24);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f4f6f5]">
      <div
        className="absolute inset-0 opacity-70 transition-transform duration-300 ease-out"
        style={{
          backgroundImage:
            "linear-gradient(28deg, transparent 0 46%, rgba(0,0,0,0.07) 47% 49%, transparent 50% 100%), linear-gradient(112deg, transparent 0 48%, rgba(0,0,0,0.06) 49% 51%, transparent 52% 100%), linear-gradient(0deg, transparent 0 48%, rgba(0,0,0,0.035) 49% 51%, transparent 52% 100%)",
          backgroundSize: "180px 160px, 220px 190px, 130px 130px",
          backgroundPosition: "20px 40px, -30px 10px, 0 0",
          transform: `scale(${zoom})`,
          transformOrigin: "50% 45%",
        }}
      />
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformOrigin: "50% 45%" }}
      >
        <div className="absolute left-[8%] top-[24%] h-24 w-[78%] rotate-[-12deg] rounded-full bg-white/70 blur-[1px]" />
        <div className="absolute right-[4%] top-[38%] h-32 w-[58%] rotate-[18deg] rounded-full bg-emerald-100/55 blur-[1px]" />
        <div className="absolute bottom-[20%] left-[10%] h-28 w-[70%] rotate-[8deg] rounded-full bg-sky-100/60 blur-[1px]" />

        {pins.map((store) => {
          const selected = selectedStoreId === store.id;
          const imageUrl = uniqueStoreImageUrls(
            getStoreImageCandidates(store)
              .map((url) => optimizeImage(url, 80, "square"))
              .filter((url): url is string => Boolean(url)),
          )[0];
          return (
            <button
              key={store.id}
              type="button"
              aria-label={`Select ${store.name}`}
              onClick={() => onSelect(store)}
              className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-full items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg transition ${
                selected ? "scale-110 bg-foreground text-background ring-4 ring-primary/25" : "bg-card text-foreground hover:scale-105"
              }`}
              style={{
                left: `${hashStorePosition(store.id, "x")}%`,
                top: `${hashStorePosition(store.slug || store.name, "y")}%`,
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    (event.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className={`flex h-full w-full items-center justify-center ${imageUrl ? "hidden" : ""}`}
              >
                <Store className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute left-4 top-[46%] z-20 max-w-[260px] rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-xl">
        <p className="text-sm font-bold text-foreground">{loading ? "Preparing live map" : "Map preview mode"}</p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
          {loading
            ? "Stores are ready while the live map loads."
            : "Browse stores below. Live map tiles are unavailable right now."}
        </p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Zoom {Math.round(zoom * 100)}%</p>
      </div>
    </div>
  );
}

function StoreLogo({ store, size = "md", className = "" }: { store: StorePin; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    xs: "h-6 w-6 rounded-lg text-xs",
    sm: "h-12 w-12 rounded-2xl text-lg",
    md: "h-14 w-14 rounded-2xl text-2xl",
    lg: "h-16 w-16 rounded-[22px] text-3xl",
  };
  const baseImageCandidates = useMemo(() => getStoreImageCandidates(store), [store]);
  const { data: fallbackImageCandidates = [] } = useQuery({
    queryKey: ["store-logo-images", store.id],
    queryFn: () => fetchStoreImageFallbacks(store),
    enabled: !!store.id,
    staleTime: 5 * 60_000,
  });
  const imageCandidates = useMemo(
    () => uniqueStoreImageUrls([...fallbackImageCandidates, ...baseImageCandidates]),
    [baseImageCandidates, fallbackImageCandidates],
  );
  const imageCandidateKey = imageCandidates.join("|");
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => { setImageIndex(0); }, [imageCandidateKey]);
  const imageUrl = imageCandidates[imageIndex];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden shadow-sm ring-1 ring-black/5 ${sizes[size]} ${className}`}
      style={{ background: `linear-gradient(135deg, ${getCategoryBg(store.category)}, ${getCategoryColor(store.category)}22)` }}
    >
      <span aria-hidden="true">{getCategoryIcon(store.category)}</span>
      {imageUrl && (
        <img
          key={imageUrl}
          src={optimizeImage(imageUrl, size === "xs" ? 64 : size === "sm" ? 120 : 160, "square")}
          alt={`${store.name} photo`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageIndex((idx) => Math.min(idx + 1, imageCandidates.length))}
        />
      )}
    </div>
  );
}

export default function StoreMapPage() {
  const navigate = useNavigate();
  const smartBack = useSmartBack("/");
  const queryClient = useQueryClient();
  const [urlParams, setUrlParams] = useSearchParams();
  const focusId = urlParams.get("focus");
  const trailParam = urlParams.get("trail");
  const stopsParam = urlParams.get("stops");
  const searchParam = urlParams.get("search");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<ClusterMarker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const pulseCirclesRef = useRef<google.maps.Circle[]>([]);
  const userDotRef = useRef<google.maps.Marker | null>(null);
  const tripMarkersRef = useRef<google.maps.Marker[]>([]);
  const tripPolylineRef = useRef<google.maps.Polyline | null>(null);
  const radiusCircleRef = useRef<google.maps.Circle | null>(null);
  const markerCameraKeyRef = useRef("");
  const googleMapUnavailableRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapPreviewSettled, setMapPreviewSettled] = useState(false);
  const [mapZoom, setMapZoom] = useState(11);
  const [mapViewportBounds, setMapViewportBounds] = useState<MapViewportBounds | null>(null);
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [selectedStore, setSelectedStore] = useState<StorePin | null>(null);
  const [drawerStore, setDrawerStore] = useState<StorePin | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(urlParams.get("cat") || "all");
  const [activeGroup, setActiveGroup] = useState<string>(urlParams.get("group") || "");
  const [searchQuery, setSearchQuery] = useState(urlParams.get("q") || "");
  const [searchOpen, setSearchOpen] = useState<boolean>(!!urlParams.get("q") || searchParam === "1");
  const [openNowOnly, setOpenNowOnly] = useState<boolean>(urlParams.get("open") === "1");
  const [trendingOnly, setTrendingOnly] = useState(() => localStorage.getItem("zivo:map:trending") === "1");
  const [dealsOnly, setDealsOnly] = useState(false);
  const [smartFilterActive, setSmartFilterActive] = useState(false);
  const [visitedStoreIds, setVisitedStoreIds] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentStoreIds());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationNoticeDismissed, setLocationNoticeDismissed] = useState(false);
  const [locationErrorCode, setLocationErrorCode] = useState<LocationErrorCode>(null);
  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  const locationHelpGuide = useMemo(() => detectLocationHelpGuide(), []);
  const [chosenCityName, setChosenCityName] = useState<string>(() => readSavedCityAnchor()?.name || "");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [liveStoreMap, setLiveStoreMap] = useState<Record<string, string>>({});
  const [checkInMap, setCheckInMap] = useState<Record<string, number>>({});
  const [mapStyle, setMapStyle] = useState<"light" | "dark" | "satellite">(
    () => (localStorage.getItem("zivo:mapStyle") as "light" | "dark" | "satellite") || "light"
  );
  const [dealStoreIds, setDealStoreIds] = useState<Set<string>>(new Set());
  const [markerImageFallbackMap, setMarkerImageFallbackMap] = useState<Record<string, string[]>>({});

  const showFallbackMap = useCallback(() => {
    googleMapUnavailableRef.current = true;
    dismissGoogleMapsErrorUi(mapContainerRef.current);
    mapRef.current = null;
    setMapReady(false);
    setMapPreviewSettled(true);
    setMapError(true);
  }, []);

  /* ── Radius + area search ── */
  const [radiusKm, setRadiusKm] = useState<number | null>(() => {
    const v = localStorage.getItem("zivo:map:radius");
    return v ? Number(v) : null;
  });
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(() => {
    const city = readSavedCityAnchor();
    return city ? { lat: city.lat, lng: city.lng } : null;
  });
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetDismissed, setSheetDismissed] = useState(false);
  const sheetDragControls = useDragControls();
  const [sortBy, setSortBy] = useState<StoreSortMode>("distance");
  const [visibleCount, setVisibleCount] = useState(STORE_LIST_PAGE);
  const [trailSeen, setTrailSeen] = useState<boolean>(() => {
    try { return localStorage.getItem("zivo:map:trail-seen") === "1"; }
    catch { return false; }
  });

  /* ── Shopping Trail ── */
  const [tripMode, setTripMode] = useState(false);
  const [tripStops, setTripStops] = useState<StorePin[]>([]);
  const tripModeRef = useRef(false);
  const tripStopsRef = useRef<StorePin[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchOpenGuardRef = useRef(0);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((n) => Math.min(n + STORE_LIST_PAGE, Number.MAX_SAFE_INTEGER));
    }
  }, []);
  const closeNearbySheet = useCallback(() => {
    setSheetExpanded(false);
    setSheetDismissed(true);
  }, []);
  const restoreNearbySheet = useCallback(() => {
    setSheetDismissed(false);
  }, []);
  const handleSheetDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 72 || info.velocity.y > 600) {
      closeNearbySheet();
    }
  }, [closeNearbySheet]);
  const { isFavorite, toggleFavorite, isAuthed } = useStoreFavorites();
  const searchPanelOpen = searchOpen || searchParam === "1";
  const selectedStoreId = selectedStore?.id;
  const normalizedSearchQuery = searchQuery.trim();
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 180);
  const filterSearchQuery = searchPanelOpen ? debouncedSearchQuery : normalizedSearchQuery;

  useEffect(() => { tripModeRef.current = tripMode; }, [tripMode]);
  useEffect(() => { tripStopsRef.current = tripStops; }, [tripStops]);
  // Reset the infinite-scroll window when the filtered list changes,
  // so a tighter filter doesn't leave us showing a stale page count.
  useEffect(() => {
    setVisibleCount(STORE_LIST_PAGE);
    if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
  }, [activeCategory, activeGroup, filterSearchQuery, openNowOnly, trendingOnly, dealsOnly, smartFilterActive, radiusKm, searchCenter, sortBy]);

  useEffect(() => {
    if (searchParam !== "1") return;
    setSearchOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchParam]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  /* Save recently viewed when a store is selected */
  useEffect(() => {
    if (!selectedStoreId) return;
    saveRecentStore(selectedStoreId);
    setRecentIds(getRecentStoreIds());
  }, [selectedStoreId]);

  /* Persist filter prefs */
  useEffect(() => { localStorage.setItem("zivo:map:trending", trendingOnly ? "1" : "0"); }, [trendingOnly]);
  useEffect(() => {
    if (radiusKm !== null) localStorage.setItem("zivo:map:radius", String(radiusKm));
    else localStorage.removeItem("zivo:map:radius");
  }, [radiusKm]);

  /* Load current user's own visited stores */
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("check_ins").select("store_id").eq("user_id", currentUserId);
      if (!active || !data) return;
      const safeId = (v: any) => (v && typeof v === "string" && v !== "null" && v !== "undefined") ? v : typeof v === "number" ? String(v) : null;
      setVisitedStoreIds(new Set<string>(data.map((r: any) => safeId(r.store_id)).filter((id): id is string => !!id)));
    })();
    return () => { active = false; };
  }, [currentUserId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (focusId) next.set("focus", focusId);
    if (trailParam) next.set("trail", trailParam);
    if (stopsParam) next.set("stops", stopsParam);
    if (activeCategory !== "all") next.set("cat", activeCategory);
    if (activeGroup) next.set("group", activeGroup);
    if (filterSearchQuery) next.set("q", filterSearchQuery);
    else if (searchOpen) next.set("search", "1");
    if (openNowOnly) next.set("open", "1");
    setUrlParams(next, { replace: true });
  }, [activeCategory, activeGroup, filterSearchQuery, focusId, openNowOnly, searchOpen, setUrlParams, stopsParam, trailParam]);

  const { data: allStores = [] } = useQuery({
    queryKey: ["store-map-all"],
    queryFn: async () => {
      return fetchActiveStorePins() as Promise<StorePin[]>;
    },
    staleTime: 60_000,
  });

  // Cambodia's bounding box (lat 9.5–14.7°N, lng 102–108°E) with a generous
  // buffer for cross-border destinations. Stores outside this box are bad
  // data (default 0,0 placeholders or admin typos) and have been seen to
  // drag the map to North America when they end up as the only filter result.
  const stores = useMemo(() => allStores.filter((s) => {
    if (s.latitude == null || s.longitude == null) return false;
    if (s.latitude < 9 || s.latitude > 16) return false;
    if (s.longitude < 100 || s.longitude > 110) return false;
    return true;
  }), [allStores]);

  const lodgingStoreIds = useMemo(
    () => stores.filter((store) => isLodgingCategory(store.category)).map((store) => store.id).sort(),
    [stores],
  );

  const { data: loadedLodgingPriceMap } = useQuery<Record<string, LodgingMapPrice>>({
    queryKey: ["store-map-lodging-price-markers", lodgingStoreIds.join("|")],
    queryFn: async () => {
      if (!lodgingStoreIds.length) return {};
      type PriceRow = Pick<LodgingRoomPreview, "base_rate_cents" | "original_rate_cents" | "weekly_discount_pct" | "monthly_discount_pct"> & {
        store_id?: string | null;
      };
      const rows: PriceRow[] = [];
      const chunks = chunkItems(lodgingStoreIds, 120);
      const results = await Promise.all(chunks.map((chunk) =>
        (supabase as any)
          .from("lodge_rooms")
          .select("store_id, base_rate_cents, original_rate_cents, weekly_discount_pct, monthly_discount_pct")
          .in("store_id", chunk)
          .eq("is_active", true),
      ));

      results.forEach(({ data, error }) => {
        if (error || !Array.isArray(data)) return;
        rows.push(...(data as PriceRow[]));
      });

      const bestByStore = new Map<string, PriceRow>();
      rows.forEach((row) => {
        if (!row.store_id) return;
        const cents = Number(row.base_rate_cents || 0);
        if (!Number.isFinite(cents) || cents <= 0) return;
        const current = bestByStore.get(row.store_id);
        if (!current || cents < Number(current.base_rate_cents || Infinity)) {
          bestByStore.set(row.store_id, row);
        }
      });

      return Object.fromEntries(
        Array.from(bestByStore.entries()).map(([storeId, room]) => [storeId, getLodgingMapPrice(room)]),
      );
    },
    enabled: lodgingStoreIds.length > 0,
    staleTime: 60_000,
  });
  const lodgingPriceMap = loadedLodgingPriceMap ?? EMPTY_LODGING_PRICE_MAP;

  /* Live pulse */
  useEffect(() => {
    let active = true;
    const loadPulse = async () => {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("shop_live_pulse")
        .select("store_id, last_purchase_at")
        .gte("last_purchase_at", cutoff);
      if (!active) return;
      const next: Record<string, string> = {};
      for (const row of data || []) {
        if (row?.store_id) next[String(row.store_id)] = String(row.last_purchase_at || "");
      }
      setLiveStoreMap(next);
    };
    loadPulse();
    const t = window.setInterval(loadPulse, 60_000);
    return () => { active = false; window.clearInterval(t); };
  }, []);

  /* Recent check-ins (last 2 hours) */
  useEffect(() => {
    let active = true;
    const loadCheckIns = async () => {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("check_ins")
        .select("store_id")
        .gte("created_at", cutoff);
      if (!active) return;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row?.store_id) counts[String(row.store_id)] = (counts[String(row.store_id)] || 0) + 1;
      }
      setCheckInMap(counts);
    };
    loadCheckIns();
    const t = window.setInterval(loadCheckIns, 120_000);
    return () => { active = false; window.clearInterval(t); };
  }, []);

  /* Active deals */
  useEffect(() => {
    let active = true;
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("promotions")
        .select("merchant_id")
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gt.${now}`);
      if (!active || !data) return;
      setDealStoreIds(new Set<string>(data.map((r: any) => String(r.merchant_id)).filter(Boolean)));
    })();
    return () => { active = false; };
  }, []);

  /* Map style toggle + persist */
  useEffect(() => {
    localStorage.setItem("zivo:mapStyle", mapStyle);
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const g = (window as any).google;
    if (!g?.maps) return;
    if (mapStyle === "satellite") {
      map.setMapTypeId("satellite");
      map.setOptions({ styles: [] });
    } else {
      map.setMapTypeId("roadmap");
      map.setOptions({ styles: mapStyle === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES });
    }
  }, [mapReady, mapStyle]);

  const usedCategories = useMemo(() => {
    const cats = new Set(stores.map((s) => s.category));
    const all = STORE_CATEGORY_OPTIONS.filter((o) => cats.has(o.value));
    // When a parent group is active, only show sub-categories that belong to it.
    // This stops "Hotel & Resort (663)" + "Hotel (521)" + "Resort (142)" from
    // visually triple-counting the same set of stores.
    if (activeGroup) {
      const group = CATEGORY_GROUPS.find((g) => g.id === activeGroup);
      if (group) return all.filter((o) => group.categories.includes(o.value));
    }
    // Without a group filter, fall back to the un-grouped categories
    // (e.g. things that aren't covered by any group) plus the currently
    // active sub-category so the user can always toggle it off.
    const grouped = new Set(CATEGORY_GROUPS.flatMap((g) => g.categories));
    return all.filter((o) => !grouped.has(o.value) || o.value === activeCategory);
  }, [stores, activeGroup, activeCategory]);

  /* Effective search center for distance calculations */
  const effectiveCenter = searchCenter || userLocation;

  const storesBeforeOpenNowFilter = useMemo(() => {
    let result = stores;
    if (activeGroup) {
      const group = CATEGORY_GROUPS.find((g) => g.id === activeGroup);
      if (group) result = result.filter((s) => group.categories.includes(s.category));
    }
    if (activeCategory !== "all") result = result.filter((s) => s.category === activeCategory);
    if (filterSearchQuery) {
      const q = filterSearchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    }
    if (trendingOnly) result = result.filter((s) => !!liveStoreMap[s.id]);
    if (dealsOnly) result = result.filter((s) => dealStoreIds.has(s.id));
    if (smartFilterActive) {
      const { categories } = getBestForNow();
      result = result.filter((s) => categories.includes(s.category));
    }
    /* Radius filter */
    if (radiusKm && effectiveCenter) {
      result = result.filter((s) => {
        const km = distanceMiles(effectiveCenter, { lat: s.latitude, lng: s.longitude }) * 1.609344;
        return km <= radiusKm;
      });
    }
    return result;
  }, [stores, activeCategory, activeGroup, filterSearchQuery, trendingOnly, dealsOnly, smartFilterActive, liveStoreMap, dealStoreIds, radiusKm, effectiveCenter]);

  const openNowCount = useMemo(
    () => storesBeforeOpenNowFilter.filter((s) => isOpenNow(s.hours) === true).length,
    [storesBeforeOpenNowFilter],
  );

  const filteredStores = useMemo(() => {
    if (!openNowOnly) return storesBeforeOpenNowFilter;
    return storesBeforeOpenNowFilter.filter((s) => isOpenNow(s.hours) === true);
  }, [openNowOnly, storesBeforeOpenNowFilter]);

  const markerCameraKey = useMemo(() => {
    const centerKey = effectiveCenter
      ? `${effectiveCenter.lat.toFixed(4)},${effectiveCenter.lng.toFixed(4)}`
      : "none";
    return [
      activeGroup,
      activeCategory,
      filterSearchQuery,
      openNowOnly ? "open" : "all-hours",
      trendingOnly ? "live" : "all-live",
      dealsOnly ? "deals" : "all-deals",
      smartFilterActive ? "smart" : "manual",
      radiusKm ?? "all-radius",
      centerKey,
      filteredStores.length,
    ].join("|");
  }, [activeCategory, activeGroup, dealsOnly, effectiveCenter, filterSearchQuery, filteredStores.length, openNowOnly, radiusKm, smartFilterActive, trendingOnly]);

  /* Nearby sorted — driven by the sort chip row in the bottom sheet.
     "distance" falls back to insertion order when no GPS / map center yet,
     so the list still renders something useful before the user grants GPS. */
  const nearbySorted = useMemo(() => {
    const arr = [...filteredStores];
    if (sortBy === "rating") {
      return arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    if (sortBy === "newest") {
      return arr.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    }
    if (!effectiveCenter) return arr;
    return arr.sort((a, b) => {
      const da = distanceMiles(effectiveCenter, { lat: a.latitude, lng: a.longitude });
      const db = distanceMiles(effectiveCenter, { lat: b.latitude, lng: b.longitude });
      return da - db;
    });
  }, [filteredStores, effectiveCenter, sortBy]);

  // Detects the "you're in the wrong region" case: user has a real GPS fix
  // but every store is hundreds of kilometres away. Without this signal, the
  // list shows misleading "12,000 km" distances and looks broken.
  const farFromAllStores = useMemo(() => {
    if (!userLocation || filteredStores.length === 0) return false;
    const nearestKm = Math.min(
      ...filteredStores.map((s) =>
        distanceMiles(userLocation, { lat: s.latitude, lng: s.longitude }) * 1.609344,
      ),
    );
    return nearestKm > 200;
  }, [userLocation, filteredStores]);

  const trendingCount = useMemo(() => stores.filter((s) => !!liveStoreMap[s.id]).length, [stores, liveStoreMap]);

  /* Recently viewed stores (resolved from IDs) */
  const recentStores = useMemo(() =>
    recentIds.map((id) => stores.find((s) => s.id === id)).filter(Boolean) as StorePin[],
    [recentIds, stores]
  );
  const showRecentRow = recentStores.length > 0 && !searchQuery.trim() && activeCategory === "all" && !activeGroup
    && !trendingOnly && !smartFilterActive && !selectedStore && !drawerStore;

  /* Search autocomplete — top 5 matches from the current filter context */
  const autoSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [] as StorePin[];
    return filteredStores.slice(0, 5);
  }, [filteredStores, searchQuery]);

  const markerPhotoScopeStores = useMemo(() => {
    const scoped = filteredStores.filter((store) => isStoreInsideBounds(store, mapViewportBounds));
    const source = scoped.length ? scoped : nearbySorted;
    return source.slice(0, 90);
  }, [filteredStores, mapViewportBounds, nearbySorted]);

  useEffect(() => {
    const focusedMap =
      mapZoom >= 12 ||
      !!activeGroup ||
      activeCategory !== "all" ||
      !!searchCenter ||
      !!filterSearchQuery ||
      filteredStores.length <= FOCUSED_PHOTO_MARKER_LIMIT;
    if (!focusedMap) return;

    const storesNeedingMarkerPhotos = markerPhotoScopeStores
      .filter((store) =>
        isLodgingCategory(store.category) &&
        getStoreImageCandidates(store).length === 0 &&
        !markerImageFallbackMap[store.id],
      );

    if (!storesNeedingMarkerPhotos.length) return;

    let cancelled = false;
    (async () => {
      const storeIds = storesNeedingMarkerPhotos.map((store) => store.id);
      const storeById = new Map(storesNeedingMarkerPhotos.map((store) => [store.id, store]));
      const [profileResult, roomResult] = await Promise.all([
        (supabase as any)
          .from("store_profiles")
          .select("id, logo_url, banner_url, gallery_images")
          .in("id", storeIds),
        (supabase as any)
          .from("lodge_rooms")
          .select("store_id, photos, cover_photo_index")
          .in("store_id", storeIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      const photosByStore = new Map<string, string[]>();
      if (!profileResult.error) {
        ((profileResult.data || []) as Array<Partial<StorePin> & { id?: string | null }>).forEach((profile) => {
          if (!profile.id) return;
          const baseStore = storeById.get(profile.id);
          if (!baseStore) return;
          photosByStore.set(profile.id, getStoreImageCandidates({ ...baseStore, ...profile }).slice(0, 4));
        });
      }
      if (!roomResult.error) {
        ((roomResult.data || []) as Array<{ store_id?: string | null; photos?: unknown; cover_photo_index?: number | null }>).forEach((room) => {
          if (!room.store_id) return;
          const photos = collectStoreImageUrls(room.photos);
          const cover = typeof room.cover_photo_index === "number" ? photos[room.cover_photo_index] : undefined;
          const current = photosByStore.get(room.store_id) || [];
          photosByStore.set(room.store_id, uniqueStoreImageUrls([...current, ...(cover ? [cover] : []), ...photos]).slice(0, 4));
        });
      }
      setMarkerImageFallbackMap((prev) => {
        const next = { ...prev };
        storeIds.forEach((id) => { next[id] = photosByStore.get(id) || []; });
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [activeCategory, activeGroup, filterSearchQuery, filteredStores.length, mapZoom, markerImageFallbackMap, markerPhotoScopeStores, searchCenter]);

  const { data: selectedStoreGallery = [] } = useQuery<string[]>({
    queryKey: ["store-map-gallery", selectedStore?.id],
    queryFn: async (): Promise<string[]> => {
      if (!selectedStore?.id) return [];
      return fetchStoreImageFallbacks(selectedStore);
    },
    enabled: !!selectedStore?.id,
    staleTime: 60_000,
  });

  const { data: selectedStoreProducts = [] } = useQuery({
    queryKey: ["store-map-products", selectedStore?.id],
    queryFn: async () => {
      if (!selectedStore?.id) return [] as StoreProduct[];
      const { data, error } = await (supabase as any)
        .from("store_products")
        .select("id, name, price")
        .eq("store_id", selectedStore.id)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [] as StoreProduct[];
      return (data || []) as StoreProduct[];
    },
    enabled: !!selectedStore?.id,
    staleTime: 30_000,
  });

  const { data: selectedLodgingRooms = [] } = useQuery<LodgingRoomPreview[]>({
    queryKey: ["store-map-lodging-rooms", selectedStore?.id],
    queryFn: async () => {
      if (!selectedStore?.id || !isLodgingCategory(selectedStore.category)) return [] as LodgingRoomPreview[];
      const { data, error } = await (supabase as any)
        .from("lodge_rooms")
        .select("id, name, base_rate_cents, original_rate_cents, weekly_discount_pct, monthly_discount_pct, max_guests, beds, room_type, photos, cover_photo_index")
        .eq("store_id", selectedStore.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(3);
      if (error) return [] as LodgingRoomPreview[];
      return (data || []) as LodgingRoomPreview[];
    },
    enabled: !!selectedStore?.id && isLodgingCategory(selectedStore?.category),
    staleTime: 60_000,
  });

  const selectedBestRoom = useMemo(() => getBestRoomPreview(selectedLodgingRooms), [selectedLodgingRooms]);
  const selectedRoomPrice = useMemo(
    () => formatUsdCents(selectedBestRoom?.base_rate_cents),
    [selectedBestRoom],
  );
  const selectedRoomOriginalPrice = useMemo(() => {
    if (!selectedBestRoom?.original_rate_cents || !selectedBestRoom?.base_rate_cents) return null;
    if (selectedBestRoom.original_rate_cents <= selectedBestRoom.base_rate_cents) return null;
    return formatUsdCents(selectedBestRoom.original_rate_cents);
  }, [selectedBestRoom]);
  const selectedRoomDiscountLabel = useMemo(() => getRoomDiscountLabel(selectedBestRoom), [selectedBestRoom]);
  const selectedMapPrice = selectedStoreId ? lodgingPriceMap[selectedStoreId] : null;
  const selectedDisplayRoomPrice = selectedRoomPrice || selectedMapPrice?.priceLabel || null;
  const selectedDisplayRoomOriginalPrice = selectedRoomOriginalPrice || (
    selectedMapPrice?.originalRateCents &&
    selectedMapPrice?.baseRateCents &&
    selectedMapPrice.originalRateCents > selectedMapPrice.baseRateCents
      ? formatUsdCents(selectedMapPrice.originalRateCents)
      : null
  );
  const selectedDisplayRoomDiscountLabel = selectedRoomDiscountLabel || selectedMapPrice?.discountLabel || null;

  useEffect(() => {
    if (selectedStoreProducts.length > 0) setSelectedProductId(selectedStoreProducts[0].id);
    else setSelectedProductId("");
  }, [selectedStoreProducts]);

  /* GPS */
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      setLocationErrorCode("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationDenied(false);
        setLocationErrorCode(null);
        setLocationNoticeDismissed(false);
      },
      (err) => {
        setLocationDenied(true);
        setLocationErrorCode(
          err.code === err.PERMISSION_DENIED ? "denied"
            : err.code === err.POSITION_UNAVAILABLE ? "unavailable"
            : err.code === err.TIMEOUT ? "timeout"
            : "unavailable",
        );
        setLocationNoticeDismissed(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  /* Init map */
  useEffect(() => {
    let cancelled = false;
    const previousAuthFailure = (window as any).gm_authFailure;
    const failMap = () => {
      if (!cancelled) showFallbackMap();
    };
    (window as any).gm_authFailure = () => {
      previousAuthFailure?.();
      dismissGoogleMapsErrorUi(mapContainerRef.current);
      if (!cancelled) setMapPreviewSettled(true);
    };
    (async () => {
      const key = await getApiKey();
      if (!key || cancelled) { failMap(); return; }
      const loaded = await loadGoogleMaps(key);
      if (!loaded || cancelled || !hasGoogleMapsConstructor() || googleMapUnavailableRef.current) { failMap(); return; }
      if (!mapContainerRef.current) { failMap(); return; }

      const initStyle = (localStorage.getItem("zivo:mapStyle") || "light") as "light" | "dark" | "satellite";
      const map = new google.maps.Map(mapContainerRef.current, {
        center: userLocation || DEFAULT_CENTER,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        backgroundColor: "#f5f5f5",
        mapTypeId: initStyle === "satellite" ? "satellite" : "roadmap",
        styles: initStyle === "dark" ? DARK_MAP_STYLES : initStyle === "satellite" ? [] : LIGHT_MAP_STYLES,
      });
      mapRef.current = map;
      const syncMapZoom = () => {
        if (!cancelled) setMapZoom(map.getZoom() ?? 13);
      };
      const syncMapViewport = () => {
        if (cancelled) return;
        syncMapZoom();
        const bounds = map.getBounds();
        if (!bounds) return;
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const nextBounds = {
          north: northEast.lat(),
          east: northEast.lng(),
          south: southWest.lat(),
          west: southWest.lng(),
        };
        setMapViewportBounds((prev) => {
          if (
            prev &&
            Math.abs(prev.north - nextBounds.north) < 0.0005 &&
            Math.abs(prev.south - nextBounds.south) < 0.0005 &&
            Math.abs(prev.east - nextBounds.east) < 0.0005 &&
            Math.abs(prev.west - nextBounds.west) < 0.0005
          ) {
            return prev;
          }
          return nextBounds;
        });
      };
      syncMapZoom();
      map.addListener("zoom_changed", syncMapZoom);
      map.addListener("idle", syncMapViewport);
      map.addListener("click", () => {
        if (Date.now() < searchOpenGuardRef.current) return;
        setSelectedStore(null);
        setSearchOpen(false);
        setSearchQuery("");
      });
      if (!cancelled) setMapReady(true);
    })();
    const stuckTimeout = setTimeout(() => {
      if (!cancelled && !mapRef.current) showFallbackMap();
    }, 20000);
    return () => {
      cancelled = true;
      clearTimeout(stuckTimeout);
      (window as any).gm_authFailure = previousAuthFailure;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

    const checkGoogleMapsErrorUi = () => {
      if (dismissGoogleMapsErrorUi(mapContainerRef.current)) {
        setMapPreviewSettled(true);
      }
    };

    checkGoogleMapsErrorUi();
    const observer = new MutationObserver(checkGoogleMapsErrorUi);
    observer.observe(document.body, { childList: true, subtree: true });

    const timeoutIds = [500, 1500, 3500].map((delay) => window.setTimeout(checkGoogleMapsErrorUi, delay));
    return () => {
      observer.disconnect();
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [showFallbackMap]);

  useEffect(() => {
    if (mapReady || mapError) {
      setMapPreviewSettled(true);
      return;
    }
    const timeout = window.setTimeout(() => setMapPreviewSettled(true), 3500);
    return () => window.clearTimeout(timeout);
  }, [mapError, mapReady]);

  /* User dot */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;
    if (userDotRef.current) userDotRef.current.setMap(null);
    userDotRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: userLocation,
      icon: { url: makeUserDotIcon(), scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) },
      title: "You",
      zIndex: 999,
    });
  }, [mapReady, userLocation]);

  /* Radius circle */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (radiusCircleRef.current) { radiusCircleRef.current.setMap(null); radiusCircleRef.current = null; }
    if (!radiusKm || !effectiveCenter) return;
    radiusCircleRef.current = new google.maps.Circle({
      map: mapRef.current,
      center: effectiveCenter,
      radius: radiusKm * 1000,
      strokeColor: "#6366f1",
      strokeOpacity: 0.55,
      strokeWeight: 2,
      fillColor: "#6366f1",
      fillOpacity: 0.07,
      zIndex: 10,
    });
  }, [mapReady, radiusKm, effectiveCenter]);

  /* Store markers */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }
    markersRef.current.forEach((m) => setClusterMarkerMap(m, null));
    markersRef.current = [];
    pulseCirclesRef.current.forEach((c) => c.setMap(null));
    pulseCirclesRef.current = [];
    if (!filteredStores.length) return;

    const shouldAnimateMarkers = filteredStores.length <= 80;
    const focusedMap =
      mapZoom >= 12 ||
      !!activeGroup ||
      activeCategory !== "all" ||
      !!searchCenter ||
      !!filterSearchQuery ||
      filteredStores.length <= FOCUSED_PHOTO_MARKER_LIMIT;
    // Non-lodging stores can still use profile-photo pins when the directory
    // is small enough. Lodging uses price pills instead so the hotel map reads
    // like a booking surface instead of a wall of tiny thumbnails.
    const shouldRenderLogoMarkers = filteredStores.length <= LOGO_MARKER_MAX_STORE_COUNT;
    const scopedPhotoStoreIds = new Set(markerPhotoScopeStores.map((store) => store.id));
    const shouldAdjustCamera = markerCameraKeyRef.current !== markerCameraKey;
    markerCameraKeyRef.current = markerCameraKey;
    const bounds = new google.maps.LatLngBounds();
    filteredStores.forEach((store) => {
      const pos = { lat: store.latitude, lng: store.longitude };
      bounds.extend(pos);
      const color = getCategoryColor(store.category);
      const bg = getCategoryBg(store.category);
      const storeIsNew = isNewStore(store);
      const storeHasDeal = dealStoreIds.has(store.id);
      const isSelectedMarker = selectedStoreId === store.id;
      const lodgingPrice = lodgingPriceMap[store.id];
      const priceMarkerLabel = isLodgingCategory(store.category) ? lodgingPrice?.priceLabel || "View" : null;
      const shouldUsePriceMarker = !!priceMarkerLabel;
      const shouldUsePhotoMarker = !shouldUsePriceMarker && (isSelectedMarker || shouldRenderLogoMarkers || scopedPhotoStoreIds.has(store.id));

      const logoMarkerUrls = shouldUsePhotoMarker
        ? uniqueStoreImageUrls(
            [...(markerImageFallbackMap[store.id] || []), ...getStoreImageCandidates(store)]
              .map((url) => optimizeImage(url, 96, "square"))
              .filter((url): url is string => Boolean(url)),
          )
        : [];
      const selectStoreFromMarker = () => {
        if (tripModeRef.current) {
          setTripStops((prev) => {
            const exists = prev.find((s) => s.id === store.id);
            if (exists) return prev.filter((s) => s.id !== store.id);
            if (prev.length >= 8) { toast.error("Max 8 stops in one trail"); return prev; }
            toast.success(`Added: ${store.name}`, { duration: 1500 });
            return [...prev, store];
          });
          return;
        }
        setSelectedStore(store);
        setSheetDismissed(false);
        setSheetExpanded(false);
        mapRef.current?.panTo(pos);
        const z = mapRef.current?.getZoom() || 14;
        if (z < 14) mapRef.current?.setZoom(14);
      };

      // Map is set by the clusterer when zoomed in; leaving it null here
      // keeps individual pins hidden until the clusterer expands their cell.
      let marker: ClusterMarker;
      const AdvancedMarkerElement = canUseAdvancedMapMarkers(mapRef.current)
        ? google.maps.marker.AdvancedMarkerElement
        : undefined;
      if (logoMarkerUrls.length && AdvancedMarkerElement) {
        const markerContent = createPhotoMarkerElement(
          logoMarkerUrls,
          color,
          bg,
          getCategoryIcon(store.category),
          storeIsNew,
          storeHasDeal,
          store.name,
          isSelectedMarker,
        );
        markerContent.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectStoreFromMarker();
        });
        markerContent.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          selectStoreFromMarker();
        });
        marker = new AdvancedMarkerElement({
          position: pos,
          title: store.name,
          content: markerContent,
          zIndex: isSelectedMarker ? 260 : 100,
        });
      } else {
        const priceMarkerSpec = shouldUsePriceMarker
          ? makePriceMarkerIcon(priceMarkerLabel || "", isSelectedMarker, storeHasDeal || !!lodgingPrice?.discountLabel, storeIsNew)
          : null;
        const legacyMarker = new google.maps.Marker({
          position: pos,
          icon: priceMarkerSpec
            ? {
                url: priceMarkerSpec.url,
                scaledSize: new google.maps.Size(priceMarkerSpec.width, priceMarkerSpec.height),
                anchor: new google.maps.Point(priceMarkerSpec.anchorX, priceMarkerSpec.anchorY),
              }
            : {
                url: makeMarkerIcon(getCategoryIcon(store.category), color, bg, storeIsNew, storeHasDeal),
                scaledSize: new google.maps.Size(isSelectedMarker ? 44 : 36, isSelectedMarker ? 52 : 43),
                anchor: new google.maps.Point(isSelectedMarker ? 22 : 18, isSelectedMarker ? 52 : 43),
              },
          title: store.name,
          clickable: true,
          cursor: "pointer",
          optimized: false,
          animation: shouldAnimateMarkers ? google.maps.Animation.DROP : undefined,
          zIndex: isSelectedMarker ? 260 : 100,
        });
        marker = legacyMarker;
        if (!priceMarkerSpec && logoMarkerUrls.length) setLegacyMarkerPhotoIcon(legacyMarker, logoMarkerUrls);
      }

      marker.addListener("click", selectStoreFromMarker);
      if (AdvancedMarkerElement && marker instanceof AdvancedMarkerElement) {
        marker.addListener("gmp-click" as "click", selectStoreFromMarker);
      }
      markersRef.current.push(marker);

      if (liveStoreMap[store.id]) {
        const pulse = new google.maps.Circle({
          map: mapRef.current!,
          center: pos,
          radius: 40,
          strokeOpacity: 0,
          fillColor: "#10b981",
          fillOpacity: 0.2,
          zIndex: 50,
        });
        pulseCirclesRef.current.push(pulse);
      }
    });

    // Group nearby pins into clusters so 600+ markers don't overlap into a wall
    // of pins. The renderer reuses our brand palette so clusters feel native.
    //
    // Use a tighter radius than the library default (60px) so a filtered
    // hotel view breaks into price pills sooner instead of staying as one
    // giant wall of count bubbles.
    clustererRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers: markersRef.current,
      // Tighter radius + lower maxZoom than the library defaults (60px /
      // zoom 16). At 24px the clusterer breaks apart dense groups earlier,
      // and maxZoom 12 means the city-level zoom (13+) shows real hotel
      // choices instead of only count bubbles.
      algorithm: new SuperClusterAlgorithm({ radius: 24, maxZoom: 12 }),
      // Explicit click handler — fit the camera to the cluster's actual
      // bounds so the user actually sees the 78 stores inside, not a 2-step
      // zoom that leaves the cluster still aggregated. For tight bounds
      // (a stack of 2-3 pins on the same block) we instead step in 2 levels
      // so we don't overshoot to street-level.
      onClusterClick: (_, cluster) => {
        const map = mapRef.current;
        if (!map) return;
        const bounds = cluster.bounds;
        const currentZoom = map.getZoom() ?? 11;
        // Tight cluster (no meaningful spread) → step in toward center.
        const ne = bounds?.getNorthEast?.();
        const sw = bounds?.getSouthWest?.();
        const isTight = !ne || !sw
          ? true
          : (Math.abs(ne.lat() - sw.lat()) < 0.002 && Math.abs(ne.lng() - sw.lng()) < 0.002);
        if (isTight) {
          map.panTo(cluster.position);
          map.setZoom(Math.min(currentZoom + 3, 18));
          return;
        }
        // Spread cluster → frame the full set with comfortable padding so
        // the sheet/header don't crop the outer pins. Crucially, when the
        // cluster's bounds are already close to the visible viewport, the
        // resulting fit-zoom can match (or be lower than) the current zoom,
        // and the cluster stays at the same density. So we wait for `idle`
        // and enforce a minimum step-in of +1 zoom level to guarantee the
        // tap always feels like it did something.
        map.panTo(cluster.position);
        map.fitBounds(bounds!, { top: 160, bottom: 220, left: 40, right: 40 });
        google.maps.event.addListenerOnce(map, "idle", () => {
          let z = map.getZoom() ?? 12;
          if (z <= currentZoom) z = currentZoom + 1;       // ensure we always advance
          if (z > 18) z = 18;                              // never punch past street-level
          if (z !== map.getZoom()) map.setZoom(z);
        });
      },
      renderer: {
        render: ({ count, position }: Cluster) => {
          const tone = count >= 100 ? "#0ea5e9" : count >= 25 ? "#10b981" : "#6366f1";
          const size = count >= 100 ? 56 : count >= 25 ? 48 : 42;
          // Scale the count label with the bubble so 100+ doesn't look
          // cramped against the 14-and-under bubbles.
          const fontSize = count >= 100 ? 18 : count >= 25 ? 16 : 14;
          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${tone}" fill-opacity="0.22"/>
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="${tone}"/>
              <text x="${size / 2}" y="${size / 2 + (fontSize / 2 - 1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#fff" font-family="system-ui">${count}</text>
            </svg>`;
          return new google.maps.Marker({
            position,
            icon: {
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(size / 2, size / 2),
            },
            zIndex: 200,
            clickable: true,
            cursor: "pointer",
            optimized: false,
            title: `${count} stores · tap to zoom in`,
          });
        },
      },
    });

    let intervalId: any = null;
    if (pulseCirclesRef.current.length) {
      let tick = 0;
      intervalId = window.setInterval(() => {
        tick += 1;
        pulseCirclesRef.current.forEach((c, idx) => {
          const phase = (tick + idx * 4) % 24;
          c.setRadius(30 + phase * 4);
          c.setOptions({ fillOpacity: Math.max(0.04, 0.24 - phase * 0.008) });
        });
      }, 90);
    }

    // Only include the user's location in the bounds when the user is
    // actually near the visible stores. Otherwise (e.g. simulator default
    // location, or user filtered to a faraway group like "Hotel & Resort"),
    // including it would zoom the map out to world-view. When a category or
    // group filter is active, always focus on the filtered pins only.
    const hasExplicitFilter = activeGroup || activeCategory !== "all";
    if (userLocation && !hasExplicitFilter) {
      const nearestKm = Math.min(
        ...filteredStores.map((s) =>
          distanceMiles(userLocation, { lat: s.latitude, lng: s.longitude }) * 1.609344,
        ),
      );
      if (nearestKm <= 200) bounds.extend(userLocation);
    }
    if (filteredStores.length > 1) {
      // Cap how far out the camera goes. With 600+ stores nationwide a raw
      // fitBounds would zoom to see all of Southeast Asia and (worse) drag
      // the center toward any outlier coordinate. So we only auto-fit when
      // the user has expressed a focus (filtered, searched, or located).
      // Otherwise we keep a steady country-level view on Cambodia so the
      // map opens looking deliberate, not chaotic.
      const hasUserFocus = !!searchCenter || !!userLocation || !!activeGroup || activeCategory !== "all";
      if (hasUserFocus) {
        if (shouldAdjustCamera) {
          const isFiltered = !!activeGroup || activeCategory !== "all" || !!filterSearchQuery;
          // When a category/group filter is active but we don't know where
          // the user is (no GPS, no explicit search center), `fitBounds`
          // across 900+ Cambodia hotels lands the camera in the rural
          // centroid where no hotels exist. Instead, jump straight to
          // Phnom Penh metro at zoom 13 — that's where the bulk of stores
          // are and the user immediately sees photo pins. They can pan to
          // other cities (Siem Reap / Sihanoukville) from there.
          if (isFiltered && !userLocation && !searchCenter) {
            mapRef.current.setCenter(DEFAULT_CENTER);
            mapRef.current.setZoom(13);
          } else {
            mapRef.current.fitBounds(bounds, { top: 140, bottom: 260, left: 30, right: 30 });
            const desiredMax = isFiltered ? 13 : 11;
            google.maps.event.addListenerOnce(mapRef.current, "idle", () => {
              const z = mapRef.current?.getZoom() ?? 0;
              if (z > desiredMax) mapRef.current?.setZoom(desiredMax);
              else if (z < 7) mapRef.current?.setZoom(7);
            });
          }
        }
      } else {
        if (shouldAdjustCamera) {
          mapRef.current.setCenter(DEFAULT_CENTER);
          mapRef.current.setZoom(13);
        }
      }
    } else if (filteredStores.length === 1 && shouldAdjustCamera) {
      mapRef.current.setCenter({ lat: filteredStores[0].latitude, lng: filteredStores[0].longitude });
      mapRef.current.setZoom(15);
    }

    return () => { if (intervalId !== null) window.clearInterval(intervalId); };
  }, [mapReady, filteredStores, userLocation, liveStoreMap, dealStoreIds, activeGroup, activeCategory, searchCenter, markerCameraKey, mapZoom, selectedStoreId, filterSearchQuery, markerImageFallbackMap, markerPhotoScopeStores, lodgingPriceMap]);

  /* Trip stop numbered markers + polyline */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    tripMarkersRef.current.forEach((m) => m.setMap(null));
    tripMarkersRef.current = [];
    if (tripPolylineRef.current) { tripPolylineRef.current.setMap(null); tripPolylineRef.current = null; }

    tripStops.forEach((store, idx) => {
      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: store.latitude, lng: store.longitude },
        icon: {
          url: makeTripStopIcon(idx + 1),
          scaledSize: new google.maps.Size(40, 48),
          anchor: new google.maps.Point(20, 48),
        },
        zIndex: 300,
      });
      tripMarkersRef.current.push(marker);
    });

    if (tripStops.length >= 2) {
      const path = [
        ...(userLocation ? [userLocation] : []),
        ...tripStops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      ];
      tripPolylineRef.current = new google.maps.Polyline({
        map: mapRef.current!,
        path,
        strokeColor: "#4f46e5",
        strokeWeight: 3,
        strokeOpacity: 0.75,
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5 },
          offset: "100%",
          repeat: "80px",
        }],
      });
    }
  }, [mapReady, tripStops, userLocation]);

  /* Auto-focus / auto-trail / shared-trail via deep link */
  useEffect(() => {
    const lookupStores = stores.length ? stores : filteredStores;
    if (!lookupStores.length) return;
    const map = mapRef.current;
    const canMoveMap = !!(mapReady && map && (window as any).google?.maps);

    if (trailParam === "1" && !tripModeRef.current) {
      setTripMode(true);
    }

    /* ?stops=id1,id2,id3 — load a shared shopping trail */
    if (stopsParam) {
      const ids = stopsParam.split(",");
      const stops = ids.map((id) => lookupStores.find((s) => s.id === id)).filter(Boolean) as StorePin[];
      if (stops.length > 0) {
        setTripMode(true);
        setTripStops((prev) => {
          const existing = new Set(prev.map((s) => s.id));
          const missing = stops.filter((s) => !existing.has(s.id));
          return missing.length ? [...prev, ...missing].slice(0, 8) : prev;
        });
        if (canMoveMap) {
          const bounds = new google.maps.LatLngBounds();
          stops.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
          map.fitBounds(bounds, { top: 140, bottom: 220, left: 30, right: 30 });
        }
      }
    }
    /* ?focus=id — select or add to trail */
    if (focusId) {
      const target = lookupStores.find((s) => s.id === focusId || s.slug === focusId);
      if (!target) return;
      if (trailParam === "1") {
        setTripMode(true);
        setTripStops((prev) => prev.find((s) => s.id === target.id) ? prev : [...prev, target]);
      } else {
        setSelectedStore(target);
      }
      if (canMoveMap) {
        map.panTo({ lat: target.latitude, lng: target.longitude });
        map.setZoom(15);
      }
    }
  }, [mapReady, focusId, trailParam, stopsParam, filteredStores, stores]);

  const clearMapArea = useCallback(() => {
    setSearchCenter(null);
    setChosenCityName("");
    writeSavedCityAnchor(null);
  }, []);

  const selectCityAnchor = useCallback((city: CityAnchor) => {
    const nextCenter = { lat: city.lat, lng: city.lng };
    setChosenCityName(city.name);
    writeSavedCityAnchor(city);
    setSearchCenter(nextCenter);
    if (mapRef.current) {
      mapRef.current.panTo(nextCenter);
      mapRef.current.setZoom(12);
    }
    setLocationNoticeDismissed(true);
    toast.success(`Showing stores around ${city.name}`);
  }, []);

  const activeFiltersCount = (openNowOnly ? 1 : 0) + (trendingOnly ? 1 : 0) + (dealsOnly ? 1 : 0) + (smartFilterActive ? 1 : 0) + (activeCategory !== "all" ? 1 : 0) + (activeGroup ? 1 : 0) + (radiusKm ? 1 : 0);
  const clearAllFilters = useCallback(() => {
    setActiveCategory("all");
    setActiveGroup("");
    setOpenNowOnly(false);
    setTrendingOnly(false);
    setDealsOnly(false);
    setSmartFilterActive(false);
    setRadiusKm(null);
    clearMapArea();
    setSelectedStore(null);
  }, [clearMapArea]);

  const hiddenStoreCount = Math.max(0, allStores.length - stores.length);
  const headerTitle = chosenCityName || (searchCenter ? "Stores in this area" : "Explore Stores");
  const mapScopeLabel = chosenCityName || (searchCenter ? "this area" : "");
  const baseHeaderCountText =
    !searchQuery.trim() && !searchCenter && activeFiltersCount === 0 && hiddenStoreCount > 0
      ? `${stores.length} on map`
      : `${filteredStores.length} ${filteredStores.length === 1 ? "store" : "stores"}`;

  const handleZoom = useCallback((direction: 1 | -1) => {
    const map = mapRef.current;
    if (mapReady && map) {
      const currentZoom = map.getZoom() ?? 13;
      map.setZoom(Math.max(3, Math.min(20, currentZoom + direction)));
      return;
    }

    setFallbackZoom((current) => {
      const next = current + direction * 0.2;
      return Math.max(0.8, Math.min(1.8, Number(next.toFixed(2))));
    });
  }, [mapReady]);

  const handleFallbackStoreSelect = useCallback((store: StorePin) => {
    if (tripModeRef.current) {
      setTripStops((prev) => {
        const exists = prev.find((s) => s.id === store.id);
        if (exists) return prev.filter((s) => s.id !== store.id);
        if (prev.length >= 8) {
          toast.error("Max 8 stops in one trail");
          return prev;
        }
        toast.success(`Added: ${store.name}`, { duration: 1500 });
        return [...prev, store];
      });
      return;
    }

    setSelectedStore(store);
    setSheetExpanded(false);
  }, []);

  const openSearchPanel = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    searchOpenGuardRef.current = Date.now() + 1000;
    setSelectedStore(null);
    setDrawerStore(null);
    setSearchOpen(true);
    const next = new URLSearchParams(urlParams);
    next.set("search", "1");
    if (searchQuery.trim()) next.set("q", searchQuery.trim());
    setUrlParams(next, { replace: true });
    window.setTimeout(() => {
      setSearchOpen(true);
      searchInputRef.current?.focus();
    }, 180);
  }, [searchQuery, setUrlParams, urlParams]);

  const closeSearchPanel = useCallback(() => {
    const next = new URLSearchParams(urlParams);
    next.delete("search");
    next.delete("q");
    searchOpenGuardRef.current = 0;
    setSearchOpen(false);
    setSearchQuery("");
    setUrlParams(next, { replace: true });
  }, [setUrlParams, urlParams]);

  const goToStoreList = useCallback((event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const p = new URLSearchParams();
    p.set("map", "1");
    const listCenter = isCambodiaMapCenter(searchCenter) ? searchCenter : null;
    if (listCenter) {
      p.set("lat", String(listCenter.lat));
      p.set("lng", String(listCenter.lng));
      if (chosenCityName) p.set("city", chosenCityName);
    }
    if (radiusKm) p.set("radius", String(radiusKm));
    if (activeCategory !== "all") p.set("cat", activeCategory);
    if (searchQuery.trim()) p.set("q", searchQuery.trim());
    if (openNowOnly) p.set("open", "1");
    navigate(`/store-map/list${p.toString() ? `?${p.toString()}` : ""}`);
  }, [activeCategory, chosenCityName, navigate, openNowOnly, radiusKm, searchCenter, searchQuery]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) {
      setFallbackZoom(1);
      setSelectedStore(null);
      return;
    }
    const center = userLocation || effectiveCenter;
    if (center) { mapRef.current.panTo(center); mapRef.current.setZoom(14); }
    else if (filteredStores.length) {
      const bounds = new google.maps.LatLngBounds();
      filteredStores.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      mapRef.current.fitBounds(bounds, { top: 140, bottom: 260, left: 30, right: 30 });
    }
    setSelectedStore(null);
  }, [filteredStores, userLocation, effectiveCenter]);

  const handleLocateMe = useCallback(() => {
    if (!("geolocation" in navigator) || !mapRef.current) {
      setLocationDenied(true);
      setLocationErrorCode("unsupported");
      setLocationNoticeDismissed(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationDenied(false);
        setLocationErrorCode(null);
        setLocationNoticeDismissed(false);
        clearMapArea();
        mapRef.current?.panTo(loc);
        mapRef.current?.setZoom(15);
      },
      (err) => {
        const code: LocationErrorCode =
          err.code === err.PERMISSION_DENIED ? "denied"
            : err.code === err.POSITION_UNAVAILABLE ? "unavailable"
            : err.code === err.TIMEOUT ? "timeout"
            : "unavailable";
        setLocationDenied(true);
        setLocationErrorCode(code);
        setLocationNoticeDismissed(false);
        const message = code === "denied"
          ? "Location blocked — tap How to enable"
          : code === "timeout"
          ? "Could not get your location in time — try again"
          : "Location unavailable — check your device settings";
        toast.error(message, {
          action: { label: "How?", onClick: () => setLocationHelpOpen(true) },
        });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [clearMapArea]);

  const handleShareSelected = useCallback(async (s: StorePin) => {
    const dist = effectiveCenter
      ? distanceMiles(effectiveCenter, { lat: s.latitude, lng: s.longitude })
      : undefined;
    try {
      const result = await shareStoreWithCard(s as any, {
        distanceMi: dist,
        categoryLabel: getCategoryLabel(s.category),
      });
      if (result.mode === "shared-with-image") toast.success("Shared with image");
      else if (result.mode === "shared-link") toast.success("Link shared");
      else if (result.mode === "downloaded") toast.success("Image saved · link copied");
      else if (result.mode === "copied") toast.success("Link copied to clipboard");
      else if (result.mode === "error") toast.error("Couldn't share");
    } catch {
      try {
        await navigator.clipboard.writeText(buildShopDeepLink(s.slug));
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Couldn't share");
      }
    }
  }, [effectiveCenter]);

  const handleToggleFavoriteSelected = useCallback(async (s: StorePin) => {
    const res = await toggleFavorite(s.id, {
      name: s.name, slug: s.slug, category: s.category, logo_url: s.logo_url,
    });
    if (res.needsAuth) { toast.error("Sign in to save favorites"); return; }
    if (res.error) { toast.error("Couldn't update favorites"); return; }
    if (res.queued) { toast.success(res.added ? "Saved offline" : "Removed offline"); return; }
    toast.success(res.added ? "Added to favorites" : "Removed from favorites");
  }, [toggleFavorite]);

  const handleRideSelected = useCallback((s: StorePin, promo?: string | null) => {
    trackInitiateCheckout({
      eventId: `ride-book-${s.id}-${Date.now()}`,
      externalId: currentUserId || undefined,
      sourceType: "ride_book", sourceTable: "store_profiles", sourceId: s.id,
      payload: { destination: s.address || s.name, promo: promo || undefined },
    });
    const qp = new URLSearchParams({
      destination: s.address || s.name,
      destLat: String(s.latitude),
      destLng: String(s.longitude),
    });
    if (promo) qp.set("promo", promo);
    navigate(`/rides/hub?${qp.toString()}`);
  }, [currentUserId, navigate]);

  const handleExitTripMode = useCallback(() => {
    setTripMode(false);
    setTripStops([]);
  }, []);

  const handleToggleTripMode = useCallback(() => {
    try { localStorage.setItem("zivo:map:trail-seen", "1"); } catch { /* noop */ }
    setTrailSeen(true);
    if (tripMode) {
      handleExitTripMode();
      return;
    }
    setTripMode(true);
    setSelectedStore(null);
    toast("Trail mode is on. Tap pins or rows to add up to 8 stops.", { duration: 3500 });
  }, [handleExitTripMode, tripMode]);

  const cycleMapStyle = useCallback(() => {
    setMapStyle((style) => style === "light" ? "dark" : style === "dark" ? "satellite" : "light");
  }, []);

  const handleShareTrail = useCallback(() => {
    if (!tripStops.length) return;
    const ids = tripStops.map((s) => s.id).join(",");
    const url = `${window.location.origin}/store-map?trail=1&stops=${encodeURIComponent(ids)}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Trail link copied! Share it with anyone."))
      .catch(() => toast.error("Couldn't copy to clipboard"));
  }, [tripStops]);;

  /* ── Nearby row component (vertical list item) ── */
  const NearbyRow = ({ store, rank }: { store: StorePin; rank: number }) => {
    const km = getDistKm(store, effectiveCenter);
    const isOpen = isOpenNow(store.hours);
    const todayHours = getTodayHours(store.hours);
    const isLive = !!liveStoreMap[store.id];
    const checkins = checkInMap[store.id] || 0;
    const isInTrip = tripStops.some((s) => s.id === store.id);
    const storeIsNew = isNewStore(store);
    const storeHasDeal = dealStoreIds.has(store.id);
    const isVisited = visitedStoreIds.has(store.id);
    const isSelectedRow = selectedStoreId === store.id;
    const closingSoon = isOpen === true ? getClosingSoonMinutes(store.hours) : null;
    const rowPrice = isLodgingCategory(store.category) ? lodgingPriceMap[store.id] : null;

    const handleTap = () => {
      if (tripMode) {
        setTripStops((prev) => {
          const exists = prev.find((s) => s.id === store.id);
          if (exists) return prev.filter((s) => s.id !== store.id);
          if (prev.length >= 8) { toast.error("Max 8 stops"); return prev; }
          toast.success(`Added: ${store.name}`, { duration: 1500 });
          return [...prev, store];
        });
        return;
      }
      setSelectedStore(store);
      setSheetExpanded(false);
      mapRef.current?.panTo({ lat: store.latitude, lng: store.longitude });
      const z = mapRef.current?.getZoom() || 14;
      if (z < 14) mapRef.current?.setZoom(14);
    };

    return (
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Select ${store.name}`}
        whileTap={{ scale: 0.98 }}
        onClick={handleTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTap();
          }
        }}
        className={`group grid w-full grid-cols-[28px_48px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border/10 px-4 py-3 text-left transition-colors ${
          isSelectedRow
            ? "bg-primary/[0.08] ring-2 ring-inset ring-primary/20"
            : isInTrip
            ? "bg-indigo-50/85"
            : "hover:bg-muted/40"
        }`}
      >
        {/* Rank badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-muted-foreground ring-1 ring-border/40">
          {rank}
        </span>

        {/* Logo */}
        <div className="relative shrink-0">
          <StoreLogo store={store} size="sm" />
          {isLive && <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-black leading-tight text-foreground">{store.name}</p>
            {isInTrip && <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="shrink-0">{getCategoryLabel(store.category)}</span>
            {store.address && (
              <>
                <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">·</span>
                <span className="truncate">{store.address}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {isOpen !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
              }`}>
                {isOpen ? "Open" : "Closed"}
              </span>
            )}
            {typeof store.rating === "number" && store.rating > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500"
                aria-label={`Rated ${store.rating.toFixed(1)} out of 10`}
              >
                <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                {store.rating.toFixed(1)}
                <span className="text-muted-foreground font-medium">/10</span>
              </span>
            )}
            {isOpen === true && todayHours && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {todayHours}
              </span>
            )}
            {isOpen === false && (() => {
              const o = getOpensAt(store.hours);
              return o ? (
                <span className="text-[10px] font-semibold text-amber-600 shrink-0">Opens {o}</span>
              ) : null;
            })()}
            {checkins > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-foreground">
                <Users className="w-2.5 h-2.5" />{checkins} here
              </span>
            )}
            {storeIsNew && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <Sparkles className="w-2.5 h-2.5" />New
              </span>
            )}
            {storeHasDeal && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <Tag className="w-2.5 h-2.5" />Deal
              </span>
            )}
            {closingSoon !== null && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                ⚠ {closingSoon}min left
              </span>
            )}
            {isVisited && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-foreground text-background shrink-0">
                ✓ Visited
              </span>
            )}
          </div>
        </div>

        <div className="flex min-w-[64px] shrink-0 flex-col items-end gap-1">
          {rowPrice?.priceLabel && (
            <div className="rounded-xl bg-primary/10 px-2 py-1 text-right ring-1 ring-primary/15">
              <p className="text-[12px] font-black leading-none text-primary">{rowPrice.priceLabel}</p>
              {rowPrice.discountLabel && (
                <p className="mt-0.5 max-w-[64px] truncate text-[9px] font-bold leading-none text-emerald-700">
                  {rowPrice.discountLabel}
                </p>
              )}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); handleToggleFavoriteSelected(store); }}
            aria-label={isFavorite(store.id) ? "Remove from favorites" : "Save to favorites"}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted/60 touch-manipulation"
          >
            <Heart className={`h-4 w-4 transition-colors ${isFavorite(store.id) ? "fill-rose-500 text-rose-500" : "text-muted-foreground/35"}`} />
          </motion.button>

          {/* Distance — hidden when location unknown or store is >200 km away
              (showing "12,644 km / 506 h" makes the app look broken) */}
          {km !== null && km <= 200 && (
            <div className="text-right">
              <p className="text-[12px] font-black leading-tight" style={{ color: getCategoryColor(store.category) }}>
                {formatDistLabel(km)}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground">{formatWalkMin(km)}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const tripKm = totalTripKm(tripStops, userLocation);
  const canShowNearbySheet = !selectedStore && !drawerStore && nearbySorted.length > 0 && !(tripMode && tripStops.length > 0);
  const showSheet = canShowNearbySheet && !sheetDismissed;
  const showSheetRestore = canShowNearbySheet && sheetDismissed;
  // On mobile the bottom sheet was eating ~47% of the viewport. Showing 2
  // peek rows by default (instead of 3) buys back ~56px of map breathing
  // room while still hinting at "tap Expand for more". On large screens
  // we still surface 3 rows since real estate is plentiful.
  const sheetRows = sheetExpanded ? Math.min(nearbySorted.length, 8) : 2;
  /* Sheet height estimate. Components stacked vertically:
       - Recently viewed strip   ~58px (only when visible)
       - Combined filter+sort row ~54px
       - Sheet header            ~58px
       - Store rows              rows * 72px
     The previous formula only counted header + rows and the FAB column
     ended up tucked behind the sheet on mobile, hiding Locate/Layers. */
  const sheetChromeHeight = (showRecentRow ? 58 : 0) + 54 + 58 + 12;
  const sheetHeight = sheetChromeHeight + sheetRows * 72;

  /* FAB bottom offset adapts to what's visible */
  const fabBottom = drawerStore ? 140 : showSheet ? sheetHeight + 88 + 8 : tripStops.length > 0 ? 220 : 140;
  const hideFloatingMapControls = showSheet && sheetExpanded && !tripMode;

  return (
    <div className="fixed inset-0 z-0 bg-background lg:flex lg:flex-col">
      <SEOHead
        title="Store Map – ZIVO"
        description="Find stores, restaurants, and businesses near you on the interactive map. Filter by category, check hours, save favorites, and get directions."
      />
      <div className="hidden lg:block relative z-[1200] shrink-0">
        <NavBar />
      </div>
      <div className="relative lg:flex-1 h-full lg:h-auto">

        {/* ── Header ── */}
        <div className="absolute top-0 left-0 right-0 z-[1100]"
          style={{ paddingTop: "max(var(--zivo-safe-top,0px), 12px)" }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-background/90 via-background/45 to-transparent" />
          <div className="relative px-3 pb-1 sm:px-4 lg:px-6">
            <AnimatePresence mode="wait">
              {tripMode ? (
                <motion.div key="trail"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-2.5 rounded-[28px] border border-indigo-200/50 bg-indigo-600/95 px-3 py-2.5 text-white shadow-[0_18px_50px_rgba(79,70,229,0.28)] ring-1 ring-black/5 backdrop-blur-xl"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Route className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white leading-tight">Shopping Trail</p>
                    <p className="text-[11px] font-semibold text-indigo-50 mt-0.5">
                      {tripStops.length === 0 ? "Tap stores on map to add stops" :
                        `${tripStops.length} stop${tripStops.length > 1 ? "s" : ""} · ${formatDistLabel(tripKm)} total`}
                    </p>
                  </div>
                  <button type="button" onClick={handleExitTripMode}
                    aria-label="Exit shopping trail"
                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : searchPanelOpen ? (
                <motion.div key="search"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl shadow-lg border border-border/20"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <Search className="w-4 h-4 shrink-0 text-primary" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search stores"
                      placeholder="Search stores..."
                      autoFocus
                      className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
                    />
                    <button type="button" onClick={closeSearchPanel}
                      aria-label="Close search"
                      className="p-1.5 rounded-full bg-muted/60 text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Recent searches — shown when query is empty */}
                  {!searchQuery.trim() && recentSearches.length > 0 && (
                    <div className="border-t border-border/15 px-4 pt-2.5 pb-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent searches</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button type="button"
                            key={term}
                            onClick={() => setSearchQuery(term)}
                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 border border-border/20 text-[12px] font-semibold text-foreground hover:bg-muted transition-colors"
                          >
                            <Search className="w-3 h-3 text-muted-foreground" />{term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Autocomplete suggestions */}
                  {autoSuggestions.length > 0 && (
                    <div className="border-t border-border/15">
                      {autoSuggestions.map((s) => (
                        <button type="button"
                          key={s.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => {
                            if (searchQuery.trim()) {
                              saveRecentSearch(searchQuery.trim());
                              setRecentSearches(getRecentSearches());
                            }
                            setSelectedStore(s);
                            setSearchOpen(false);
                            setSearchQuery("");
                            setSheetExpanded(false);
                            mapRef.current?.panTo({ lat: s.latitude, lng: s.longitude });
                            const z = mapRef.current?.getZoom() || 14;
                            if (z < 14) mapRef.current?.setZoom(14);
                          }}
                        >
                          <span className="text-lg shrink-0">{getCategoryIcon(s.category)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{s.name}</p>
                            {s.address && <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>}
                          </div>
                          {dealStoreIds.has(s.id) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Deal</span>
                          )}
                          {isNewStore(s) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">New</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim() && activeFiltersCount > 0 && (
                    <div className="border-t border-border/15 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          clearAllFilters();
                          searchInputRef.current?.focus();
                        }}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-[12px] font-bold text-primary"
                      >
                        <Search className="h-3.5 w-3.5" /> Search all stores
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="title"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div
                    className="group flex min-h-[72px] items-center gap-2 rounded-[28px] border border-white/70 bg-card/95 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-black/5 backdrop-blur-2xl cursor-pointer sm:min-h-[76px] sm:gap-3 sm:px-3.5"
                    role="button"
                    tabIndex={0}
                    aria-label="Search stores and browse all stores"
                    onClick={openSearchPanel}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openSearchPanel(e);
                    }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); smartBack(); }}
                      aria-label="Go back"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-muted/70 transition hover:bg-muted sm:h-[52px] sm:w-[52px] sm:rounded-[22px]"
                    >
                      <ArrowLeft className="h-5 w-5 text-foreground" />
                    </motion.button>
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 min-[420px]:flex sm:h-[52px] sm:w-[52px] sm:rounded-[22px]">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[15px] font-black leading-tight text-foreground sm:text-[17px]">
                        {headerTitle}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-muted-foreground">
                        <span>{baseHeaderCountText}</span>
                        {hiddenStoreCount > 0 && !searchCenter && activeFiltersCount === 0 && !searchQuery.trim() && (
                          <span className="text-amber-600">{hiddenStoreCount} missing map pins</span>
                        )}
                        {mapScopeLabel && <span className="text-primary">{mapScopeLabel}</span>}
                        {radiusKm && <span>within {radiusKm < 1 ? radiusKm * 1000 + " m" : radiusKm + " km"}</span>}
                        {openNowOnly && <span className="text-emerald-600">{openNowCount} open now</span>}
                        {trendingCount > 0 && <span className="text-emerald-600">{trendingCount} live</span>}
                        {searchCenter && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); clearMapArea(); }} className="text-primary font-bold underline">reset area</button>
                        )}
                      </p>
                    </div>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={goToStoreList}
                      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-foreground px-3 text-[12px] font-black text-background shadow-sm sm:h-12 sm:px-4 sm:text-[13px]"
                      aria-label="See all map stores"
                    >
                      <List className="w-4 h-4" /> <span className="hidden min-[430px]:inline">See all</span>
                    </motion.button>
                    <span
                      aria-hidden="true"
                      className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/70 transition group-hover:bg-muted min-[430px]:flex"
                    >
                      <Search className="w-[18px] h-[18px] text-muted-foreground" />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category chips */}
          {!tripMode && (
            <div className="relative overflow-x-auto scrollbar-hide px-3 pb-1 pt-2.5 sm:px-4 lg:px-6">
              <div className="flex gap-2 w-max">
                {/* Clear all active filters */}
                {activeFiltersCount > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={clearAllFilters}
                    className="min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm bg-secondary text-foreground border-border shadow-sm touch-manipulation"
                  >
                    <X className="w-3.5 h-3.5" /> Clear ({activeFiltersCount})
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.95 }}
                  type="button"
                  aria-pressed={activeCategory === "all" && !activeGroup && !trendingOnly}
                  onClick={() => { setActiveCategory("all"); setActiveGroup(""); setTrendingOnly(false); setSmartFilterActive(false); setSelectedStore(null); }}
                  className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap border backdrop-blur-sm touch-manipulation ${
                    activeCategory === "all" && !activeGroup && !trendingOnly
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                  }`}
                >
                  All ({stores.length})
                </motion.button>
                {/* Preset category groups — single tap filters multiple related categories */}
                {CATEGORY_GROUPS.map((g) => {
                  const count = stores.filter((s) => g.categories.includes(s.category)).length;
                  if (count === 0) return null;
                  const isActive = activeGroup === g.id;
                  return (
                    <motion.button whileTap={{ scale: 0.95 }} key={g.id}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${g.label} category group — ${count} stores`}
                      onClick={() => {
                        setActiveGroup(isActive ? "" : g.id);
                        setActiveCategory("all");
                        setTrendingOnly(false);
                        setSmartFilterActive(false);
                        setSelectedStore(null);
                      }}
                      className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm touch-manipulation ${
                        isActive ? "bg-foreground text-background border-foreground shadow-md" : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                      }`}
                    >
                      <span className="text-[13px]">{g.emoji}</span> {g.label} ({count})
                    </motion.button>
                  );
                })}
                <motion.button whileTap={{ scale: openNowCount === 0 && !openNowOnly ? 1 : 0.95 }}
                  type="button"
                  aria-pressed={openNowOnly}
                  aria-label={
                    openNowOnly
                      ? "Showing open stores only — tap to clear"
                      : openNowCount === 0
                      ? "No open stores for the current filters"
                      : `Filter to ${openNowCount} stores open now`
                  }
                  disabled={openNowCount === 0 && !openNowOnly}
                  onClick={() => { setOpenNowOnly((v) => !v); setSelectedStore(null); }}
                  className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm touch-manipulation ${
                    openNowOnly
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : openNowCount === 0
                      ? "bg-muted/65 text-muted-foreground/60 border-border/20 shadow-sm"
                      : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Open now ({openNowCount})
                </motion.button>
                {/* Best for now — time-aware smart filter */}
                {(() => { const { label, emoji } = getBestForNow(); return (
                  <motion.button whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-pressed={smartFilterActive}
                    onClick={() => { setSmartFilterActive((v) => !v); setActiveCategory("all"); setTrendingOnly(false); setSelectedStore(null); }}
                    className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm touch-manipulation ${
                      smartFilterActive ? "bg-violet-600 text-white border-violet-600 shadow-md" : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                    }`}
                  >
                    <span className="text-[13px]">{emoji}</span> {label}
                  </motion.button>
                ); })()}
                {trendingCount > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-pressed={trendingOnly}
                    onClick={() => { setTrendingOnly((v) => !v); setActiveCategory("all"); setSelectedStore(null); }}
                    className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm touch-manipulation ${
                      trendingOnly ? "bg-orange-500 text-white border-orange-500 shadow-md" : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Trending ({trendingCount})
                  </motion.button>
                )}
                {dealStoreIds.size > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    type="button"
                    aria-pressed={dealsOnly}
                    onClick={() => { setDealsOnly((v) => !v); setActiveCategory("all"); setSelectedStore(null); }}
                    className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm ${
                      dealsOnly ? "bg-rose-500 text-white border-rose-500 shadow-md" : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" /> Deals ({dealStoreIds.size})
                  </motion.button>
                )}
                {usedCategories.map((cat) => {
                  const count = stores.filter((s) => s.category === cat.value).length;
                  const isActive = activeCategory === cat.value;
                  return (
                    <motion.button whileTap={{ scale: 0.95 }} key={cat.value}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${cat.label} category — ${count} stores`}
                      onClick={() => { setActiveCategory(isActive ? "all" : cat.value); setTrendingOnly(false); setSmartFilterActive(false); setSelectedStore(null); }}
                      className={`min-h-[40px] px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border backdrop-blur-sm touch-manipulation ${
                        isActive ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card/90 text-muted-foreground border-border/30 shadow-sm"
                      }`}
                    >
                      <span className="text-[13px]">{getCategoryIcon(cat.value)}</span>
                      {cat.label} ({count})
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Map controls ── */}
        {!drawerStore && !hideFloatingMapControls && (
          <div className="absolute right-4 z-[1500] flex flex-col gap-2.5 transition-all duration-300"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ bottom: `${fabBottom}px` }}>
            <div className="hidden overflow-hidden rounded-full border border-border/20 bg-card/95 shadow-lg backdrop-blur-xl lg:block">
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => handleZoom(1)}
                aria-label="Zoom in"
                className="flex h-12 w-12 items-center justify-center text-foreground hover:bg-muted"
              >
                <Plus className="h-5 w-5" />
              </motion.button>
              <div className="mx-2 h-px bg-border/60" />
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => handleZoom(-1)}
                aria-label="Zoom out"
                className="flex h-12 w-12 items-center justify-center text-foreground hover:bg-muted"
              >
                <Minus className="h-5 w-5" />
              </motion.button>
            </div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                onClick={handleToggleTripMode}
                className={`w-12 h-12 rounded-full shadow-lg border relative ${
                  tripMode
                    ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                    : "border-border/20 bg-card/95 backdrop-blur-xl text-foreground hover:bg-muted"
                }`}
                size="icon" variant="secondary"
                aria-pressed={tripMode}
                aria-label={tripMode ? "Exit shopping trail" : "Plan a multi-stop shopping trail"}
                title={tripMode ? "Exit trail mode" : "Plan a trail — tap stores to chain stops"}
              >
                <Route className="w-5 h-5" />
                {tripStops.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
                    {tripStops.length}
                  </span>
                )}
                {!tripMode && tripStops.length === 0 && !trailSeen && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-card animate-pulse" aria-hidden="true" />
                )}
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  // Smart locate: jump to GPS when available, otherwise re-fit
                  // the current filtered set so a panned map snaps back into view.
                  if (userLocation) handleRecenter();
                  else handleLocateMe();
                }}
                className="w-12 h-12 rounded-full shadow-lg border border-border/20 bg-card/95 backdrop-blur-xl hover:bg-muted"
                style={{ color: userLocation ? "#4285F4" : undefined }}
                aria-label={userLocation ? "Re-center on me" : "Find my location"}
                title={userLocation ? "Re-center on me" : "Find my location"}
              >
                <Locate className="w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="secondary" size="icon"
                onClick={cycleMapStyle}
                className={`w-12 h-12 rounded-full shadow-lg border border-border/20 bg-card/95 backdrop-blur-xl hover:bg-muted relative ${
                  mapStyle !== "light" ? "text-primary border-primary/40" : "text-foreground"
                }`}
                aria-label={`Map style: ${mapStyle}. Tap to change.`}
                title={`Map style: ${mapStyle === "light" ? "Light" : mapStyle === "dark" ? "Dark" : "Satellite"}`}
              >
                <Layers className="w-5 h-5" />
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${
                    mapStyle === "light" ? "bg-amber-400" : mapStyle === "dark" ? "bg-slate-700" : "bg-emerald-500"
                  }`}
                />
              </Button>
            </motion.div>
          </div>
        )}

        {/* ── Map ── */}
        <div ref={mapContainerRef} className={`absolute inset-0 ${mapError ? "pointer-events-none opacity-0" : ""}`} style={{ touchAction: "none" }} />

        {(mapError || (!mapReady && filteredStores.length > 0)) && (
          <div className="absolute inset-0 z-[400]">
            <MapFallbackCanvas
              stores={nearbySorted.length > 0 ? nearbySorted : stores}
              selectedStoreId={selectedStore?.id}
              loading={!mapReady && !mapError && !mapPreviewSettled}
              zoom={fallbackZoom}
              onSelect={handleFallbackStoreSelect}
            />
          </div>
        )}

        {/* Map loading overlay — visible from first paint so the user
            never sees a blank white screen while the SDK + key resolve. */}
        {!mapReady && !mapError && filteredStores.length === 0 && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#f5f5f5]">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 animate-pulse">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Loading map…</p>
            <p className="text-[11px] text-muted-foreground mt-1">Finding stores near you</p>
            {/* Indeterminate shimmer bar — sliding-half pattern.
                The Tailwind `shimmer` keyframe (translateX -100% → 100%)
                animates the inner half-width bar across the track. */}
            <div className="mt-4 w-40 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full animate-shimmer" />
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        <AnimatePresence>
          {mapReady && filteredStores.length === 0 && !selectedStore && !drawerStore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-[160px] left-1/2 -translate-x-1/2 z-[1400] w-[270px]"
            >
              {(() => {
                const { title, hint } = getEmptyReason(openNowOnly, trendingOnly, smartFilterActive, searchQuery, activeCategory, activeGroup, radiusKm);
                const actions: Array<{ label: string; run: () => void; primary?: boolean }> = [];
                if (searchQuery.trim()) actions.push({ label: "Clear search", run: () => setSearchQuery(""), primary: true });
                if (openNowOnly) actions.push({ label: "Show closed too", run: () => setOpenNowOnly(false), primary: !actions.length });
                if (activeGroup) {
                  const groupLabel = CATEGORY_GROUPS.find((g) => g.id === activeGroup)?.label || "group";
                  actions.push({ label: `Clear ${groupLabel}`, run: () => setActiveGroup(""), primary: !actions.length });
                } else if (activeCategory !== "all") {
                  actions.push({ label: "Clear category", run: () => setActiveCategory("all"), primary: !actions.length });
                }
                if (radiusKm) actions.push({ label: "Expand radius", run: () => setRadiusKm(null), primary: !actions.length });
                if (actions.length || activeFiltersCount > 0) {
                  actions.push({
                    label: "Reset all",
                    run: () => {
                      clearAllFilters();
                      setSearchQuery("");
                    },
                  });
                }
                return (
                  <div className="bg-card/96 backdrop-blur-xl rounded-2xl px-5 py-4 shadow-xl border border-border/20 text-center">
                    <p className="text-[15px] font-bold text-foreground">{title}</p>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{hint}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.run}
                          className={`min-h-[34px] rounded-full px-3.5 text-[12px] font-bold shadow-sm ${
                            action.primary
                              ? "bg-primary text-primary-foreground"
                              : "border border-border/40 bg-muted/50 text-foreground"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── GPS denied banner with city quick-jump ── */}
        <AnimatePresence>
          {locationDenied && !userLocation && !locationNoticeDismissed && !tripMode && !searchPanelOpen && !searchCenter && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-[128px] left-3 right-3 z-[1600] overflow-hidden rounded-[28px] border border-amber-200/80 bg-card/95 p-3 text-[12px] font-semibold text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5 backdrop-blur-2xl sm:left-4 sm:right-4 lg:left-6 lg:right-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-amber-100 text-amber-700 ring-1 ring-amber-200/70">
                  <Locate className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-black leading-tight text-foreground">
                    {locationErrorCode === "denied"
                      ? "Pick a city to start"
                      : locationErrorCode === "unsupported"
                      ? "Pick a city to start"
                      : locationErrorCode === "timeout"
                      ? "Pick a city or retry"
                      : "Choose your map area"}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-snug text-muted-foreground">
                    {locationErrorCode === "denied"
                      ? `GPS is blocked in ${locationHelpGuide.browser}. Choose a city now, or enable location later.`
                      : locationErrorCode === "unsupported"
                      ? "This browser does not support GPS. Choose a city to browse nearby stores."
                      : locationErrorCode === "timeout"
                      ? "GPS took too long to respond. Retry, or choose a city below."
                      : "Location is off. Pick a city or retry to unlock distance-sorted results."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {locationErrorCode !== "unsupported" && (
                    <button type="button"
                      onClick={() => { handleLocateMe(); }}
                      className="min-h-[40px] rounded-full bg-foreground px-4 text-[12px] font-black text-background touch-manipulation"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Dismiss location notice"
                    onClick={() => setLocationNoticeDismissed(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {locationErrorCode === "denied" && (
                <div className="mt-2 rounded-2xl bg-amber-50/70 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:ring-amber-500/20">
                  <button
                    type="button"
                    onClick={() => setLocationHelpOpen((v) => !v)}
                    aria-expanded={locationHelpOpen}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-bold text-amber-800 dark:text-amber-200"
                  >
                    <span>How to enable on {locationHelpGuide.platform} · {locationHelpGuide.browser}</span>
                    {locationHelpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {locationHelpOpen && (
                    <ol className="space-y-1.5 px-3 pb-3 text-[11.5px] font-semibold text-amber-900/90 dark:text-amber-100/90">
                      {locationHelpGuide.steps.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-black text-amber-900 dark:bg-amber-500/30 dark:text-amber-100">
                            {i + 1}
                          </span>
                          <span className="leading-snug">
                            {step.label}
                            {step.detail && (
                              <span className="block text-[11px] font-medium text-amber-800/80 dark:text-amber-200/70">
                                {step.detail}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                      {locationHelpGuide.settingsUrl && (
                        <li className="pt-1 text-[11px] font-medium text-amber-800/80 dark:text-amber-200/70">
                          Or paste this into the address bar:
                          <code className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">{locationHelpGuide.settingsUrl}</code>
                        </li>
                      )}
                    </ol>
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
                {CITY_ANCHORS.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => selectCityAnchor(city)}
                    className="min-h-[34px] shrink-0 rounded-full border border-border/40 bg-muted/50 px-3.5 py-1 text-[12px] font-bold text-foreground transition hover:bg-muted touch-manipulation"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── "You're far from these stores" banner ── */}
        <AnimatePresence>
          {farFromAllStores && !locationDenied && !searchPanelOpen && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-[128px] left-3 right-3 z-[1600] flex items-center gap-2 rounded-2xl bg-sky-500/95 backdrop-blur-xl shadow-lg px-4 py-2.5 text-white text-[12px] font-semibold"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="flex-1">No stores near you — showing distant results</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Expandable nearby sheet ── */}
        <AnimatePresence>
          {showSheet && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              drag="y"
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 180 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={handleSheetDragEnd}
              className="absolute left-3 right-3 z-[1400] overflow-hidden rounded-[28px] border border-white/70 bg-card/95 shadow-[0_22px_70px_rgba(15,23,42,0.20)] ring-1 ring-black/5 backdrop-blur-2xl sm:left-4 sm:right-4 lg:left-6 lg:right-6"
              style={{ bottom: "88px" }}
            >
              <button
                type="button"
                aria-label="Drag down to hide nearby stores"
                className="flex w-full cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
                onPointerDown={(event) => sheetDragControls.start(event.nativeEvent)}
              >
                <span className="h-1 w-10 rounded-full bg-muted-foreground/20" aria-hidden="true" />
              </button>
              {/* Recently viewed strip */}
              {showRecentRow && (
                <div className="border-b border-border/10 px-4 pb-2 pt-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Recently viewed</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {recentStores.map((s) => (
                      <button type="button"
                        key={s.id}
                        onClick={() => { setSelectedStore(s); setSheetExpanded(false); mapRef.current?.panTo({ lat: s.latitude, lng: s.longitude }); const z = mapRef.current?.getZoom() || 14; if (z < 14) mapRef.current?.setZoom(14); }}
                        className="flex-shrink-0 flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 border border-border/20 rounded-xl pl-1 pr-2.5 py-1 transition-colors"
                      >
                        <StoreLogo store={s} size="xs" />
                        <span className="text-[11px] font-semibold text-foreground whitespace-nowrap max-w-[90px] truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tripMode && tripStops.length === 0 && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-bold text-indigo-900">
                  <Route className="h-4 w-4 shrink-0 text-indigo-600" />
                  Trail mode is on · tap a pin or row to add stops
                </div>
              )}

              {/* Combined sort + radius row. Sort chips lead because
                  they're always meaningful; radius chips trail (and are
                  hidden when no GPS / city is selected, since "5km from
                  what?" makes no sense without an anchor). On mobile the
                  whole strip stays in one row to free up map real estate. */}
              <div
                role="group"
                aria-label="Sort and filter stores"
                className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 pb-2 pt-3"
              >
                <div role="radiogroup" aria-label="Sort stores" className="flex items-center gap-2 shrink-0">
                  {([
                    { id: "distance", label: "Near", icon: <Navigation className="w-3 h-3" /> },
                    { id: "rating", label: "Top", icon: <Star className="w-3 h-3" /> },
                    { id: "newest", label: "New", icon: <Sparkles className="w-3 h-3" /> },
                  ] as Array<{ id: StoreSortMode; label: string; icon: React.ReactNode }>).map((opt) => {
                    const isActive = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isActive ? "true" : "false"}
                        aria-label={opt.id === "distance" ? "Sort by distance" : opt.id === "rating" ? "Sort by top rated" : "Sort by newest"}
                        onClick={() => {
                          if (opt.id === "distance" && !effectiveCenter) { handleLocateMe(); return; }
                          setSortBy(opt.id);
                          setVisibleCount(STORE_LIST_PAGE);
                        }}
                        className={`min-h-[34px] px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all touch-manipulation flex items-center gap-1 ${
                          isActive
                            ? "bg-foreground text-background border-foreground"
                            : "bg-muted/50 text-muted-foreground border-border/30"
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {effectiveCenter && (
                  <>
                    <span aria-hidden="true" className="h-5 w-px bg-border/40 mx-1 shrink-0" />
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {RADIUS_OPTIONS.map((opt) => (
                      <button type="button"
                        key={String(opt.value)}
                        onClick={() => setRadiusKm(opt.value)}
                        aria-pressed={radiusKm === opt.value}
                        className={`min-h-[34px] px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all touch-manipulation ${
                          radiusKm === opt.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-muted/50 text-muted-foreground border-border/30"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </>
                )}
                {sheetExpanded && (
                  <>
                    <span aria-hidden="true" className="h-5 w-px bg-border/40 mx-1 shrink-0" />
                    <button
                      type="button"
                      onClick={handleToggleTripMode}
                      aria-pressed={tripMode}
                      aria-label={tripMode ? "Exit shopping trail" : "Plan a shopping trail"}
                      className={`flex min-h-[34px] w-9 shrink-0 items-center justify-center rounded-full border transition touch-manipulation ${
                        tripMode
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-border/30 bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Route className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (userLocation) handleRecenter();
                        else handleLocateMe();
                      }}
                      aria-label={userLocation ? "Re-center on me" : "Find my location"}
                      className="flex min-h-[34px] w-9 shrink-0 items-center justify-center rounded-full border border-border/30 bg-muted/50 text-muted-foreground transition hover:bg-muted touch-manipulation"
                    >
                      <Locate className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cycleMapStyle}
                      aria-label={`Map style: ${mapStyle}. Tap to change.`}
                      className={`flex min-h-[34px] w-9 shrink-0 items-center justify-center rounded-full border transition touch-manipulation ${
                        mapStyle !== "light"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/30 bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Sheet header */}
              <div className="flex min-h-[52px] items-center gap-2 border-t border-border/10 bg-gradient-to-r from-muted/25 to-transparent px-4 py-2">
                <button
                  type="button"
                  onClick={() => setSheetExpanded((v) => !v)}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left touch-manipulation"
                >
                  <p className="min-w-0 flex-1 text-[15px] font-black leading-tight text-foreground">
                    {(() => {
                      const groupLabel = activeGroup ? CATEGORY_GROUPS.find((g) => g.id === activeGroup)?.label : null;
                      const nearestKm = effectiveCenter && nearbySorted.length > 0
                        ? distanceMiles(effectiveCenter, { lat: nearbySorted[0].latitude, lng: nearbySorted[0].longitude }) * 1.609344
                        : null;
                      const isActuallyNearby = nearestKm != null && nearestKm <= 50;
                      const noun = groupLabel ?? "store";
                      const plural = nearbySorted.length === 1 ? noun : `${noun}s`;
                      if (radiusKm) return `${nearbySorted.length} ${plural} within ${radiusKm < 1 ? radiusKm * 1000 + " m" : radiusKm + " km"}`;
                      if (isActuallyNearby) return `${nearbySorted.length} ${plural} nearby`;
                      return `${nearbySorted.length} ${plural}`;
                    })()}
                    {tripMode && tripStops.length > 0
                      ? <span className="ml-1.5 text-[12px] font-bold text-muted-foreground">· {tripStops.length} stops · {formatTripEta(tripKm)}</span>
                      : tripMode
                      ? <span className="ml-1.5 text-[12px] font-bold text-muted-foreground">· tap to add to trail</span>
                      : null}
                  </p>
                  {nearbySorted.length > 2 && (
                    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                      {sheetExpanded ? <><ChevronDown className="w-3.5 h-3.5" /> Collapse</> : <><ChevronUp className="w-3.5 h-3.5" /> Expand</>}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Hide nearby stores"
                  title="Hide nearby stores"
                  onClick={closeNearbySheet}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground touch-manipulation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Store rows — infinite scroll. Collapsed view scrolls
                  through the first page (10 rows) internally; expanded view
                  unlocks the full pageable list with auto-load on scroll. */}
              <div
                ref={listScrollRef}
                className="overflow-y-auto transition-all duration-300"
                style={{ maxHeight: sheetExpanded ? "55vh" : "44vh" }}
                onScroll={handleListScroll}
              >
                {(sheetExpanded
                  ? nearbySorted.slice(0, visibleCount)
                  : nearbySorted.slice(0, STORE_LIST_PAGE)
                ).map((store, idx) => (
                  <NearbyRow key={store.id} store={store} rank={idx + 1} />
                ))}
                {!sheetExpanded && nearbySorted.length > STORE_LIST_PAGE && (
                  <button
                    type="button"
                    onClick={() => setSheetExpanded(true)}
                    className="w-full py-3 text-[12px] font-semibold text-primary hover:bg-muted/40 border-t border-border/10"
                  >
                    Show more · {nearbySorted.length - STORE_LIST_PAGE} remaining
                  </button>
                )}
                {sheetExpanded && visibleCount < nearbySorted.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => Math.min(n + STORE_LIST_PAGE, nearbySorted.length))}
                    className="w-full py-3 text-[12px] font-semibold text-primary hover:bg-muted/40 border-t border-border/10"
                  >
                    Show {Math.min(STORE_LIST_PAGE, nearbySorted.length - visibleCount)} more
                  </button>
                )}
                {sheetExpanded && nearbySorted.length > 0 && visibleCount >= nearbySorted.length && (
                  <div className="py-3 text-center text-[11px] text-muted-foreground border-t border-border/10">
                    End of list · {nearbySorted.length} {nearbySorted.length === 1 ? "store" : "stores"}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSheetRestore && (
            <motion.button
              type="button"
              initial={{ y: 56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 56, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={restoreNearbySheet}
              className="absolute bottom-[88px] left-3 right-3 z-[1400] mx-auto flex min-h-[46px] w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/70 bg-card/95 px-4 text-[13px] font-black text-foreground shadow-[0_16px_45px_rgba(15,23,42,0.20)] ring-1 ring-black/5 backdrop-blur-2xl"
            >
              <ChevronUp className="h-4 w-4 text-primary" />
              <span>Show stores</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{nearbySorted.length}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Shopping Trail panel ── */}
        <AnimatePresence>
          {tripMode && tripStops.length > 0 && !drawerStore && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-[80px] left-3 right-3 z-[1600]"
            >
              <div className="overflow-hidden rounded-[24px] border border-white/70 bg-card/95 shadow-[0_22px_70px_rgba(15,23,42,0.22)] ring-1 ring-black/5 backdrop-blur-2xl">
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      <Route className="w-4 h-4 text-indigo-600" />
                      Your Shopping Trail
                    </p>
                    <span className="text-[11px] text-muted-foreground font-bold">
                      {formatDistLabel(tripKm)} · {formatTripEta(tripKm)}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {tripStops.map((stop, idx) => (
                      <div key={stop.id} className="flex-shrink-0 flex items-center gap-1.5">
                        {idx > 0 && <ChevronRight className="w-3 h-3 text-foreground shrink-0" />}
                        <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-muted/50 px-2.5 py-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-[11px] font-semibold text-foreground whitespace-nowrap max-w-[100px] truncate">{stop.name}</p>
                          <button type="button"
                            onClick={() => setTripStops((prev) => prev.filter((s) => s.id !== stop.id))}
                            className="text-foreground hover:text-red-500"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex border-t border-border/20">
                  <button type="button" className="flex-1 py-3 text-[12px] font-bold text-red-500 hover:bg-red-50" onClick={handleExitTripMode}>
                    Clear
                  </button>
                  <div className="w-px bg-border/30" />
                  {tripStops.length >= 3 && (
                    <>
                      <button type="button"
                        className="flex-1 py-3 text-[12px] font-bold text-foreground hover:bg-muted/50 flex items-center justify-center gap-1"
                        onClick={() => {
                          const optimized = optimizeTrailStops(tripStops, userLocation);
                          setTripStops(optimized);
                          toast.success("Route optimized for shortest walk");
                        }}
                      >
                        ✦ Optimize
                      </button>
                      <div className="w-px bg-border/30" />
                    </>
                  )}
                  <button type="button"
                    className="flex-1 py-3 text-[12px] font-bold text-primary hover:bg-primary/5 flex items-center justify-center gap-1"
                    onClick={handleShareTrail}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <div className="w-px bg-border/30" />
                  <button type="button"
                    className="flex-1 py-3 text-[12px] font-bold text-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5"
                    onClick={() => navigateShoppingTrail(tripStops, userLocation)}
                  >
                    <Navigation className="w-3.5 h-3.5" /> Navigate
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Selected store card — drag down to close, drag up to open detail */}
        <AnimatePresence>
          {selectedStore && !drawerStore && !tripMode && (
            <motion.div
              initial={{ y: 140, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 140, opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              drag="y"
              dragDirectionLock
              // Generous bottom slack so the user can peek the map underneath
              // by dragging the card down without immediately dismissing it —
              // when they release short of the threshold it springs back to
              // its anchored position. Top slack is smaller because dragging
              // up only needs to register a "show me more" intent.
              dragConstraints={{ top: -120, bottom: 400 }}
              dragElastic={0.3}
              dragMomentum={false}
              dragTransition={{ bounceStiffness: 380, bounceDamping: 30 }}
              onDragEnd={(_, info: PanInfo) => {
                // Down past commit threshold → dismiss. The threshold is
                // intentionally large (≈ a third of the card height) so a
                // peek that returns to position doesn't accidentally close.
                if (info.offset.y > 180 || info.velocity.y > 900) {
                  setSelectedStore(null);
                  return;
                }
                // Up past commit threshold → open the full detail page.
                if (info.offset.y < -80 || info.velocity.y < -800) {
                  navigate(getStorePublicPath(selectedStore));
                }
                // Anything in between → spring back to anchor (no action).
              }}
              className="absolute bottom-[100px] left-3 right-3 z-[1600] touch-pan-x"
            >
              <div
                className="rounded-[28px] overflow-hidden shadow-[0_24px_70px_rgba(15,23,42,0.24)] border border-white/70 bg-card/95 ring-1 ring-black/5 backdrop-blur-2xl active:scale-[0.99] transition-transform"
              >
                {/* Drag handle — hints that this sheet is swipeable */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 w-10 h-1 rounded-full bg-foreground/25" />
                {/* Inner click target — clicks open detail, drags don't trigger this */}
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(getStorePublicPath(selectedStore))}
                >
                {/* Gallery banner — first photo when available */}
                {selectedStoreGallery.length > 0 && (
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={selectedStoreGallery[0]}
                      alt={`${selectedStore.name} — photo`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                    {selectedStoreGallery.length > 1 && (
                      <span className="absolute bottom-2 right-3 text-[10px] font-bold text-white/90 bg-black/40 px-1.5 py-0.5 rounded-full">
                        +{selectedStoreGallery.length - 1} more
                      </span>
                    )}
                  </div>
                )}
                <div className="p-4 flex items-center gap-3.5">
                  <StoreLogo store={selectedStore} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[16px] truncate text-foreground leading-tight">{selectedStore.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: getCategoryColor(selectedStore.category) + "15", color: getCategoryColor(selectedStore.category) }}>
                        {getCategoryLabel(selectedStore.category)}
                      </span>
                      {typeof selectedStore.rating === "number" && selectedStore.rating > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500"
                          aria-label={`Rated ${selectedStore.rating.toFixed(1)} out of 10`}
                        >
                          <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                          {selectedStore.rating.toFixed(1)}
                          <span className="text-muted-foreground font-medium">/10</span>
                        </span>
                      )}
                      {(() => {
                        const km = getDistKm(selectedStore, effectiveCenter);
                        return km !== null ? (
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
                            <Timer className="w-3 h-3" /> {formatDistLabel(km)} · {formatWalkMin(km)}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {/* Today's hours */}
                    {(() => {
                      const t = getTodayHours(selectedStore.hours);
                      const isOpen = isOpenNow(selectedStore.hours);
                      if (t) {
                        if (isOpen) {
                          return (
                            <p className="text-[11px] mt-1 font-semibold flex items-center gap-1 text-emerald-600">
                              <Clock className="w-3 h-3 shrink-0" /> Today: {t}
                            </p>
                          );
                        }
                        const opensAt = getOpensAt(selectedStore.hours);
                        return (
                          <p className="text-[11px] mt-1 font-semibold flex items-center gap-1 text-red-500">
                            <Clock className="w-3 h-3 shrink-0" />
                            Closed{opensAt ? ` · Opens at ${opensAt}` : ""}
                          </p>
                        );
                      }
                      return selectedStore.address ? (
                        <p className="text-[11px] mt-1.5 truncate flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" /> {selectedStore.address}
                        </p>
                      ) : null;
                    })()}
                    {/* Closes soon warning */}
                    {(() => {
                      const mins = isOpenNow(selectedStore.hours) === true ? getClosingSoonMinutes(selectedStore.hours) : null;
                      return mins !== null ? (
                        <p className="text-[11px] mt-0.5 font-bold text-amber-600 flex items-center gap-1">
                          ⚠ Closes in {mins} min
                        </p>
                      ) : null;
                    })()}
                    {/* Check-in count */}
                    {checkInMap[selectedStore.id] > 0 && (
                      <p className="text-[11px] mt-0.5 flex items-center gap-1 text-foreground font-semibold">
                        <Users className="w-3 h-3" /> {checkInMap[selectedStore.id]} people here recently
                      </p>
                    )}
                    {/* GPS nudge */}
                    {!effectiveCenter && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); handleLocateMe(); }}
                        className="text-[11px] mt-0.5 text-primary font-semibold flex items-center gap-1"
                      >
                        <Locate className="w-3 h-3" /> Enable location for distance
                      </button>
                    )}
                    {/* Badges */}
                    {(isNewStore(selectedStore) || dealStoreIds.has(selectedStore.id) || visitedStoreIds.has(selectedStore.id)) && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {isNewStore(selectedStore) && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                            <Sparkles className="w-2.5 h-2.5" />New
                          </span>
                        )}
                        {dealStoreIds.has(selectedStore.id) && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            <Tag className="w-2.5 h-2.5" />Deal
                          </span>
                        )}
                        {visitedStoreIds.has(selectedStore.id) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-foreground text-background">
                            ✓ Visited
                          </span>
                        )}
                      </div>
                    )}
                    {isLodgingCategory(selectedStore.category) && (
                      <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                              {selectedLodgingRooms.length > 0
                                ? `${selectedLodgingRooms.length} room preview${selectedLodgingRooms.length === 1 ? "" : "s"}`
                                : selectedDisplayRoomPrice
                                ? "Best nightly price"
                                : "Room details"}
                            </p>
                            <p className="mt-0.5 text-[12px] font-black text-foreground">
                              {selectedDisplayRoomPrice ? (
                                <>
                                  Rooms from {selectedDisplayRoomPrice}
                                  <span className="font-semibold text-muted-foreground"> / night</span>
                                  {selectedDisplayRoomOriginalPrice && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground line-through">
                                      {selectedDisplayRoomOriginalPrice}
                                    </span>
                                  )}
                                </>
                              ) : (
                                "Room rates coming soon"
                              )}
                            </p>
                          </div>
                          {selectedDisplayRoomDiscountLabel && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                              {selectedDisplayRoomDiscountLabel}
                            </span>
                          )}
                        </div>
                        {selectedBestRoom && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-semibold text-muted-foreground">
                            <span className="truncate">{selectedBestRoom.name}</span>
                            {selectedBestRoom.max_guests && (
                              <span className="inline-flex items-center gap-0.5">
                                <Users className="h-3 w-3" /> {selectedBestRoom.max_guests}
                              </span>
                            )}
                            {selectedBestRoom.beds && <span className="truncate">{selectedBestRoom.beds}</span>}
                            {selectedBestRoom.room_type && <span className="truncate">{selectedBestRoom.room_type}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 border-t border-border/20">
                  <button type="button"
                    className="min-h-[46px] border-r border-border/20 text-[12px] font-black text-center text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackInitiateCheckout({
                        eventId: `ride-book-${selectedStore.id}-${Date.now()}`,
                        externalId: currentUserId || undefined,
                        sourceType: "ride_book", sourceTable: "store_profiles", sourceId: selectedStore.id,
                        payload: { destination: selectedStore.address || selectedStore.name },
                      });
                      navigate(`/rides/hub?destination=${encodeURIComponent(selectedStore.address || selectedStore.name)}&destLat=${selectedStore.latitude}&destLng=${selectedStore.longitude}`);
                    }}
                  >
                    <Car className="w-3.5 h-3.5" /> Ride There
                  </button>
                  <button type="button"
                    className="min-h-[46px] border-r border-border/20 text-[12px] font-black text-center text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInZivoMap(navigate, { lat: selectedStore.latitude, lng: selectedStore.longitude, label: selectedStore.name, address: selectedStore.address });
                    }}
                  >
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </button>
                  <button type="button"
                    className="min-h-[46px] text-[12px] font-black text-center text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5"
                    onClick={(e) => { e.stopPropagation(); navigate(getStorePublicPath(selectedStore)); }}
                  >
                    <Store className="w-3.5 h-3.5" /> View Store
                  </button>
                </div>

                <div className="grid grid-cols-3 border-t border-border/20 bg-muted/10">
                  <button type="button"
                    className="min-h-[42px] border-r border-border/20 text-[12px] font-bold text-foreground hover:bg-muted/60 flex items-center justify-center gap-1.5"
                    onClick={(e) => { e.stopPropagation(); handleShareSelected(selectedStore); }}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button type="button"
                    className="min-h-[42px] border-r border-border/20 text-[12px] font-bold text-foreground hover:bg-muted/60 flex items-center justify-center gap-1.5 disabled:opacity-45"
                    disabled={!selectedStore.phone}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedStore.phone) window.open(`tel:${selectedStore.phone}`, "_self");
                    }}
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                  <button type="button"
                    className="min-h-[42px] text-[12px] font-bold text-foreground hover:bg-muted/60 flex items-center justify-center gap-1.5"
                    onClick={(e) => { e.stopPropagation(); setDrawerStore(selectedStore); }}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" /> More
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 border-t border-border/20 bg-card/70">
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTripMode(true);
                      setTripStops([selectedStore]);
                      setSelectedStore(null);
                      toast("Trail started! Tap more stores to add stops", { duration: 3000 });
                    }}
                    className="flex-1 h-11 rounded-xl bg-foreground text-white inline-flex items-center justify-center gap-1.5 text-[12px] font-bold"
                  >
                    <Route className="w-4 h-4" /> Add to Trail
                  </button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleFavoriteSelected(selectedStore); }}
                    aria-pressed={isFavorite(selectedStore.id)}
                    className={`flex-1 h-11 rounded-xl inline-flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors ${
                      isFavorite(selectedStore.id) ? "bg-rose-500 text-white" : "bg-card text-foreground border border-border/40"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(selectedStore.id) ? "fill-current" : ""}`} />
                    {isFavorite(selectedStore.id) ? "Saved" : "Save"}
                  </button>
                </div>

                {shouldShowSelectedStoreCommerceSection(
                  selectedStore,
                  selectedStoreProducts.length,
                  !!liveStoreMap[selectedStore.id],
                ) && (
                  <div className="border-t border-border/20 px-3 py-3 bg-muted/20">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                      {selectedStore.category === "auto-repair"
                        ? "Quick Actions"
                        : selectedStoreProducts.length > 0
                          ? "Social-to-Sale"
                          : "Live activity"}
                    </p>
                    {liveStoreMap[selectedStore.id] && (
                      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live — purchase in last 30 min
                      </p>
                    )}
                    {selectedStore.category === "auto-repair" && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button type="button"
                          className="h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          onClick={(e) => { e.stopPropagation(); navigate(`/book/${selectedStore.slug}`); }}
                        >
                          <Wrench className="w-3.5 h-3.5" /> Book Service
                        </button>
                        <button type="button"
                          className="h-10 rounded-lg border border-primary/30 text-primary text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                          disabled={!selectedStore.phone}
                          onClick={(e) => { e.stopPropagation(); if (selectedStore.phone) window.open(`tel:${selectedStore.phone}`, "_self"); }}
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </button>
                      </div>
                    )}
                    {selectedStore.category !== "auto-repair" && selectedStoreProducts.length > 0 && (
                      <>
                        <select
                          value={selectedProductId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-xs"
                        >
                          {selectedStoreProducts.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (${Number(p.price).toFixed(2)})</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button type="button"
                            className="h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/reels", {
                                state: {
                                  openCreate: true,
                                  commerceLinkDraft: {
                                    linkType: "store_product",
                                    storeId: selectedStore.id, storeProductId: selectedProductId,
                                    checkoutPath: `${getStorePublicPath(selectedStore)}?buy=${selectedProductId}`,
                                    mapLat: selectedStore.latitude, mapLng: selectedStore.longitude, mapLabel: selectedStore.name,
                                  },
                                },
                              });
                            }}
                          >
                            Create Reel
                          </button>
                          <button type="button"
                            className="h-9 rounded-lg border border-primary/30 text-primary text-xs font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              trackInitiateCheckout({
                                eventId: `store-buy-${selectedStore.id}-${selectedProductId}-${Date.now()}`,
                                externalId: currentUserId || undefined,
                                sourceType: "store_product", sourceTable: "store_products", sourceId: selectedProductId,
                                payload: { store_id: selectedStore.id },
                              });
                              navigate(`${getStorePublicPath(selectedStore)}?buy=${selectedProductId}`);
                            }}
                          >
                            Buy Now
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {drawerStore && (
          <StoreDetailsDrawer
            store={drawerStore}
            userLoc={userLocation}
            categoryLabel={getCategoryLabel(drawerStore.category)}
            isFavorite={isFavorite(drawerStore.id)}
            isAuthed={isAuthed}
            isLive={!!liveStoreMap[drawerStore.id]}
            gallery={drawerStore.id === selectedStore?.id ? selectedStoreGallery : undefined}
            onClose={() => setDrawerStore(null)}
            onView={(s) => navigate(getStorePublicPath(s))}
            onRide={(s, promo) => handleRideSelected(s, promo)}
            onDirections={(s) => openInZivoMap(navigate, { lat: s.latitude, lng: s.longitude, label: s.name, address: s.address })}
            onShare={(s) => handleShareSelected(s)}
            onToggleFavorite={handleToggleFavoriteSelected}
            onAddToTrail={(s) => {
              setDrawerStore(null);
              setTripMode(true);
              setTripStops((prev) => prev.find((x) => x.id === s.id) ? prev : [...prev, s]);
              toast("Added to trail! Tap more stores to add stops.", { duration: 2500 });
            }}
            onPromoApplied={(code) => toast.success(`Promo ${code} ready for your next ride or order`)}
          />
        )}

        {!drawerStore && <ZivoMobileNav />}
      </div>
    </div>
  );
}
