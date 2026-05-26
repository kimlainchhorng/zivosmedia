/**
 * HotelResortDetailPage
 * Public-facing detail page for a single Hotel/Resort store.
 * Route: /hotel/:storeId
 *
 * Shows cover, name/location, amenities, rooms preview, contact actions.
 * Owners (when their own store is being viewed) get a quick "Open Admin
 * Dashboard" band at the bottom.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

const HotelAskChat = lazy(() => import("@/components/lodging/HotelAskChat"));
import { LodgingRoomDetailsModal } from "@/components/lodging/LodgingRoomDetailsModal";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SafeCaption from "@/components/social/SafeCaption";
import { motion } from "framer-motion";
import { format, addDays, differenceInCalendarDays, parseISO, isValid } from "date-fns";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Star from "lucide-react/dist/esm/icons/star";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Phone from "lucide-react/dist/esm/icons/phone";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { resolveMapsKey } from "@/lib/mapsKey";
import { optimizeImage } from "@/lib/optimizeImage";
import Globe from "lucide-react/dist/esm/icons/globe";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import Coffee from "lucide-react/dist/esm/icons/coffee";
import Waves from "lucide-react/dist/esm/icons/waves";
import Car from "lucide-react/dist/esm/icons/car";
import Footprints from "lucide-react/dist/esm/icons/footprints";
import Bike from "lucide-react/dist/esm/icons/bike";
import TrainFront from "lucide-react/dist/esm/icons/train-front";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Utensils from "lucide-react/dist/esm/icons/utensils";
import Dumbbell from "lucide-react/dist/esm/icons/dumbbell";
import Wind from "lucide-react/dist/esm/icons/wind";
import Tv from "lucide-react/dist/esm/icons/tv";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import Zap from "lucide-react/dist/esm/icons/zap";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import X from "lucide-react/dist/esm/icons/x";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Heart from "lucide-react/dist/esm/icons/heart";
import CalendarRange from "lucide-react/dist/esm/icons/calendar-range";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Settings from "lucide-react/dist/esm/icons/settings";
import Users from "lucide-react/dist/esm/icons/users";

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StoreRow {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  phone: string | null;
  setup_complete: boolean | null;
  slug?: string | null;
  gallery_images?: unknown;
  latitude?: number | null;
  longitude?: number | null;
}

const AMENITY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  "free wifi": Wifi,
  internet: Wifi,
  breakfast: Coffee,
  pool: Waves,
  "swimming pool": Waves,
  parking: Car,
  "free parking": Car,
  restaurant: Utensils,
  "restaurant on-site": Utensils,
  gym: Dumbbell,
  fitness: Dumbbell,
  ac: Wind,
  "air conditioning": Wind,
  tv: Tv,
  spa: Sparkles,
};

const HERO_ACTION_BUTTON_CLASS =
  "h-11 w-11 rounded-full bg-white/95 text-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition hover:bg-white dark:bg-zinc-950/80 dark:text-white dark:ring-white/15";

// Format a phone number nicely. KH local numbers (7–9 digits, no leading +)
// get +855 prefix and grouped as +855 XX XXX XXX.
const formatPhone = (raw?: string | null) => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    if (digits.length >= 10) {
      const cc = digits.slice(0, digits.length - 9);
      return `+${cc} ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
    }
    return trimmed;
  }
  const local = trimmed.replace(/[^\d]/g, "").replace(/^0+/, "");
  if (local.length >= 7 && local.length <= 9) {
    const a = local.slice(0, local.length - 6);
    const b = local.slice(local.length - 6, local.length - 3);
    const c = local.slice(local.length - 3);
    return `+855 ${a} ${b} ${c}`;
  }
  return trimmed;
};

const amenityIconFor = (label: string) => {
  const key = label.toLowerCase().trim();
  return AMENITY_ICON_MAP[key] || CheckCircle2;
};

// Convert "free_toiletries" / "non-smoking_room" -> "Free Toiletries"
const humanizeLabel = (raw: string) =>
  (raw || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const todayUTC = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseParamDate = (s: string | null) => {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
};

const compactTime = (value?: string | null) => value?.slice(0, 5) || "";

const checkInLabel = (from?: string | null, until?: string | null) => {
  const fromTime = compactTime(from);
  if (fromTime) return fromTime;
  const untilTime = compactTime(until);
  return untilTime ? `Until ${untilTime}` : "Ask property";
};

const checkOutLabel = (until?: string | null, from?: string | null) => {
  const untilTime = compactTime(until);
  if (untilTime) return untilTime;
  const fromTime = compactTime(from);
  return fromTime ? `From ${fromTime}` : "Ask property";
};

const stayWindowLabel = (profile: any) => (
  `Check-in ${checkInLabel(profile?.check_in_from, profile?.check_in_until)} / ` +
  `Check-out ${checkOutLabel(profile?.check_out_until, profile?.check_out_from)}`
);

function collectImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(input)) {
    return input.flatMap((item) => collectImageUrls(item));
  }
  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    return [
      ...collectImageUrls(record.url),
      ...collectImageUrls(record.src),
      ...collectImageUrls(record.path),
      ...collectImageUrls(record.publicUrl),
      ...collectImageUrls(record.public_url),
      ...collectImageUrls(record.image_url),
      ...collectImageUrls(record.imageUrl),
      ...collectImageUrls(record.photo_url),
      ...collectImageUrls(record.thumbnail_url),
    ];
  }
  return [];
}

function uniqueImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function RoomPhoto({ room, fallbackImages = [] }: { room: any; fallbackImages?: string[] }) {
  const photoCandidates = useMemo(() => {
    const roomPhotos = collectImageUrls(room.photos);
    const coverIdx = typeof room.cover_photo_index === "number" ? room.cover_photo_index : 0;
    const galleryFallback = roomPhotos.length ? [] : fallbackImages;
    return uniqueImageUrls([
      roomPhotos[coverIdx],
      ...collectImageUrls(room.cover_photo),
      ...collectImageUrls(room.gallery_images),
      ...collectImageUrls(room.image_urls),
      ...roomPhotos,
      ...galleryFallback,
    ].filter((url): url is string => !!url));
  }, [fallbackImages, room]);
  const photoKey = photoCandidates.join("|");
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => { setPhotoIndex(0); }, [photoKey]);
  const photo = photoCandidates[photoIndex];
  const photoSrc = useMemo(() => photo ? optimizeImage(photo, 320) || photo : null, [photo]);

  if (!photo || !photoSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-violet-500/10">
        <Hotel className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={photoSrc}
      alt={room.name}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => {
        setPhotoIndex((idx) => Math.min(idx + 1, photoCandidates.length));
      }}
    />
  );
}

interface PromoInfo {
  type: "percent" | "fixed";
  value: number;
  name: string;
}

export default function HotelResortDetailPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { data: ownerStore } = useOwnerStoreProfile();
  const isOwner = ownerStore?.id === storeId;
  const { format: formatCurrency } = useCurrency();
  const formatPrice = (cents: number) => { if (!cents || cents <= 0) return "—"; return formatCurrency(cents / 100, "USD"); };

  // Phase D: one aggregate RPC call replaces store + profile + rooms + promo +
  // reviews + reservations queries. The page reads everything from this single
  // payload — fewer round-trips, faster cold load.
  const detailQuery = useQuery({
    queryKey: ["hotel-detail-rpc", storeId],
    queryFn: async (): Promise<any> => {
      const { data, error } = await (supabase as any).rpc("get_hotel_detail", {
        p_store_id: storeId,
        p_check_in: null,
        p_check_out: null,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    staleTime: 60_000,
    gcTime: 300_000,
  });
  const detail = detailQuery.data;

  // Backwards-compatible shims keeping the old variable names referenced
  // throughout the rest of the component.
  const storeQuery = { data: (detail?.store ?? null) as StoreRow | null, isLoading: detailQuery.isLoading };
  const profileQuery = { data: (detail?.profile ?? null) as any, isLoading: detailQuery.isLoading };
  const roomsQuery = { data: ((detail?.rooms ?? []) as any[]), isLoading: detailQuery.isLoading };

  const store = storeQuery.data;
  const profile = profileQuery.data;
  const rooms = roomsQuery.data;
  const activeRooms = useMemo(() => rooms.filter((r: any) => r.is_active !== false), [rooms]);

  const location = store?.address || "";
  const galleryImages = useMemo<string[]>(() => {
    const roomPhotos = activeRooms.flatMap((room: any) => [
      ...collectImageUrls(room.photos),
      ...collectImageUrls(room.gallery_images),
      ...collectImageUrls(room.image_urls),
      ...collectImageUrls(room.cover_photo),
    ]);
    return uniqueImageUrls([
      ...collectImageUrls(store?.banner_url),
      ...collectImageUrls((store as any)?.gallery_images),
      ...roomPhotos,
    ]);
  }, [activeRooms, store]);
  const galleryKey = galleryImages.join("|");
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Set<string>>(() => new Set());
  const markPhotoFailed = useCallback((url: string | null | undefined) => {
    if (!url) return;
    setFailedPhotoUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);
  const lastGalleryKeyRef = useRef(galleryKey);
  useEffect(() => {
    if (lastGalleryKeyRef.current === galleryKey) return;
    lastGalleryKeyRef.current = galleryKey;
    setFailedPhotoUrls(new Set());
  }, [galleryKey]);
  const visibleGalleryImages = useMemo(
    () => galleryImages.filter((url) => !failedPhotoUrls.has(url)),
    [failedPhotoUrls, galleryImages],
  );
  const cover = visibleGalleryImages[0] || null;
  const logoUrl = collectImageUrls(store?.logo_url)[0] || null;
  const coverImageSrc = useMemo(() => cover ? optimizeImage(cover, 1024) || cover : null, [cover]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const profileImageCandidates = useMemo(
    () => uniqueImageUrls([logoUrl, cover, ...visibleGalleryImages].filter((url): url is string => !!url)),
    [cover, logoUrl, visibleGalleryImages],
  );
  const profileImageUrl = profileImageCandidates.find((url) => !failedPhotoUrls.has(url)) || null;
  const handleProfileImageError = () => {
    if (!profileImageUrl) return;
    markPhotoFailed(profileImageUrl);
  };
  useEffect(() => {
    if (visibleGalleryImages.length > 0 && lightboxIdx >= visibleGalleryImages.length) setLightboxIdx(0);
  }, [lightboxIdx, visibleGalleryImages.length]);
  const activeLightboxPhoto = visibleGalleryImages[lightboxIdx] || visibleGalleryImages[0] || "";
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    if (!storeId) return false;
    try {
      const set = new Set(JSON.parse(localStorage.getItem("hotel_faves") || "[]") as string[]);
      return set.has(storeId);
    } catch { return false; }
  });
  const toggleFavorite = () => {
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        const set = new Set(JSON.parse(localStorage.getItem("hotel_faves") || "[]") as string[]);
        if (next) set.add(storeId); else set.delete(storeId);
        localStorage.setItem("hotel_faves", JSON.stringify([...set]));
      } catch {}
      toast.success(next ? "Saved to favorites" : "Removed from favorites");
      return next;
    });
  };

  useEffect(() => {
    const el = heroSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [storeId]);
  const amenities = useMemo(() => {
    const merged = [
      ...(profile?.popular_amenities || []),
      ...(profile?.facilities || []),
    ];
    return Array.from(new Set(merged.map((a) => a?.toString().trim()).filter(Boolean))).slice(0, 12);
  }, [profile]);

  // Promo, reviews, and reservations are now sourced from the aggregate RPC.
  const promo = useMemo<PromoInfo | null>(() => {
    const list: any[] = Array.isArray(detail?.promotions) ? detail.promotions : [];
    let best: PromoInfo | null = null;
    for (const r of list) {
      const value = Number(r.discount_value) || 0;
      if (value <= 0) continue;
      const candidate: PromoInfo = {
        type: r.promo_type === "fixed" ? "fixed" : "percent",
        value,
        name: r.name || "",
      };
      if (!best || candidate.value > best.value) best = candidate;
    }
    return best;
  }, [detail]);

  const reviews = useMemo(() => {
    const items: any[] = detail?.reviews?.items ?? [];
    const stats: any = detail?.reviews?.stats ?? null;
    const count = stats ? Number(stats.count) || 0 : items.length;
    const avg = stats ? Number(stats.avg) || 0 : (count ? items.reduce((a, r) => a + Number(r.rating || 0), 0) / count : 0);
    const subKeys = ["cleanliness", "comfort", "location_score", "staff", "value"] as const;
    const sub: Record<string, number> = {};
    if (stats) {
      for (const k of subKeys) {
        const v = Number(stats[k]);
        if (Number.isFinite(v) && v > 0) sub[k] = v;
      }
    }
    return { items, avg, count, sub: Object.keys(sub).length ? sub : null };
  }, [detail]);
  const reviewsQuery = { isLoading: detailQuery.isLoading };

  const bookedRangesAll = useMemo(() => {
    return Array.isArray(detail?.reservations) ? detail.reservations : [];
  }, [detail]);
  const bookedRanges = bookedRangesAll;

  const minPriceCents = useMemo(() => {
    const prices = activeRooms.map((r) => r.base_rate_cents).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [activeRooms]);

  // Apply promo to a base price -> { discounted, pctOff }
  const applyPromo = useCallback((baseCents: number) => {
    if (!baseCents || !promo) return { discounted: baseCents, pctOff: 0 };
    if (promo.type === "percent") {
      const pct = Math.round(promo.value);
      return { discounted: Math.round(baseCents * (1 - pct / 100)), pctOff: pct };
    }
    const off = Math.round(promo.value * 100);
    const discounted = Math.max(0, baseCents - off);
    const pctOff = Math.round((1 - discounted / baseCents) * 100);
    return { discounted, pctOff };
  }, [promo]);

  const roomPricePresentation = useCallback((room: any) => {
    const baseCents = Number(room?.base_rate_cents) || 0;
    const promoDeal = applyPromo(baseCents);
    if (promoDeal.pctOff > 0 && promoDeal.discounted < baseCents) {
      return {
        displayCents: promoDeal.discounted,
        strikeCents: baseCents,
        discountPct: promoDeal.pctOff,
      };
    }

    const originalCents = Number(room?.original_rate_cents) || 0;
    if (originalCents > baseCents && baseCents > 0) {
      return {
        displayCents: baseCents,
        strikeCents: originalCents,
        discountPct: Math.round((1 - baseCents / originalCents) * 100),
      };
    }

    return {
      displayCents: baseCents,
      strikeCents: 0,
      discountPct: 0,
    };
  }, [applyPromo]);

  const minDeal = useMemo(() => applyPromo(minPriceCents), [applyPromo, minPriceCents]);

  const [searchParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState<Date>(() => parseParamDate(searchParams.get("ci")) ?? todayUTC());
  const [checkOut, setCheckOut] = useState<Date>(() => parseParamDate(searchParams.get("co")) ?? addDays(todayUTC(), 1));
  const [adults, setAdults] = useState<number>(() => Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = useState<number>(() => Number(searchParams.get("children")) || 0);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [allRoomsOpen, setAllRoomsOpen] = useState(false);
  const [detailsRoom, setDetailsRoom] = useState<any | null>(null);

  const openRoomDetails = useCallback((room: any) => {
    setDetailsRoom(room);
  }, []);
  const closeRoomDetails = useCallback(() => setDetailsRoom(null), []);
  const reserveCurrentDetailsRoom = useCallback(() => {
    if (!detailsRoom) return;
    const ciStr = format(checkIn, "yyyy-MM-dd");
    const coStr = format(checkOut, "yyyy-MM-dd");
    setDetailsRoom(null);
    setAllRoomsOpen(false);
    navigate(`/hotel/${storeId}/book?room=${detailsRoom.id}&ci=${ciStr}&co=${coStr}&adults=${adults}&children=${children}`);
  }, [detailsRoom, checkIn, checkOut, adults, children, navigate, storeId]);
  const detailsRoomPhotos = useMemo<string[]>(() => {
    if (!detailsRoom) return [];
    return uniqueImageUrls([
      ...collectImageUrls(detailsRoom.photos),
      ...collectImageUrls(detailsRoom.cover_photo),
      ...collectImageUrls(detailsRoom.gallery_images),
      ...collectImageUrls(detailsRoom.image_urls),
    ]);
  }, [detailsRoom]);
  const detailsRoomPrice = useMemo(
    () => (detailsRoom ? roomPricePresentation(detailsRoom) : null),
    [detailsRoom],
  );
  const [mapsKey, setMapsKey] = useState<string>("");
  useEffect(() => {
    // Only resolve the Maps API key when this hotel actually has coordinates
    // (otherwise the map section never renders), and defer to idle time so
    // it stays off the critical path on first paint.
    if (typeof store?.latitude !== "number" || typeof store?.longitude !== "number") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      void resolveMapsKey().then((k) => { if (!cancelled) setMapsKey(k); });
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = typeof w.requestIdleCallback === "function"
      ? w.requestIdleCallback(run, { timeout: 2000 })
      : window.setTimeout(run, 1500);
    return () => {
      cancelled = true;
      if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, [store?.latitude, store?.longitude]);
  const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));

  // Per-room availability for the user's selected dates
  const roomAvailability = useMemo(() => {
    const ciIso = format(checkIn, "yyyy-MM-dd");
    const coIso = format(checkOut, "yyyy-MM-dd");
    const byRoom = new Map<string, { soldOut: boolean; nextAvailable: string | null }>();
    const byRoomRanges = new Map<string, Array<{ in: string; out: string }>>();
    for (const r of bookedRanges) {
      if (!r.room_id) continue;
      const list = byRoomRanges.get(r.room_id) || [];
      list.push({ in: r.check_in, out: r.check_out });
      byRoomRanges.set(r.room_id, list);
    }
    for (const room of activeRooms) {
      const ranges = byRoomRanges.get(room.id) || [];
      // Half-open overlap: conflict iff range.in < coIso && range.out > ciIso
      const conflict = ranges.some((r) => r.in < coIso && r.out > ciIso);
      let nextAvailable: string | null = null;
      if (conflict) {
        const sorted = [...ranges].sort((a, b) => a.out.localeCompare(b.out));
        const overlapping = sorted.filter((r) => r.in < coIso && r.out > ciIso);
        if (overlapping.length) {
          nextAvailable = overlapping[overlapping.length - 1].out;
        }
      }
      byRoom.set(room.id, { soldOut: conflict, nextAvailable });
    }
    return byRoom;
  }, [activeRooms, bookedRanges, checkIn, checkOut]);

  // Identify the cheapest active room for a deterministic "Top pick" badge
  const topPickRoomId = useMemo(() => {
    if (!activeRooms.length) return null;
    const cheapest = activeRooms
      .filter((r) => r.base_rate_cents > 0)
      .sort((a, b) => a.base_rate_cents - b.base_rate_cents)[0];
    return cheapest?.id || null;
  }, [activeRooms]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [storeId]);

  // Track this hotel in localStorage as "recently viewed" so the listing page
  // can surface it. Only persist once we have a name (avoids storing during
  // the initial loading phase) and dedupe by id with newest-first ordering.
  useEffect(() => {
    if (!storeId || !store?.name) return;
    try {
      const KEY = "hotel_recently_viewed";
      const MAX = 12;
      const entry = {
        id: storeId,
        name: store.name,
        category: store.category ?? null,
        address: store.address ?? null,
        logo_url: store.logo_url ?? null,
        banner_url: store.banner_url ?? null,
        viewed_at: Date.now(),
      };
      const raw = localStorage.getItem(KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      const next = [entry, ...list.filter((x) => x?.id !== storeId)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // localStorage may be disabled — fail silently
    }
  }, [storeId, store?.name, store?.category, store?.address, store?.logo_url, store?.banner_url]);

  // Open the in-app "share to a ZIVO chat" sheet. Centralized so the hero
  // icon, desktop CTA, and any future share entrypoint all push the same
  // ZivoCardPayload — no chance of the buttons disagreeing on what gets sent.
  const handleShareToChat = () => {
    openShareToChat({
      kind: "hotel",
      title: store?.name || "Hotel on ZIVO",
      subtitle: store?.address || undefined,
      meta: minPriceCents > 0 ? `From $${Math.round(minPriceCents / 100)} / night` : undefined,
      deepLink: window.location.pathname,
      image: cover,
    });
  };

  // System share / copy link — secondary affordance used when the user wants
  // to forward outside the app. If `navigator.share` is unavailable (desktop,
  // some WKWebView contexts) we fall back to clipboard + toast, and if even
  // that fails we open the in-app sheet so the tap is never a dead-end.
  const handleSystemShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: store?.name || "Hotel on ZIVO",
      text: `Check out ${store?.name || "this property"} on ZIVO`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled — fall through
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      return;
    } catch {
      // Clipboard blocked (insecure context, permissions, etc.) — fall back
      // to the in-app share sheet so the user still gets something useful.
    }
    handleShareToChat();
  };

  // Back-compat alias for inline references elsewhere in the file.
  const handleShare = handleSystemShare;

  const handleCheckAvailability = () => {
    const el = document.getElementById("rooms-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");
      const dest = store?.slug || storeId;
      navigate(`/store/${dest}?ci=${ciStr}&co=${coStr}&adults=${adults}&children=${children}`);
    }
  };

  const isLoading = storeQuery.isLoading || profileQuery.isLoading;

  if (!storeId) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">No property selected.</p>
      </div>
    );
  }

  if (!isLoading && !store) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-3">
        <Hotel className="w-10 h-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Property not found</h1>
        <p className="text-sm text-muted-foreground">This hotel or resort is no longer available.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-32 md:pb-12">
      {/* Sticky compact header (appears once the hero scrolls out) */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border transition-all safe-area-top",
          showStickyHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="mx-auto max-w-3xl lg:max-w-5xl flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-9 w-9 rounded-full hover:bg-muted/50 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{store?.name || ""}</p>
            {minPriceCents > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">
                {minDeal.pctOff > 0 && minDeal.discounted < minPriceCents ? (
                  <>
                    <span className="text-emerald-600 font-semibold">{formatPrice(minDeal.discounted)}</span>
                    <span> /night · {nights}n</span>
                  </>
                ) : (
                  <>From {formatPrice(minPriceCents)} /night · {nights}n</>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
            aria-pressed={isFavorite}
            className="h-9 w-9 rounded-full hover:bg-muted/50 flex items-center justify-center shrink-0"
          >
            <Heart className={cn("w-5 h-5 transition-colors", isFavorite ? "fill-rose-500 text-rose-500" : "text-foreground")} />
          </button>
        </div>
      </div>

      <Helmet>
        <title>{store?.name ? `${store.name} — ZIVO` : "Hotel & Resort — ZIVO"}</title>
        <meta
          name="description"
          content={
            store?.description?.slice(0, 155) ||
            `Discover ${store?.name || "this hotel"} on ZIVO — rooms, amenities, location and contact.`
          }
        />
        <link rel="canonical" href={`https://hizivo.com/hotel/${storeId}`} />
      </Helmet>

      {/* Hero / Cover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { if (visibleGalleryImages.length) { setLightboxIdx(0); setLightboxOpen(true); } }}
          disabled={!visibleGalleryImages.length}
          aria-label={visibleGalleryImages.length ? `View all ${visibleGalleryImages.length} photos` : "Hotel cover"}
          className="relative h-56 md:h-80 lg:h-[420px] w-full overflow-hidden bg-muted block group"
        >
          {cover && coverImageSrc ? (
            <img
              src={coverImageSrc}
              alt={store?.name ? `${store.name} cover` : "Hotel cover"}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-active:scale-[1.02]"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={() => markPhotoFailed(cover)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-violet-500/15">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-background/80 shadow-sm ring-1 ring-border">
                  <Hotel className="h-8 w-8" />
                </span>
                <span className="max-w-[240px] px-4 text-center text-sm font-bold text-foreground/70 line-clamp-2">
                  {store?.name || "Hotel preview"}
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 md:via-transparent to-transparent" />
          {visibleGalleryImages.length > 1 && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold px-3 py-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> {visibleGalleryImages.length} photos
            </span>
          )}
        </button>

        {/* Top nav */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between safe-area-top">
          <button type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className={HERO_ACTION_BUTTON_CLASS}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.6} />
          </button>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
              aria-pressed={isFavorite}
              className={HERO_ACTION_BUTTON_CLASS}
            >
              <Heart className={cn("w-5 h-5 transition-colors", isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-950 dark:text-white")} strokeWidth={2.6} />
            </button>
            <button type="button"
              onClick={handleShareToChat}
              aria-label="Share"
              className={HERO_ACTION_BUTTON_CLASS}
            >
              <Share2 className="w-5 h-5" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* Sentinel for sticky header trigger */}
      <div ref={heroSentinelRef} aria-hidden className="h-0" />

      {/* Header card */}
      <div className="px-4 -mt-12 relative z-10 mx-auto w-full max-w-3xl lg:max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-border bg-card shadow-sm p-4 pt-8"
        >
          {/* Profile avatar floating over the cover */}
          {profileImageUrl && (
            <div className="absolute -top-7 left-4 h-14 w-14 rounded-2xl overflow-hidden border-2 border-background bg-muted shadow-md ring-1 ring-border">
              <img
                src={optimizeImage(profileImageUrl, 120, "square")}
                alt={store?.name ? `${store.name} profile photo` : "Hotel profile photo"}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                onError={handleProfileImageError}
              />
            </div>
          )}
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-ig-gradient line-clamp-2 break-words">{store?.name}</h1>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {store?.category?.replace(/_/g, " ") || "Hotel"}
                    </Badge>
                  </div>
                  {reviews && reviews.count > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[11px] font-semibold hover:bg-amber-500/20 transition"
                    >
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {reviews.avg.toFixed(1)}
                      <span className="font-normal opacity-80">· {reviews.count} review{reviews.count === 1 ? "" : "s"}</span>
                    </button>
                  )}
                  {location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{location}</span>
                    </p>
                  )}
                </div>
                {minPriceCents > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">From</p>
                    {minDeal.pctOff > 0 && minDeal.discounted < minPriceCents ? (
                      <>
                        <p className="text-base font-bold text-emerald-600 leading-tight">
                          {formatPrice(minDeal.discounted)}
                          <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatPrice(minPriceCents)}
                          </span>
                          <span className="rounded-full bg-red-600 text-white text-[9px] font-semibold px-1.5 py-0.5">
                            -{minDeal.pctOff}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-base font-bold text-primary leading-tight">
                        {formatPrice(minPriceCents)}
                        <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Rooms" value={activeRooms.length || "—"} />
                <Stat
                  label="Check-in"
                  value={checkInLabel(profile?.check_in_from, profile?.check_in_until)}
                />
                <Stat
                  label="Check-out"
                  value={checkOutLabel(profile?.check_out_until, profile?.check_out_from)}
                />
              </div>
            </>
          )}
        </motion.div>

        {/* Property highlights — top amenities at-a-glance */}
        {!isLoading && amenities.length > 0 && (() => {
          const HIGHLIGHT_ORDER = [
            { keys: ["beach", "beachfront", "sea"], label: "Beachfront", icon: Waves, tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
            { keys: ["pool", "swimming"], label: "Pool", icon: Waves, tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
            { keys: ["wifi", "wi-fi", "internet"], label: "Free Wi-Fi", icon: Wifi, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { keys: ["breakfast"], label: "Breakfast", icon: Coffee, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
            { keys: ["parking"], label: "Free parking", icon: Car, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
            { keys: ["restaurant"], label: "Restaurant", icon: Utensils, tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
            { keys: ["spa"], label: "Spa", icon: Sparkles, tint: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
            { keys: ["gym", "fitness"], label: "Gym", icon: Dumbbell, tint: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
          ];
          const haystack = amenities.join(" ").toLowerCase();
          const matched = HIGHLIGHT_ORDER.filter((h) => h.keys.some((k) => haystack.includes(k))).slice(0, 4);
          if (matched.length === 0) return null;
          return (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {matched.map((h) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.label}
                    className="rounded-2xl border border-border bg-card flex flex-col items-center gap-1 py-2.5"
                  >
                    <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center", h.tint)}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-semibold text-foreground text-center px-1 truncate max-w-full">
                      {h.label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Promo banner (active discount) */}
        {!isLoading && promo && minDeal.pctOff > 0 && minPriceCents > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-2xl overflow-hidden border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-foreground truncate">
                  {promo.name || `${minDeal.pctOff}% off`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Save{" "}
                  <span className="font-bold text-emerald-600">
                    {formatPrice(Math.max(0, minPriceCents - minDeal.discounted))}
                  </span>{" "}
                  /night
                </p>
              </div>
              <span className="rounded-full bg-rose-500 text-white text-[11px] font-extrabold px-2.5 py-1 shrink-0">
                -{minDeal.pctOff}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Trust strip */}
        {!isLoading && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3" /> Verified by ZIVO
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2.5 py-1 text-[10px] font-semibold">
              <Zap className="w-3 h-3" /> Instant booking
            </span>
            {profile?.cancellation_policy?.toLowerCase().includes("free") && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 px-2.5 py-1 text-[10px] font-semibold">
                <BadgeCheck className="w-3 h-3" /> Free cancellation
              </span>
            )}
          </div>
        )}

        {!isLoading && !!store?.description && (
          <section className="mt-4 rounded-[24px] border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {profileImageUrl ? (
                <img
                  src={optimizeImage(profileImageUrl, 96, "square")}
                  alt={store?.name ? `${store.name} profile photo` : "Hotel profile photo"}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-border object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={handleProfileImageError}
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Hotel className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-foreground leading-tight">Profile</p>
                    <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{store.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    {activeRooms.length || "—"} rooms
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location || "Location available after booking"}</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-4">
              <SafeCaption text={store.description} />
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/45 px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Check-in</p>
                <p className="mt-0.5 text-xs font-extrabold text-foreground">{checkInLabel(profile?.check_in_from, profile?.check_in_until)}</p>
              </div>
              <div className="rounded-xl bg-muted/45 px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Check-out</p>
                <p className="mt-0.5 text-xs font-extrabold text-foreground">{checkOutLabel(profile?.check_out_until, profile?.check_out_from)}</p>
              </div>
              <div className="rounded-xl bg-muted/45 px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Photos</p>
                <p className="mt-0.5 text-xs font-extrabold text-foreground">{visibleGalleryImages.length || "—"}</p>
              </div>
            </div>
            {!!profile?.languages?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.languages.slice(0, 6).map((lang: string) => (
                  <span
                    key={lang}
                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {!isLoading && visibleGalleryImages.length > 0 && (
          <section className="mt-4 rounded-[24px] border border-border bg-card p-2 shadow-sm">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-foreground leading-tight">Photos</p>
                <p className="text-[11px] text-muted-foreground">
                  {visibleGalleryImages.length} photo{visibleGalleryImages.length === 1 ? "" : "s"} from the property and rooms
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background"
              >
                View all
              </button>
            </div>
            <div className="grid h-44 grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-[18px] md:h-64">
              {visibleGalleryImages.slice(0, 5).map((photo, idx) => {
                const isLead = idx === 0;
                const remaining = visibleGalleryImages.length - 5;
                return (
                  <button
                    key={`${photo}-${idx}`}
                    type="button"
                    onClick={() => { setLightboxIdx(idx); setLightboxOpen(true); }}
                    className={cn(
                      "group relative overflow-hidden bg-muted",
                      isLead ? "col-span-2 row-span-2" : "",
                    )}
                    aria-label={`Open photo ${idx + 1} of ${visibleGalleryImages.length}`}
                  >
                    <img
                      src={optimizeImage(photo, isLead ? 760 : 360)}
                      alt={`${store?.name || "Hotel"} photo ${idx + 1}`}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02] md:group-hover:scale-[1.04]"
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={() => markPhotoFailed(photo)}
                    />
                    {idx === 4 && remaining > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-extrabold text-white backdrop-blur-[1px]">
                        +{remaining}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Body wrapper for tablet/desktop centering */}
      <div className="mx-auto w-full max-w-3xl lg:max-w-5xl">

      {/* Inline desktop CTA (replaces sticky bar on md+) */}
      <div className="hidden md:flex items-stretch gap-2.5 px-4 mt-4">
        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-2xl flex-1 max-w-[200px] font-semibold border-border/70 hover:bg-muted/60"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
        <Button
          size="lg"
          className="h-12 rounded-2xl flex-1 font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20"
          onClick={handleCheckAvailability}
        >
          <CalendarRange className="w-4 h-4 mr-2" /> Check Availability
        </Button>
      </div>

      {/* Date + Guests picker */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2">
        <Popover open={datesOpen} onOpenChange={setDatesOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="h-11 rounded-2xl border border-border bg-card shadow-sm text-left px-3 flex items-center gap-2 active:scale-[0.98] transition">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                  {nights} night{nights > 1 ? "s" : ""}
                </p>
                <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                  {format(checkIn, "MMM d")} – {format(checkOut, "MMM d")}
                </p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 max-w-[92vw]" align="start">
            <div className="p-2 border-b">
              <p className="text-[11px] font-semibold text-muted-foreground">Pick check-in & check-out</p>
            </div>
            <Calendar
              mode="range"
              selected={{ from: checkIn, to: checkOut }}
              onSelect={(range) => {
                if (range?.from) setCheckIn(range.from);
                if (range?.to) {
                  setCheckOut(range.to);
                  setDatesOpen(false);
                }
              }}
              numberOfMonths={1}
              disabled={(d) => d < todayUTC()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="h-11 rounded-2xl border border-border bg-card shadow-sm text-left px-3 flex items-center gap-2 active:scale-[0.98] transition">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Guests</p>
                <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                  {adults} adult{adults > 1 ? "s" : ""}{children > 0 ? ` · ${children} child${children > 1 ? "ren" : ""}` : ""}
                </p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <DetailStepper label="Adults" value={adults} min={1} max={20} onChange={setAdults} />
              <DetailStepper label="Children" value={children} min={0} max={10} onChange={setChildren} />
              <Button className="w-full h-9" onClick={() => setGuestsOpen(false)}>Done</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Rooms — moved to the top of the body so booking is the first action
          the user sees after the hero. Amenities now sits below it. */}
      <div id="rooms-section" className="scroll-mt-20">
      <Section title={`Rooms${activeRooms.length ? ` · ${activeRooms.length}` : ""}`}>
        {roomsQuery.isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-56 rounded-xl shrink-0" />
            ))}
          </div>
        ) : activeRooms.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rooms published yet.</p>
        ) : (
          <div className="relative">
            <div className="-mx-4 px-4 pr-10 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:pr-0 md:overflow-visible md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
              {activeRooms.slice(0, 8).map((room) => {
                const price = roomPricePresentation(room);
                const hasDiscount = price.discountPct > 0 && price.strikeCents > price.displayCents;
                const isTopPick = room.id === topPickRoomId;
                const avail = roomAvailability.get(room.id);
                const soldOut = !!avail?.soldOut;
                return (
                  <div
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRoomDetails(room)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRoomDetails(room);
                      }
                    }}
                    aria-label={`View details for ${room.name}`}
                    className={cn(
                      "snap-start shrink-0 w-60 md:w-auto rounded-xl border border-border bg-card overflow-hidden text-left cursor-pointer hover:border-emerald-500/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition",
                      soldOut && "opacity-80",
                    )}
                  >
                    <div className="h-28 bg-muted relative">
                      <RoomPhoto room={room} fallbackImages={visibleGalleryImages} />
                      {room.breakfast_included && (
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          Breakfast
                        </span>
                      )}
                      {hasDiscount && !soldOut && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[9px] font-bold">
                          -{price.discountPct}%
                        </span>
                      )}
                      {soldOut && (
                        <>
                          <div className="absolute inset-0 bg-black/35" />
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
                            Sold out
                          </span>
                        </>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate flex-1">{room.name}</p>
                        {isTopPick && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Top pick
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                        {room.beds || room.room_type || "Room"} · {room.max_guests} guests
                      </p>
                      <div className="mt-1.5">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-bold text-emerald-600">
                              {formatPrice(price.displayCents)}
                              <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                            </span>
                            <div className="text-[10px] text-muted-foreground line-through leading-none">
                              {formatPrice(price.strikeCents)}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {formatPrice(room.base_rate_cents)}
                            <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                          </span>
                        )}
                      </div>
                      {soldOut ? (
                        <div className="mt-2 w-full rounded-lg bg-muted/60 text-muted-foreground text-[10px] font-semibold py-1.5 px-2 text-center">
                          {avail?.nextAvailable
                            ? `Available from ${format(parseISO(avail.nextAvailable), "MMM d")}`
                            : "Sold out for these dates"}
                        </div>
                      ) : (
                        <button type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ciStr = format(checkIn, "yyyy-MM-dd");
                            const coStr = format(checkOut, "yyyy-MM-dd");
                            navigate(`/hotel/${storeId}/book?room=${room.id}&ci=${ciStr}&co=${coStr}&adults=${adults}&children=${children}`);
                          }}
                          className="mt-2 w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition text-white text-[11px] font-bold py-1.5 px-2"
                        >
                          Book Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Right-edge fade hint (mobile only) */}
            <div className="md:hidden pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-background to-transparent" />
          </div>
        )}
        {activeRooms.length > 8 && (
          <button
            type="button"
            onClick={() => setAllRoomsOpen(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-[11px] font-semibold hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
          >
            See all {activeRooms.length} rooms <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </Section>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <Section title="Amenities">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {amenities.map((label, i) => {
              const Icon = amenityIconFor(label);
              const tints = [
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
              ];
              const tint = tints[i % tints.length];
              return (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 hover:border-primary/30 transition"
                >
                  <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", tint)}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">{humanizeLabel(label)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Reviews */}
      <div id="reviews-section">
        <Section title={`Reviews${reviews?.count ? ` · ${reviews.count}` : ""}`}>
          {reviewsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !reviews || reviews.count === 0 ? (
            <p className="text-xs text-muted-foreground">
              No reviews yet. Be the first to review after your stay.
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className="text-3xl font-extrabold text-amber-600 leading-none">{reviews.avg.toFixed(1)}</p>
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "w-3 h-3",
                          n <= Math.round(reviews.avg) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{reviews.count} review{reviews.count === 1 ? "" : "s"}</p>
                </div>
                {reviews.sub && (
                  <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    {Object.entries(reviews.sub).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground capitalize truncate">
                          {k.replace(/_/g, " ").replace("score", "")}
                        </span>
                        <span className="font-semibold tabular-nums">{v.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {reviews.items.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                          {(r.guest_name || "G").trim().slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{r.guest_name || "Guest"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        {Number(r.rating).toFixed(1)}
                      </span>
                    </div>
                    {r.title && <p className="mt-2 text-xs font-semibold line-clamp-1">{r.title}</p>}
                    {r.body && <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{r.body}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Location — actions stay inside ZIVO. "View on map" focuses the
          property pin on the ZIVO store map; "Get directions" pre-fills the
          ride hub with this hotel as the destination so the user can either
          see the route or book a ride to get here. */}
      {(location || (typeof store?.latitude === "number" && typeof store?.longitude === "number")) && (
        <Section title="Location">
          {(() => {
            const lat = store?.latitude;
            const lng = store?.longitude;
            const hasCoords = typeof lat === "number" && typeof lng === "number";
            const storeMapUrl = `/store-map?focus=${encodeURIComponent(storeId)}`;
            const destParams = hasCoords
              ? `&destLat=${lat}&destLng=${lng}`
              : "";
            const directionsUrl = `/rides/hub?tab=book&destination=${encodeURIComponent(store?.name || location || "")}${destParams}`;
            // staticmap.openstreetmap.de went offline — use Google Static Maps
            // (key resolved via env var or maps-api-key edge function).
            const staticMapSrc = hasCoords && mapsKey
              ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=640x280&scale=2&markers=color:0x10b981%7C${lat},${lng}&key=${mapsKey}`
              : null;
            return (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(storeMapUrl)}
                  className="relative block w-full h-40 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-violet-500/10 group text-left"
                  aria-label="Open this property on the ZIVO map"
                >
                  {staticMapSrc ? (
                    <img
                      src={staticMapSrc}
                      alt={`Map showing ${store?.name || "property"} location`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="w-10 h-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm w-fit max-w-full">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{location || "View on map"}</span>
                  </span>
                </button>
                <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                  <button
                    type="button"
                    onClick={() => navigate(storeMapUrl)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition"
                  >
                    <MapPin className="w-3.5 h-3.5" /> View on map
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(directionsUrl)}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 transition"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Get directions
                  </button>
                </div>
              </div>
            );
          })()}
        </Section>
      )}

      {/* Policies */}
      {profile && (
        profile.cancellation_policy ||
        profile.check_in_from || profile.check_in_until || profile.check_out_from || profile.check_out_until ||
        profile.house_rules?.min_age ||
        profile.house_rules?.smoking_zones ||
        profile.house_rules?.parties_allowed !== undefined ||
        profile.house_rules?.security_deposit_cents ||
        profile.pet_policy?.allowed !== undefined ||
        profile.child_policy?.allowed !== undefined ||
        profile.deposit_required
      ) && (
        <Section title="Policies & house rules">
          <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
            {(profile.check_in_from || profile.check_in_until || profile.check_out_from || profile.check_out_until) && (
              <PolicyRow
                icon={CalendarRange}
                label="Check-in / Check-out"
                value={stayWindowLabel(profile)}
              />
            )}
            {profile.cancellation_policy && (
              <PolicyRow
                icon={ShieldCheck}
                label="Cancellation"
                value={profile.cancellation_policy}
                accent={profile.cancellation_policy.toLowerCase().includes("free") ? "emerald" : undefined}
              />
            )}
            {profile.deposit_required && (
              <PolicyRow
                icon={BadgeCheck}
                label="Deposit"
                value={profile.deposit_percent ? `${profile.deposit_percent}% required at booking` : "Required at booking"}
              />
            )}
            {profile.pet_policy && profile.pet_policy.allowed !== undefined && (
              <PolicyRow
                icon={Sparkles}
                label="Pets"
                value={profile.pet_policy.allowed
                  ? `Allowed${profile.pet_policy.fee_cents ? ` · ${formatPrice(profile.pet_policy.fee_cents)} fee` : ""}${profile.pet_policy.max_weight_kg ? ` · max ${profile.pet_policy.max_weight_kg}kg` : ""}`
                  : "Not allowed"}
                accent={profile.pet_policy.allowed ? "emerald" : "rose"}
              />
            )}
            {profile.child_policy && profile.child_policy.allowed !== undefined && (
              <PolicyRow
                icon={Users}
                label="Children"
                value={profile.child_policy.allowed
                  ? `Welcome${profile.child_policy.min_age ? ` · age ${profile.child_policy.min_age}+` : ""}${profile.child_policy.cot_available ? " · cot available" : ""}`
                  : "Adults only"}
                accent={profile.child_policy.allowed ? "emerald" : undefined}
              />
            )}
            {profile.house_rules?.min_age != null && (
              <PolicyRow icon={Users} label="Minimum age" value={`${profile.house_rules.min_age}+`} />
            )}
            {profile.house_rules?.parties_allowed !== undefined && (
              <PolicyRow
                icon={Sparkles}
                label="Parties / events"
                value={profile.house_rules.parties_allowed ? "Allowed" : "Not allowed"}
                accent={profile.house_rules.parties_allowed ? "emerald" : "rose"}
              />
            )}
            {profile.house_rules?.smoking_zones && (
              <PolicyRow icon={Wind} label="Smoking" value={profile.house_rules.smoking_zones} />
            )}
            {(profile.house_rules?.quiet_from || profile.house_rules?.quiet_to) && (
              <PolicyRow
                icon={ShieldCheck}
                label="Quiet hours"
                value={`${profile.house_rules.quiet_from || "—"} – ${profile.house_rules.quiet_to || "—"}`}
              />
            )}
            {profile.house_rules?.security_deposit_cents ? (
              <PolicyRow
                icon={BadgeCheck}
                label="Security deposit"
                value={formatPrice(profile.house_rules.security_deposit_cents)}
              />
            ) : null}
          </div>
        </Section>
      )}

      {/* Nearby — per-mode icon, cleaner meta, tap to open in Google Maps */}
      {!!profile?.nearby?.length && (
        <Section title="What's nearby">
          <div className="grid grid-cols-2 gap-2">
            {profile.nearby.slice(0, 8).map((n: any, i: number) => {
              // Schema in DB stores `name` + `distance_km` + `type`; older
              // shape used `label` + `km` + `minutes` + `mode`. Support both.
              const label = n.label || n.name || "";
              const km = n.km ?? n.distance_km;
              const minutes = n.minutes;
              const mode = (n.mode || n.type || "").toLowerCase();
              if (!label) return null;

              // Map mode → icon + tint + human label
              let Icon = MapPin;
              let tint = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              let modeLabel = "";
              if (mode.includes("walk") || mode.includes("foot")) {
                Icon = Footprints; tint = "bg-sky-500/10 text-sky-600 dark:text-sky-400";
                modeLabel = "Walk";
              } else if (mode.includes("bike") || mode.includes("cycle")) {
                Icon = Bike; tint = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                modeLabel = "Bike";
              } else if (mode.includes("transit") || mode.includes("bus") || mode.includes("train") || mode.includes("rail")) {
                Icon = TrainFront; tint = "bg-violet-500/10 text-violet-600 dark:text-violet-400";
                modeLabel = "Transit";
              } else if (mode.includes("drive") || mode.includes("car")) {
                Icon = Car; tint = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
                modeLabel = "Drive";
              }

              const metaParts: string[] = [];
              if (typeof minutes === "number" && minutes > 0) metaParts.push(`${minutes} min`);
              else if (km != null && km !== "") metaParts.push(`${km} km`);
              if (modeLabel) metaParts.push(modeLabel);
              const meta = metaParts.join(" · ");

              const pickupParams = (store?.latitude != null && store?.longitude != null)
                ? `&pickupLat=${store.latitude}&pickupLng=${store.longitude}&pickup=${encodeURIComponent(store?.name || "Hotel")}`
                : "";
              // Always land on the `book` tab — that's the screen with the
              // actual pickup→destination route on the map. The `map` tab is a
              // driver-side demand heatmap and was showing the wrong thing
              // when the guest just wanted to see the route. The book screen
              // has the map at the top and a (dismissible) ride CTA below, so
              // a user who only wants to look at the route can do so without
              // committing to a booking.
              const rideUrl = `/rides/hub?tab=book&destination=${encodeURIComponent(label)}${pickupParams}`;

              return (
                <button
                  key={`${label}-${i}`}
                  type="button"
                  onClick={() => navigate(rideUrl)}
                  className="group rounded-xl border border-border bg-card px-3 py-2.5 text-xs flex items-center gap-2.5 hover:border-primary/30 hover:shadow-sm active:scale-[0.99] transition text-left w-full"
                  aria-label={`Open route to ${label} in ZIVO map`}
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tint)}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-foreground truncate">{label}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {meta || "Nearby"}
                    </span>
                  </span>
                  <Navigation className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Languages */}
      {!!profile?.languages?.length && (
        <Section title="Languages spoken">
          <div className="flex flex-wrap gap-1.5">
            {profile.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 text-[11px] font-medium dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
              >
                {lang}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Owner band */}
      {isOwner && (
        <section className="px-4 mt-5 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-2">Owner tools</h2>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">You manage this property</p>
              <p className="text-[11px] text-muted-foreground">Open admin to edit rooms, rates and guests</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/admin/stores/${storeId}?tab=lodge-overview`)}
            >
              Admin
            </Button>
          </div>
        </section>
      )}

      </div>
      {/* /body wrapper */}

      {/* Sticky CTA — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border px-4 py-3 pb-[max(var(--zivo-safe-bottom,0px),12px)]">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          {minPriceCents > 0 ? (
            <div className="flex flex-col leading-tight shrink-0">
              {minDeal.pctOff > 0 && minDeal.discounted < minPriceCents ? (
                <>
                  <span className="text-[10px] text-muted-foreground line-through">
                    {formatPrice(minPriceCents)}
                  </span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {formatPrice(minDeal.discounted)}
                    <span className="text-[10px] font-medium text-emerald-600/80"> /night</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">From</span>
                  <span className="text-base font-extrabold text-foreground">
                    {formatPrice(minPriceCents)}
                    <span className="text-[10px] font-medium text-muted-foreground"> /night</span>
                  </span>
                </>
              )}
              <span className="text-[10px] text-muted-foreground">
                {nights} night{nights === 1 ? "" : "s"} · {adults + children} guest{adults + children === 1 ? "" : "s"}
              </span>
              {nights > 1 && (
                <span className="mt-0.5 text-[10px] font-semibold text-foreground">
                  Total {formatPrice((minDeal.pctOff > 0 ? minDeal.discounted : minPriceCents) * nights)}
                </span>
              )}
            </div>
          ) : null}
          <Button
            size="lg"
            className="h-12 rounded-2xl flex-1 font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20"
            onClick={handleCheckAvailability}
          >
            <CalendarRange className="w-4 h-4 mr-2" /> Check Availability
          </Button>
        </div>
      </div>

      {/* AI Ask chat — inline trigger near the end of the content, above
          the sticky booking CTA (no longer a floating overlay). */}
      {storeId && store?.name && (
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl px-3 py-4">
          <Suspense fallback={null}>
            <HotelAskChat storeId={storeId} storeName={store.name} />
          </Suspense>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxOpen && visibleGalleryImages.length > 0 && activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-label="Photo gallery"
        >
          <img
            src={optimizeImage(activeLightboxPhoto, 1280)}
            alt={`Photo ${lightboxIdx + 1} of ${visibleGalleryImages.length}`}
            className="max-w-full max-h-full object-contain"
            onError={() => markPhotoFailed(activeLightboxPhoto)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="absolute top-4 left-4 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1.5">
            {lightboxIdx + 1} / {visibleGalleryImages.length}
          </span>
          {visibleGalleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i - 1 + visibleGalleryImages.length) % visibleGalleryImages.length); }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i + 1) % visibleGalleryImages.length); }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Room details modal */}
      <LodgingRoomDetailsModal
        open={!!detailsRoom}
        onOpenChange={(v) => { if (!v) closeRoomDetails(); }}
        name={detailsRoom?.name || ""}
        type={detailsRoom?.room_type ?? null}
        beds={detailsRoom?.beds ?? null}
        maxGuests={detailsRoom?.max_guests ?? 2}
        sizeSqm={detailsRoom?.size_sqm ?? null}
        baseRateCents={detailsRoomPrice?.displayCents ?? detailsRoom?.base_rate_cents ?? 0}
        originalRateCents={
          detailsRoomPrice && detailsRoomPrice.strikeCents > detailsRoomPrice.displayCents
            ? detailsRoomPrice.strikeCents
            : null
        }
        description={detailsRoom?.description ?? null}
        amenities={Array.isArray(detailsRoom?.amenities) ? detailsRoom!.amenities : []}
        breakfastIncluded={!!detailsRoom?.breakfast_included}
        photos={detailsRoomPhotos}
        coverIndex={typeof detailsRoom?.cover_photo_index === "number" ? detailsRoom.cover_photo_index : 0}
        addons={[]}
        cancellationPolicy={detailsRoom?.cancellation_policy ?? null}
        checkInTime={detailsRoom?.check_in_time ?? null}
        checkOutTime={detailsRoom?.check_out_time ?? null}
        onReserve={reserveCurrentDetailsRoom}
      />

      {/* All rooms sheet */}
      {allRoomsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center"
          onClick={() => setAllRoomsOpen(false)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md md:max-w-2xl max-h-[85dvh] bg-card rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 pb-3 border-b border-border">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-3 md:hidden" />
              <h3 className="text-base font-bold text-foreground">All rooms · {activeRooms.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{store?.name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 pb-[max(var(--zivo-safe-bottom,0px),16px)]">
              {activeRooms.map((room) => {
                const price = roomPricePresentation(room);
                const hasDiscount = price.discountPct > 0 && price.strikeCents > price.displayCents;
                const isTopPick = room.id === topPickRoomId;
                const avail = roomAvailability.get(room.id);
                const soldOut = !!avail?.soldOut;
                return (
                  <div
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRoomDetails(room)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRoomDetails(room);
                      }
                    }}
                    aria-label={`View details for ${room.name}`}
                    className={cn(
                      "rounded-xl border border-border bg-card overflow-hidden text-left cursor-pointer hover:border-emerald-500/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition",
                      soldOut && "opacity-80",
                    )}
                  >
                    <div className="h-28 bg-muted relative">
                        <RoomPhoto room={room} fallbackImages={visibleGalleryImages} />
                      {hasDiscount && !soldOut && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[9px] font-bold">
                          -{price.discountPct}%
                        </span>
                      )}
                      {soldOut && (
                        <>
                          <div className="absolute inset-0 bg-black/35" />
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
                            Sold out
                          </span>
                        </>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate flex-1">{room.name}</p>
                        {isTopPick && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Top pick
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                        {room.beds || room.room_type || "Room"} · {room.max_guests} guests
                      </p>
                      <div className="mt-1.5">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-bold text-emerald-600">
                              {formatPrice(price.displayCents)}
                              <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                            </span>
                            <div className="text-[10px] text-muted-foreground line-through leading-none">
                              {formatPrice(price.strikeCents)}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {formatPrice(room.base_rate_cents)}
                            <span className="text-[10px] font-normal text-muted-foreground"> /night</span>
                          </span>
                        )}
                      </div>
                      <button type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const ciStr = format(checkIn, "yyyy-MM-dd");
                          const coStr = format(checkOut, "yyyy-MM-dd");
                          setAllRoomsOpen(false);
                          navigate(`/hotel/${storeId}/book?room=${room.id}&ci=${ciStr}&co=${coStr}&adults=${adults}&children=${children}`);
                        }}
                        className="mt-2 w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition text-white text-[11px] font-bold py-1.5 px-2"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" className="w-full" onClick={() => setAllRoomsOpen(false)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 mt-6 md:mt-8">
      <h2 className="text-base font-extrabold text-foreground mb-3 tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function PolicyRow({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "emerald" | "rose";
}) {
  const valueColor =
    accent === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
    accent === "rose" ? "text-rose-600 dark:text-rose-400" :
    "text-foreground";
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
        <p className={cn("text-xs font-semibold mt-0.5 break-words", valueColor)}>{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 py-2 md:py-2.5">
      <p className="text-sm md:text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] md:text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DetailStepper({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="h-8 w-8 rounded-full border border-border text-foreground disabled:opacity-40 active:bg-muted" aria-label={`Decrease ${label}`}>–</button>
        <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="h-8 w-8 rounded-full border border-border text-foreground disabled:opacity-40 active:bg-muted" aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
