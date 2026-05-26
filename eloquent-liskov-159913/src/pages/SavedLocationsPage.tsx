/**
 * SavedLocationsPage — Saved pickup/destination locations.
 * Backed by `saved_locations` (orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles, Home, Briefcase, Star, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocRow {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function iconForLabel(icon: string | null, label: string): { Icon: typeof Home; tone: string; bg: string } {
  const key = (icon ?? "").toLowerCase();
  const l = label.toLowerCase();
  if (key === "home" || l === "home") return { Icon: Home, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" };
  if (key === "work" || l === "work") return { Icon: Briefcase, tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15" };
  if (key === "star") return { Icon: Star, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" };
  return { Icon: MapPin, tone: "text-ig-gradient", bg: "bg-ig-gradient/10" };
}

export default function SavedLocationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["saved-locations-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LocRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: LocRow[] | null }> } } } };
      const { data } = await sb.from("saved_locations").select("id, user_id, label, address, lat, lng, icon, created_at, updated_at").eq("user_id", user.id).order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const remove = async (id: string) => {
    qc.setQueryData<LocRow[]>(["saved-locations-me", user?.id], (old) => (old ?? []).filter((l) => l.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("saved_locations").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["saved-locations-me", user?.id] }); } else toast.success("Removed");
  };

  const home = useMemo(() => locations.find((l) => l.label.toLowerCase() === "home" || l.icon === "home"), [locations]);
  const work = useMemo(() => locations.find((l) => l.label.toLowerCase() === "work" || l.icon === "work"), [locations]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Saved Locations · ZIVO" description="Your saved addresses." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><MapPin className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Saved Locations</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Pinned</p>
          <p className="text-3xl font-bold mt-1">{locations.length} {locations.length === 1 ? "place" : "places"}</p>
          <p className="text-sm text-white/80 mt-1">{home && "Home set · "}{work && "Work set"}</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && locations.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><MapPin className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No saved locations</p>
            <p className="text-xs text-muted-foreground">Save your home and work for faster ride bookings.</p>
          </div>
        )}
        {!isLoading && locations.length > 0 && (
          <div className="space-y-2">
            {locations.map((l, idx) => {
              const { Icon, tone, bg } = iconForLabel(l.icon, l.label);
              return (
                <motion.div key={l.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", bg)}><Icon className={cn("h-4 w-4", tone)} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1 capitalize">{l.label}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{l.address}</p>
                  </div>
                  <button type="button" aria-label="Remove" onClick={() => remove(l.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
