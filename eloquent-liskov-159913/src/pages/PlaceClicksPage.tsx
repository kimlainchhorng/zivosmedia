/**
 * PlaceClicksPage — Stores you've tapped on the map (recent browsing history).
 * Backed by `map_pin_clicks` (orphan) joined with `store_profiles`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles, Clock, Store, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ClickRow {
  id: string;
  store_id: string;
  user_id: string | null;
  source: string | null;
  created_at: string;
}

interface StoreRow {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string | null;
  is_verified: boolean | null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PlaceClicksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: clicks = [], isLoading } = useQuery({
    queryKey: ["map-pin-clicks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ClickRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ClickRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("map_pin_clicks")
        .select("id, store_id, user_id, source, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const storeIds = useMemo(() => Array.from(new Set(clicks.map((c) => c.store_id))), [clicks]);

  const { data: stores = [] } = useQuery({
    queryKey: ["map-pin-clicks-stores", storeIds.join(",")],
    queryFn: async () => {
      if (storeIds.length === 0) return [] as StoreRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: StoreRow[] | null }>;
          };
        };
      };
      const { data } = await sb.from("store_profiles").select("id, name, logo_url, slug, is_verified").in("id", storeIds);
      return data ?? [];
    },
    enabled: storeIds.length > 0,
    staleTime: 60_000,
  });

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  // Group by store, sort by recency
  const byStore = useMemo(() => {
    const groups = new Map<string, { store_id: string; clicks: number; lastAt: string; sources: Set<string> }>();
    clicks.forEach((c) => {
      const g = groups.get(c.store_id);
      if (g) {
        g.clicks += 1;
        if (c.created_at > g.lastAt) g.lastAt = c.created_at;
        if (c.source) g.sources.add(c.source);
      } else {
        groups.set(c.store_id, { store_id: c.store_id, clicks: 1, lastAt: c.created_at, sources: new Set(c.source ? [c.source] : []) });
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [clicks]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Place Clicks · ZIVO" description="Places you've tapped on the map." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Places Tapped</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Map history</p>
          <p className="text-3xl font-bold mt-1">{byStore.length} {byStore.length === 1 ? "place" : "places"}</p>
          <p className="text-sm text-white/80 mt-1">{clicks.length} total taps across stored pins</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && byStore.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No places yet</p>
            <p className="text-xs text-muted-foreground mb-4">Tap pins on the map to remember spots you're interested in.</p>
            <Button onClick={() => navigate("/nearby")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">
              Explore nearby
            </Button>
          </div>
        )}

        {!isLoading && byStore.length > 0 && (
          <div className="space-y-2">
            {byStore.map((g, idx) => {
              const s = storeMap.get(g.store_id);
              return (
                <motion.button
                  key={g.store_id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(s?.slug ? `/store/${s.slug}` : `/store-profile/${g.store_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="shrink-0 h-10 w-10 rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                    {s?.logo_url ? (
                      <img src={s.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Store className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{s?.name ?? "Store"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{g.clicks} tap{g.clicks === 1 ? "" : "s"}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(g.lastAt)}</span>
                      {g.sources.size > 0 && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{Array.from(g.sources).join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0")} />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
