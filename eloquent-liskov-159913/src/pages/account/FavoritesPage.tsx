/**
 * Account Favorites Page
 * View and manage favorites across all service types
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Star, Utensils, BedDouble, MapPin, Plane, X, Search, Grid3x3, List, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SEOHead from "@/components/SEOHead";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import type { FavoriteItemType } from "@/types/personalization";

type TabKey = "all" | "restaurant" | "hotel" | "destination" | "flight";
type SortKey = "recent" | "name" | "rating";
type ViewMode = "list" | "grid";

const VIEW_MODE_KEY = "zivo_favorites_view";
const SORT_KEY_STORAGE = "zivo_favorites_sort";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "name", label: "Name (A-Z)" },
  { value: "rating", label: "Top rated" },
];

const tabs: { key: TabKey; label: string; icon: typeof Heart; itemType?: FavoriteItemType }[] = [
  { key: "all", label: "All", icon: Heart },
  { key: "restaurant", label: "Restaurants", icon: Utensils, itemType: "restaurant" },
  { key: "hotel", label: "Hotels", icon: BedDouble, itemType: "hotel" },
  { key: "destination", label: "Destinations", icon: MapPin, itemType: "destination" },
  { key: "flight", label: "Flights", icon: Plane, itemType: "flight" },
];

const typeStyles: Record<string, { color: string; bg: string; icon: typeof Heart }> = {
  restaurant: { color: "text-orange-500", bg: "bg-orange-500/10", icon: Utensils },
  hotel: { color: "text-amber-500", bg: "bg-amber-500/10", icon: BedDouble },
  destination: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: MapPin },
  flight: { color: "text-sky-500", bg: "bg-sky-500/10", icon: Plane },
};

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const filterType = tabs.find((t) => t.key === activeTab)?.itemType;
  const { favorites, isLoading, removeFavorite } = useFavorites(filterType);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "recent";
    try {
      return (localStorage.getItem(SORT_KEY_STORAGE) as SortKey) || "recent";
    } catch {
      return "recent";
    }
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    try {
      return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "list";
    } catch {
      return "list";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(SORT_KEY_STORAGE, sortKey); } catch { /* ignore */ }
  }, [sortKey]);
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  const getItemName = (fav: any) => fav.item_data?.name || fav.item_data?.title || fav.item_type;
  const getItemSubtitle = (fav: any) => {
    const d = fav.item_data;
    if (d?.cuisine_type) return d.cuisine_type;
    if (d?.location) return d.location;
    if (d?.city) return d.city;
    return fav.item_type;
  };
  const getItemImage = (fav: any) => fav.item_data?.cover_image_url || fav.item_data?.logo_url || fav.item_data?.image_url;
  const getItemLink = (fav: any) => {
    if (fav.item_type === "restaurant") return `/eats/restaurant/${fav.item_id}`;
    if (fav.item_type === "hotel") return `/hotel/${fav.item_id}`;
    return "#";
  };

  // Search + sort
  const visibleFavorites = useMemo(() => {
    let list = [...favorites];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f: any) => {
        const name = String(getItemName(f) || "").toLowerCase();
        const sub = String(getItemSubtitle(f) || "").toLowerCase();
        return name.includes(q) || sub.includes(q);
      });
    }
    if (sortKey === "name") {
      list.sort((a: any, b: any) => String(getItemName(a)).localeCompare(String(getItemName(b))));
    } else if (sortKey === "rating") {
      list.sort((a: any, b: any) => (Number(b.item_data?.rating) || 0) - (Number(a.item_data?.rating) || 0));
    } else {
      list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return list;
  }, [favorites, search, sortKey]);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Recently added";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Favorites — ZIVO" description="View and manage your favorite places" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Favorites</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const count = tab.key === "all" ? favorites.length : favorites.filter((f) => f.item_type === tab.key).length;
            return (
              <button type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", isActive ? "bg-primary-foreground/20" : "bg-muted")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + sort + view toggle */}
        {!isLoading && favorites.length > 0 && (
          <div className="flex items-center gap-2 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search favorites…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search favorites"
                className="pl-9 pr-8 h-9 rounded-full bg-muted/40 border-border/40 text-xs"
              />
              {search && (
                <button type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full px-3 text-xs gap-1 shrink-0">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">{sortLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => setSortKey(o.value)} className="text-xs">
                    {o.value === sortKey && <Heart className="h-3 w-3 mr-2 fill-primary text-primary" />}
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button"
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              aria-label={viewMode === "list" ? "Switch to grid view" : "Switch to list view"}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-card border border-border/40 hover:bg-accent/50 active:scale-95 transition-all shrink-0"
            >
              {viewMode === "list" ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border bg-card">
                <Skeleton className="h-32 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold mb-2">No favorites yet</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Tap the heart icon on restaurants, hotels, or destinations to save them here
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/eats")} size="sm" variant="outline" className="gap-1.5">
                <Utensils className="w-4 h-4" />
                Restaurants
              </Button>
              <Button onClick={() => navigate("/search?tab=hotels")} size="sm" variant="outline" className="gap-1.5">
                <BedDouble className="w-4 h-4" />
                Hotels
              </Button>
            </div>
          </div>
        )}

        {/* No matches for search/filter */}
        {!isLoading && favorites.length > 0 && visibleFavorites.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No favorites match your search</p>
            <Button variant="link" size="sm" className="mt-2 text-xs" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        )}

        {/* Favorites List / Grid */}
        {!isLoading && visibleFavorites.length > 0 && (
          <div className={cn(
            "pt-2",
            viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"
          )}>
            <AnimatePresence mode="popLayout">
              {visibleFavorites.map((fav, index) => {
                const style = typeStyles[fav.item_type] || typeStyles.restaurant;
                const TypeIcon = style.icon;
                const image = getItemImage(fav);

                return (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => navigate(getItemLink(fav))}
                    className="group relative rounded-2xl overflow-hidden border bg-card cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    {/* Cover */}
                    {image ? (
                      <img src={image} alt={getItemName(fav)} className={cn("w-full object-cover", viewMode === "grid" ? "h-24" : "h-28")} loading="lazy" />
                    ) : (
                      <div className={cn("w-full flex items-center justify-center", style.bg, viewMode === "grid" ? "h-24" : "h-28")}>
                        <TypeIcon className={cn(viewMode === "grid" ? "w-8 h-8" : "w-10 h-10", style.color)} />
                      </div>
                    )}

                    {/* Type badge */}
                    <div className={cn("absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border", style.bg, "border-white/20")}>
                      <TypeIcon className={cn("w-3 h-3", style.color)} />
                      <span className={cn("text-[10px] font-bold capitalize", style.color)}>{fav.item_type}</span>
                    </div>

                    {/* Remove button */}
                    <button type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite({ itemType: fav.item_type, itemId: fav.item_id });
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/30 transition-colors"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>

                    {/* Info */}
                    <div className="p-3.5">
                      <h3 className="font-bold text-sm">{getItemName(fav)}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{getItemSubtitle(fav)}</span>
                        {fav.item_data?.rating && (
                          <>
                            <span className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <Star className="w-3 h-3 fill-current" />
                              {fav.item_data.rating}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
