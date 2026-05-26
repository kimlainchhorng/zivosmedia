/**
 * LiveLocationsPage — Active live-location shares you have running.
 * Backed by `live_locations` (orphan). RLS: user manages own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles, Users, Clock, Square, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocationRow {
  id: string;
  user_id: string;
  chat_kind: "direct" | "group";
  chat_key: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  expires_at: string;
  updated_at: string;
}

function formatRemaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  if (ms < 60_000) return "< 1m";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m left`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export default function LiveLocationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["live-locations-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LocationRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: LocationRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("live_locations")
        .select("id, user_id, chat_kind, chat_key, latitude, longitude, accuracy_m, expires_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const active = shares.filter((s) => new Date(s.expires_at).getTime() > now);
    return {
      total: shares.length,
      active: active.length,
      groups: active.filter((s) => s.chat_kind === "group").length,
      directs: active.filter((s) => s.chat_kind === "direct").length,
    };
  }, [shares]);

  const stopShare = async (id: string) => {
    qc.setQueryData<LocationRow[]>(["live-locations-me", user?.id], (old) => (old ?? []).filter((s) => s.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("live_locations").delete().eq("id", id);
    if (error) { toast.error("Couldn't stop"); qc.invalidateQueries({ queryKey: ["live-locations-me", user?.id] }); }
    else toast.success("Stopped sharing");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Live Locations · ZIVO" description="Active live-location shares." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Live Locations</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Sharing</p>
          <p className="text-3xl font-bold mt-1">{stats.active} active</p>
          <p className="text-sm text-white/80 mt-1">{stats.directs} direct chats · {stats.groups} groups</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && shares.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Not sharing anywhere</p>
            <p className="text-xs text-muted-foreground">Share your live location from a chat's attachment menu to start.</p>
          </div>
        )}

        {!isLoading && shares.length > 0 && (
          <div className="space-y-2">
            {shares.map((s, idx) => {
              const expired = new Date(s.expires_at).getTime() < Date.now();
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className={cn("flex items-start gap-3 p-3 rounded-2xl bg-card border", expired ? "border-border opacity-60" : "border-emerald-500/30 bg-emerald-500/[0.02]")}
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", expired ? "bg-secondary" : "bg-emerald-500/15")}>
                    {s.chat_kind === "group" ? <Users className={cn("h-4 w-4", expired ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")} /> : <MapPin className={cn("h-4 w-4", expired ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground capitalize">{s.chat_kind} chat</p>
                      {!expired && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>}
                      {expired && <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Expired</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}{s.accuracy_m && ` · ±${Math.round(Number(s.accuracy_m))}m`}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Hash className="h-2.5 w-2.5" /> {s.chat_key.slice(0, 10)}…</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {expired ? formatRelative(s.expires_at) : formatRemaining(s.expires_at)}</span>
                    </div>
                  </div>
                  {!expired && (
                    <button
                      type="button"
                      aria-label="Stop sharing"
                      onClick={() => stopShare(s.id)}
                      className="shrink-0 h-9 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Square className="h-3 w-3" fill="currentColor" /> Stop
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
