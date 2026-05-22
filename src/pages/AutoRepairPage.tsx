/**
 * AutoRepairPage — Browse & book auto repair shops on ZIVO
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Search from "lucide-react/dist/esm/icons/search";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Clock from "lucide-react/dist/esm/icons/clock";
import Wrench from "lucide-react/dist/esm/icons/wrench";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { Input } from "@/components/ui/input";

const SERVICE_FILTERS = [
  "All",
  "Oil Change",
  "Brakes",
  "Tires",
  "Engine",
  "Transmission",
  "AC Repair",
  "Diagnostics",
  "Body Work",
];

const FALLBACK_SHOPS = [
  { id: "ar1", name: "QuickFix Auto", address: "Downtown", rating: 4.8, slug: null, banner_url: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=500", services: ["Oil Change", "Brakes", "Diagnostics"], verified: true },
  { id: "ar2", name: "Pro Mechanics", address: "Westside", rating: 4.7, slug: null, banner_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=500", services: ["Tires", "Engine", "Transmission"], verified: true },
  { id: "ar3", name: "City Auto Care", address: "Northpark", rating: 4.6, slug: null, banner_url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=500", services: ["AC Repair", "Body Work", "Oil Change"], verified: false },
  { id: "ar4", name: "Elite Car Service", address: "Eastville", rating: 4.9, slug: null, banner_url: "https://images.unsplash.com/photo-1622188526197-5e62d3cf7a9b?auto=format&fit=crop&q=80&w=500", services: ["Engine", "Diagnostics", "Brakes"], verified: true },
];

interface Shop {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean | null;
  services?: string[];
}

export default function AutoRepairPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ["auto-repair-shops"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, rating, logo_url, banner_url, slug, is_verified")
        .eq("category", "auto-repair")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const useLive = shops.length >= 2;
  const displayShops: Shop[] = useLive
    ? shops.filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.address ?? "").toLowerCase().includes(q);
        const matchFilter = activeFilter === "All" || !Array.isArray((s as any).services) || (s as any).services.some((sv: string) => sv.toLowerCase().includes(activeFilter.toLowerCase()));
        return matchSearch && matchFilter;
      })
    : (FALLBACK_SHOPS.filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q);
        const matchFilter = activeFilter === "All" || s.services.some((sv) => sv === activeFilter);
        return matchSearch && matchFilter;
      }).map((s) => ({ ...s, logo_url: null, is_verified: s.verified ?? null })) as Shop[]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Auto Repair | ZIVO — Book Trusted Mechanics Near You"
        description="Find and book trusted auto repair shops on ZIVO. Oil changes, brakes, tires, engine work, and more."
        canonical="/auto-repair"
      />

      {/* Desktop NavBar */}
      <div className="hidden md:block">
        <NavBar />
      </div>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/20 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors touch-manipulation">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Auto Repair</h1>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold mb-4 text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified mechanics · Transparent pricing
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-3 tracking-tight">
              Book Trusted <span className="text-primary">Auto Repair</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mb-8">
              Find certified mechanics near you. Fast estimates, real-time repair tracking, and guaranteed work.
            </p>
            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shop name or location…"
                className="pl-10 h-12 rounded-2xl bg-background/95 text-foreground border-0 shadow-xl"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
        {/* Service filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {SERVICE_FILTERS.map((f) => (
            <button type="button"
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "shrink-0 min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap touch-manipulation",
                activeFilter === f
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { step: "1", title: "Find a shop", desc: "Search verified mechanics near you" },
            { step: "2", title: "Get an estimate", desc: "Transparent pricing before you commit" },
            { step: "3", title: "Track repairs", desc: "Live status updates on your car" },
          ].map((item) => (
            <div key={item.step} className="bg-card border border-border/50 rounded-2xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mx-auto mb-2">{item.step}</div>
              <p className="text-xs font-bold text-foreground mb-1">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Shop count */}
        <p className="text-xs text-muted-foreground mb-4">
          {useLive ? `${displayShops.length} shop${displayShops.length !== 1 ? "s" : ""} near you` : "Explore top-rated shops"}
        </p>

        {/* Shops grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Wrench className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm font-semibold text-foreground">No shops found</p>
            <p className="text-xs text-muted-foreground">Try a different search or filter</p>
            <button type="button" onClick={() => { setSearch(""); setActiveFilter("All"); }} className="text-xs text-primary font-semibold">Clear filters</button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {displayShops.map((shop, i) => {
                const img = useLive
                  ? (optimizeAvatar((shop as any).banner_url || shop.logo_url, 500) || (shop as any).banner_url || shop.logo_url)
                  : (shop as any).banner_url;

                return (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                  >
                    <div
                      onClick={() => navigate(shop.slug ? `/store/${shop.slug}` : `/auto-repair`)}
                      className="group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99] cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                        {img ? (
	                          <img src={img} alt={shop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-slate-500/10 to-primary/5">
                            🔧
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity" />
                        {(shop.is_verified || (shop as any).verified) && (
                          <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-sm mb-1 truncate">{shop.name}</h3>
                        {shop.address && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> {shop.address}
                          </p>
                        )}
                        {Array.isArray((shop as any).services) && (shop as any).services.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(shop as any).services.slice(0, 3).map((sv: string) => (
                              <span key={sv} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{sv}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {shop.rating != null && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                              {Number(shop.rating).toFixed(1)}
                            </span>
                          )}
                          <span className="text-primary text-xs font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all ml-auto">
                            Book Now <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
