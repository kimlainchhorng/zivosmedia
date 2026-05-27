/**
 * RecentlyViewedPage — Recently viewed travel items (hotels, flights, etc.).
 * Backed by `user_recently_viewed` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Sparkles, Plane, Building2, Car, Activity, ArrowRight, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ItemType = "hotel" | "activity" | "flight" | "car" | "transfer";
type Tab = "all" | ItemType;

interface ViewRow {
  id: string;
  user_id: string;
  item_type: ItemType;
  item_id: string;
  item_data: Record<string, unknown>;
  viewed_at: string;
}

const TYPE_META: Record<ItemType, { label: string; icon: typeof Plane; tone: string; bg: string }> = {
  hotel:    { label: "Hotel",    icon: Building2, tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15"    },
  flight:   { label: "Flight",   icon: Plane,     tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15"    },
  activity: { label: "Activity", icon: Activity,  tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
  car:      { label: "Car",      icon: Car,       tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15"   },
  transfer: { label: "Transfer", icon: ArrowRight,tone: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-500/15"  },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RecentlyViewedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["user-recently-viewed", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ViewRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ViewRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb.from("user_recently_viewed").select("id, user_id, item_type, item_id, item_data, viewed_at").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(120);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    views.forEach((v) => { c[v.item_type] = (c[v.item_type] ?? 0) + 1; });
    return c;
  }, [views]);

  const filtered = useMemo(() => tab === "all" ? views : views.filter((v) => v.item_type === tab), [views, tab]);

  const remove = async (id: string) => {
    qc.setQueryData<ViewRow[]>(["user-recently-viewed", user?.id], (old) => (old ?? []).filter((v) => v.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("user_recently_viewed").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["user-recently-viewed", user?.id] }); }
  };

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",      label: "All",      count: views.length },
    { id: "hotel",    label: "Hotels",   count: counts.hotel ?? 0 },
    { id: "flight",   label: "Flights",  count: counts.flight ?? 0 },
    { id: "activity", label: "Activity", count: counts.activity ?? 0 },
    { id: "car",      label: "Cars",     count: counts.car ?? 0 },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Recently Viewed · ZIVO" description="Your travel browsing history." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <History className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Recently Viewed</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">History</p>
          <p className="text-3xl font-bold mt-1">{views.length} viewed</p>
          <p className="text-sm text-white/80 mt-1">Tap a tab to filter · long-press to remove</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <History className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Nothing viewed yet</p>
            <p className="text-xs text-muted-foreground">Items you tap on hotel, flight, and activity searches will appear here.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((v, idx) => {
              const meta = TYPE_META[v.item_type] ?? TYPE_META.hotel;
              const Icon = meta.icon;
              const name = (v.item_data?.name as string) || (v.item_data?.title as string) || "Item";
              const image = (v.item_data?.image as string) || (v.item_data?.cover as string);
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.015 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-muted">
                    {image ? <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className={cn("w-full h-full flex items-center justify-center", meta.bg)}><Icon className={cn("h-4 w-4", meta.tone)} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize", meta.bg, meta.tone)}>{meta.label}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{name}</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(v.viewed_at)}</p>
                  </div>
                  <button type="button" aria-label="Remove" onClick={() => remove(v.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors">
                    <X className="h-3.5 w-3.5" />
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
