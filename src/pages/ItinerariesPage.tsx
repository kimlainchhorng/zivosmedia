/**
 * ItinerariesPage — Travel itineraries with flight/hotel/car/activity items.
 * Backed by `trip_itineraries` + `trip_items` (both orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles, Calendar, Plane, Hotel, Car, Sparkles as Activity, FileText, ChevronDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ItineraryRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
}

type ItemType = "flight" | "hotel" | "car" | "activity" | "note";
type Status = "planned" | "booked" | "confirmed" | "cancelled";

interface ItemRow {
  id: string;
  itinerary_id: string;
  item_type: ItemType;
  title: string;
  start_datetime: string | null;
  end_datetime: string | null;
  location: string | null;
  estimated_cost_cents: number | null;
  currency: string;
  status: Status;
}

const TYPE_META: Record<ItemType, { icon: typeof Plane; tone: string; bg: string }> = {
  flight:   { icon: Plane,    tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15" },
  hotel:    { icon: Hotel,    tone: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-500/15" },
  car:      { icon: Car,      tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
  activity: { icon: Activity, tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15" },
  note:     { icon: FileText, tone: "text-muted-foreground",                  bg: "bg-secondary" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ItinerariesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ["trip-itineraries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ItineraryRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: ItineraryRow[] | null }> } } } };
      const { data } = await sb.from("trip_itineraries").select("id, user_id, title, description, destination, start_date, end_date, cover_image_url").eq("user_id", user.id).order("start_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const itineraryIds = useMemo(() => Array.from(expanded), [expanded]);

  const { data: items = [] } = useQuery({
    queryKey: ["trip-items", itineraryIds.join(",")],
    queryFn: async () => {
      if (itineraryIds.length === 0) return [] as ItemRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: ItemRow[] | null }> } } } };
      const { data } = await sb.from("trip_items").select("id, itinerary_id, item_type, title, start_datetime, end_datetime, location, estimated_cost_cents, currency, status").in("itinerary_id", itineraryIds).order("start_datetime", { ascending: true });
      return data ?? [];
    },
    enabled: itineraryIds.length > 0,
    staleTime: 30_000,
  });

  const itemsByItinerary = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    items.forEach((i) => { const arr = m.get(i.itinerary_id) ?? []; arr.push(i); m.set(i.itinerary_id, arr); });
    return m;
  }, [items]);

  const toggle = (id: string) => {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Itineraries · ZIVO" description="Your travel itineraries." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><MapPin className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Itineraries</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Travel plans</p>
          <p className="text-3xl font-bold mt-1">{itineraries.length}</p>
          <p className="text-sm text-white/80 mt-1">All your trips with flights, hotels, cars, activities</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && itineraries.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><MapPin className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No itineraries yet</p>
            <p className="text-xs text-muted-foreground">Plan your next trip — flights, hotels, cars, and activities all in one place.</p>
          </div>
        )}
        {!isLoading && itineraries.length > 0 && (
          <div className="space-y-2">
            {itineraries.map((it, idx) => {
              const isOpen = expanded.has(it.id);
              const tripItems = itemsByItinerary.get(it.id) ?? [];
              return (
                <motion.div key={it.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.03 }} className="rounded-2xl bg-card border border-border overflow-hidden">
                  <button type="button" onClick={() => toggle(it.id)} className="w-full text-left flex items-start gap-3 p-3.5 hover:bg-secondary/40 transition-colors">
                    {it.cover_image_url ? <img src={it.cover_image_url} alt="" className="shrink-0 h-14 w-14 rounded-xl object-cover" loading="lazy" /> : <div className="shrink-0 h-14 w-14 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-ig-gradient" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{it.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {it.destination && <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {it.destination}</span>}
                        {(it.start_date || it.end_date) && (<><span>·</span><span className="inline-flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {formatDate(it.start_date)} – {formatDate(it.end_date)}</span></>)}
                      </div>
                      {it.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{it.description}</p>}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform mt-2", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-border/60">
                        <div className="p-3 space-y-1.5">
                          {tripItems.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-2">No items added yet</p> :
                            tripItems.map((tt) => {
                              const meta = TYPE_META[tt.item_type] ?? TYPE_META.note;
                              const Icon = meta.icon;
                              return (
                                <div key={tt.id} className="flex items-start gap-2 p-2 rounded-xl bg-secondary/40">
                                  <div className={cn("shrink-0 h-8 w-8 rounded-lg flex items-center justify-center", meta.bg)}><Icon className={cn("h-3.5 w-3.5", meta.tone)} /></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground line-clamp-1">{tt.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                                      {tt.start_datetime && <span>{formatDate(tt.start_datetime)}</span>}
                                      {tt.location && (<><span>·</span><span className="line-clamp-1">{tt.location}</span></>)}
                                      <span>·</span>
                                      <span className="capitalize">{tt.status}</span>
                                    </div>
                                  </div>
                                  {(tt.estimated_cost_cents ?? 0) > 0 && (
                                    <span className="text-xs font-bold text-ig-gradient inline-flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" />{((tt.estimated_cost_cents ?? 0) / 100).toFixed(0)}</span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
