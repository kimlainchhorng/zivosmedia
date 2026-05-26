/**
 * StoreProfilePage - Ultra-premium 3D/4D Spatial UI store profile
 * Immersive glassmorphic design with depth, perspective, holographic cards
 */
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, Star, Clock, MapPin, Phone, Store, Package, Loader2, Plus, Minus, Sparkles, Heart, Eye, MessageCircle, Facebook, Instagram, Send, CalendarCheck, BedDouble, Lock, Share2, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/shared/StarRating";
import SafeCaption from "@/components/social/SafeCaption";
import { track } from "@/lib/analytics";
import { optimizeImage } from "@/lib/optimizeImage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { useStoreProfile, useStoreProducts, useStoreProductCategories, type StoreProductItem } from "@/hooks/useStoreProfile";
import { useGroceryCart } from "@/hooks/useGroceryCart";
import { GroceryCheckoutDrawer } from "@/components/grocery/GroceryCheckoutDrawer";
import { useState, useRef, useMemo, useEffect } from "react";
import StoreHeroCarousel from "@/components/grocery/StoreHeroCarousel";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import storeRideBg from "@/assets/store-ride-bg.jpg";
import storeCallBg from "@/assets/store-call-bg.jpg";
import hotelResortFallback from "@/assets/hotel-resort.jpg";
import StoreLiveChat from "@/components/grocery/StoreLiveChat";
import { isAllowedSocialUrl } from "@/lib/urlSafety";
import { getStoreStatus } from "@/utils/storeStatus";
import { useLodgeRooms, type LodgeRoom } from "@/hooks/lodging/useLodgeRooms";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { LodgingRoomCard } from "@/components/lodging/LodgingRoomCard";
import { LodgingStaySelector } from "@/components/lodging/LodgingStaySelector";
import { LodgingBookingDrawer } from "@/components/lodging/LodgingBookingDrawer";
import { LodgingHighlightsStrip } from "@/components/lodging/LodgingHighlightsStrip";
import { LodgingAmenitiesPanel } from "@/components/lodging/LodgingAmenitiesPanel";
import { LodgingPolicyPanel } from "@/components/lodging/LodgingPolicyPanel";
import { useHasStoreBooking, clearStoreBookingCache } from "@/hooks/useHasStoreBooking";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildPhoneE164, normalizePhoneE164 } from "@/lib/phone";
import StoreSideRail from "@/components/grocery/StoreSideRail";
import StorePhotoLightbox from "@/components/grocery/StorePhotoLightbox";

/**
 * Extract the correct language part from dual-format text like "Khmer/English".
 * If lang is "km" → return Khmer part (before "/"), otherwise English part (after "/").
 * If no "/" separator found, return the text as-is.
 */
function localizedName(text: string, lang: string): string {
  if (!text) return text;
  const slashIdx = text.indexOf("/");
  if (slashIdx === -1) return text;
  const kmPart = text.slice(0, slashIdx).trim();
  const enPart = text.slice(slashIdx + 1).trim();
  if (!enPart) return kmPart;
  if (!kmPart) return enPart;
  return lang === "km" ? kmPart : enPart;
}

function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeStoreImageUrl(url?: unknown, fallback = ""): string {
  const raw = typeof url === "string"
    ? url
    : (url && typeof url === "object" && ("url" in (url as any) || "src" in (url as any)))
      ? String((url as any).url || (url as any).src || "")
      : "";
  const value = raw.trim();
  if (!value) return fallback;
  // Some third-party WordPress media endpoints are blocked by ORB in Chromium.
  if (value.includes("goodtimerelaxresort.com/wp-content/")) return fallback;
  return value;
}

function uniqueImageUrls(values: unknown[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const add = (value: unknown) => {
    const url = sanitizeStoreImageUrl(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach(add);
    } else {
      add(value);
    }
  });

  return urls;
}

function addStoreAssetPathFallbacks(urls: string[], storeId?: string): string[] {
  if (!storeId) return uniqueImageUrls(urls);

  const variants: string[] = [];
  urls.forEach((url) => {
    variants.push(url);

    const encodedStoreId = encodeURIComponent(storeId);
    const newPathNeedle = `/store-assets/${encodedStoreId}/products/`;
    const legacyPathNeedle = `/store-assets/products/${encodedStoreId}/`;

    if (url.includes(newPathNeedle)) {
      const fileName = url.slice(url.lastIndexOf("/") + 1);
      variants.push(url.replace(newPathNeedle, legacyPathNeedle));
      variants.push(url.replace(`/products/${fileName}`, `/${fileName}`));
    }

    if (url.includes(legacyPathNeedle)) {
      variants.push(url.replace(legacyPathNeedle, newPathNeedle));
    }
  });

  return uniqueImageUrls(variants);
}

function productImageCandidates(product: StoreProductItem, store: { id?: string; gallery_images?: string[] | null; banner_url?: string | null; logo_url?: string | null } | null | undefined, index: number): string[] {
  const productUrls = addStoreAssetPathFallbacks(
    uniqueImageUrls([product.image_urls, product.image_url]),
    product.store_id || store?.id,
  );
  const gallery = uniqueImageUrls([store?.gallery_images]);
  const storeFallbacks = uniqueImageUrls([
    gallery.length ? gallery[index % gallery.length] : "",
    store?.banner_url,
    store?.logo_url,
  ]);

  return uniqueImageUrls([productUrls, storeFallbacks]);
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 24, rotateX: 12, scale: 0.92 },
  show: {
    opacity: 1, y: 0, rotateX: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 },
  },
};

/* Floating bokeh particle */
function BokehDot({ delay, size, x, y, color }: { delay: number; size: number; x: string; y: string; color: string }) {
  return (
    <motion.div
      animate={{ y: [-12, 12, -12], x: [-6, 6, -6], opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
      className="absolute rounded-full blur-sm pointer-events-none"
      style={{ width: size, height: size, left: x, top: y, background: color }}
    />
  );
}

function StoreItemImage({
  src,
  srcs,
  label,
  imgClassName,
  fallbackClassName,
  iconClassName = "h-5 w-5",
}: {
  src?: string | null;
  srcs?: Array<string | null | undefined>;
  label: string;
  imgClassName: string;
  fallbackClassName?: string;
  iconClassName?: string;
}) {
  const sources = useMemo(() => uniqueImageUrls([srcs || [], src]), [src, srcs]);
  const sourceKey = sources.join("\n");
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceKey]);

  const currentSrc = sources[sourceIndex];

  if (!currentSrc) {
    return (
      <div
        role="img"
        aria-label={`${label} photo unavailable`}
        className={cn("h-full w-full flex items-center justify-center bg-muted/10", fallbackClassName)}
      >
        <Package className={cn("text-muted-foreground/25", iconClassName)} />
      </div>
    );
  }

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt=""
      aria-label={label}
      className={imgClassName}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}

