/**
 * MarketplacePage — Buy & sell items between users
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import MarketplaceReviewSheet from "@/components/marketplace/MarketplaceReviewSheet";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, Plus, Search, Heart, MapPin, Tag, ShoppingBag, DollarSign, Eye,
  Grid3X3, LayoutList, Camera, X as XIcon, SlidersHorizontal, MessageCircle,
  Sparkles, BadgeCheck, Share2, Flag, HandCoins, CheckCircle2, Trash2, RotateCcw, Inbox,
  Store, User as UserIcon, TrendingUp, Star, Clock, MessageSquare, Send, Bell, BellOff, Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";

const CONDITIONS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Like New", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "For Parts", value: "for_parts" },
];

const SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Most Viewed", value: "popular" },
];

const conditionLabel = (v?: string) =>
  CONDITIONS.find((c) => c.value === v)?.label ?? v ?? "";

const fmtPrice = (cents: number, currency = "USD") => {
  if (!cents || cents <= 0) return "FREE";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
};

const isFresh = (iso: string) => Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const TAB_KEY = "marketplace_tab_v1";
  const [tab, setTab] = useState<"browse" | "saved" | "mine" | "offers">(() => {
    if (typeof window === "undefined") return "browse";
    const v = localStorage.getItem(TAB_KEY);
    return (v === "saved" || v === "mine" || v === "offers" || v === "browse") ? v : "browse";
  });
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch {/**/} }, [tab]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelectedIds((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const bulkUpdateStatus = useMutation({
    mutationFn: async (status: "sold" | "active" | "withdrawn") => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      const { error } = await (supabase as any).from("marketplace_listings").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Updated ${selectedIds.size} listing${selectedIds.size === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["marketplace-mine"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      exitSelect();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      const { error } = await (supabase as any).from("marketplace_listings").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.size} listing${selectedIds.size === 1 ? "" : "s"}`);
      queryClient.invalidateQueries({ queryKey: ["marketplace-mine"] });
      exitSelect();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const RECENT_VIEW_KEY = "marketplace_recent_view_v1";
  const [recentViewed, setRecentViewed] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_VIEW_KEY) || "[]"); } catch { return []; }
  });
  const pushRecentView = (l: any) => {
    if (!l?.id) return;
    setRecentViewed((prev) => {
      const next = [l, ...prev.filter((x) => x.id !== l.id)].slice(0, 12);
      try { localStorage.setItem(RECENT_VIEW_KEY, JSON.stringify(next)); } catch {/**/}
      return next;
    });
  };
  const RECENT_KEY = "marketplace_recent_searches_v1";
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [pageSize, setPageSize] = useState(60);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const toggleCompare = (id: string) => setCompareIds((p) => {
    if (p.includes(id)) return p.filter((x) => x !== id);
    if (p.length >= 3) { toast("Compare up to 3 at a time"); return p; }
    return [...p, id];
  });
  const commitSearch = (q: string) => {
    const v = q.trim();
    if (!v) return;
    const next = [v, ...recentSearches.filter((s) => s.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {/**/}
  };
  const [conditionFilter, setConditionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeListing, setActiveListing] = useState<any | null>(null);
  const [reviewFor, setReviewFor] = useState<{ sellerId: string; listingId: string } | null>(null);
  const [offerStatusFilter, setOfferStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const DRAFT_KEY = "marketplace_draft_v1";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newListing, setNewListing] = useState(() => {
    if (typeof window !== "undefined") {
      try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) return JSON.parse(raw); } catch {/**/}
    }
    return {
      title: "", description: "", price: "", condition: "new",
      location: "", is_negotiable: false, category_id: "" as string | "",
      tags: "", quantity: "1", currency: "USD",
    };
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Persist draft (only when not editing an existing listing)
  useEffect(() => {
    if (editingId) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(newListing)); } catch {/**/}
  }, [newListing, editingId]);

  const { data: categories = [] } = useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_categories")
        .select("id,name,slug,icon")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  // Trending: hottest listings (most views) in the last 7 days
  const { data: trending = [] } = useQuery({
    queryKey: ["marketplace-trending", user?.id ?? null],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      let q = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .gt("created_at", since)
        .order("views_count", { ascending: false, nullsFirst: false })
        .limit(8);
      if (user) q = q.neq("seller_id", user.id);
      const { data } = await q;
      return (data || []).filter((l: any) => (l.views_count || 0) > 0);
    },
    staleTime: 5 * 60_000,
  });

  // Average price per category for smart price guide
  const { data: priceGuide = {} } = useQuery({
    queryKey: ["marketplace-price-guide"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("category_id,price_cents")
        .eq("status", "active");
      const buckets: Record<string, number[]> = {};
      (data || []).forEach((r: any) => {
        if (!r.category_id || !r.price_cents) return;
        (buckets[r.category_id] = buckets[r.category_id] || []).push(r.price_cents);
      });
      const out: Record<string, { avg: number; min: number; max: number; n: number }> = {};
      Object.entries(buckets).forEach(([k, arr]) => {
        const sorted = arr.slice().sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        out[k] = { avg: sum / sorted.length, min: sorted[0], max: sorted[sorted.length - 1], n: sorted.length };
      });
      return out;
    },
    staleTime: 5 * 60_000,
  });

  // For-You: pull active listings from categories the user has recently viewed
  const recentCatIds = useMemo(() => {
    const set = new Set<string>();
    recentViewed.forEach((l: any) => { if (l.category_id) set.add(l.category_id); });
    return Array.from(set).slice(0, 5);
  }, [recentViewed]);

  const { data: forYou = [] } = useQuery({
    queryKey: ["marketplace-for-you", recentCatIds.join("|"), user?.id ?? null],
    enabled: recentCatIds.length > 0,
    queryFn: async () => {
      let q = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .in("category_id", recentCatIds)
        .order("views_count", { ascending: false, nullsFirst: false })
        .limit(8);
      if (user) q = q.neq("seller_id", user.id);
      const { data } = await q;
      const seen = new Set(recentViewed.map((r: any) => r.id));
      return (data || []).filter((l: any) => !seen.has(l.id));
    },
    staleTime: 60_000,
  });

  const { data: categoryCounts = {} } = useQuery({
    queryKey: ["marketplace-category-counts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("category_id")
        .eq("status", "active");
      const m: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (!r.category_id) return;
        m[r.category_id] = (m[r.category_id] || 0) + 1;
      });
      return m;
    },
    staleTime: 60_000,
  });

  const { data: listings = [], isLoading, isError: isListingsError, refetch, isFetching } = useQuery({
    queryKey: ["marketplace-listings", conditionFilter, categoryFilter, sort, user?.id ?? null, pageSize],
    queryFn: async () => {
      let query = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active");
      if (user) query = query.neq("seller_id", user.id);
      if (conditionFilter !== "all") query = query.eq("condition", conditionFilter);
      if (categoryFilter) query = query.eq("category_id", categoryFilter);

      if (sort === "price_asc") query = query.order("price_cents", { ascending: true });
      else if (sort === "price_desc") query = query.order("price_cents", { ascending: false });
      else if (sort === "popular") query = query.order("views_count", { ascending: false, nullsFirst: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query.limit(pageSize);
      if (error) throw error;
      return data || [];
    },
  });

  // Real-time: notify buyer when their pending offer is accepted/rejected
  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`marketplace-my-offers-${user.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketplace_offers", filter: `buyer_id=eq.${user.id}` },
        (payload: any) => {
          const s = payload?.new?.status;
          if (s === "accepted") toast.success("🎉 Your offer was accepted!");
          else if (s === "rejected") toast("Your offer was declined");
          if (payload?.new?.counter_amount_cents != null && payload?.old?.counter_amount_cents !== payload?.new?.counter_amount_cents) {
            toast("Seller sent a counter offer");
          }
          queryClient.invalidateQueries({ queryKey: ["marketplace-my-offers", user.id] });
          queryClient.invalidateQueries({ queryKey: ["marketplace-tab-counts", user.id] });
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [user, queryClient]);

  // Real-time: count new listings while user is viewing
  const [newCount, setNewCount] = useState(0);
  useEffect(() => {
    const channel = (supabase as any)
      .channel("marketplace-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_listings" }, (payload: any) => {
        if (payload?.new?.seller_id !== user?.id) setNewCount((n) => n + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_listings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [queryClient, user?.id]);

  // Saved tab data
  const { data: savedListings = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ["marketplace-saved", user?.id],
    enabled: !!user && tab === "saved",
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_favorites")
        .select("listing_id, marketplace_listings(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []).map((r: any) => r.marketplace_listings).filter(Boolean);
    },
  });

  // Mine tab data + offer-count per listing for analytics badge
  const { data: myListings = [], isLoading: isLoadingMine } = useQuery({
    queryKey: ["marketplace-mine", user?.id],
    enabled: !!user && tab === "mine",
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      const list = rows || [];
      if (list.length === 0) return list;
      const ids = list.map((l: any) => l.id);
      const { data: offers } = await (supabase as any)
        .from("marketplace_offers")
        .select("listing_id, status")
        .in("listing_id", ids);
      const counts = new Map<string, number>();
      (offers || []).forEach((o: any) => {
        if (o.status === "pending") counts.set(o.listing_id, (counts.get(o.listing_id) || 0) + 1);
      });
      return list.map((l: any) => ({ ...l, _pending_offers: counts.get(l.id) || 0 }));
    },
  });

  // Blocked users
  const { data: blockedSet = new Set<string>() } = useQuery({
    queryKey: ["marketplace-blocked", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_user_blocks")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      return new Set<string>((data || []).map((r: any) => r.blocked_id));
    },
  });

  const blockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("Login required");
      const { error } = await (supabase as any)
        .from("marketplace_user_blocks")
        .upsert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Seller blocked. Their listings are hidden.");
      queryClient.invalidateQueries({ queryKey: ["marketplace-blocked", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Saved searches
  const { data: savedSearches = [] } = useQuery({
    queryKey: ["marketplace-saved-searches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_saved_searches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveCurrentSearch = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login to save searches");
      const label = (searchQuery || "").trim() || "All listings";
      const { error } = await (supabase as any).from("marketplace_saved_searches").upsert({
        user_id: user.id,
        label,
        query: searchQuery || null,
        filters: {
          condition: conditionFilter !== "all" ? conditionFilter : null,
          category_id: categoryFilter,
          price_min: priceMin || null,
          price_max: priceMax || null,
          negotiable_only: negotiableOnly,
        },
        alerts_enabled: true,
      }, { onConflict: "user_id,label" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Search saved — we'll notify you of matches");
      queryClient.invalidateQueries({ queryKey: ["marketplace-saved-searches", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSearchAlerts = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await (supabase as any)
        .from("marketplace_saved_searches")
        .update({ alerts_enabled: !s.alerts_enabled })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-saved-searches", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSavedSearch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("marketplace_saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-saved-searches", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const applySavedSearch = (s: any) => {
    setSearchQuery(s.query || "");
    const f = s.filters || {};
    setConditionFilter(f.condition || "all");
    setCategoryFilter(f.category_id || null);
    setPriceMin(f.price_min || "");
    setPriceMax(f.price_max || "");
    setNegotiableOnly(!!f.negotiable_only);
    setTab("browse");
  };

  // Withdraw / cancel a pending offer (buyer-side)
  const withdrawOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("marketplace_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offer withdrawn");
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-offers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-tab-counts", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Duplicate listing (seller convenience)
  const duplicateListing = useMutation({
    mutationFn: async (l: any) => {
      if (!user) throw new Error("Login required");
      const payload = {
        seller_id: user.id,
        title: `${l.title} (copy)`,
        description: l.description,
        price_cents: l.price_cents,
        currency: l.currency,
        condition: l.condition,
        location: l.location,
        category_id: l.category_id,
        is_negotiable: l.is_negotiable,
        tags: l.tags,
        quantity: l.quantity ?? 1,
        images: l.images,
        status: "active",
      };
      const { error } = await (supabase as any).from("marketplace_listings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing duplicated");
      queryClient.invalidateQueries({ queryKey: ["marketplace-mine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Counts for tab badges
  const { data: tabCounts } = useQuery({
    queryKey: ["marketplace-tab-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ count: saved }, { count: pendingOffers }] = await Promise.all([
        (supabase as any).from("marketplace_favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", user!.id),
        (supabase as any).from("marketplace_offers").select("id", { count: "exact", head: true }).eq("buyer_id", user!.id).eq("status", "pending"),
      ]);
      return { saved: saved || 0, pendingOffers: pendingOffers || 0 };
    },
  });

  // Sent offers tab loading state needs the isLoading flag
  const acceptCounter = useMutation({
    mutationFn: async (offer: any) => {
      if (!user) throw new Error("Login required");
      const { error } = await (supabase as any).from("marketplace_offers")
        .update({ amount_cents: offer.counter_amount_cents, counter_amount_cents: null })
        .eq("id", offer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Counter accepted — seller will be notified");
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-offers", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: myOffers = [], isLoading: isLoadingOffers } = useQuery({
    queryKey: ["marketplace-my-offers", user?.id],
    enabled: !!user && tab === "offers",
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_offers")
        .select("*, marketplace_listings(id,title,price_cents,images,status,seller_id)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Q counts for visible browse listings (non-zero only)
  const { data: questionCounts = {} } = useQuery({
    queryKey: ["marketplace-q-counts", (listings as any[]).slice(0, 60).map((l: any) => l.id).join(",")],
    enabled: tab === "browse" && (listings as any[]).length > 0,
    queryFn: async () => {
      const ids = (listings as any[]).slice(0, 60).map((l: any) => l.id);
      if (ids.length === 0) return {};
      const { data } = await (supabase as any)
        .from("marketplace_questions")
        .select("listing_id")
        .in("listing_id", ids);
      const m: Record<string, number> = {};
      (data || []).forEach((r: any) => { m[r.listing_id] = (m[r.listing_id] || 0) + 1; });
      return m;
    },
    staleTime: 60_000,
  });

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ["marketplace-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_favorites")
        .select("listing_id")
        .eq("user_id", user!.id);
      return new Set<string>((data || []).map((r: any) => r.listing_id));
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) throw new Error("Login to save listings");
      if (favoriteIds.has(listingId)) {
        await (supabase as any).from("marketplace_favorites")
          .delete().eq("user_id", user.id).eq("listing_id", listingId);
      } else {
        await (supabase as any).from("marketplace_favorites")
          .insert({ user_id: user.id, listing_id: listingId });
      }
    },
    onMutate: async (listingId: string) => {
      const key = ["marketplace-favorites", user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Set<string>>(key);
      const next = new Set(prev ?? []);
      next.has(listingId) ? next.delete(listingId) : next.add(listingId);
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["marketplace-favorites", user?.id], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-favorites", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-tab-counts", user?.id] });
    },
  });

  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const priceCents = saveAsDraft
        ? Math.max(0, Math.round(parseFloat(newListing.price || "0") * 100))
        : Math.round(parseFloat(newListing.price) * 100);
      if (!saveAsDraft && (isNaN(priceCents) || priceCents <= 0)) throw new Error("Invalid price");

      const imageUrls: string[] = [];
      for (const rawFile of imageFiles) {
        const file = await compressImage(rawFile);
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage.from("marketplace-photos").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);
        const { data: urlData } = (supabase as any).storage.from("marketplace-photos").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl as string);
      }

      const tagsArray = (newListing.tags || "")
        .split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 10);
      const qty = Math.max(1, parseInt(newListing.quantity || "1", 10) || 1);

      const payload: Record<string, any> = {
        title: newListing.title,
        description: newListing.description || null,
        price_cents: priceCents,
        condition: newListing.condition,
        location: newListing.location || null,
        is_negotiable: newListing.is_negotiable,
        category_id: newListing.category_id || null,
        currency: newListing.currency || "USD",
        tags: tagsArray.length > 0 ? tagsArray : null,
        quantity: qty,
      };
      if (imageUrls.length > 0) payload.images = imageUrls;

      if (editingId) {
        const { error } = await (supabase as any).from("marketplace_listings")
          .update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.seller_id = user.id;
        payload.status = saveAsDraft ? "draft" : "active";
        if (imageUrls.length === 0) payload.images = null;
        const { error } = await (supabase as any).from("marketplace_listings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-mine"] });
      toast.success(editingId ? "Listing updated!" : saveAsDraft ? "Saved as draft" : "Listing created!");
      setSaveAsDraft(false);
      setShowCreate(false);
      setEditingId(null);
      setNewListing({ title: "", description: "", price: "", condition: "new", location: "", is_negotiable: false, category_id: "", tags: "", quantity: "1", currency: "USD" });
      try { localStorage.removeItem(DRAFT_KEY); } catch {/**/}
      setImageFiles([]);
      setImagePreviews([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEditFor = (l: any) => {
    setEditingId(l.id);
    setNewListing({
      title: l.title || "",
      description: l.description || "",
      price: l.price_cents ? String(l.price_cents / 100) : "",
      condition: l.condition || "new",
      location: l.location || "",
      is_negotiable: !!l.is_negotiable,
      category_id: l.category_id || "",
      tags: Array.isArray(l.tags) ? l.tags.join(", ") : "",
      quantity: String(l.quantity ?? 1),
      currency: l.currency || "USD",
    });
    setImageFiles([]);
    setImagePreviews(Array.isArray(l.images) ? l.images : []);
    setShowCreate(true);
  };

  // Deep-link: open listing from ?listing=ID and apply ?q= search on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) { setSearchQuery(q); setTab("browse"); }
    const id = params.get("listing");
    if (!id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings").select("*").eq("id", id).maybeSingle();
      if (data) setActiveListing(data);
    })();
  }, []);

  const sourceList: any[] =
    tab === "saved" ? (savedListings as any[]) :
    tab === "mine" ? (myListings as any[]) :
    (listings as any[]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = priceMin ? parseFloat(priceMin) * 100 : -Infinity;
    const max = priceMax ? parseFloat(priceMax) * 100 : Infinity;
    return sourceList.filter((l) => {
      if (tab === "browse" && blockedSet.has(l.seller_id)) return false;
      if (q) {
        const tagHit = Array.isArray(l.tags) && l.tags.some((t: string) => t.toLowerCase().includes(q));
        const titleHit = l.title?.toLowerCase().includes(q);
        const descHit = l.description?.toLowerCase().includes(q);
        if (!titleHit && !descHit && !tagHit) return false;
      }
      if (l.price_cents < min || l.price_cents > max) return false;
      if (negotiableOnly && !l.is_negotiable) return false;
      return true;
    });
  }, [sourceList, searchQuery, priceMin, priceMax, negotiableOnly, tab, blockedSet]);

  const featured = useMemo(
    () => (listings as any[]).filter((l) => l.is_featured).slice(0, 6),
    [listings]
  );

  const activeFilterCount = (conditionFilter !== "all" ? 1 : 0) + (categoryFilter ? 1 : 0) + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (negotiableOnly ? 1 : 0);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>Marketplace · ZIVO</title>
        <meta name="description" content="Buy and sell items on ZIVO Marketplace — electronics, fashion, home, and more." />
        <meta property="og:title" content="ZIVO Marketplace" />
        <meta property="og:description" content="Browse local listings and find great deals." />
      </Helmet>
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-gradient-to-b from-background via-background/95 to-background/85 backdrop-blur-xl border-b border-border/30 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="min-h-[40px] min-w-[40px] -ml-2 inline-flex items-center justify-center rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold leading-tight bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">Marketplace</h1>
            {!isLoading && (
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} item{filtered.length === 1 ? "" : "s"}
                {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-40 touch-manipulation" aria-label="Refresh">
            <RotateCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button type="button" aria-label="Toggle layout" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/50 touch-manipulation">
            {viewMode === "grid" ? <LayoutList className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </button>
          {user && (
            <button type="button" aria-label="Create listing" onClick={() => setShowCreate(true)} className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg active:scale-95 transition-all touch-manipulation">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex gap-1 px-4 pb-2">
            {[
              { v: "browse", label: "Browse", Icon: Store, badge: 0 },
              { v: "saved",  label: "Saved",  Icon: Heart, badge: tabCounts?.saved || 0 },
              { v: "mine",   label: "Mine",   Icon: UserIcon, badge: 0 },
              { v: "offers", label: "Offers", Icon: HandCoins, badge: tabCounts?.pendingOffers || 0 },
            ].map(({ v, label, Icon, badge }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v as typeof tab)}
                className={`relative flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  tab === v
                    ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md scale-[1.02]"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {badge > 0 && (
                  <span className={`ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold ${
                    tab === v ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                  }`}>{badge > 99 ? "99+" : badge}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Search + filters */}
        <div className="px-4 pb-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter") commitSearch(searchQuery); }}
              placeholder="Search marketplace..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-muted/40 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/60"
                aria-label="Clear search"
              >
                <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {searchFocused && searchQuery.trim().length >= 2 && tab === "browse" && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                {(() => {
                  const q = searchQuery.trim().toLowerCase();
                  const hits = (listings as any[])
                    .filter((l) => l.title?.toLowerCase().includes(q))
                    .slice(0, 5);
                  if (hits.length === 0) return (
                    <div className="px-4 py-3 text-xs text-muted-foreground">No quick matches</div>
                  );
                  return hits.map((h: any) => {
                    const img = Array.isArray(h.images) ? h.images[0] : null;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setActiveListing(h); commitSearch(searchQuery); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/40 text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted/30 overflow-hidden shrink-0">
                          {img ? <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-4 w-4 text-muted-foreground/30" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold line-clamp-1">{h.title}</p>
                          <p className="text-[11px] font-bold text-primary">{fmtPrice(h.price_cents, h.currency)}</p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`relative shrink-0 px-3 rounded-xl text-sm flex items-center gap-1.5 ${
              activeFilterCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Saved searches strip */}
        {user && tab === "browse" && savedSearches.length > 0 && !searchFocused && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            {savedSearches.map((s: any) => (
              <div key={s.id} className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                <button type="button" onClick={() => applySavedSearch(s)} className="flex items-center gap-1">
                  <Bell className={`h-3 w-3 ${s.alerts_enabled ? "" : "opacity-30"}`} /> {s.label}
                </button>
                <button type="button" onClick={() => toggleSearchAlerts.mutate(s)} className="opacity-60 hover:opacity-100" title="Toggle alerts">
                  {s.alerts_enabled ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                </button>
                <button type="button" onClick={() => deleteSavedSearch.mutate(s.id)} className="opacity-60 hover:opacity-100" title="Delete">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Save this search button */}
        {user && tab === "browse" && (searchQuery.trim() || activeFilterCount > 0) && !searchFocused && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => saveCurrentSearch.mutate()}
              disabled={saveCurrentSearch.isPending}
              className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"
            >
              <Bell className="h-3 w-3" /> Save this search
            </button>
          </div>
        )}

        {/* Quick chips: recent searches + price quickies */}
        {(searchFocused || (!searchQuery && recentSearches.length > 0)) && tab === "browse" && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            {recentSearches.length > 0 && recentSearches.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setSearchQuery(s); commitSearch(s); }}
                className="px-3 py-1 rounded-full bg-muted/40 text-[11px] text-foreground whitespace-nowrap flex items-center gap-1"
              >
                <Search className="h-3 w-3 text-muted-foreground" /> {s}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setPriceMin(""); setPriceMax("20"); }}
              className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] whitespace-nowrap"
            >
              Under $20
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setPriceMin(""); setPriceMax("50"); }}
              className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] whitespace-nowrap"
            >
              Under $50
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSort("popular")}
              className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] whitespace-nowrap"
            >
              Trending
            </button>
            {recentSearches.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setRecentSearches([]); try { localStorage.removeItem(RECENT_KEY); } catch {/**/} }}
                className="px-3 py-1 rounded-full text-[11px] text-muted-foreground whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                !categoryFilter ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              All categories
            </button>
            {categories.map((cat: any) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  categoryFilter === cat.id ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                {(categoryCounts as Record<string, number>)[cat.id] > 0 && (
                  <span className="ml-1 opacity-70">{(categoryCounts as Record<string, number>)[cat.id]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Condition Filter */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {CONDITIONS.map((c) => (
            <button type="button"
              key={c.value}
              onClick={() => setConditionFilter(c.value)}
              className={`min-h-[40px] rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
                conditionFilter === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured strip */}
      {featured.length > 0 && (
        <div className="pt-3 bg-gradient-to-b from-amber-500/5 to-transparent">
          <div className="px-4 flex items-center gap-1.5 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Featured</h2>
          </div>
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-none">
            {featured.map((item) => {
              const img = Array.isArray(item.images) ? item.images[0] : undefined;
              return (
                <button
                  type="button"
                  key={`feat-${item.id}`}
                  onClick={() => { setActiveListing(item); pushRecentView(item); }}
                  className="group shrink-0 w-36 rounded-2xl overflow-hidden bg-card border border-amber-500/30 text-left shadow-sm hover:shadow-md transition-all"
                >
                  <div className="relative aspect-square bg-muted/30 overflow-hidden">
                    {img ? (
                      <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10"><ShoppingBag className="h-7 w-7 text-muted-foreground/30" /></div>
                    )}
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold flex items-center gap-0.5 shadow"><Sparkles className="h-2.5 w-2.5" /></span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold line-clamp-1">{item.title}</p>
                    <p className="text-sm font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{fmtPrice(item.price_cents, item.currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mine summary */}
      {tab === "mine" && user && (() => {
        const list = (myListings as any[]) || [];
        const active = list.filter((l) => l.status === "active").length;
        const sold = list.filter((l) => l.status === "sold").length;
        const revenue = list.filter((l) => l.status === "sold").reduce((a, l) => a + (l.price_cents || 0), 0);
        if (list.length === 0) return null;
        return (
          <div className="px-4 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Active</p>
                <p className="text-lg font-extrabold">{active}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sold</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{sold}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Revenue</p>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{fmtPrice(revenue)}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Trending */}
      {tab === "browse" && trending.length > 0 && (
        <div className="pt-3">
          <div className="px-4 flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">Trending now</h2>
          </div>
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-none">
            {trending.map((item: any, i: number) => {
              const img = Array.isArray(item.images) ? item.images[0] : undefined;
              return (
                <button
                  type="button"
                  key={`tr-${item.id}`}
                  onClick={() => { setActiveListing(item); pushRecentView(item); }}
                  className="group relative shrink-0 w-32 rounded-2xl overflow-hidden bg-card border border-rose-500/30 text-left hover:shadow-md transition-all"
                >
                  <span className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white text-xs font-extrabold flex items-center justify-center shadow">{i + 1}</span>
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    {img ? <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10"><ShoppingBag className="h-6 w-6 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold line-clamp-1">{item.title}</p>
                    <p className="text-sm font-extrabold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">{fmtPrice(item.price_cents, item.currency)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><Eye className="h-2.5 w-2.5" /> {item.views_count}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* For You */}
      {tab === "browse" && forYou.length > 0 && (
        <div className="pt-3">
          <div className="px-4 flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">For you</h2>
          </div>
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-none">
            {forYou.map((item: any) => {
              const img = Array.isArray(item.images) ? item.images[0] : undefined;
              return (
                <button
                  type="button"
                  key={`fy-${item.id}`}
                  onClick={() => { setActiveListing(item); pushRecentView(item); }}
                  className="group shrink-0 w-32 rounded-2xl overflow-hidden bg-card border border-border/30 text-left hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    {img ? <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10"><ShoppingBag className="h-6 w-6 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold line-clamp-1">{item.title}</p>
                    <p className="text-sm font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{fmtPrice(item.price_cents, item.currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {tab === "browse" && recentViewed.length > 0 && (
        <div className="pt-3">
          <div className="px-4 flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recently viewed</h2>
            <button type="button" onClick={() => { setRecentViewed([]); try { localStorage.removeItem(RECENT_VIEW_KEY); } catch {/**/} }} className="ml-auto text-[10px] text-muted-foreground/70">Clear</button>
          </div>
          <div className="flex gap-3 px-4 pb-3 overflow-x-auto scrollbar-none">
            {recentViewed.map((item: any) => {
              const img = Array.isArray(item.images) ? item.images[0] : undefined;
              return (
                <button
                  type="button"
                  key={`rv-${item.id}`}
                  onClick={() => { setActiveListing(item); pushRecentView(item); }}
                  className="group shrink-0 w-28 rounded-xl overflow-hidden bg-card border border-border/30 text-left hover:shadow-md transition-all"
                >
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    {img ? <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10"><ShoppingBag className="h-5 w-5 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-semibold line-clamp-1">{item.title}</p>
                    <p className="text-xs font-bold text-primary">{fmtPrice(item.price_cents, item.currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort row */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {selectMode ? `${selectedIds.size} selected` : `Showing ${filtered.length}`}
          </p>
          {tab === "mine" ? (
            <button
              type="button"
              onClick={() => selectMode ? exitSelect() : setSelectMode(true)}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${selectMode ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}
            >
              {selectMode ? "Done" : "Select"}
            </button>
          ) : null}
          <select
            title="Sort listings"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs bg-muted/40 rounded-full px-3 py-1 focus:outline-none"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Offers tab */}
      {tab === "offers" && (
        <div className="px-4 py-4 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {(["all","pending","accepted","rejected"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOfferStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap capitalize ${
                  offerStatusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {isLoadingOffers ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-muted/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted/40 rounded w-3/4" />
                  <div className="h-3 bg-muted/40 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : myOffers.length === 0 ? (
            <div className="text-center py-16">
              <HandCoins className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No offers sent</p>
              <p className="text-xs text-muted-foreground">Make an offer on a negotiable listing</p>
            </div>
          ) : (
            myOffers
              .filter((o: any) => offerStatusFilter === "all" || o.status === offerStatusFilter)
              .map((o: any) => {
              const l = o.marketplace_listings;
              const img = Array.isArray(l?.images) ? l.images[0] : null;
              const statusClr = o.status === "accepted" ? "text-emerald-600" :
                                o.status === "rejected" ? "text-red-500" : "text-amber-600";
              return (
                <div
                  key={o.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30 text-left"
                >
                  <button
                    type="button"
                    onClick={() => l && setActiveListing(l)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted/30 overflow-hidden shrink-0">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold line-clamp-1">{l?.title || "Listing"}</p>
                      <p className="text-xs text-muted-foreground">
                        Asking {l ? fmtPrice(l.price_cents, l.currency) : "—"}
                      </p>
                      <p className="text-xs">
                        Your offer: <span className="font-bold">{fmtPrice(o.amount_cents, l?.currency)}</span> · <span className={`font-semibold uppercase ${statusClr}`}>{o.status}</span>
                      </p>
                      {o.counter_amount_cents != null && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                            Seller counter: {fmtPrice(o.counter_amount_cents, l?.currency)}
                          </p>
                          {o.status === "pending" && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); acceptCounter.mutate(o); }}
                              className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold"
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </p>
                    {o.status === "accepted" && l?.seller_id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReviewFor({ sellerId: l.seller_id, listingId: l.id }); }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-semibold"
                      >
                        Leave review
                      </button>
                    )}
                    {o.status === "pending" && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (confirm("Withdraw your offer?")) withdrawOffer.mutate(o.id); }}
                        className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New-listing pill */}
      {newCount > 0 && tab === "browse" && (
        <div className="sticky top-[148px] z-20 flex justify-center pt-2 pb-1">
          <button
            type="button"
            onClick={() => { setNewCount(0); refetch(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> {newCount} new {newCount === 1 ? "listing" : "listings"}
          </button>
        </div>
      )}

      {/* Browse error recovery card */}
      {tab === "browse" && isListingsError && (listings as any[]).length === 0 && !isLoading && (
        <LoadFailureCard
          className="mx-4 mt-4"
          title="Could not load listings"
          description="Marketplace data failed to refresh. Retry to reconnect and load the latest listings."
          onRetry={() => {
            void refetch();
          }}
          trackingContext="marketplace"
        />
      )}

      {/* Stale-data banner */}
      {tab === "browse" && isListingsError && (listings as any[]).length > 0 && (
        <DegradedDataBanner
          className="mx-4 mt-3"
          message="Showing cached results. Refresh failed."
          onRetry={() => {
            void refetch();
          }}
          trackingContext="marketplace"
          rightSlot={
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
              className="shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background disabled:opacity-50"
            >
              {isFetching ? "Refreshing..." : "Retry"}
            </button>
          }
        />
      )}

      {/* Listings */}
      {tab !== "offers" && (
        <div className={`px-4 py-4 ${viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}`}>
        {(tab === "browse" ? isLoading : tab === "saved" ? isLoadingSaved : tab === "mine" ? isLoadingMine : false) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/30 overflow-hidden animate-pulse">
              <div className={`bg-muted/40 ${viewMode === "grid" ? "aspect-square" : "w-28 h-28"}`} />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-muted/40 rounded w-3/4" />
                <div className="h-4 bg-muted/40 rounded w-1/3" />
                <div className="h-2 bg-muted/40 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 && tab === "browse" && !searchQuery && activeFilterCount === 0 && categories.length > 0 ? (
          <div className="col-span-2">
            <div className="text-center py-6">
              <p className="text-sm font-semibold mb-1">Start exploring</p>
              <p className="text-xs text-muted-foreground">Pick a category to browse</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {categories.slice(0, 12).map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-muted/20 border border-border/30 flex flex-col items-center justify-center gap-1 hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <span className="text-2xl">{c.icon || "🛍️"}</span>
                  <span className="text-[11px] font-semibold text-center px-1 line-clamp-1">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{(categoryCounts as Record<string, number>)[c.id] || 0}</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" /> Sell your first item
                </button>
              </div>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-16">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 via-muted/30 to-muted/10 flex items-center justify-center mb-4 shadow-inner">
              {tab === "saved" ? <Heart className="h-9 w-9 text-primary/60" />
               : tab === "mine" ? <Store className="h-9 w-9 text-primary/60" />
               : <ShoppingBag className="h-9 w-9 text-primary/60" />}
            </div>
            <p className="text-sm font-semibold mb-1">
              {tab === "saved" ? "No saved listings" : tab === "mine" ? "No listings yet" : "No listings found"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {tab === "saved" ? "Tap the heart on any listing to save it"
               : tab === "mine" ? "Create your first listing to start selling"
               : (searchQuery || activeFilterCount > 0) ? "Try adjusting your filters"
               : "Be the first to sell something"}
            </p>
            {user && tab !== "saved" && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Create listing
              </button>
            )}
            {tab === "saved" && (
              <button
                type="button"
                onClick={() => setTab("browse")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold"
              >
                Browse listings
              </button>
            )}
          </div>
        ) : (
          filtered.map((item: any, i: number) => {
            const images = Array.isArray(item.images) ? item.images : [];
            const firstImage = images[0] as string | undefined;
            const isFav = favoriteIds.has(item.id);

            return (
              <motion.div
                role="button"
                tabIndex={0}
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => {
                  if (selectMode && tab === "mine") { toggleSel(item.id); return; }
                  setActiveListing(item); pushRecentView(item);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { setActiveListing(item); pushRecentView(item); } }}
                className={`group bg-card rounded-2xl border border-border/30 overflow-hidden text-left active:scale-[0.98] hover:shadow-md hover:border-border/60 transition-all cursor-pointer ${
                  viewMode === "list" ? "flex items-stretch" : ""
                }`}
              >
                {/* Image */}
                <div className={`relative bg-muted/30 ${viewMode === "grid" ? "aspect-square" : "w-32 shrink-0"}`}>
                  {firstImage ? (
                    <img src={firstImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                  {images.length > 1 && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold flex items-center gap-0.5">
                      <Camera className="h-2.5 w-2.5" /> {images.length}
                    </span>
                  )}
                  {tab === "browse" && !selectMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleCompare(item.id); }}
                      className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm ${
                        compareIds.includes(item.id) ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"
                      }`}
                      title="Compare"
                    >
                      ⇄
                    </button>
                  )}
                  {selectMode && tab === "mine" && (
                    <div className={`absolute inset-0 flex items-start justify-end p-2 ${selectedIds.has(item.id) ? "bg-primary/20" : ""}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedIds.has(item.id) ? "bg-primary border-primary text-primary-foreground" : "bg-background/80 border-white"
                      }`}>
                        {selectedIds.has(item.id) && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                    </div>
                  )}
                  {item.is_featured ? (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-md">
                      <Sparkles className="h-2.5 w-2.5" /> FEATURED
                    </span>
                  ) : isFresh(item.created_at) ? (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[9px] font-bold shadow-md animate-pulse">
                      NEW
                    </span>
                  ) : null}
                  {item.status && item.status !== "active" && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold uppercase">
                      {item.status}
                    </span>
                  )}
                  {user && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate(item.id); }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-sm"
                      aria-label="Save"
                    >
                      <Heart className={`h-3.5 w-3.5 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-white"}`} />
                    </motion.button>
                  )}
                </div>

                <div className="p-3 flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.title}</h3>
                  <p className="text-base font-bold text-primary mt-0.5">
                    {fmtPrice(item.price_cents, item.currency)}
                    {item.is_negotiable && <span className="text-[10px] font-normal text-muted-foreground ml-1">OBO</span>}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    {item.condition && (
                      <span className="flex items-center gap-0.5">
                        <Tag className="h-2.5 w-2.5" /> {conditionLabel(item.condition)}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-0.5 truncate max-w-[80px]">
                        <MapPin className="h-2.5 w-2.5 shrink-0" /> {item.location}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" /> {item.views_count || 0}
                    </span>
                    {(item.favorites_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" /> {item.favorites_count}
                      </span>
                    )}
                    {tab === "browse" && (questionCounts as Record<string, number>)[item.id] > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" /> {(questionCounts as Record<string, number>)[item.id]}
                      </span>
                    )}
                    {tab === "mine" && (item._pending_offers || 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                        <HandCoins className="h-2.5 w-2.5" /> {item._pending_offers}
                      </span>
                    )}
                    {tab === "mine" && !selectMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); duplicateListing.mutate(item); }}
                        className="ml-auto flex items-center gap-0.5 text-primary hover:underline"
                        title="Duplicate"
                      >
                        <Copy className="h-2.5 w-2.5" /> Duplicate
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      )}

      {/* Load more */}
      {tab === "browse" && !isLoading && filtered.length >= pageSize && (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={() => setPageSize((s) => s + 60)}
            disabled={isFetching}
            className="px-5 py-2.5 rounded-full bg-muted/50 text-sm font-semibold disabled:opacity-50"
          >
            {isFetching ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {/* Filters Sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl pb-8"
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">Filters</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setConditionFilter("all"); setCategoryFilter(null);
                      setPriceMin(""); setPriceMax(""); setNegotiableOnly(false);
                    }}
                    className="text-xs text-primary font-medium"
                  >
                    Reset
                  </button>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Price range (USD)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm focus:outline-none"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <label className="flex items-center justify-between p-3 rounded-xl bg-muted/30 cursor-pointer">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <HandCoins className="h-4 w-4" /> Negotiable only
                  </span>
                  <input
                    type="checkbox"
                    checked={negotiableOnly}
                    onChange={(e) => setNegotiableOnly(e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-bold text-sm shadow-lg active:scale-[0.98] transition-transform"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listing Detail Sheet */}
      <AnimatePresence>
        {activeListing && (
          <ListingDetail
            listing={activeListing}
            isFav={favoriteIds.has(activeListing.id)}
            onToggleFav={() => toggleFavorite.mutate(activeListing.id)}
            onClose={() => setActiveListing(null)}
            onEdit={(l) => { setActiveListing(null); openEditFor(l); }}
            onOpenListing={(l) => setActiveListing(l)}
            onBlockSeller={(sellerId) => { blockUser.mutate(sellerId); setActiveListing(null); }}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>

      {/* Create Listing Sheet */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            onClick={() => { setShowCreate(false); setEditingId(null); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 space-y-4">
                <h3 className="text-base font-bold">{editingId ? "Edit Listing" : "Create Listing"}</h3>
                {(() => {
                  const tips: string[] = [];
                  if (imagePreviews.length === 0) tips.push("Add at least one photo");
                  if ((newListing.description || "").trim().length < 30) tips.push("Write a description (30+ chars)");
                  if (!newListing.category_id) tips.push("Pick a category for better discovery");
                  if (tips.length === 0) return null;
                  return (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Improve listing quality
                      </p>
                      <ul className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5 pl-4 list-disc">
                        {tips.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    </div>
                  );
                })()}

                {/* Photo picker */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Photos (up to 4) — drag to reorder. First photo = cover.</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imagePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", String(idx))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                          if (Number.isNaN(from) || from === idx) return;
                          setImagePreviews((p) => { const a = [...p]; const [m] = a.splice(from, 1); a.splice(idx, 0, m); return a; });
                          setImageFiles((p) => { const a = [...p]; const [m] = a.splice(from, 1); a.splice(idx, 0, m); return a; });
                        }}
                        className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border ${idx === 0 ? "border-primary ring-2 ring-primary/30" : "border-border"} cursor-move`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" decoding="async" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold text-center py-0.5">COVER</span>
                        )}
                        <button type="button"
                          aria-label="Remove photo"
                          onClick={() => {
                            setImageFiles((f) => f.filter((_, i) => i !== idx));
                            setImagePreviews((p) => p.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                        >
                          <XIcon className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 4 && (
                      <label className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                        <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground">Add photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []).slice(0, 4 - imagePreviews.length);
                            setImageFiles((prev) => [...prev, ...files]);
                            files.forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => setImagePreviews((prev) => [...prev, ev.target?.result as string]);
                              reader.readAsDataURL(file);
                            });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <input
                  value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  placeholder="What are you selling?"
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={newListing.price}
                      onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                      placeholder="Price"
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <select
                    title="Currency"
                    value={newListing.currency}
                    onChange={(e) => setNewListing({ ...newListing, currency: e.target.value })}
                    className="px-3 py-3 rounded-xl bg-muted/40 text-sm font-semibold focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="KHR">KHR</option>
                  </select>
                </div>
                {newListing.category_id && (priceGuide as Record<string, any>)[newListing.category_id] && (() => {
                  const g = (priceGuide as Record<string, any>)[newListing.category_id];
                  if (!g || g.n < 3) return null;
                  return (
                    <p className="text-[11px] text-muted-foreground -mt-1 px-1">
                      💡 Similar listings range {fmtPrice(g.min, newListing.currency)}–{fmtPrice(g.max, newListing.currency)} · avg <span className="font-semibold">{fmtPrice(Math.round(g.avg), newListing.currency)}</span>
                    </p>
                  );
                })()}
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                  placeholder="Location (optional)"
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  <input
                    value={newListing.tags}
                    onChange={(e) => setNewListing({ ...newListing, tags: e.target.value })}
                    placeholder="Tags, comma separated"
                    className="flex-1 px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newListing.quantity}
                    onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                    placeholder="Qty"
                    className="w-20 px-3 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {(() => {
                  const STOP = new Set(["the","and","for","with","this","that","your","very","new","like","good","best","made","sale","item","items"]);
                  const existing = (newListing.tags || "").split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
                  const words = (newListing.title || "")
                    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
                    .filter((w: string) => w.length >= 3 && !STOP.has(w) && !existing.includes(w));
                  const sug = Array.from(new Set(words)).slice(0, 6);
                  if (sug.length === 0) return null;
                  return (
                    <div className="flex gap-1.5 flex-wrap -mt-1">
                      <span className="text-[10px] text-muted-foreground self-center">Suggestions:</span>
                      {sug.map((s: string) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewListing({ ...newListing, tags: existing.length > 0 ? `${newListing.tags}, ${s}` : s })}
                          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {categories.length > 0 && (
                  <select
                    title="Category"
                    value={newListing.category_id}
                    onChange={(e) => setNewListing({ ...newListing, category_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"
                  >
                    <option value="">Select category (optional)</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <select
                  title="Condition"
                  value={newListing.condition}
                  onChange={(e) => setNewListing({ ...newListing, condition: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"
                >
                  {CONDITIONS.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newListing.is_negotiable}
                    onChange={(e) => setNewListing({ ...newListing, is_negotiable: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Price is negotiable</span>
                </label>
                <div className="flex gap-2">
                  {!editingId && (
                    <button type="button"
                      onClick={() => { setSaveAsDraft(true); createMutation.mutate(); }}
                      disabled={!newListing.title || createMutation.isPending}
                      className="px-4 py-3.5 rounded-2xl bg-muted/40 font-semibold text-sm disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                  )}
                  <button type="button"
                    onClick={() => { setSaveAsDraft(false); createMutation.mutate(); }}
                    disabled={!newListing.title || !newListing.price || createMutation.isPending}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-bold text-sm disabled:opacity-50 shadow-lg active:scale-[0.98] transition-transform"
                  >
                    {createMutation.isPending && !saveAsDraft ? "Saving..." : editingId ? "Save Changes" : "Publish Listing"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare bar */}
      <AnimatePresence>
        {compareIds.length > 0 && tab === "browse" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+4rem)] left-0 right-0 z-40 px-4"
          >
            <div className="max-w-md mx-auto bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg flex items-center gap-2 p-2">
              <span className="text-xs font-bold pl-2">⇄ {compareIds.length}/3</span>
              <button type="button" onClick={() => setCompareIds([])} className="text-[11px] text-muted-foreground">Clear</button>
              <div className="flex-1" />
              <button
                type="button"
                disabled={compareIds.length < 2}
                onClick={() => setShowCompare(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground text-xs font-bold disabled:opacity-50"
              >
                Compare
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison sheet */}
      <AnimatePresence>
        {showCompare && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            onClick={() => setShowCompare(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
              <div className="px-4 space-y-3">
                <h3 className="text-base font-bold">Compare</h3>
                {(() => {
                  const items = compareIds
                    .map((id) => (listings as any[]).find((l) => l.id === id) || (recentViewed as any[]).find((l) => l.id === id))
                    .filter(Boolean) as any[];
                  if (items.length === 0) return <p className="text-xs text-muted-foreground">No items to compare</p>;
                  return (
                    <div className={`grid gap-3 ${items.length === 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-1"}`}>
                      {items.map((it) => {
                        const img = Array.isArray(it.images) ? it.images[0] : null;
                        return (
                          <div key={it.id} className="rounded-2xl overflow-hidden border border-border/30 bg-card">
                            <div className="aspect-square bg-muted/30">
                              {img ? <img src={img} alt={it.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground/30" /></div>}
                            </div>
                            <div className="p-2 space-y-1">
                              <p className="text-xs font-bold line-clamp-2">{it.title}</p>
                              <p className="text-sm font-extrabold text-primary">{fmtPrice(it.price_cents, it.currency)}</p>
                              <p className="text-[10px] text-muted-foreground"><Tag className="h-2.5 w-2.5 inline mr-0.5" />{conditionLabel(it.condition)}</p>
                              {it.location && <p className="text-[10px] text-muted-foreground"><MapPin className="h-2.5 w-2.5 inline mr-0.5" />{it.location}</p>}
                              <p className="text-[10px] text-muted-foreground"><Eye className="h-2.5 w-2.5 inline mr-0.5" />{it.views_count || 0} views</p>
                              {it.is_negotiable && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Negotiable</p>}
                              <button
                                type="button"
                                onClick={() => { setShowCompare(false); setActiveListing(it); }}
                                className="w-full mt-1 py-1.5 rounded-lg bg-muted/40 text-[10px] font-semibold"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectMode && tab === "mine" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+4rem)] left-0 right-0 z-40 px-4"
          >
            <div className="max-w-md mx-auto bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg flex items-center gap-2 p-2">
              <span className="text-xs font-bold pl-2">{selectedIds.size} selected</span>
              <div className="flex-1" />
              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkUpdateStatus.isPending}
                onClick={() => bulkUpdateStatus.mutate("sold")}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Sold
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkDelete.isPending}
                onClick={() => { if (confirm(`Delete ${selectedIds.size} listings?`)) bulkDelete.mutate(); }}
                className="px-3 py-2 rounded-xl bg-red-500/15 text-red-600 text-xs font-bold disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MarketplaceReviewSheet
        open={!!reviewFor}
        onClose={() => setReviewFor(null)}
        sellerId={reviewFor?.sellerId || ""}
        listingId={reviewFor?.listingId}
      />

      <ZivoMobileNav />
    </div>
  );
}

function ListingDetail({
  listing, isFav, onToggleFav, onClose, onEdit, onOpenListing, onBlockSeller, currentUserId,
}: {
  listing: any;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
  onEdit: (l: any) => void;
  onOpenListing: (l: any) => void;
  onBlockSeller: (sellerId: string) => void;
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const [imageIdx, setImageIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const images: string[] = Array.isArray(listing.images) ? listing.images : [];
  const isOwn = currentUserId && currentUserId === listing.seller_id;

  useEffect(() => {
    if (!listing?.id || isOwn) return;
    (supabase as any).rpc("increment_listing_views", { listing_id: listing.id }).then(() => {});
  }, [listing?.id, isOwn]);

  // Presence: how many people are viewing this listing right now
  const [viewerCount, setViewerCount] = useState(1);
  useEffect(() => {
    if (!listing?.id) return;
    const channel = (supabase as any).channel(`listing-presence-${listing.id}`, {
      config: { presence: { key: currentUserId || `anon-${Math.random().toString(36).slice(2, 8)}` } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewerCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: new Date().toISOString() });
        }
      });
    return () => { (supabase as any).removeChannel(channel); };
  }, [listing?.id, currentUserId]);

  const { data: sellerStats } = useQuery({
    queryKey: ["marketplace-seller-stats", listing.seller_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_reviews")
        .select("rating")
        .eq("seller_id", listing.seller_id);
      const rows = (data || []) as { rating: number }[];
      if (rows.length === 0) return { avg: 0, count: 0 };
      const sum = rows.reduce((a, r) => a + (r.rating || 0), 0);
      return { avg: sum / rows.length, count: rows.length };
    },
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ["marketplace-seller-reviews", listing.seller_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_reviews")
        .select("id,rating,title,content,reviewer_id,created_at,is_verified_purchase,helpful_count")
        .eq("seller_id", listing.seller_id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: hasPendingOffer = false } = useQuery({
    queryKey: ["marketplace-my-pending-offer", listing.id, currentUserId],
    enabled: !!currentUserId && !isOwn,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("marketplace_offers")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listing.id)
        .eq("buyer_id", currentUserId!)
        .eq("status", "pending");
      return (count || 0) > 0;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["marketplace-questions", listing.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_questions")
        .select("id,question,answer,answered_at,asker_id,seller_id,created_at")
        .eq("listing_id", listing.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const askQuestion = useMutation({
    mutationFn: async (text: string) => {
      if (!currentUserId) throw new Error("Login to ask a question");
      const { error } = await (supabase as any).from("marketplace_questions").insert({
        listing_id: listing.id,
        asker_id: currentUserId,
        seller_id: listing.seller_id,
        question: text,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-questions", listing.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const answerQuestion = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await (supabase as any)
        .from("marketplace_questions")
        .update({ answer: text, answered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-questions", listing.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [qText, setQText] = useState("");
  const [isSharingListing, setIsSharingListing] = useState(false);
  const [helpfulLoadingIds, setHelpfulLoadingIds] = useState<Set<string>>(new Set());
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const { data: similar = [] } = useQuery({
    queryKey: ["marketplace-similar", listing.id, listing.category_id],
    queryFn: async () => {
      let q = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .neq("id", listing.id)
        .limit(8);
      if (listing.category_id) q = q.eq("category_id", listing.category_id);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: seller } = useQuery({
    queryKey: ["marketplace-seller", listing.seller_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .eq("id", listing.seller_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: sellerProfile } = useQuery({
    queryKey: ["marketplace-seller-profile", listing.seller_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_seller_profiles")
        .select("is_verified,total_sales,store_name")
        .eq("user_id", listing.seller_id)
        .maybeSingle();
      return data as { is_verified?: boolean; total_sales?: number; store_name?: string } | null;
    },
  });

  const { data: sellerActiveCount = 0 } = useQuery({
    queryKey: ["marketplace-seller-active-count", listing.seller_id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("marketplace_listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", listing.seller_id)
        .eq("status", "active");
      return count || 0;
    },
  });

  const handleShare = async () => {
    if (isSharingListing) return;
    setIsSharingListing(true);
    const url = `${window.location.origin}/marketplace?listing=${listing.id}`;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {/* user cancelled */}
    finally { setIsSharingListing(false); }
  };

  const handleMessage = () => {
    if (!currentUserId) { toast.error("Login to message seller"); return; }
    if (isOwn) return;
    navigate(`/chat?with=${listing.seller_id}&listing=${listing.id}`);
  };

  const queryClient = useQueryClient();
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const sendOffer = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Login to make an offer");
      const cents = Math.round(parseFloat(offerAmount) * 100);
      if (isNaN(cents) || cents <= 0) throw new Error("Enter a valid amount");
      const { error } = await (supabase as any).from("marketplace_offers").insert({
        listing_id: listing.id,
        buyer_id: currentUserId,
        amount_cents: cents,
        message: offerMessage || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Offer sent!");
      setShowOffer(false); setOfferAmount(""); setOfferMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bumpListing = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("bump_marketplace_listing", { listing_id: listing.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing bumped to top");
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-mine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePromote = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("marketplace_listings")
        .update({ is_featured: !listing.is_featured })
        .eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(listing.is_featured ? "Removed from Featured" : "Listing featured!");
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: "active" | "sold" | "withdrawn" | "draft") => {
      const { error } = await (supabase as any)
        .from("marketplace_listings").update({ status }).eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing updated");
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteListing = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("marketplace_listings").delete().eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing deleted");
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["marketplace-offers", listing.id, isOwn],
    enabled: !!isOwn,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_offers")
        .select("*")
        .eq("listing_id", listing.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const respondOffer = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const { error } = await (supabase as any)
        .from("marketplace_offers")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-offers", listing.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const counterOffer = useMutation({
    mutationFn: async ({ id, cents }: { id: string; cents: number }) => {
      const { error } = await (supabase as any)
        .from("marketplace_offers")
        .update({ counter_amount_cents: cents })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Counter sent");
      queryClient.invalidateQueries({ queryKey: ["marketplace-offers", listing.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[210] flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-t-3xl pb-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex justify-center py-3 sticky top-0 bg-background z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Image carousel */}
        <div className="relative aspect-square bg-muted/30 mx-5 rounded-2xl overflow-hidden">
          {images.length > 0 ? (
            <>
              <img src={images[imageIdx]} alt={listing.title} onClick={() => setLightbox(true)} className="w-full h-full object-cover cursor-zoom-in" />
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`View image ${i + 1}`}
                      onClick={() => setImageIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === imageIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-12 w-12 text-muted-foreground/20" /></div>
          )}
          <button type="button" aria-label="Close" onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            <XIcon className="h-4 w-4 text-white" />
          </button>
          {listing.status === "sold" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-8 py-2 rounded-lg bg-red-500/90 text-white text-2xl font-extrabold tracking-widest -rotate-12 shadow-2xl border-4 border-white/30">SOLD</div>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-5 mt-2 pb-1">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                aria-label={`View image ${i + 1}`}
                onClick={() => setImageIdx(i)}
                className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === imageIdx ? "border-primary scale-105" : "border-transparent opacity-70"
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="px-5 pt-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{listing.title}</h2>
              <p className="text-2xl font-extrabold mt-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {fmtPrice(listing.price_cents, listing.currency)}
                {listing.is_negotiable && <span className="text-xs font-normal text-muted-foreground ml-2">OBO</span>}
              </p>
            </div>
            {currentUserId && !isOwn && (
              <button
                type="button"
                onClick={onToggleFav}
                className="p-2.5 rounded-full bg-muted/40"
                aria-label="Save"
              >
                <Heart className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            )}
            <button type="button" aria-label="Share listing" onClick={handleShare} disabled={isSharingListing} className="p-2.5 rounded-full bg-muted/40 disabled:opacity-50">
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {listing.condition && (
              <span className="px-2.5 py-1 rounded-full bg-muted/40 flex items-center gap-1">
                <Tag className="h-3 w-3" /> {conditionLabel(listing.condition)}
              </span>
            )}
            {listing.location && (
              <span className="px-2.5 py-1 rounded-full bg-muted/40 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {listing.location}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-muted/40 flex items-center gap-1">
              <Eye className="h-3 w-3" /> {listing.views_count || 0} views
            </span>
            {viewerCount > 1 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {viewerCount} viewing now
              </span>
            )}
            {(listing.quantity ?? 1) > 1 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                Qty: {listing.quantity}
              </span>
            )}
          </div>

          {Array.isArray(listing.tags) && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map((t: string) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { onClose(); navigate(`/marketplace?q=${encodeURIComponent(t)}`); }}
                  className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/15"
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {listing.description && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Description</h4>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{listing.description}</p>
            </div>
          )}

          {/* Seller card */}
          <button
            type="button"
            onClick={() => navigate(`/u/${seller?.username || listing.seller_id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/30 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
              {seller?.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(seller?.display_name || seller?.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold flex items-center gap-1 truncate">
                {seller?.display_name || seller?.username || "Seller"}
                {sellerProfile?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                {sellerActiveCount > 1 && (
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">· {sellerActiveCount} active</span>
                )}
                {(sellerProfile?.total_sales ?? 0) > 0 && (
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 ml-1">· {sellerProfile?.total_sales} sold</span>
                )}
              </p>
              {(() => {
                const r = sellerStats?.avg ?? 0;
                const c = sellerStats?.count ?? 0;
                const sales = sellerProfile?.total_sales ?? 0;
                const score = Math.min(100, Math.round(
                  (Math.min(r, 5) / 5) * 50 +
                  Math.min(c, 30) / 30 * 20 +
                  Math.min(sales, 50) / 50 * 20 +
                  (sellerProfile?.is_verified ? 10 : 0)
                ));
                const tier = score >= 80 ? "Excellent" : score >= 60 ? "Trusted" : score >= 40 ? "Building" : "New";
                const color = score >= 80 ? "from-emerald-500 to-green-500"
                  : score >= 60 ? "from-blue-500 to-indigo-500"
                  : score >= 40 ? "from-amber-500 to-orange-500"
                  : "from-muted to-muted";
                return (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-md bg-gradient-to-r ${color} text-white font-bold text-[10px]`} title="Trust score">
                      {tier} · {score}
                    </span>
                    {c > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="font-semibold">{r.toFixed(1)}</span>
                        <span className="text-muted-foreground">({c})</span>
                      </span>
                    )}
                    <span>· Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                  </p>
                );
              })()}
            </div>
          </button>

          {/* Reviews preview */}
          {recentReviews.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reviews</h4>
              {recentReviews.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (r.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    {r.is_verified_purchase && (
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Verified</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.title && <p className="text-xs font-semibold">{r.title}</p>}
                  {r.content && <p className="text-xs text-muted-foreground line-clamp-3">{r.content}</p>}
                  <button
                    type="button"
                    onClick={async () => {
                      if (helpfulLoadingIds.has(r.id)) return;
                      setHelpfulLoadingIds((prev) => new Set(prev).add(r.id));
                      try {
                        const { error } = await (supabase as any).rpc("increment_review_helpful", { review_id: r.id });
                        if (error) toast.error(error.message); else toast.success("Marked helpful");
                      } finally {
                        setHelpfulLoadingIds((prev) => {
                          const next = new Set(prev);
                          next.delete(r.id);
                          return next;
                        });
                      }
                    }}
                    disabled={helpfulLoadingIds.has(r.id)}
                    className="mt-1.5 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-50"
                  >
                    {helpfulLoadingIds.has(r.id) ? "Saving..." : `👍 Helpful${r.helpful_count ? ` (${r.helpful_count})` : ""}`}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Status badge */}
          {listing.status && listing.status !== "active" && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold text-center uppercase tracking-wide">
              {listing.status}
            </div>
          )}

          {/* Actions */}
          {!isOwn ? (
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleMessage}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
                {listing.is_negotiable && (
                  <button
                    type="button"
                    onClick={() => setShowOffer(true)}
                    disabled={hasPendingOffer}
                    title={hasPendingOffer ? "You already have a pending offer" : ""}
                    className="flex-1 py-3.5 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <HandCoins className="h-4 w-4" /> {hasPendingOffer ? "Offer pending" : "Make Offer"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="px-4 rounded-2xl bg-muted/40"
                  aria-label="Report"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {/* Owner controls */}
              <div className="flex gap-2">
                {listing.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate("active")}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
                  >
                    <Sparkles className="h-4 w-4" /> Publish
                  </button>
                ) : listing.status === "sold" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate("active")}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-3 rounded-2xl bg-muted/40 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> Relist
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate("sold")}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Sold
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(listing)}
                  className="px-4 rounded-2xl bg-muted/40 font-semibold text-sm"
                >
                  Edit
                </button>
                {listing.status === "active" && (
                  <button
                    type="button"
                    onClick={() => bumpListing.mutate()}
                    disabled={bumpListing.isPending}
                    className="px-4 rounded-2xl bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold text-sm flex items-center gap-1"
                    title="Bump to top of feed (once per 24h)"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => togglePromote.mutate()}
                  disabled={togglePromote.isPending}
                  className={`px-4 rounded-2xl font-semibold text-sm flex items-center gap-1 ${
                    listing.is_featured ? "bg-primary text-primary-foreground" : "bg-muted/40"
                  }`}
                  title={listing.is_featured ? "Remove from Featured" : "Promote to Featured"}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this listing? This cannot be undone.")) deleteListing.mutate();
                  }}
                  disabled={deleteListing.isPending}
                  title="Delete listing"
                  className="px-4 rounded-2xl bg-red-500/10 text-red-600 font-semibold text-sm flex items-center gap-1.5 hover:bg-red-500/15 active:scale-95 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Offers received */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Offers ({offers.length})
                  </h4>
                </div>
                {offers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-xl">No offers yet</p>
                ) : (
                  <div className="space-y-2">
                    {offers.map((o: any) => (
                      <div key={o.id} className="p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/15 border border-border/30 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">
                            {fmtPrice(o.amount_cents, listing.currency)}
                            {o.counter_amount_cents != null && (
                              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                Counter: {fmtPrice(o.counter_amount_cents, listing.currency)}
                              </span>
                            )}
                          </p>
                          {o.message && <p className="text-[11px] text-muted-foreground line-clamp-2">{o.message}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })} · {o.status}
                          </p>
                        </div>
                        {o.status === "pending" && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => respondOffer.mutate({ id: o.id, status: "accepted" })}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[11px] font-semibold shadow-sm active:scale-95 transition-transform"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const ans = prompt("Counter offer amount", o.counter_amount_cents != null ? String(o.counter_amount_cents / 100) : String(o.amount_cents / 100));
                                if (!ans) return;
                                const cents = Math.round(parseFloat(ans) * 100);
                                if (isNaN(cents) || cents <= 0) { toast.error("Invalid amount"); return; }
                                counterOffer.mutate({ id: o.id, cents });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[11px] font-semibold"
                            >
                              Counter
                            </button>
                            <button
                              type="button"
                              onClick={() => respondOffer.mutate({ id: o.id, status: "rejected" })}
                              className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-[11px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Q&A */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Questions ({questions.length})</h4>
            </div>
            {!isOwn && currentUserId && (
              <div className="flex gap-2 mb-3">
                <input
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Ask the seller a question..."
                  className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  aria-label="Send question"
                  disabled={!qText.trim() || askQuestion.isPending}
                  onClick={() => { askQuestion.mutate(qText.trim()); setQText(""); }}
                  className="px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-xl">No questions yet</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q: any) => (
                  <div key={q.id} className="p-3 rounded-xl bg-muted/30 space-y-1.5">
                    <p className="text-sm">
                      <span className="text-muted-foreground font-bold mr-1">Q:</span>{q.question}
                    </p>
                    {q.answer ? (
                      <p className="text-sm pl-3 border-l-2 border-primary">
                        <span className="text-primary font-bold mr-1">A:</span>{q.answer}
                      </p>
                    ) : isOwn ? (
                      <div className="flex gap-2">
                        <input
                          placeholder="Write a reply..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const t = (e.currentTarget as HTMLInputElement).value.trim();
                              if (t) answerQuestion.mutate({ id: q.id, text: t });
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Awaiting seller's reply</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Similar items */}
          {similar.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You may also like</h4>
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
                {similar.map((s: any) => {
                  const img = Array.isArray(s.images) ? s.images[0] : null;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => onOpenListing(s)}
                      className="group shrink-0 w-32 rounded-xl overflow-hidden bg-card border border-border/30 text-left hover:shadow-md hover:border-border/60 transition-all"
                    >
                      <div className="aspect-square bg-muted/30 overflow-hidden">
                        {img ? <img src={img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10"><ShoppingBag className="h-6 w-6 text-muted-foreground/30" /></div>}
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-semibold line-clamp-1">{s.title}</p>
                        <p className="text-xs font-bold text-primary">{fmtPrice(s.price_cents, s.currency)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spacer for sticky CTA */}
          {!isOwn && listing.status === "active" && <div className="h-16" />}
        </div>

        {/* Sticky bottom CTA for buyers */}
        {!isOwn && listing.status === "active" && (
          <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/30 px-5 py-3 flex gap-2">
            <button
              type="button"
              onClick={onToggleFav}
              className="px-4 rounded-2xl bg-muted/40"
              aria-label="Save"
            >
              <Heart className={`h-5 w-5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleMessage}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-transform"
            >
              <MessageCircle className="h-4 w-4" /> Message
            </button>
            {listing.is_negotiable && (
              <button
                type="button"
                onClick={() => setShowOffer(true)}
                disabled={hasPendingOffer}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-foreground to-foreground/85 text-background font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <HandCoins className="h-4 w-4" /> {hasPendingOffer ? "Pending" : "Offer"}
              </button>
            )}
          </div>
        )}

        {/* Report dialog */}
        <AnimatePresence>
          {showReport && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[225] flex items-end justify-center bg-black/50"
              onClick={() => setShowReport(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-background rounded-t-3xl pb-8"
              >
                <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
                <div className="px-5 space-y-3">
                  <h3 className="text-base font-bold">Report listing</h3>
                  <p className="text-xs text-muted-foreground">Help keep the marketplace safe. Reports are reviewed by our team.</p>
                  <div className="grid gap-2">
                    {["Spam or scam","Counterfeit / fake","Prohibited item","Wrong category","Inappropriate content","Other"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReportReason(r)}
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm ${
                          reportReason === r ? "border-primary bg-primary/5 font-semibold" : "border-border bg-muted/20"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="More details (optional)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    disabled={!reportReason || isSubmittingReport}
                    onClick={async () => {
                      if (isSubmittingReport) return;
                      setIsSubmittingReport(true);
                      try {
                        await (supabase as any).from("bug_reports").insert({
                          user_id: currentUserId || null,
                          title: `Marketplace report: ${reportReason}`,
                          description: `Listing: ${listing.id}\nSeller: ${listing.seller_id}\nNote: ${reportNote || "(none)"}`,
                          category: "marketplace",
                          severity: "low",
                        });
                      } catch {/* table optional */}
                      toast.success("Report submitted. Thank you.");
                      setShowReport(false); setReportReason(""); setReportNote("");
                      setIsSubmittingReport(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm disabled:opacity-50"
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit report"}
                  </button>
                  {currentUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Block this seller? Their listings will be hidden from your feed.")) {
                          onBlockSeller(listing.seller_id);
                          setShowReport(false);
                        }
                      }}
                      className="w-full py-3 rounded-2xl bg-muted/40 text-foreground font-semibold text-sm"
                    >
                      Block seller
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightbox */}
        <AnimatePresence>
          {lightbox && images.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[230] bg-black flex items-center justify-center"
              onClick={() => setLightbox(false)}
            >
              <button
                type="button"
                aria-label="Close lightbox"
                onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm"
              >
                <XIcon className="h-5 w-5 text-white" />
              </button>
              {imageIdx > 0 && (
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => { e.stopPropagation(); setImageIdx((i) => Math.max(0, i - 1)); }}
                  className="absolute left-3 z-10 p-2 rounded-full bg-white/10 text-white"
                >
                  ‹
                </button>
              )}
              {imageIdx < images.length - 1 && (
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => { e.stopPropagation(); setImageIdx((i) => Math.min(images.length - 1, i + 1)); }}
                  className="absolute right-3 z-10 p-2 rounded-full bg-white/10 text-white"
                >
                  ›
                </button>
              )}
              <motion.img
                key={imageIdx}
                src={images[imageIdx]}
                alt={listing.title}
                className="max-w-full max-h-full object-contain"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80 && imageIdx < images.length - 1) setImageIdx(imageIdx + 1);
                  else if (info.offset.x > 80 && imageIdx > 0) setImageIdx(imageIdx - 1);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === imageIdx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offer modal */}
        <AnimatePresence>
          {showOffer && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50"
              onClick={() => setShowOffer(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-background rounded-t-3xl pb-8"
              >
                <div className="flex justify-center py-3">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="px-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                      <HandCoins className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight">Make an Offer</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Asking price: {fmtPrice(listing.price_cents, listing.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="Your offer"
                      step="0.01"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/40 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Add a message (optional)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => sendOffer.mutate()}
                    disabled={!offerAmount || sendOffer.isPending}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm disabled:opacity-50 shadow-lg active:scale-[0.98] transition-transform"
                  >
                    {sendOffer.isPending ? "Sending..." : "Send Offer"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
