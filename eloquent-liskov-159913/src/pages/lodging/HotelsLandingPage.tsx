/**
 * HotelsLandingPage
 * Booking-style discovery: tighter hero, dates+guests, quick filters,
 * price/amenities/rating on cards, "Near me" sort.
 *
 * Route: /hotels
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Heart from "lucide-react/dist/esm/icons/heart";
import Clock from "lucide-react/dist/esm/icons/clock";
import X from "lucide-react/dist/esm/icons/x";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Coffee from "lucide-react/dist/esm/icons/coffee";
import Dog from "lucide-react/dist/esm/icons/dog";
import HotelIcon from "lucide-react/dist/esm/icons/hotel";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Star from "lucide-react/dist/esm/icons/star";
import Users from "lucide-react/dist/esm/icons/users";
import Waves from "lucide-react/dist/esm/icons/waves";
import Wifi from "lucide-react/dist/esm/icons/wifi";

import { useQuery, useQueryClient } from "@tanstack/react-query";

const HotelsMapView = lazy(() => import("@/components/lodging/HotelsMapView"));
const HotelConciergeSheet = lazy(() => import("@/components/lodging/HotelConciergeSheet"));
const GOOGLE_MAPS_KEY: string =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || "";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { LODGING_STORE_CATEGORIES, normalizeStoreCategory } from "@/hooks/useOwnerStoreProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/shared/SmartImage";

import tabHotelsBg from "@/assets/tab-hotels-bg.jpg";
import destPhnomPenh from "@/assets/destinations/phnom-penh.jpg";
import destSiemReap from "@/assets/destinations/siem-reap.jpg";
import destSihanoukville from "@/assets/destinations/sihanoukville.jpg";
import destKep from "@/assets/destinations/kep.jpg";
import destKampot from "@/assets/destinations/kampot.jpg";
import destBattambang from "@/assets/destinations/battambang.jpg";

interface DirectoryStore {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  setup_complete: boolean | null;
  is_verified?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
}

const FILTERS: Array<{ id: string; label: string; match: (cat: string) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "hotel", label: "Hotels", match: (c) => c.includes("hotel") },
  { id: "resort", label: "Resorts", match: (c) => c.includes("resort") },
  { id: "guesthouse", label: "Guesthouses", match: (c) => c.includes("guest") || c.includes("bed and breakfast") },
];

const QUICK_TAGS: Array<{ id: string; label: string; keywords: string[]; icon: typeof Coffee }> = [
  { id: "beach", label: "Beachfront", keywords: ["beach", "beachfront", "sea"], icon: Waves },
  { id: "pool", label: "Pool", keywords: ["pool", "swimming"], icon: Waves },
  { id: "breakfast", label: "Breakfast", keywords: ["breakfast"], icon: Coffee },
  { id: "wifi", label: "Free Wi-Fi", keywords: ["wifi", "wi-fi"], icon: Wifi },
  { id: "family", label: "Family", keywords: ["family", "kids", "children"], icon: Users },
  { id: "pet", label: "Pet-friendly", keywords: ["pet"], icon: Dog },
];

const POPULAR_DESTINATIONS: Array<{ id: string; label: string; city: string; img: string }> = [
  { id: "pp", label: "Phnom Penh", city: "phnom penh", img: destPhnomPenh },
  { id: "sr", label: "Siem Reap", city: "siem reap", img: destSiemReap },
  { id: "sv", label: "Sihanoukville", city: "sihanoukville", img: destSihanoukville },
  { id: "kep", label: "Kep", city: "kep", img: destKep },
  { id: "kampot", label: "Kampot", city: "kampot", img: destKampot },
  { id: "btb", label: "Battambang", city: "battambang", img: destBattambang },
];

const todayUTC = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HotelsLandingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { format: fmtPrice } = useCurrency();

  // Honor share-card / deep-link query params on mount: ?city=&ci=&co=&adults=&children=
  // Matches the params built by ZivoCardPicker's hotel composer.
  const initial = useMemo(() => {
    const parseDate = (raw: string | null): Date | null => {
      if (!raw) return null;
      const d = new Date(raw + "T00:00:00");
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const parseInt10 = (raw: string | null): number | null => {
      if (!raw) return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const sortRaw = searchParams.get("sort");
    const validSorts = ["default", "price_asc", "price_desc", "rating", "near_me"] as const;
    type SortKey = typeof validSorts[number];
    const viewRaw = searchParams.get("view");
    return {
      city: searchParams.get("city") || "",
      ci: parseDate(searchParams.get("ci")),
      co: parseDate(searchParams.get("co")),
      adults: parseInt10(searchParams.get("adults")),
      children: parseInt10(searchParams.get("children")),
      rooms: parseInt10(searchParams.get("rooms")),
      filter: searchParams.get("filter") || "all",
      tags: (searchParams.get("tags") || "").split(",").filter(Boolean),
      saved: searchParams.get("saved") === "1",
      budget: parseInt10(searchParams.get("budget")),
      sort: (validSorts.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "default") as SortKey,
      view: (viewRaw === "map" ? "map" : "list") as "list" | "map",
    };
    // We compute this once at mount; subsequent in-page changes shouldn't
    // re-overwrite the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [search, setSearch] = useState(initial.city);
  const [activeFilter, setActiveFilter] = useState<string>(initial.filter);
  const [activeTags, setActiveTags] = useState<string[]>(initial.tags);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hotel_recent_searches") || "[]") as string[];
      // Strip junk (single-letter / 2-letter typos) that previously slipped in
      // via onBlur of half-typed queries.
      const cleaned = Array.from(new Set(raw.map((s) => s.trim()).filter((s) => s.length >= 3)));
      if (cleaned.length !== raw.length) {
        try { localStorage.setItem("hotel_recent_searches", JSON.stringify(cleaned)); } catch {}
      }
      return cleaned;
    } catch { return []; }
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [checkIn, setCheckIn] = useState<Date>(() => initial.ci ?? todayUTC());
  const [checkOut, setCheckOut] = useState<Date>(
    () => initial.co ?? addDays(initial.ci ?? todayUTC(), 1)
  );
  const [guests, setGuests] = useState<number>(initial.adults ?? 2);
  const [children, setChildren] = useState<number>(initial.children ?? 0);
  const [rooms, setRooms] = useState<number>(initial.rooms ?? 1);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "rating" | "near_me">(initial.sort);
  const [maxBudget, setMaxBudget] = useState<number | null>(initial.budget); // USD per night, null = no limit
  const [savedOnly, setSavedOnly] = useState(initial.saved);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("hotel_faves") || "[]") as string[]); }
    catch { return new Set<string>(); }
  });

  type RecentlyViewed = {
    id: string;
    name: string;
    category: string | null;
    address: string | null;
    logo_url: string | null;
    banner_url: string | null;
    viewed_at: number;
  };
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>(() => {
    try { return (JSON.parse(localStorage.getItem("hotel_recently_viewed") || "[]") as RecentlyViewed[]).filter((x) => x?.id && x?.name); }
    catch { return []; }
  });
  const clearRecentlyViewed = () => {
    try { localStorage.removeItem("hotel_recently_viewed"); } catch {}
    setRecentlyViewed([]);
  };

  const [viewMode, setViewMode] = useState<"list" | "map">(initial.view);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  // Infinite scroll: render the first PAGE_SIZE rows, then add another page
  // each time the sentinel enters the viewport. Resets on filter/search
  // change via the effect below.
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("hotel_faves", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Show a sticky compact header once the hero scrolls out of view
  useEffect(() => {
    const onScroll = () => {
      const el = heroSentinelRef.current;
      if (!el) return;
      // Sentinel sits right below the hero. When its top is above 0 the hero has scrolled away.
      setShowStickyBar(el.getBoundingClientRect().top < 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset infinite-scroll page back to the first chunk whenever the user
  // changes any filter — they should see the new top of the list, not the
  // tail of the previous one.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, activeFilter, activeTags, savedOnly, maxBudget, sortBy]);

  // Auto-load the next page when the sentinel scrolls into view. We arm a
  // 200px rootMargin so the next batch starts rendering before the user
  // actually hits the bottom — keeps scrolling smooth.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "200px 0px 200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount]);

  // Sync filters + dates + guests back to the URL so refresh / back-button /
  // share preserve the full search criteria. The Booking/Airbnb-style flow
  // expects every input on this page to round-trip through the URL.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, val: string) => {
      if (val) next.set(key, val); else next.delete(key);
    };
    setOrDelete("city", search.trim());
    setOrDelete("filter", activeFilter !== "all" ? activeFilter : "");
    setOrDelete("tags", activeTags.join(","));
    setOrDelete("ci", format(checkIn, "yyyy-MM-dd"));
    setOrDelete("co", format(checkOut, "yyyy-MM-dd"));
    setOrDelete("adults", guests !== 2 ? String(guests) : "");
    setOrDelete("children", children > 0 ? String(children) : "");
    setOrDelete("rooms", rooms > 1 ? String(rooms) : "");
    setOrDelete("saved", savedOnly ? "1" : "");
    setOrDelete("budget", maxBudget !== null ? String(maxBudget) : "");
    setOrDelete("sort", sortBy !== "default" ? sortBy : "");
    setOrDelete("view", viewMode !== "list" ? viewMode : "");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, activeTags, checkIn, checkOut, guests, children, rooms, savedOnly, maxBudget, sortBy, viewMode]);

  const pushRecentSearch = useCallback((value: string) => {
    const v = value.trim();
    // Skip half-typed queries — only save things the user is likely to want
    // to search for again.
    if (v.length < 3) return;
    setRecentSearches((prev) => {
      const next = [v, ...prev.filter((p) => p.toLowerCase() !== v.toLowerCase())].slice(0, 5);
      try { localStorage.setItem("hotel_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((value: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((p) => p.toLowerCase() !== value.toLowerCase());
      try { localStorage.setItem("hotel_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Scroll the results section to the top of the viewport. Uses an explicit
  // window.scrollTo (not scrollIntoView) and a short timeout so that React
  // re-renders triggered by upstream state changes (`setSearch`, filter
  // resets) settle their layout heights before we measure. Without this the
  // filtered list shrinks mid-scroll and the destination point moves out
  // from under us — the page ends up parked at scrollY ~270 instead of at
  // the results header.
  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      const el = document.getElementById("hotels-all");
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }, 80);
  }, []);

  // Unified "submit search" — used by the Search button, Enter key on the
  // search input, and the sticky bar. Records the query, closes the dropdown,
  // dismisses the keyboard, and scrolls to the results section. The URL
  // already carries the full state via the sync effect above, so there's
  // nothing else to wire up.
  const submitSearch = useCallback(() => {
    const v = search.trim();
    if (v) pushRecentSearch(v);
    setSearchFocused(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    scrollToResults();
  }, [search, pushRecentSearch, scrollToResults]);

  // "See all top-rated" — used by the Featured-properties section header.
  // Clears narrow filters and switches sort to rating so the user actually
  // lands on the same set of properties that were featured, expanded to the
  // full ranked list.
  const jumpToFeatured = useCallback(() => {
    setSearch("");
    setActiveFilter("all");
    setActiveTags([]);
    setSavedOnly(false);
    setMaxBudget(null);
    setSortBy("rating");
    requestAnimationFrame(() => {
      const el = document.getElementById("hotels-all");
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }, []);

  // Open a hotel detail page with the RPC pre-warmed so the destination
  // renders in one round-trip instead of 5-6. Shared by featured cards,
  // recently-viewed cards, and the autocomplete dropdown.
  const openHotel = useCallback((id: string) => {
    qc.prefetchQuery({
      queryKey: ["hotel-detail-rpc", id],
      queryFn: async () => {
        const { data } = await (supabase as any).rpc("get_hotel_detail", {
          p_store_id: id,
          p_check_in: null,
          p_check_out: null,
        });
        return data;
      },
      staleTime: 60_000,
    });
    navigate(`/hotel/${id}?ci=${format(checkIn, "yyyy-MM-dd")}&co=${format(checkOut, "yyyy-MM-dd")}&adults=${guests}&children=${children}`);
  }, [qc, navigate, checkIn, checkOut, guests, children]);

  // Smart back — Booking/Airbnb-style. If the user has narrowed the view
  // (search, filter, saved, budget, sort, or map mode), the first back tap
  // unwinds those choices instead of leaving the page. A second tap (now on
  // a clean view) actually navigates away.
  const smartBack = useCallback(() => {
    const narrowed =
      !!search.trim() ||
      activeTags.length > 0 ||
      activeFilter !== "all" ||
      savedOnly ||
      maxBudget !== null ||
      sortBy !== "default" ||
      viewMode === "map";
    if (narrowed) {
      setSearch("");
      setActiveTags([]);
      setActiveFilter("all");
      setSavedOnly(false);
      setMaxBudget(null);
      setSortBy("default");
      setViewMode("list");
      setSearchFocused(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }, [search, activeTags, activeFilter, savedOnly, maxBudget, sortBy, viewMode, navigate]);

  // "See all in <destination>" — used by Popular-destination cards and recent
  // search chips. Clears narrow filters (tags, saved, budget, sort) so the
  // user lands on a clean city-wide list, then scrolls to results.
  const jumpToDestination = useCallback((city: string) => {
    const v = city.trim();
    setSearch(v);
    setActiveFilter("all");
    setActiveTags([]);
    setSavedOnly(false);
    setMaxBudget(null);
    setSortBy("default");
    if (v) pushRecentSearch(v);
    scrollToResults();
  }, [pushRecentSearch, scrollToResults]);

  const listQuery = useQuery({
    queryKey: ["hotels-landing"],
    staleTime: 300_000,
    gcTime: 600_000,
    queryFn: async (): Promise<DirectoryStore[]> => {
      const { data, error } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, category, address, logo_url, banner_url, description, setup_complete, is_verified, latitude, longitude")
        .in("category", LODGING_STORE_CATEGORIES)
        .order("setup_complete", { ascending: false })
        .order("name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as DirectoryStore[];
    },
  });

  const all = listQuery.data || [];
  const storeIds = useMemo(() => all.map((s) => s.id), [all]);

  // Autocomplete suggestions — top 6 hotels matching the current query.
  // Stay light: only run once the user has typed 2+ chars to avoid showing
  // the whole list when the input is just focused.
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [] as DirectoryStore[];
    return all
      .filter((s) => {
        if (s.name.toLowerCase().includes(q)) return true;
        if ((s.address || "").toLowerCase().includes(q)) return true;
        return false;
      })
      .slice(0, 6);
  }, [search, all]);

  // Min rates per store (with stay-length discount info)
  type RateInfo = {
    base: number;
    weeklyPct: number;
    monthlyPct: number;
  };
  const ratesQuery = useQuery({
    queryKey: ["lodge-min-rates", storeIds],
    enabled: storeIds.length > 0,
    staleTime: 300_000,
    queryFn: async (): Promise<Record<string, RateInfo>> => {
      const { data, error } = await (supabase as any)
        .from("lodge_rooms")
        .select("store_id, base_rate_cents, weekly_discount_pct, monthly_discount_pct, is_active")
        .in("store_id", storeIds)
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, RateInfo> = {};
      for (const r of (data || []) as Array<{
        store_id: string;
        base_rate_cents: number;
        weekly_discount_pct: number | null;
        monthly_discount_pct: number | null;
      }>) {
        if (!r.base_rate_cents || r.base_rate_cents <= 0) continue;
        const existing = map[r.store_id];
        if (!existing || r.base_rate_cents < existing.base) {
          map[r.store_id] = {
            base: r.base_rate_cents,
            weeklyPct: Number(r.weekly_discount_pct) || 0,
            monthlyPct: Number(r.monthly_discount_pct) || 0,
          };
        }
      }
      return map;
    },
  });

  // Active public promotions per store (largest discount wins)
  type PromoInfo = {
    type: "percent" | "fixed";
    value: number;
    name: string;
    minNights: number;
    maxNights: number | null;
  };
  const promotionsQuery = useQuery({
    queryKey: ["lodge-promotions", storeIds],
    enabled: storeIds.length > 0,
    staleTime: 300_000,
    queryFn: async (): Promise<Record<string, PromoInfo>> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("lodging_promotions")
        .select("store_id, promo_type, discount_value, name, min_nights, max_nights, starts_at, ends_at, active, member_only")
        .in("store_id", storeIds)
        .eq("active", true)
        .eq("member_only", false);
      if (error) {
        // Silently ignore — fall back to base rates
        return {};
      }
      const map: Record<string, PromoInfo> = {};
      for (const r of (data || []) as Array<any>) {
        if (r.starts_at && r.starts_at > nowIso) continue;
        if (r.ends_at && r.ends_at < nowIso) continue;
        const type = r.promo_type === "fixed" ? "fixed" : "percent";
        const value = Number(r.discount_value) || 0;
        if (value <= 0) continue;
        const candidate: PromoInfo = {
          type,
          value,
          name: r.name || "",
          minNights: Number(r.min_nights) || 1,
          maxNights: r.max_nights ? Number(r.max_nights) : null,
        };
        const existing = map[r.store_id];
        // Prefer larger percentage; fixed treated roughly as value cents-equivalent
        const score = (p: PromoInfo) => (p.type === "percent" ? p.value : p.value);
        if (!existing || score(candidate) > score(existing)) {
          map[r.store_id] = candidate;
        }
      }
      return map;
    },
  });

  type PropertyProfile = { amenities: string[]; rating: number | null };

  // Amenities + ratings per store
  const amenitiesQuery = useQuery({
    queryKey: ["lodge-amenities", storeIds],
    enabled: storeIds.length > 0,
    staleTime: 300_000,
    queryFn: async (): Promise<Record<string, PropertyProfile>> => {
      const { data, error } = await (supabase as any)
        .from("lodge_property_profile")
        .select("store_id, popular_amenities, facilities")
        .in("store_id", storeIds);
      if (error) throw error;
      const map: Record<string, PropertyProfile> = {};
      for (const r of (data || []) as Array<{
        store_id: string;
        popular_amenities: string[] | null;
        facilities: string[] | null;
      }>) {
        const list = [...(r.popular_amenities || []), ...(r.facilities || [])]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        map[r.store_id] = {
          amenities: Array.from(new Set(list)),
          rating: null,
        };
      }
      return map;
    },
  });

  // Review counts + true avg per store (lodging_reviews)
  const reviewStatsQuery = useQuery({
    queryKey: ["lodge-review-stats", storeIds],
    enabled: storeIds.length > 0,
    staleTime: 300_000,
    gcTime: 600_000,
    queryFn: async (): Promise<Record<string, { avg: number; count: number }>> => {
      const { data, error } = await (supabase as any)
        .from("lodging_reviews")
        .select("store_id, rating")
        .in("store_id", storeIds)
        .eq("flagged", false);
      if (error) return {};
      const acc: Record<string, { sum: number; count: number }> = {};
      for (const r of (data || []) as Array<{ store_id: string; rating: number }>) {
        const a = (acc[r.store_id] ||= { sum: 0, count: 0 });
        a.sum += Number(r.rating) || 0;
        a.count += 1;
      }
      const out: Record<string, { avg: number; count: number }> = {};
      for (const [id, v] of Object.entries(acc)) {
        out[id] = { avg: v.count ? v.sum / v.count : 0, count: v.count };
      }
      return out;
    },
  });

  const minRates = ratesQuery.data || {};
  const promotions = promotionsQuery.data || {};
  const amenitiesMap = amenitiesQuery.data || {};
  const reviewStats = reviewStatsQuery.data || {};
  const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));

  const requestNearMe = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("near_me");
      },
      () => setCoords(null),
      { timeout: 8000, enableHighAccuracy: false },
    );
  };

  const featured = useMemo(
    () => {
      const completed = all.filter((s) => s.setup_complete);
      if (completed.length === 0) return [];
      // Sort featured by review rating so best-reviewed properties surface first
      const withRating = [...completed].sort((a, b) => {
        const ra = reviewStats[a.id]?.count ? reviewStats[a.id].avg : -1;
        const rb = reviewStats[b.id]?.count ? reviewStats[b.id].avg : -1;
        return rb - ra;
      });
      return withRating.slice(0, 6);
    },
    [all, reviewStats]
  );


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matcher = FILTERS.find((f) => f.id === activeFilter)?.match || (() => true);
    return all.filter((store) => {
      const cat = normalizeStoreCategory(store.category);
      if (!matcher(cat)) return false;
      if (q) {
        const haystack = [store.name, store.address, store.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (activeTags.length > 0) {
        const am = amenitiesMap[store.id]?.amenities || [];
        const haystack = [...am, store.description?.toLowerCase() || ""].join(" ");
        const ok = activeTags.every((tagId) => {
          const tag = QUICK_TAGS.find((t) => t.id === tagId);
          if (!tag) return true;
          return tag.keywords.some((k) => haystack.includes(k));
        });
        if (!ok) return false;
      }
      if (savedOnly && !favorites.has(store.id)) return false;
      if (maxBudget !== null) {
        const cents = minRates[store.id]?.base;
        if (typeof cents === "number" && cents / 100 > maxBudget) return false;
      }
      return true;
    });
  }, [all, search, activeFilter, activeTags, amenitiesMap, savedOnly, favorites, maxBudget, minRates]);

  const sorted = useMemo(() => {
    if (sortBy === "price_asc") {
      return [...filtered].sort((a, b) => (minRates[a.id]?.base ?? Infinity) - (minRates[b.id]?.base ?? Infinity));
    }
    if (sortBy === "price_desc") {
      return [...filtered].sort((a, b) => (minRates[b.id]?.base ?? 0) - (minRates[a.id]?.base ?? 0));
    }
    if (sortBy === "rating") {
      return [...filtered].sort((a, b) => {
        const ra = reviewStats[a.id]?.count ? reviewStats[a.id].avg : -1;
        const rb = reviewStats[b.id]?.count ? reviewStats[b.id].avg : -1;
        return rb - ra;
      });
    }
    if (sortBy === "near_me") {
      if (coords) {
        return [...filtered].sort((a, b) => {
          const da = (typeof a.latitude === "number" && typeof a.longitude === "number")
            ? haversineDist(coords.lat, coords.lng, a.latitude, a.longitude) : Infinity;
          const db = (typeof b.latitude === "number" && typeof b.longitude === "number")
            ? haversineDist(coords.lat, coords.lng, b.latitude, b.longitude) : Infinity;
          return da - db;
        });
      }
      return [...filtered].sort((a, b) => (favorites.has(a.id) ? 0 : 1) - (favorites.has(b.id) ? 0 : 1));
    }
    return filtered;
  }, [filtered, sortBy, minRates, favorites, reviewStats, coords]);

  const toggleTag = (id: string) => {
    setActiveTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>Hotels & Resorts — Find Your Stay | ZIVO</title>
        <meta name="description" content="Discover hotels, resorts and guesthouses. Browse properties in Phnom Penh, Siem Reap, Sihanoukville and more. Book direct on ZIVO." />
        <link rel="canonical" href="https://hizivo.com/hotels" />
        <meta property="og:title" content="Hotels & Resorts — Find Your Stay | ZIVO" />
        <meta property="og:description" content="Discover hotels, resorts and guesthouses. Browse properties and book direct on ZIVO." />
        <meta property="og:image" content="https://hizivo.com/og-hotels.jpg" />
        <meta property="og:url" content="https://hizivo.com/hotels" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hotels & Resorts — Find Your Stay | ZIVO" />
        <meta name="twitter:description" content="Discover hotels, resorts and guesthouses. Book direct on ZIVO." />
        <meta name="twitter:image" content="https://hizivo.com/og-hotels.jpg" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Hotels & Resorts — ZIVO",
          "url": "https://hizivo.com/hotels",
          "description": "Search and book hotels, resorts and guesthouses on ZIVO.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://hizivo.com/hotels-list?city={city}",
            "query-input": "required name=city"
          }
        })}</script>
      </Helmet>

      {/* Hero — tightened. Background layers live in their own `overflow-hidden`
          wrapper so the search-autocomplete dropdown can spill out below the
          hero without being clipped. */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={tabHotelsBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-background" />
        </div>

        <div className="relative px-4 pt-3 pb-4 safe-area-top">
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={smartBack}
              aria-label="Back"
              className="h-11 w-11 -ml-1 rounded-full flex items-center justify-center bg-white/15 backdrop-blur active:bg-white/25 transition touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-base font-bold text-white flex-1 truncate drop-shadow-lg">Hotels & Resorts</h1>
          </div>

          <div className="mt-3 mb-3">
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white leading-tight drop-shadow-lg">
              Find your perfect stay
            </h2>
            <p className="mt-1 text-[13px] text-white/90 drop-shadow-md">
              Hotels, resorts and guesthouses across Cambodia.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={(e) => {
                pushRecentSearch(e.target.value);
                // Delay so taps on dropdown items register before we hide it.
                setTimeout(() => setSearchFocused(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                } else if (e.key === "Escape") {
                  setSearchFocused(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Search city, hotel name..."
              aria-label="Search hotels and destinations"
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-white text-foreground placeholder:text-muted-foreground shadow-lg outline-none text-sm focus:ring-2 focus:ring-primary/40 transition [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition z-10"
              >
                <span className="text-base leading-none">×</span>
              </button>
            )}

            {/* Autocomplete dropdown */}
            {searchFocused && searchSuggestions.length > 0 && (
              <div
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1.5 bg-card rounded-2xl shadow-xl border border-border z-40 overflow-hidden max-h-[60vh] overflow-y-auto"
              >
                {searchSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      pushRecentSearch(s.name);
                      setSearchFocused(false);
                      openHotel(s.id);
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-muted/60 active:bg-muted border-b border-border last:border-b-0 touch-manipulation"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                      {(s.banner_url || s.logo_url) ? (
                        <img
                          src={s.banner_url || s.logo_url || ""}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <HotelIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      {s.address && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {s.address}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates + Guests */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Popover open={datesOpen} onOpenChange={setDatesOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="h-11 rounded-2xl bg-white/95 backdrop-blur shadow-md text-left px-3 flex items-center gap-2 active:scale-[0.98] transition">
                  <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
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
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Pick check-in & check-out
                  </p>
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
                <button type="button" className="h-11 rounded-2xl bg-white/95 backdrop-blur shadow-md text-left px-3 flex items-center gap-2 active:scale-[0.98] transition">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                      Guests · Rooms
                    </p>
                    <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                      {guests + children} guest{guests + children > 1 ? "s" : ""} · {rooms} room{rooms > 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                  <Stepper label="Adults" value={guests} min={1} max={20} onChange={setGuests} />
                  <Stepper label="Children" value={children} min={0} max={10} onChange={setChildren} />
                  <Stepper label="Rooms" value={rooms} min={1} max={10} onChange={setRooms} />
                  <Button className="w-full h-9" onClick={() => setGuestsOpen(false)}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search action button — confirms criteria and scrolls to results. */}
          <button
            type="button"
            onClick={submitSearch}
            className="mt-2 w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>
      <div ref={heroSentinelRef} aria-hidden className="h-px" />

      {/* Sticky compact search bar — appears after hero scrolls past */}
      <div
        className={cn(
          "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border transition-all duration-200",
          showStickyBar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden border-0",
        )}
      >
        <div className="px-3 py-2 flex items-center gap-2 safe-area-top">
          <button
            type="button"
            onClick={smartBack}
            aria-label="Back"
            className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-muted active:bg-muted/70 touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={(e) => pushRecentSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Search city, hotel name..."
              aria-label="Search hotels and destinations (sticky)"
              className="w-full h-9 pl-9 pr-8 rounded-full bg-muted text-foreground placeholder:text-muted-foreground outline-none text-sm focus:ring-2 focus:ring-primary/40 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background"
              >
                <span className="text-base leading-none">×</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDatesOpen(true)}
            className="h-9 px-2.5 shrink-0 rounded-full bg-muted text-[11px] font-semibold text-foreground inline-flex items-center gap-1 active:bg-muted/70"
            aria-label="Edit dates"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            {format(checkIn, "MMM d")}–{format(checkOut, "MMM d")}
          </button>
        </div>
      </div>

      {/* Recent searches */}
      {!search && recentSearches.length > 0 && (
        <section className="pt-3">
          <div className="px-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] text-muted-foreground shrink-0 mr-0.5 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent
            </span>
            {recentSearches.map((q) => (
              <div
                key={q}
                className="shrink-0 inline-flex items-center rounded-full bg-muted/70 text-foreground active:bg-muted overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => jumpToDestination(q)}
                  className="pl-3 pr-1.5 py-1 text-[11px] font-medium truncate max-w-[140px]"
                  aria-label={`Search ${q}`}
                >
                  {q}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecentSearch(q)}
                  className="pr-2 pl-0.5 py-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${q} from recent searches`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setRecentSearches([]);
                try { localStorage.removeItem("hotel_recent_searches"); } catch {}
              }}
              className="shrink-0 text-[11px] text-muted-foreground underline ml-1"
            >
              Clear all
            </button>
          </div>
        </section>
      )}

      {/* Quick filter chips */}
      <section className="pt-3">
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button"
            onClick={() => {
              if (coords) { setCoords(null); setSortBy("default"); }
              else requestNearMe();
            }}
            className={cn(
              "shrink-0 inline-flex min-h-[40px] items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-semibold transition border shadow-sm touch-manipulation",
              coords
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border/80 hover:bg-muted active:bg-muted",
            )}
          >
            <LocateFixed className="w-3 h-3" />
            Near me
          </button>
          {favorites.size > 0 && (
            <button
              type="button"
              onClick={() => setSavedOnly((v) => !v)}
              aria-pressed={savedOnly}
              className={cn(
                "shrink-0 inline-flex min-h-[40px] items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-semibold transition border shadow-sm touch-manipulation",
                savedOnly
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/80 hover:bg-muted active:bg-muted",
              )}
            >
              <Heart className={cn("w-3 h-3", savedOnly ? "fill-current" : "fill-rose-500 text-rose-500")} />
              Saved ({favorites.size})
            </button>
          )}
          {QUICK_TAGS.map((tag) => {
            const active = activeTags.includes(tag.id);
            const TagIcon = tag.icon;
            return (
              <button type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 inline-flex min-h-[40px] items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-semibold transition border shadow-sm touch-manipulation",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/80 hover:bg-muted active:bg-muted",
                )}
              >
                <TagIcon className="w-3 h-3" />
                {tag.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular destinations */}
      <section className="pt-4">
        <div className="px-4 flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            Popular destinations
          </h3>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {POPULAR_DESTINATIONS.map((dest) => {
            const active = search.toLowerCase() === dest.city;
            return (
              <button type="button"
                key={dest.id}
                onClick={() => {
                  if (active) {
                    // Tapping the active destination again clears it.
                    setSearch("");
                    return;
                  }
                  jumpToDestination(dest.city);
                }}
                className={
                  "shrink-0 relative w-[140px] h-[88px] rounded-2xl overflow-hidden border transition active:scale-95 " +
                  (active ? "border-primary ring-2 ring-primary/30" : "border-border")
                }
                aria-label={`Show hotels in ${dest.label}`}
              >
                <img
                  src={dest.img}
                  alt={dest.label}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="absolute inset-0 w-full h-full object-cover bg-muted"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-bold text-white drop-shadow text-left whitespace-nowrap">
                  {dest.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      {!listQuery.isLoading && featured.length > 0 && (
        <section className="pt-5">
          <div className="px-4 flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Featured properties
            </h3>
            <button type="button"
              onClick={jumpToFeatured}
              className="min-h-[40px] px-1 text-[11px] font-semibold text-primary flex items-center gap-0.5 touch-manipulation"
              aria-label="See all top-rated properties"
            >
              See all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((store) => {
              const rate = minRates[store.id];
              const minCents = rate?.base;
              const rs = reviewStats[store.id];
              const rating = rs?.count ? rs.avg : null;
              const promo = promotions[store.id];
              let discountedCents: number | null = null;
              let pctOff = 0;
              if (typeof minCents === "number" && promo && nights >= promo.minNights && (!promo.maxNights || nights <= promo.maxNights)) {
                if (promo.type === "percent") {
                  discountedCents = Math.round(minCents * (1 - promo.value / 100));
                  pctOff = Math.round(promo.value);
                } else {
                  discountedCents = Math.max(0, minCents - Math.round(promo.value * 100));
                  pctOff = Math.round((1 - discountedCents / minCents) * 100);
                }
              }
              const showCents = discountedCents ?? minCents;
              const isFav = favorites.has(store.id);
              const hasLeftMeta = typeof rating === "number" || ((store as any).created_at && (Date.now() - new Date((store as any).created_at).getTime()) < 30 * 24 * 60 * 60 * 1000);
              return (
                <button type="button"
                  key={store.id}
                  onClick={() => openHotel(store.id)}
                  className="shrink-0 w-[210px] rounded-2xl border border-border bg-card overflow-hidden text-left active:scale-[0.98] transition shadow-sm"
                  aria-label={`Open ${store.name}`}
                >
                  <div className="relative w-full h-28 bg-muted">
                    <SmartImage
                      src={store.banner_url || store.logo_url}
                      alt={store.name}
                      fallback={
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
                          <HotelIcon className="w-7 h-7 text-primary/60" />
                        </div>
                      }
                    />
                    {store.is_verified && (
                      <Badge className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                        Verified
                      </Badge>
                    )}
                    {pctOff > 0 && (
                      <Badge className="absolute bottom-1.5 left-1.5 bg-red-600 text-white text-[9px] px-1.5 py-0">
                        -{pctOff}%
                      </Badge>
                    )}
                    <button
                      type="button"
                      aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                      onClick={(e) => toggleFavorite(store.id, e)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Heart className={cn("w-3.5 h-3.5", isFav ? "fill-rose-500 text-rose-500" : "text-white")} />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[13px] font-bold text-foreground truncate">{store.name}</p>
                    {store.address && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {typeof rating === "number" ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {rating.toFixed(1)}
                        </span>
                      ) : hasLeftMeta ? (
                        <span className="text-[10px] font-semibold text-emerald-600">New</span>
                      ) : null}
                      {typeof showCents === "number" ? (
                        <span className={cn("text-[11px] font-bold text-foreground", !hasLeftMeta && "ml-auto")}>
                          from{" "}
                          {discountedCents !== null && typeof minCents === "number" && (
                            <span className="line-through text-muted-foreground font-normal mr-0.5">{fmtPrice(minCents / 100, "USD")}</span>
                          )}
                          <span className={discountedCents !== null ? "text-emerald-600" : "text-primary"}>{fmtPrice(showCents / 100, "USD")}</span>
                          <span className="text-muted-foreground font-normal text-[9px]"> /night</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentlyViewed.length > 0 && (
        <section className="pt-5">
          <div className="px-4 flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Recently viewed</h3>
            <button
              type="button"
              onClick={clearRecentlyViewed}
              className="min-h-[40px] px-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition touch-manipulation"
            >
              Clear
            </button>
          </div>
          <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentlyViewed.map((rv) => (
              <button
                key={rv.id}
                type="button"
                onClick={() => openHotel(rv.id)}
                className="shrink-0 w-44 rounded-2xl border border-border bg-card overflow-hidden text-left active:scale-[0.98] transition"
                aria-label={`Open ${rv.name}`}
              >
                <div className="relative h-24 bg-muted">
                  {rv.banner_url || rv.logo_url ? (
                    <img
                      src={rv.banner_url || rv.logo_url || ""}
                      alt={rv.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-foreground truncate">{rv.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground capitalize truncate">
                    {rv.category?.replace(/_/g, " ") || "Hotel"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* All Hotels & Resorts */}
      <section id="hotels-all" className="pt-5 scroll-mt-4">
        <div className="px-4 flex items-center justify-between mb-2 gap-3">
          {(() => {
            const dest = POPULAR_DESTINATIONS.find(
              (d) => d.city === search.trim().toLowerCase(),
            );
            return (
              <h3 className="text-sm font-bold text-foreground inline-flex items-center gap-1.5 min-w-0">
                {dest ? (
                  <>
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">Hotels in {dest.label}</span>
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label={`Clear ${dest.label} filter`}
                      className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <span>All Hotels & Resorts</span>
                )}
              </h3>
            );
          })()}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-card overflow-hidden text-[11px] font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={cn("min-h-[40px] px-3 py-2 transition touch-manipulation", viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                aria-pressed={viewMode === "map"}
                className={cn("min-h-[40px] px-3 py-2 transition touch-manipulation", viewMode === "map" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {/* Active-filters summary — shows every narrow filter as a removable
            chip plus a "Clear all" shortcut. Auto-hides when nothing is set. */}
        {(() => {
          type Pill = { key: string; label: string; clear: () => void };
          const pills: Pill[] = [];
          const dest = POPULAR_DESTINATIONS.find((d) => d.city === search.trim().toLowerCase());
          if (search.trim() && !dest) {
            pills.push({ key: "search", label: `"${search.trim()}"`, clear: () => setSearch("") });
          }
          if (activeFilter !== "all") {
            const f = FILTERS.find((x) => x.id === activeFilter);
            if (f) pills.push({ key: `filter:${f.id}`, label: f.label, clear: () => setActiveFilter("all") });
          }
          activeTags.forEach((t) => {
            const tag = QUICK_TAGS.find((x) => x.id === t);
            if (tag) pills.push({ key: `tag:${t}`, label: tag.label, clear: () => setActiveTags((prev) => prev.filter((p) => p !== t)) });
          });
          if (savedOnly) pills.push({ key: "saved", label: "Saved only", clear: () => setSavedOnly(false) });
          if (maxBudget !== null) pills.push({ key: "budget", label: `Under $${maxBudget}`, clear: () => setMaxBudget(null) });
          if (sortBy !== "default") {
            const sortLabel: Record<string, string> = {
              price_asc: "Price ↑",
              price_desc: "Price ↓",
              rating: "Top rated",
              near_me: "Near me",
            };
            pills.push({ key: "sort", label: sortLabel[sortBy] || sortBy, clear: () => setSortBy("default") });
          }
          if (pills.length === 0) return null;
          return (
            <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {pills.map((p) => (
                <span
                  key={p.key}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold pl-2.5 pr-1 py-1"
                >
                  {p.label}
                  <button
                    type="button"
                    onClick={p.clear}
                    aria-label={`Remove filter ${p.label}`}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {pills.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("all");
                    setActiveTags([]);
                    setSavedOnly(false);
                    setMaxBudget(null);
                    setSortBy("default");
                  }}
                  className="shrink-0 text-[11px] font-semibold text-muted-foreground underline ml-1"
                >
                  Clear all
                </button>
              )}
            </div>
          );
        })()}

        {/* Sort chips */}
        <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] text-muted-foreground shrink-0">Sort:</span>
          {([
            { id: "default", label: "Best match" },
            { id: "rating", label: "Top rated" },
            { id: "price_asc", label: "Price ↑" },
            { id: "price_desc", label: "Price ↓" },
          ] as const).map((opt) => (
            <button type="button"
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={
                "shrink-0 min-h-[40px] rounded-full px-3.5 py-2 text-xs font-semibold transition touch-manipulation " +
                (sortBy === opt.id
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground active:bg-muted")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Budget filter chips */}
        <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] text-muted-foreground shrink-0">Budget:</span>
          {([
            { id: null,  label: "Any",        key: "any" },
            { id: 25,    label: "Under $25",   key: "25" },
            { id: 50,    label: "Under $50",   key: "50" },
            { id: 100,   label: "Under $100",  key: "100" },
            { id: 200,   label: "Under $200",  key: "200" },
          ] as const).map((opt) => (
            <button type="button"
              key={opt.key}
              onClick={() => setMaxBudget(opt.id)}
              className={
                "shrink-0 min-h-[40px] rounded-full px-3.5 py-2 text-xs font-semibold transition touch-manipulation " +
                (maxBudget === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground active:bg-muted")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = f.id === activeFilter;
            return (
              <button type="button"
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={
                  "shrink-0 min-h-[40px] rounded-full px-3.5 py-2 text-xs font-semibold transition touch-manipulation " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground active:bg-muted")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {viewMode === "map" ? (
          <div className="px-4">
            <Suspense fallback={<div className="h-[60vh] rounded-2xl bg-muted/20 animate-pulse" />}>
              <HotelsMapView
                apiKey={GOOGLE_MAPS_KEY}
                hotels={sorted
                  .filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number")
                  .map((s) => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    address: s.address,
                    banner_url: s.banner_url,
                    logo_url: s.logo_url,
                    latitude: s.latitude as number,
                    longitude: s.longitude as number,
                    pricePerNightCents: minRates[s.id]?.base ?? null,
                    rating: reviewStats[s.id]?.count ? reviewStats[s.id].avg : null,
                    reviewCount: reviewStats[s.id]?.count ?? 0,
                  }))}
                onSelect={openHotel}
              />
            </Suspense>
          </div>
        ) : (
        <div className="px-4">
          {listQuery.isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden flex">
                  <Skeleton className="w-32 h-32 shrink-0 rounded-none" />
                  <div className="flex-1 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-3.5 flex-1 max-w-[60%]" />
                      <Skeleton className="h-4 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-3" />
                    </div>
                    <div className="flex items-end justify-between pt-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
              <HotelIcon className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No properties found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {savedOnly
                  ? "You haven't saved any properties yet — tap the heart on a card."
                  : search || activeTags.length > 0 || activeFilter !== "all"
                  ? "Try a different city or remove some filters."
                  : "Be the first — list your property on ZIVO."}
              </p>
              {(search || activeTags.length > 0 || activeFilter !== "all" || savedOnly || maxBudget !== null || sortBy !== "default") ? (
                <button type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveTags([]);
                    setActiveFilter("all");
                    setSavedOnly(false);
                    setMaxBudget(null);
                    setSortBy("default");
                  }}
                  className="mt-2 text-xs font-semibold text-primary"
                >
                  Clear filters
                </button>
              ) : (
                <Button
                  className="mt-2 h-9 px-4 text-xs"
                  onClick={() => navigate("/business/onboarding")}
                >
                  List your property
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {sorted.slice(0, visibleCount).map((store, idx) => (
                  <PropertyCard
                    key={store.id}
                    store={store}
                    index={idx}
                    rateInfo={minRates[store.id]}
                    promo={promotions[store.id]}
                    amenities={amenitiesMap[store.id]?.amenities || []}
                    rating={reviewStats[store.id]?.count ? reviewStats[store.id].avg : null}
                    reviewCount={reviewStats[store.id]?.count ?? 0}
                    isFavorite={favorites.has(store.id)}
                    onToggleFavorite={(e) => toggleFavorite(store.id, e)}
                    nights={nights}
                    onOpen={() => openHotel(store.id)}
                  />
                ))}
              </div>

              {/* Load-more sentinel + "Show more" fallback */}
              {visibleCount < sorted.length ? (
                <div
                  ref={loadMoreRef}
                  className="pt-5 pb-2 flex flex-col items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length))}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-muted text-foreground font-semibold text-xs active:bg-muted/70 transition touch-manipulation"
                  >
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                    Show more
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Showing {visibleCount} of {sorted.length}
                  </p>
                </div>
              ) : sorted.length > PAGE_SIZE ? (
                <p className="pt-5 pb-2 text-center text-[11px] text-muted-foreground">
                  Showing all {sorted.length} properties
                </p>
              ) : null}
            </>
          )}
        </div>
        )}
      </section>

      {/* Floating "Find with AI" CTA — hidden in Map view so it doesn't
          obscure the property cards / map markers. */}
      {viewMode !== "map" && (
        <button
          type="button"
          onClick={() => setConciergeOpen(true)}
          aria-label="Find a hotel with AI"
          className="fixed z-30 bottom-[max(var(--zivo-safe-bottom,0px),16px)] right-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-sm font-bold px-4 py-3 shadow-xl shadow-violet-500/30 active:scale-95 transition md:right-6 md:bottom-6"
        >
          <Sparkles className="w-4 h-4" />
          Find with AI
        </button>
      )}

      {/* AI concierge sheet */}
      <Suspense fallback={null}>
        <HotelConciergeSheet
          isOpen={conciergeOpen}
          onClose={() => setConciergeOpen(false)}
          candidates={sorted.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            address: s.address,
            banner_url: s.banner_url,
            logo_url: s.logo_url,
            pricePerNightCents: minRates[s.id]?.base ?? null,
          }))}
          onSelect={(id) => {
            setConciergeOpen(false);
            openHotel(id);
          }}
        />
      </Suspense>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-full border border-border text-foreground disabled:opacity-40 active:bg-muted"
          aria-label={`Decrease ${label}`}
        >
          –
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-8 w-8 rounded-full border border-border text-foreground disabled:opacity-40 active:bg-muted"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const AMENITY_ICONS: Array<{ key: string; icon: typeof Wifi; label: string }> = [
  { key: "wifi", icon: Wifi, label: "Wi-Fi" },
  { key: "pool", icon: Waves, label: "Pool" },
  { key: "breakfast", icon: Coffee, label: "Breakfast" },
  { key: "pet", icon: Dog, label: "Pets" },
];

type RateInfoProp = {
  base: number;
  weeklyPct: number;
  monthlyPct: number;
};
type PromoInfoProp = {
  type: "percent" | "fixed";
  value: number;
  name: string;
  minNights: number;
  maxNights: number | null;
};

function PropertyCard({
  store,
  index,
  rateInfo,
  promo,
  amenities,
  rating,
  reviewCount,
  nights,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  store: DirectoryStore;
  index: number;
  rateInfo?: RateInfoProp;
  promo?: PromoInfoProp;
  amenities: string[];
  rating?: number | null;
  reviewCount?: number;
  nights: number;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onOpen: () => void;
}) {
  const { format: fmtPrice } = useCurrency();
  const location = store.address || "";
  const haystack = amenities.join(" ");
  const matchedAmenities = AMENITY_ICONS.filter((a) =>
    a.key === "wifi"
      ? haystack.includes("wifi") || haystack.includes("wi-fi")
      : haystack.includes(a.key),
  ).slice(0, 4);

  // Pricing + discount calculation
  const baseCents = rateInfo?.base;
  let discountedCents: number | null = null;
  let pctOff = 0;
  let promoLabel = "";

  if (typeof baseCents === "number") {
    const promoApplies =
      promo &&
      nights >= promo.minNights &&
      (!promo.maxNights || nights <= promo.maxNights);

    if (promoApplies && promo) {
      if (promo.type === "percent") {
        discountedCents = Math.round(baseCents * (1 - promo.value / 100));
        pctOff = Math.round(promo.value);
      } else {
        const off = Math.round(promo.value * 100);
        discountedCents = Math.max(0, baseCents - off);
        pctOff = Math.round((1 - discountedCents / baseCents) * 100);
      }
      promoLabel = promo.name || `${pctOff}% OFF`;
    } else if (rateInfo && nights >= 28 && rateInfo.monthlyPct > 0) {
      pctOff = Math.round(rateInfo.monthlyPct);
      discountedCents = Math.round(baseCents * (1 - pctOff / 100));
      promoLabel = "Monthly deal";
    } else if (rateInfo && nights >= 7 && rateInfo.weeklyPct > 0) {
      pctOff = Math.round(rateInfo.weeklyPct);
      discountedCents = Math.round(baseCents * (1 - pctOff / 100));
      promoLabel = "Weekly deal";
    }
  }

  const hasDiscount = discountedCents !== null && discountedCents < (baseCents ?? 0);
  const effectiveCents = hasDiscount ? (discountedCents as number) : baseCents;
  const totalCents = typeof effectiveCents === "number" ? effectiveCents * nights : null;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.04 }}
      className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition cursor-pointer"
      aria-label={`Open ${store.name}`}
    >
      <div className="flex">
        <div className="relative w-32 shrink-0 bg-muted">
          <SmartImage
            src={store.banner_url || store.logo_url}
            alt={`${store.name} cover`}
            fallback={
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
                <HotelIcon className="w-6 h-6 text-primary/60" />
              </div>
            }
          />
          {store.is_verified && (
            <Badge className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] px-1.5 py-0">
              Verified
            </Badge>
          )}
          {hasDiscount && pctOff > 0 && (
            <Badge className="absolute bottom-1.5 left-1.5 bg-red-600 text-white text-[9px] px-1.5 py-0">
              -{pctOff}%
            </Badge>
          )}
          <button
            type="button"
            aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
            onClick={onToggleFavorite}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/30 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
          >
            <Heart className={cn("w-3.5 h-3.5", isFavorite ? "fill-rose-500 text-rose-500" : "text-white")} />
          </button>
        </div>
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-bold text-foreground truncate flex-1">{store.name}</h3>
            {typeof rating === "number" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 shrink-0">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {rating.toFixed(1)}
                {reviewCount && reviewCount > 0 ? (
                  <span className="text-amber-600/70 font-normal">({reviewCount})</span>
                ) : null}
              </span>
            ) : (store as any).created_at && (Date.now() - new Date((store as any).created_at).getTime()) < 30 * 24 * 60 * 60 * 1000 ? (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 shrink-0">
                New
              </span>
            ) : null}
          </div>
          {location && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          )}

          {matchedAmenities.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              {matchedAmenities.map((a) => {
                const Icon = a.icon;
                return (
                  <span
                    key={a.key}
                    className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
                    title={a.label}
                  >
                    <Icon className="w-3 h-3" />
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="text-[10px] font-medium text-muted-foreground capitalize truncate">
              {store.category?.replace(/_/g, " ") || "Hotel"}
            </span>
            {typeof effectiveCents === "number" ? (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground leading-none">from</p>
                {hasDiscount && typeof baseCents === "number" ? (
                  <>
                    <p className="text-[10px] line-through text-muted-foreground leading-none">
                      {fmtPrice(baseCents / 100, "USD")}
                    </p>
                    <p className="text-[14px] font-extrabold text-emerald-600 leading-tight">
                      {fmtPrice(effectiveCents / 100, "USD")}
                      <span className="text-[10px] font-medium text-emerald-600/80"> /night</span>
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] font-extrabold text-foreground leading-tight">
                    {fmtPrice(effectiveCents / 100, "USD")}
                    <span className="text-[10px] font-medium text-muted-foreground"> /night</span>
                  </p>
                )}
                {totalCents && nights > 1 && (
                  <p className="text-[9px] text-muted-foreground leading-none">
                    {fmtPrice(totalCents / 100, "USD")} for {nights}n
                  </p>
                )}
                {hasDiscount && promoLabel && (
                  <p className="text-[9px] font-semibold text-red-600 leading-none mt-0.5 truncate max-w-[110px] ml-auto">
                    {promoLabel}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