export default function StoreProfilePage() {
  // Routes use either `:slug` (/store/:slug, /grocery/shop/:slug) or
  // `:storeId` (/shop/:storeId). Read whichever is present.
  const params = useParams<{ slug?: string; storeId?: string }>();
  const slug = params.slug || params.storeId || "";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useGroceryCart();
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(searchParams.get("chat") === "open");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, number>>({});
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 300_000, timeout: 8000 }
    );
  }, []);
  const { t, currentLanguage } = useI18n();

  const { data: store, isLoading: loadingStore } = useStoreProfile(slug || "");
  const { data: products = [], isLoading: loadingProducts } = useStoreProducts(store?.id, selectedCategory);
  const { data: categories = [] } = useStoreProductCategories(store?.id);

  // Lodging support
  const isLodging = !!store && ["hotel", "resort", "guesthouse"].includes(store.category);

  // Smart redirect: hotels/resorts/etc. have a dedicated page at /hotel/:storeId.
  // Legacy or hardcoded /grocery/shop/:slug links would otherwise render this
  // grocery-style page for a lodging — redirect them once the store is loaded.
  useEffect(() => {
    if (!store) return;
    const LODGING_CATS = ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"];
    if (LODGING_CATS.includes(store.category)) {
      navigate(`/hotel/${store.id}`, { replace: true });
    }
  }, [store?.id, store?.category, navigate]);
  const { data: allRooms = [], isLoading: loadingRooms } = useLodgeRooms(isLodging ? store!.id : "");
  const { data: propertyProfile } = useLodgePropertyProfile(isLodging ? store!.id : "");
  const { data: bookingCheck, isLoading: loadingBooking } = useHasStoreBooking(store?.id);
  const hasBooking = !!bookingCheck?.hasBooking;
  const bookingSource = bookingCheck?.source ?? null;
  const phoneNumber = (store as any)?.phone || (store as any)?.contact?.phone || "";
  const storeCountryCode = (store as any)?.country_code || (store as any)?.country || "";
  // Normalize phone to E.164 once. If raw value already has "+", keep as-is.
  // Otherwise prefix with the store's country dial code (default +855 / Cambodia).
  const normalizedPhone = useMemo(() => {
    if (!phoneNumber) return "";
    const trimmed = String(phoneNumber).trim();
    if (trimmed.startsWith("+")) return normalizePhoneE164(trimmed);
    const dial = String(storeCountryCode).toUpperCase() === "US" ? "+1" : "+855";
    return buildPhoneE164(dial, trimmed);
  }, [phoneNumber, storeCountryCode]);
  const callable = hasBooking && !!normalizedPhone;
  const chattable = hasBooking;
  const queryClient = useQueryClient();

  // Per-render click nonce so double-clicks within one render share an id
  // (deduped downstream); a deliberate later click after re-render gets a new one.
  const clickNonceRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  useEffect(() => {
    clickNonceRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, [store?.id, hasBooking]);

  // Fire `store_contact_unlocked` once per (browser session, store).
  // Uses sessionStorage so HMR / route remounts don't double-fire,
  // and naturally resets when the tab closes.
  useEffect(() => {
    if (!store?.id || !hasBooking) return;
    const key = `zivo:unlock_fired:${store.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Safari private mode — fall through and fire anyway */
    }
    const storeType: "lodge" | "food" =
      bookingSource === "lodge_reservation" ? "lodge" : "food";
    track("store_contact_unlocked", {
      store_id: store.id,
      store_type: storeType,
      source: bookingSource,
    });
  }, [store?.id, hasBooking, bookingSource]);

  // Detect booking flip: false → true while page is open. Prompt user to open chat.
  const prevHasBookingRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (loadingBooking || !store?.id) return;
    const prev = prevHasBookingRef.current;
    if (prev === false && hasBooking === true) {
      toast.success(
        t("store.booking_confirmed_chat").replace("{name}", store.name || "this store"),
        {
          duration: 8000,
          action: {
            label: t("store.open_chat"),
            onClick: () => setChatOpen(true),
          },
        }
      );
    }
    prevHasBookingRef.current = hasBooking;
  }, [hasBooking, loadingBooking, store?.id, store?.name]);

  // Long-press support for the Share tile (copy link fallback).
  // ignoreNextClickUntilRef suppresses the synthetic `click` that fires after
  // a long-press touchend on iOS/Android, plus blocks contextmenu→click races on desktop.
  const sharePressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sharePressFiredRef = useRef(false);
  const ignoreNextClickUntilRef = useRef<number>(0);
  const copyShareLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success(t("store.link_copied"));
      }
    } catch {
      toast.error(t("store.link_copy_failed"));
    }
  };

  // Manual refresh: wipe cache + invalidate query so the booking check
  // re-runs immediately (covers webhook lag right after a fresh booking).
  const handleRefreshBooking = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      clearStoreBookingCache(uid, store?.id);
    } catch {
      /* ignore */
    }
    queryClient.invalidateQueries({ queryKey: ["has-store-booking", store?.id] });
    toast.success(t("store.booking_status.rechecking"));
  };

  const rooms = useMemo(() => (allRooms || []).filter(r => r.is_active), [allRooms]);
  const hasPublishedRooms = rooms.length > 0;
  const roomRates = rooms.map(r => r.base_rate_cents).filter(n => n > 0);
  const minRoomPriceCents = roomRates.length ? Math.min(...roomRates) : undefined;
  const safeBannerUrl = useMemo(
    () => sanitizeStoreImageUrl(store?.banner_url, isLodging ? hotelResortFallback : ""),
    [store?.banner_url, isLodging],
  );
  const safeLogoUrl = useMemo(
    () => sanitizeStoreImageUrl(store?.logo_url, isLodging ? hotelResortFallback : ""),
    [store?.logo_url, isLodging],
  );
  const galleryImages = useMemo(() => {
    const rawImages = (store?.gallery_images || []) as string[];
    const normalized = rawImages
      .map((url) => sanitizeStoreImageUrl(url, isLodging ? hotelResortFallback : ""))
      .filter(Boolean);
    const deduped = Array.from(new Set(normalized));
    if (!isLodging || deduped.length < 2 || !safeBannerUrl) return deduped;
    const different = deduped.filter((url) => url !== safeBannerUrl);
    return different.length ? [...different, ...deduped.filter((url) => url === safeBannerUrl)] : deduped;
  }, [isLodging, safeBannerUrl, store?.gallery_images]);
  const allPhotoImages = useMemo(
    () => Array.from(new Set([safeLogoUrl, ...galleryImages].filter(Boolean))),
    [galleryImages, safeLogoUrl],
  );
  const openPhotoLightboxForSrc = (src?: string, fallbackIndex = 0) => {
    if (!allPhotoImages.length) return;
    const index = src ? allPhotoImages.indexOf(src) : -1;
    setPhotoLightbox({ open: true, index: index >= 0 ? index : fallbackIndex });
  };
  const heroCoverUrl = safeBannerUrl || galleryImages[0] || (isLodging ? hotelResortFallback : "");

  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return toLocalYmd(d);
  }, []);
  const dayAfterTomorrowISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 2);
    return toLocalYmd(d);
  }, []);
  const stay = {
    checkIn: searchParams.get("ci") || tomorrowISO,
    checkOut: searchParams.get("co") || dayAfterTomorrowISO,
    adults: parseInt(searchParams.get("ad") || "2", 10),
    children: parseInt(searchParams.get("ch") || "0", 10),
  };
  const updateStay = (next: { checkIn: string; checkOut: string; adults: number; children: number }) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("ci", next.checkIn);
    sp.set("co", next.checkOut);
    sp.set("ad", String(next.adults));
    sp.set("ch", String(next.children));
    setSearchParams(sp, { replace: true });
  };
  const [bookingRoom, setBookingRoom] = useState<LodgeRoom | null>(null);
  const [bookingPlan, setBookingPlan] = useState<{ rateCents: number; label: string; breakfastIncluded: boolean } | null>(null);

  const handleAddToCart = (product: StoreProductItem, sizeVariant?: { size: string; price_khr: number; price_usd: number }) => {
    const displayName = localizedName(product.name, currentLanguage);
    cart.addItem({
      productId: sizeVariant ? `${product.id}__${sizeVariant.size}` : product.id,
      name: sizeVariant ? `${displayName} (${sizeVariant.size})` : displayName,
      price: sizeVariant ? sizeVariant.price_usd : product.price,
      image: product.image_url || "",
      brand: product.brand || "",
      sizeLabel: sizeVariant?.size,
    }, store?.name || "Store");
    toast.success(t("store.added_to_cart"), { icon: "🛒" });
  };

  const toggleLike = (id: string) => {
    setLikedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Store className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t("store.not_found")}</p>
        <Button onClick={() => navigate("/grocery")} variant="outline">Back to Grocery</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <SEOHead
        title={store ? `${store.name} – ZIVO` : "Store – ZIVO"}
        description={store?.description || `Shop at ${store?.name || "this store"} on ZIVO. Browse products and order for delivery or pickup.`}
        ogImage={heroCoverUrl || safeLogoUrl || undefined}
        canonical={store ? `/s/${store.slug}` : undefined}
        structuredData={store ? {
          "@context": "https://schema.org",
          "@type": "Store",
          "name": store.name,
          "description": store.description || undefined,
          "image": safeLogoUrl || undefined,
          "url": `https://zivo.app/s/${store.slug}`,
          "telephone": (store as any).phone || undefined,
          "address": store.address ? { "@type": "PostalAddress", "streetAddress": store.address } : undefined,
        } : undefined}
      />
      {/* ── Stable page background ── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ── Banner with 3D parallax ── */}
      {(() => {
        const coverUrl = heroCoverUrl;
        const storedBannerPosition = Number((store as any).banner_position);
        const bannerPosition = Number.isFinite(storedBannerPosition)
          ? storedBannerPosition
          : isLodging
            ? 44
            : 50;

        return (
          <div className="relative w-full h-[270px] sm:h-[300px] lg:h-[320px] overflow-hidden bg-muted">
            {coverUrl ? (
              <img
                src={optimizeImage(coverUrl, 1024)}
                alt={`${store.name} cover`}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                style={{ objectPosition: `center ${bannerPosition}%` }}
                onError={(e) => {
                  // If the cover image fails to load (broken URL, SW cache
                  // corruption, etc.) hide the broken-image icon and let the
                  // gradient parent show through instead of rendering the
                  // alt text + question-mark glyph.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 via-black/5 to-transparent pointer-events-none z-[1]" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background via-background/45 to-transparent pointer-events-none z-[1]" />

            {/* Nav buttons */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10" style={{ paddingTop: "max(calc(var(--zivo-safe-top,0px) + 4.75rem), 76px)" }}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/grocery")}
                aria-label="Go back"
                className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
              >
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setChatOpen(true)}
                  aria-label={`Open chat with ${store.name}`}
                  className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
                >
                  <MessageCircle className="h-4 w-4 text-foreground" />
                </motion.button>
                {!isLodging && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setShowCart(true)}
                    className="relative h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
                  >
                    <ShoppingCart className="h-4 w-4 text-foreground" />
                    {cart.itemCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background shadow-lg shadow-primary/30"
                      >
                        {cart.itemCount}
                      </motion.span>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Desktop split layout: left content + sticky right rail ── */}
      <div className="max-w-7xl mx-auto lg:px-6 lg:grid lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-8 min-w-0">

      {/* ── Store Info Card - 3D glassmorphic ── */}
      <div className="relative px-4 -mt-14 lg:-mt-10 z-10" style={{ perspective: "1000px" }}>
        <motion.div
          initial={{ y: 50, opacity: 0, rotateX: 10 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="bg-card/95 backdrop-blur-2xl rounded-3xl border border-border shadow-2xl shadow-black/10 p-4 relative overflow-hidden"
        >
          {/* Holographic shine */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-primary/[0.02] rounded-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <div className="flex items-start gap-3 relative">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="h-16 w-16 rounded-2xl bg-background backdrop-blur-sm border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-xl shadow-black/5"
            >
              {safeLogoUrl ? (
                <button
                  type="button"
                  onClick={() => openPhotoLightboxForSrc(safeLogoUrl)}
                  className="group h-full w-full cursor-zoom-in"
                  aria-label={`View ${store.name} photo full screen`}
                >
                  <img
                    src={optimizeImage(safeLogoUrl, 160, "square")}
                    alt={store.name}
                    loading="eager"
                    decoding="async"
                    className={cn(
                      "h-full w-full transition-transform duration-500 group-hover:scale-105",
                      isLodging ? "object-cover" : "object-contain p-1"
                    )}
                    onError={(e) => {
                      if (!isLodging) {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      } else {
                        (e.currentTarget as HTMLImageElement).src = hotelResortFallback;
                      }
                    }}
                  />
                </button>
              ) : isLodging ? (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/15 via-sky-500/10 to-primary/10">
                  <BedDouble className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-amber-500/10 to-fuchsia-500/10">
                  <Store className="h-8 w-8 text-primary" />
                </div>
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-ig-gradient truncate">{store.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <StarRating
                    value={Number(store.rating) || 4.5}
                    size="xs"
                    reviewCount={(store as any).review_count}
                  />
                  <span className="font-semibold text-foreground">{store.rating || "4.5"}</span>
                </span>
                {(store.hours || isLodging) && (() => {
                  const market = (store as any).market || (store as any).country;
                  const status = getStoreStatus(isLodging ? "Open 24 hours" : store.hours as string, market);
                  const cls = status.status === "open"
                    ? "text-emerald-500 font-semibold"
                    : status.status === "closing-soon"
                    ? "text-amber-500 font-semibold"
                    : status.status === "almost-open"
                    ? "text-amber-500"
                    : "text-red-500";
                  return (
                    <span className={`flex items-center gap-1 text-xs ${cls}`}>
                      <Clock className="h-3 w-3" /> {status.label}
                      {status.formattedHours && status.label !== status.formattedHours && (
                        <span className="text-muted-foreground font-normal">· {status.formattedHours}</span>
                      )}
                    </span>
                  );
                })()}
                {store.delivery_min && !["auto-repair","hotel","resort","guesthouse"].includes(store.category) && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/15">
                    {store.delivery_min}m delivery
                  </Badge>
                )}
              </div>
              {store.description && (
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  <SafeCaption text={store.description} />
                </p>
              )}
            </div>
          </div>

          {/* Mobile/Tablet contact actions — clean Booking.com-style layout */}
          <div className="lg:hidden mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
            {/* Primary: Ride There — full width green */}
            {store.address && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const params = new URLSearchParams({ destination: store.address! });
                  const s = store as any;
                  if (s.latitude && s.longitude) {
                    params.set("destLat", String(s.latitude));
                    params.set("destLng", String(s.longitude));
                  }
                  navigate(`/rides/hub?${params.toString()}`);
                }}
                className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
                style={{
                  background: "linear-gradient(180deg, hsl(152 70% 48%), hsl(152 72% 42%))",
                  boxShadow: "0 6px 18px -4px hsl(152 70% 45% / 0.5)",
                }}
              >
                <MapPin className="h-4.5 w-4.5" strokeWidth={2.5} />
                {t("store.ride_there", "Ride There")}
              </motion.button>
            )}

            {/* Inline booking status chip — under Ride There, above tile row */}
            {(() => {
              if (loadingBooking) {
                return (
                  <div
                    role="status"
                    aria-live="polite"
                    className="self-center inline-flex items-center gap-2 px-3.5 h-8 rounded-full bg-white/[0.05] border border-white/10 text-white/70 text-[12.5px] font-semibold"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("store.booking_status.checking")}
                  </div>
                );
              }
              if (hasBooking) {
                return (
                  <div className="self-center inline-flex items-center gap-2 px-3.5 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[12.5px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    {t("store.booking_status.unlocked")} · {t("store.booking_status.unlocked_sub")}
                  </div>
                );
              }
              return (
                <button type="button"
                  onClick={() => isLodging && !hasPublishedRooms ? toast.info("Rooms are not published yet. Check back soon.") : navigate("/trips")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleRefreshBooking();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap"
                >
                  <Lock className="h-4 w-4 shrink-0" />
                  {isLodging && !hasPublishedRooms ? "Rooms not published yet" : t("store.booking_status.locked")}
                </button>
              );
            })()}

            {/* Secondary row: Call/SMS · Chat · Share */}
            <div className="grid grid-cols-3 gap-2">
              {/* Call (or SMS fallback when locked but phone exists) */}
              {(() => {
                const callDisabled = !callable;
                const tel = normalizedPhone;
                const showSmsFallback = callDisabled && !!tel;
                if (showSmsFallback) {
                  const smsBody = encodeURIComponent(
                    `Hi, I'm interested in ${store.name || "your store"}.`
                  );
                  return (
                    <motion.a
                      whileTap={{ scale: 0.96 }}
                      href={`sms:${tel}?body=${smsBody}`}
                      onClick={() => {
                        track("store_contact_action", {
                          store_id: store.id,
                          channel: "sms",
                          click_nonce: clickNonceRef.current,
                        });
                        toast.success(t("store.sms_draft_opened"), { duration: 4000 });
                      }}
                      className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                      <span className="text-[12px] font-semibold">{t("store.sms", "SMS")}</span>
                    </motion.a>
                  );
                }
                return (
                  <motion.a
                    whileTap={{ scale: callDisabled ? 1 : 0.96 }}
                    href={callDisabled ? undefined : `tel:${tel}`}
                    onClick={(e) => {
                      if (callDisabled) {
                        e.preventDefault();
                        return;
                      }
                      track("store_contact_action", {
                        store_id: store.id,
                        channel: "call",
                        click_nonce: clickNonceRef.current,
                      });
                    }}
                    aria-disabled={callDisabled}
                    className={cn(
                      "h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors",
                      callDisabled
                        ? "border-white/10 text-white/35 cursor-not-allowed"
                        : "border-white/15 text-white hover:bg-white/[0.07]"
                    )}
                  >
                    <Phone className="h-4 w-4" strokeWidth={2.2} />
                    <span className="text-[12px] font-semibold">{t("store.call", "Call")}</span>
                  </motion.a>
                );
              })()}

              {/* Chat */}
              {(() => {
                const chatDisabled = !chattable;
                return (
                  <motion.button
                    whileTap={{ scale: chatDisabled ? 1 : 0.96 }}
                    onClick={() => {
                      if (chatDisabled) return;
                      track("store_contact_action", {
                        store_id: store.id,
                        channel: "chat",
                        click_nonce: clickNonceRef.current,
                      });
                      setChatOpen(true);
                    }}
                    disabled={chatDisabled}
                    className={cn(
                      "h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors",
                      chatDisabled
                        ? "border-white/10 text-white/35 cursor-not-allowed"
                        : "border-white/15 text-white hover:bg-white/[0.07]"
                    )}
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                    <span className="text-[12px] font-semibold">{t("store.chat", "Chat")}</span>
                  </motion.button>
                );
              })()}

              {/* Share — tap = native share, long-press / right-click = copy link */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  ignoreNextClickUntilRef.current = Date.now() + 350;
                  copyShareLink();
                }}
                onTouchStart={() => {
                  sharePressFiredRef.current = false;
                  if (sharePressTimerRef.current) clearTimeout(sharePressTimerRef.current);
                  sharePressTimerRef.current = setTimeout(() => {
                    sharePressFiredRef.current = true;
                    ignoreNextClickUntilRef.current = Date.now() + 350;
                    copyShareLink();
                  }, 500);
                }}
                onTouchEnd={(e) => {
                  if (sharePressTimerRef.current) {
                    clearTimeout(sharePressTimerRef.current);
                    sharePressTimerRef.current = null;
                  }
                  // Suppress synthetic click after a fired long-press
                  if (sharePressFiredRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onTouchCancel={() => {
                  if (sharePressTimerRef.current) {
                    clearTimeout(sharePressTimerRef.current);
                    sharePressTimerRef.current = null;
                  }
                }}
                onClick={async (e) => {
                  // Skip if long-press / right-click just fired
                  if (sharePressFiredRef.current || Date.now() < ignoreNextClickUntilRef.current) {
                    sharePressFiredRef.current = false;
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  const title = store.name || "Store";
                  try {
                    if (navigator.share) {
                      await navigator.share({ title, url });
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(url);
                      toast.success(t("store.link_copied"));
                    }
                    track("store_contact_action", {
                      store_id: store.id,
                      channel: "share",
                      click_nonce: clickNonceRef.current,
                    });
                  } catch {
                    /* user cancelled */
                  }
                }}
                className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
              >
                <Share2 className="h-4 w-4" strokeWidth={2.2} />
                <span className="text-[12px] font-semibold">{t("store.share", "Share")}</span>
              </motion.button>
            </div>

            {/* Social links — small icon row */}
            {(() => {
              const s = store as any;
              const socials = [
                s.facebook_url && isAllowedSocialUrl(s.facebook_url) && { icon: Facebook, url: s.facebook_url, label: "Facebook", color: "#1877F2" },
                s.instagram_url && isAllowedSocialUrl(s.instagram_url) && { icon: Instagram, url: s.instagram_url, label: "Instagram", color: "#E4405F" },
                s.telegram_url && isAllowedSocialUrl(s.telegram_url) && { icon: Send, url: s.telegram_url, label: "Telegram", color: "#0088cc" },
              ].filter(Boolean) as Array<{ icon: any; url: string; label: string; color: string }>;
              if (socials.length === 0) return null;
              return (
                <div className="flex items-center justify-center gap-2 pt-1">
                  {socials.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
                      >
                        <Icon className="h-4 w-4" style={{ color: s.color }} />
                      </a>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {!loadingBooking && hasBooking && !phoneNumber && (
            <p className="mt-2 text-[10px] text-white/55 px-1 lg:hidden">
              This store hasn't shared a phone number — chat is the fastest way to reach them.
            </p>
          )}

          {/* Stay selector — embedded in profile card on mobile only (rail hosts it on lg+) */}
          {isLodging && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] lg:hidden">
              <LodgingStaySelector
                checkIn={stay.checkIn}
                checkOut={stay.checkOut}
                adults={stay.adults}
                children={stay.children}
                onChange={updateStay}
                fromPriceCents={minRoomPriceCents}
              />
            </div>
          )}

          {/* Book Now button for auto-repair stores */}
          {store.category === "auto-repair" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 pt-3 border-t border-white/[0.06]"
            >
              <Button
                onClick={() => navigate(`/book/${slug}`)}
                className="w-full h-12 rounded-xl text-sm font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                <CalendarCheck className="h-4 w-4" />
                Book a Service
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Promo Banner Carousel ── */}
      {galleryImages.length > 0 && (
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="relative h-[360px] overflow-hidden rounded-3xl border border-border bg-muted shadow-2xl shadow-black/20 sm:h-[400px] md:h-[430px] xl:h-[460px]"
          >
            <StoreHeroCarousel
              images={galleryImages}
              storeName={store.name}
              positions={(store as any).gallery_positions}
              onOpenGallery={(index) => openPhotoLightboxForSrc(galleryImages[index], index)}
            />
          </motion.div>
        </div>
      )}


      {/* ── Category Tabs - 3D Spatial Pills ── */}
      {categories.length > 0 && (
        <div className="relative px-4 pt-5">
          {/* Frosted track background */}
          <div className="absolute inset-x-4 top-5 bottom-0 rounded-2xl bg-card/30 backdrop-blur-xl border border-white/[0.06] shadow-inner" />
          <div className="relative flex gap-1.5 overflow-x-auto no-scrollbar p-1.5">
            <motion.button
              whileTap={{ scale: 0.88, rotateX: 8 }}
              whileHover={{ y: -2, scale: 1.03 }}
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                "relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200",
                "border backdrop-blur-sm",
                !selectedCategory
                  ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20"
                  : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground"
              )}
              style={{ transformStyle: "preserve-3d" }}
            >
              {!selectedCategory && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />
              )}
              <span className="relative z-10">All</span>
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                whileTap={{ scale: 0.88, rotateX: 8 }}
                whileHover={{ y: -2, scale: 1.03 }}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200",
                  "border backdrop-blur-sm",
                  selectedCategory === cat
                    ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20"
                    : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground"
                )}
                style={{ transformStyle: "preserve-3d" }}
              >
                {selectedCategory === cat && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />
                )}
                <span className="relative z-10">{localizedName(cat, currentLanguage)}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lodging: Rooms & Rates ── */}
      {isLodging ? (
        <div className="px-4 pt-5 pb-40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Rooms & Rates</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
            </span>
          </div>

          {loadingRooms ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary md:mx-0">
                  <BedDouble className="h-6 w-6" />
                </div>
                <div className="min-w-0 text-center md:text-left">
                  <p className="text-base font-bold text-foreground">Rooms are being prepared</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    This hotel is live, but room types, nightly prices, and booking availability are not published yet.
                  </p>
                  <div className="mt-2 grid w-full gap-1.5 text-left sm:grid-cols-3">
                    {[
                      ["Room types", "Pending"],
                      ["Public rates", "Pending"],
                      ["Availability", "Pending"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-background px-2.5 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-amber-600">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <Button
                    className="h-9 whitespace-nowrap gap-2 text-xs"
                    onClick={() => toast.info("Rooms are not published yet. We will show rates here when the hotel is ready.")}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Check room status
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 whitespace-nowrap gap-2 border-border bg-background text-xs text-foreground hover:bg-muted"
                    onClick={() => navigate(`/rides/hub?${new URLSearchParams({ destination: store.address ?? store.name }).toString()}`)}
                  >
                    <MapPin className="h-4 w-4" />
                    Get directions
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {rooms.map((r) => (
                <LodgingRoomCard
                  key={r.id}
                  name={r.name}
                  type={r.room_type}
                  beds={r.beds}
                  bedConfig={r.bed_config}
                  maxGuests={r.max_guests}
                  baseRateCents={r.base_rate_cents}
                  weekendRateCents={r.weekend_rate_cents}
                  weeklyDiscountPct={r.weekly_discount_pct}
                  monthlyDiscountPct={r.monthly_discount_pct}
                  amenities={r.amenities || []}
                  breakfastIncluded={r.breakfast_included}
                  photos={(r.photos as string[]) || []}
                  coverIndex={r.cover_photo_index ?? 0}
                  description={r.description}
                  sizeSqm={r.size_sqm}
                  addons={r.addons || []}
                  cancellationPolicy={r.cancellation_policy}
                  checkInTime={r.check_in_time}
                  checkOutTime={r.check_out_time}
                  breakfastRateCents={r.breakfast_rate_cents ?? undefined}
                  originalRateCents={r.original_rate_cents ?? undefined}
                  badges={r.badges || []}
                  expandableFeatures={r.expandable_features || []}
                  onReserve={(plan) => { setBookingRoom(r); setBookingPlan(plan); }}
                />
              ))}
            </div>
          )}

          {propertyProfile && <LodgingHighlightsStrip profile={propertyProfile} />}

          {propertyProfile && <LodgingPolicyPanel profile={propertyProfile} />}

          <LodgingAmenitiesPanel storeId={store!.id} />
        </div>
      ) : (
      <>
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            {store.category === "auto-repair"
              ? (selectedCategory ? localizedName(selectedCategory, currentLanguage) : "All Services")
              : (selectedCategory ? localizedName(selectedCategory, currentLanguage) : t("store.all_products"))}
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          {products.length} {store.category === "auto-repair" ? "services" : t("store.items")}
        </span>
      </div>

      {/* ── Auto Repair Services List ── */}
      {store.category === "auto-repair" ? (
        <div className="px-4 pt-1 pb-40 space-y-3">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="h-12 w-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No services available</p>
            </div>
          ) : (
            (() => {
              const grouped = !selectedCategory
                ? categories.reduce<Record<string, typeof products>>((acc, cat) => {
                    acc[cat] = products.filter((p: any) => p.category === cat);
                    return acc;
                  }, {})
                : { [selectedCategory]: products };
              if (!selectedCategory) {
                const uncategorized = products.filter((p: any) => !p.category || !categories.includes(p.category));
                if (uncategorized.length > 0) grouped["Other"] = uncategorized;
              }
              return Object.entries(grouped).map(([cat, catProducts]) => {
                if (!catProducts.length) return null;
                return (
                  <div key={cat} className="space-y-2">
                    {!selectedCategory && Object.keys(grouped).length > 1 && (
                      <div className="flex items-center gap-2 pt-2">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-3 w-3 text-primary" />
                        </div>
                        <h3 className="text-xs font-bold text-foreground">{cat}</h3>
                        <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full">{catProducts.length}</span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>
                    )}
                    {catProducts.map((service) => {
                      const p = service as any;
                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
                        >
                          <div className="flex gap-3 p-3">
                            {/* Service image */}
                            <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted/10 shrink-0">
                              <StoreItemImage
                                src={service.image_url}
                                label={localizedName(service.name, currentLanguage)}
                                imgClassName="h-full w-full object-cover"
                                iconClassName="h-6 w-6"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-tight">{localizedName(service.name, currentLanguage)}</p>
                              {service.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                {p.unit && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {p.unit}
                                  </Badge>
                                )}
                                {p.category && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                                    {p.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-between shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-bold text-foreground">${service.price.toFixed(2)}</p>
                                <p className="text-[9px] text-muted-foreground">starting</p>
                              </div>
                              <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => {
                                  navigate(`/book/${slug}?service=${encodeURIComponent(service.name)}`);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shadow-sm"
                              >
                                Book
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>
      ) : (

      /* ── Products Grid - 3D Holographic Cards (Grocery) ── */
      <div className="px-3 pt-1 pb-40" style={{ perspective: "1200px" }}>
        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">{t("store.no_products")}</p>
          </div>
        ) : (
          (() => {
            // Group by category when showing "All"
            const grouped = !selectedCategory
              ? categories.reduce<Record<string, typeof products>>((acc, cat) => {
                  acc[cat] = products.filter((p: any) => p.category === cat);
                  return acc;
                }, {})
              : { [selectedCategory]: products };

            // Add uncategorized
            if (!selectedCategory) {
              const uncategorized = products.filter((p: any) => !p.category || !categories.includes(p.category));
              if (uncategorized.length > 0) grouped[t("store.other", "Other")] = uncategorized;
            }

            return Object.entries(grouped).map(([cat, catProducts]) => {
              if (!catProducts.length) return null;
              return (
                <div key={cat} className="mb-5">
                  {!selectedCategory && Object.keys(grouped).length > 1 && (
                    <div className="flex items-center gap-2.5 mb-3 px-1">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-[13px] font-bold text-foreground tracking-tight">{localizedName(cat, currentLanguage)}</h3>
                      <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/30 px-2 py-0.5 rounded-full">{catProducts.length}</span>
                      <div className="flex-1 h-px bg-border/30 ml-1" />
                    </div>
                  )}
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {catProducts.map((product, i) => {
                      const p = product as any;
                      const sizeVariants: { size: string; price_khr: number; price_usd: number }[] = (p.size_variants || []);
                      const hasSizes = sizeVariants.length > 0;
                      const selectedIdx = selectedSizes[product.id] ?? 0;
                      const activeVariant = hasSizes ? sizeVariants[selectedIdx] : null;
                      const activePrice = activeVariant ? activeVariant.price_usd : product.price;
                      const activeKhr = activeVariant ? activeVariant.price_khr : ((p.price_khr || Math.round(product.price * ((store as any)?.khr_rate || 4050))));
                      const cartKey = hasSizes && activeVariant ? `${product.id}__${activeVariant.size}` : product.id;
                      const cartItem = cart.items.find((c) => c.productId === cartKey);
                      const khrPrice = activeKhr;
                      const isLiked = likedProducts.has(product.id);
                      const hasBogo = p.discount_type === "bogo" && (p.buy_quantity || 0) >= 1 && (p.get_quantity || 0) >= 1
                        && (!p.discount_expires_at || new Date(p.discount_expires_at) > new Date());
                      const hasDiscount = !hasBogo && p.discount_type && p.discount_value > 0 && p.discount_price_khr != null
                        && (!p.discount_expires_at || new Date(p.discount_expires_at) > new Date());
                      const discountKhr = hasDiscount ? p.discount_price_khr : null;
                      const discountUsd = hasDiscount ? parseFloat((discountKhr / ((store as any)?.khr_rate || 4050)).toFixed(2)) : null;
                      const discountPct = hasDiscount && p.discount_type === "percentage" ? p.discount_value : null;
                      const imageSources = productImageCandidates(product, store, i);
                      return (
                <motion.div
                  key={product.id}
                  variants={cardVariant}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden snap-start shrink-0",
                    "bg-card border",
                    "w-[28vw] min-w-[105px] max-w-[120px]",
                    cartItem
                      ? "border-primary/30 ring-1 ring-primary/10"
                      : "border-border/40"
                  )}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted/10 rounded-t-2xl">
                    <StoreItemImage
                      srcs={imageSources}
                      label={localizedName(product.name, currentLanguage)}
                      imgClassName="h-full w-full object-contain p-1.5"
                    />

                    {/* Badge - top right */}
                    {(product as any).badge && (() => {
                      const badgeMap: Record<string, { labelKm: string; labelEn: string; cls: string }> = {
                        "new": { labelKm: "ថ្មី", labelEn: "New", cls: "from-blue-500 to-indigo-600" },
                        "hot": { labelKm: "ក្ដៅ", labelEn: "Hot", cls: "from-red-500 to-orange-500" },
                        "popular": { labelKm: "កំពូល", labelEn: "Popular", cls: "from-amber-400 to-orange-500" },
                        "best-seller": { labelKm: "លក់ដាច់", labelEn: "Best Seller", cls: "from-emerald-500 to-teal-500" },
                        "limited": { labelKm: "មានកំណត់", labelEn: "Limited", cls: "from-purple-500 to-pink-500" },
                        "recommended": { labelKm: "ណែនាំ", labelEn: "Recommended", cls: "from-sky-400 to-blue-500" },
                        "organic": { labelKm: "ធម្មជាតិ", labelEn: "Organic", cls: "from-green-500 to-emerald-500" },
                        "imported": { labelKm: "នាំចូល", labelEn: "Imported", cls: "from-violet-500 to-fuchsia-500" },
                      };
                      const b = badgeMap[(product as any).badge];
                      if (!b) return null;
                      return (
                        <div className={cn("absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r text-white text-[6px] font-bold z-10", b.cls)}>
                          {currentLanguage === "km" ? b.labelKm : b.labelEn}
                        </div>
                      );
                    })()}

                    {/* Discount badge */}
                    {hasDiscount && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground text-[7px] font-bold z-10">
                        {discountPct ? `-${discountPct}%` : t("store.sale")}
                      </div>
                    )}

                    {/* BOGO badge */}
                    {hasBogo && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[6px] font-bold z-10">
                        {t("store.buy_x_get_y").replace("{buy}", String(p.buy_quantity)).replace("{get}", String(p.get_quantity))}
                      </div>
                    )}

                    {/* Cart quantity */}
                    <AnimatePresence>
                      {cartItem && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-1 left-1 h-5 min-w-[20px] px-1 rounded-full bg-primary flex items-center justify-center ring-1 ring-background z-20"
                        >
                          <span className="text-[8px] font-black text-primary-foreground">{cartItem.quantity}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Like button */}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); toggleLike(product.id); }}
                      className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-background/60 backdrop-blur flex items-center justify-center z-20"
                    >
                      <Heart className={cn("h-2.5 w-2.5", isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground/50")} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="px-1.5 pt-1 pb-1.5">
                    <p className="text-[9px] font-semibold text-foreground line-clamp-2 leading-tight min-h-[22px]">
                      {localizedName(product.name, currentLanguage)}
                    </p>

                    {/* Size pills */}
                    {hasSizes && (
                      <div className="flex gap-0.5 mt-1">
                        {sizeVariants.map((sv, sIdx) => (
                          <button type="button"
                            key={sv.size}
                            onClick={(e) => { e.stopPropagation(); setSelectedSizes(prev => ({ ...prev, [product.id]: sIdx })); }}
                            className={cn(
                              "h-4 px-1.5 rounded text-[7px] font-bold border transition-all",
                              selectedIdx === sIdx
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : "bg-muted/10 border-border/30 text-muted-foreground/40"
                            )}
                          >
                            {sv.size}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Price + Add */}
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        {hasDiscount && !hasSizes ? (
                          <>
                            <span className="text-[11px] font-black text-destructive leading-none block">
                              ៛{discountKhr.toLocaleString()}
                            </span>
                            <span className="text-[7px] text-muted-foreground/40 line-through">
                              ៛{khrPrice.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-black text-foreground leading-none block">
                              ៛{khrPrice.toLocaleString()}
                            </span>
                            <span className="text-[7px] text-muted-foreground/40">
                              ${activePrice.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>

                      {!cartItem && product.in_stock && (
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(product, activeVariant || undefined); }}
                          className="h-6 w-6 shrink-0 rounded-full bg-primary flex items-center justify-center shadow-sm"
                        >
                          <Plus className="h-3 w-3 text-primary-foreground" />
                        </motion.button>
                      )}
                    </div>

                    {/* Quantity stepper */}
                    {cartItem && (
                      <div className="flex items-center justify-between bg-primary/[0.08] rounded-lg p-0.5 mt-1">
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); cart.updateQuantity(cartKey, cartItem.quantity - 1); }}
                          className="h-5 w-5 rounded-md bg-background/80 flex items-center justify-center touch-manipulation"
                        >
                          <Minus className="h-2.5 w-2.5 text-foreground/60" />
                        </button>
                        <span className="text-[9px] font-black text-primary">{cartItem.quantity}</span>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); cart.updateQuantity(cartKey, cartItem.quantity + 1); }}
                          className="h-5 w-5 rounded-md bg-background/80 flex items-center justify-center touch-manipulation"
                        >
                          <Plus className="h-2.5 w-2.5 text-foreground/60" />
                        </button>
                      </div>
                    )}

                    {!product.in_stock && (
                      <div className="text-[7px] text-muted-foreground text-center py-1 rounded bg-muted/10 font-semibold mt-1 uppercase">
                        {t("store.out_of_stock")}
                      </div>
                    )}
                  </div>
                </motion.div>
                    );
                    })}
                  </motion.div>
                </div>
              );
            });
          })()
        )}
      </div>
      )}
      </>
      )}

      </div>{/* /lg:col-span-7 left column */}

      {/* ── Desktop sticky right rail ── */}
      <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 lg:self-start">
        <StoreSideRail
          store={store}
          hasBooking={hasBooking}
          loadingBooking={loadingBooking}
          bookingSource={bookingSource}
          callable={callable}
          chattable={chattable}
          phoneNumber={phoneNumber}
          onOpenChat={() => setChatOpen(true)}
          isLodging={isLodging}
          stay={isLodging ? stay : undefined}
          onStayChange={isLodging ? updateStay : undefined}
          roomsMinPriceCents={isLodging ? minRoomPriceCents : undefined}
          hasPublishedRooms={!isLodging || hasPublishedRooms}
          showBookService={store.category === "auto-repair"}
          onBookService={() => navigate(`/book/${slug}`)}
          userLoc={userLoc}
        />
      </aside>

      </div>{/* /desktop split grid */}

      {/* ── Floating Cart Bar - Premium 3D ── */}
      <AnimatePresence>
        {cart.itemCount > 0 && !showCart && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] left-3 right-3 z-50"
          >
            <button type="button"
              onClick={() => setShowCart(true)}
              className="w-full rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/30 border border-primary/30 relative overflow-hidden active:scale-[0.98] transition-transform px-4 py-3"
            >
              {/* Shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                {/* Left: cart icon + count */}
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-extrabold">{store?.category === "auto-repair" ? "View Booking" : t("store.view_cart")}</p>
                    <p className="text-[10px] font-medium opacity-80">{cart.itemCount} {store?.category === "auto-repair" ? "services" : t("store.items")}</p>
                  </div>
                </div>
                {/* Right: price */}
                <div className="text-right">
                  <p className="text-[14px] font-extrabold">៛{Math.round(cart.total * ((store as any)?.khr_rate || 4050)).toLocaleString()}</p>
                  <p className="text-[10px] font-medium opacity-80">${cart.total.toFixed(2)}</p>
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showCart && (
        <GroceryCheckoutDrawer
          items={cart.items}
          total={cart.total}
          onClose={() => setShowCart(false)}
          onOrderPlaced={() => { cart.clearCart(); setShowCart(false); }}
          onRemoveItem={cart.removeItem}
          onUpdateQuantity={cart.updateQuantity}
          storeCoords={store?.latitude && store?.longitude ? { lat: store.latitude, lng: store.longitude } : null}
          storeName={store?.name}
          storePaymentTypes={(store?.payment_types as any[]) || ["cash", "card"]}
        />
      )}
      {store && (
        <StoreLiveChat
          storeId={store.id}
          storeName={store.name}
          storeLogo={safeLogoUrl || null}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
      {bookingRoom && store && (
        <LodgingBookingDrawer
          open={!!bookingRoom}
          onClose={() => { setBookingRoom(null); setBookingPlan(null); }}
          storeId={store.id}
          storeName={store.name}
          storePhone={(store as any).phone}
          roomId={bookingRoom.id}
          roomName={bookingRoom.name}
          ratePlanLabel={bookingPlan?.label}
          baseRateCents={bookingPlan?.rateCents ?? bookingRoom.base_rate_cents}
          weekendRateCents={bookingRoom.weekend_rate_cents}
          weeklyDiscountPct={bookingRoom.weekly_discount_pct}
          monthlyDiscountPct={bookingRoom.monthly_discount_pct}
          cancellationPolicy={bookingRoom.cancellation_policy}
          addons={bookingRoom.addons || []}
          fees={(bookingRoom as any).fees}
          childPolicy={(bookingRoom as any).child_policy}
          minStay={(bookingRoom as any).min_stay}
          maxStay={(bookingRoom as any).max_stay}
          noArrivalWeekdays={(bookingRoom as any).no_arrival_weekdays}
          checkIn={stay.checkIn}
          checkOut={stay.checkOut}
          adults={stay.adults}
          children={stay.children}
        />
      )}
      <StorePhotoLightbox
        open={photoLightbox.open}
        images={allPhotoImages}
        storeName={store.name}
        initialIndex={photoLightbox.index}
        positions={(store as any).gallery_positions}
        onClose={() => setPhotoLightbox((current) => ({ ...current, open: false }))}
      />
      <ZivoMobileNav />
    </div>
  );
}
