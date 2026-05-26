/**
 * FavoritesPage — Saved hotels, flights, cars, activities.
 * Backed by `user_favorites` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Sparkles, Plane, Building2, Car, Activity, ArrowRight, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ItemType = "hotel" | "activity" | "flight_route" | "car" | "transfer";
type Tab = "all" | ItemType;

interface FavRow {
  id: string;
  user_id: string;
  item_type: ItemType;
  item_id: string;
  item_data: Record<string, unknown>;
  created_at?: string;
}

const TYPE_META: Record<ItemType, { label: string; icon: typeof Plane; tone: string; bg: string }> = {
  hotel:        { label: "Hotel",   icon: Building2, tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15"    },
  activity:     { label: "Activity",icon: Activity,  tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
  flight_route: { label: "Flight",  icon: Plane,     tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15"    },
  car:          { label: "Car",     icon: Car,       tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15"   },
  transfer:     { label: "Transfer",icon: ArrowRight,tone: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-500/15"  },
};

function getName(data: Record<string, unknown>, fallback: string): string {
  return (data?.name as string) || (data?.title as string) || fallback;
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data: favs = [], isLoading } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as FavRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => Promise<{ data: FavRow[] | null }>;
          };
        };
      };
      const { data } = await sb.from("user_favorites").select("id, user_id, item_type, item_id, item_data, created_at").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    favs.forEach((f) => { c[f.item_type] = (c[f.item_type] ?? 0) + 1; });
    return c;
  }, [favs]);

  const filtered = useMemo(() => tab === "all" ? favs : favs.filter((f) => f.item_type === tab), [favs, tab]);

  const remove = async (id: string) => {
    qc.setQueryData<FavRow[]>(["user-favorites", user?.id], (old) => (old ?? []).filter((f) => f.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("user_favorites").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["user-favorites", user?.id] }); }
    else toast.success("Removed");
  };

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",          label: "All",      count: favs.length },
    { id: "hotel",        label: "Hotels",   count: counts.hotel ?? 0 },
    { id: "flight_route", label: "Flights",  count: counts.flight_route ?? 0 },
    { id: "activity",     label: "Activity", count: counts.activity ?? 0 },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Favorites · ZIVO" description="Your saved hotels and trips." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Favorites</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Saved</p>
          <p className="text-3xl font-bold mt-1">{favs.length} {favs.length === 1 ? "item" : "items"}</p>
          <p className="text-sm text-white/80 mt-1">Hotels, flights, cars, and activities you've ♥</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No favorites yet</p>
            <p className="text-xs text-muted-foreground">Tap the heart on any hotel, flight, or activity to save it here.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((f, idx) => {
              const meta = TYPE_META[f.item_type] ?? TYPE_META.hotel;
              const Icon = meta.icon;
              const name = getName(f.item_data, "Item");
              const image = (f.item_data?.image as string) || (f.item_data?.cover as string) || (f.item_data?.thumbnail as string);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted">
                    {image ? <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className={cn("w-full h-full flex items-center justify-center", meta.bg)}><Icon className={cn("h-5 w-5", meta.tone)} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize", meta.bg, meta.tone)}>{meta.label}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{name}</p>
                    {f.created_at && <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> saved {new Date(f.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>}
                  </div>
                  <button type="button" aria-label="Remove" onClick={() => remove(f.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
