/**
 * MarketplaceHubPage — /marketplace-hub
 * Browse peer-to-peer item listings, or list your own.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MarketplaceListingCard, { type ListingData } from "@/components/marketplace/MarketplaceListingCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import PackagePlus from "lucide-react/dist/esm/icons/package-plus";
import MessagesSquare from "lucide-react/dist/esm/icons/messages-square";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const STEPS = [
  { icon: PackagePlus, title: "List it free", desc: "Snap a photo, set a price, post in seconds" },
  { icon: MessagesSquare, title: "Chat to arrange", desc: "Buyers message you right inside ZIVO" },
  { icon: ShieldCheck, title: "Meet & deal safely", desc: "Meet locally and complete the sale" },
];

const labelOf = (c: string) => c.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

export default function MarketplaceHubPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingData[] | null>(null);
  const [cond, setCond] = useState<string>("all");
  const listingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("marketplace_listings") as { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: ListingData[] | null }> } } } })
        .select("id, title, price_cents, currency, condition, images, location, status")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) setListings((data as ListingData[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const conditions = useMemo(
    () => [...new Set((listings || []).map((l) => l.condition).filter(Boolean))] as string[],
    [listings],
  );
  const shown = useMemo(
    () => (cond === "all" ? (listings || []) : (listings || []).filter((l) => l.condition === cond)),
    [listings, cond],
  );

  const scrollTo = (ref: RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-safe-header pb-24">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-background to-orange-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl py-8 sm:py-10"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-border text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
                Buy &amp; sell locally
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                <span className="text-ig-gradient">Marketplace</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">
                Find great deals near you, or turn what you don't need into cash. Free to list.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/marketplace-hub/create")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-lg shadow-black/10 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="w-4 h-4" /> Sell an item
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(listingsRef)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse listings <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── How selling works ── */}
        <section className="container mx-auto px-4 pt-2 pb-10 sm:pb-14">
          <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
            <h2 className="text-base font-bold mb-6 text-center">How selling works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center text-fuchsia-500">
                    <step.icon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ig-gradient text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-[14rem]">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Listings ── */}
        <section ref={listingsRef} className="container mx-auto px-4 scroll-mt-28">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">
              Listings{listings && listings.length > 0 ? ` (${listings.length})` : ""}
            </h2>
          </div>

          {/* Condition filter — only shown when there are real conditions to filter by */}
          {listings && listings.length > 0 && conditions.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["all", ...conditions].map((c) => {
                const active = cond === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCond(c)}
                    aria-pressed={active}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "bg-ig-gradient text-white border-transparent" : "bg-background border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {c === "all" ? "All" : labelOf(c)}
                  </button>
                );
              })}
            </div>
          )}

          {listings == null ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : listings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center mb-4 text-fuchsia-500">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-1">No active listings yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Be the first to sell in your area — listing an item is free and takes under a minute.
              </p>
              <button
                type="button"
                onClick={() => navigate("/marketplace-hub/create")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Plus className="w-4 h-4" /> Sell an item
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shown.map((l) => <MarketplaceListingCard key={l.id} listing={l} onTap={(id) => navigate(`/marketplace?listing=${id}`)} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
