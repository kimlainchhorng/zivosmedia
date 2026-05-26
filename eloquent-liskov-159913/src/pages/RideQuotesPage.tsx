/**
 * RideQuotesPage — Recent ride price quotes you've requested.
 * Backed by `ride_quotes` (orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Car, Sparkles, Clock, MapPin, ArrowRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QuoteRow {
  id: string;
  user_id: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  ride_type: string | null;
  miles: number | null;
  minutes: number | null;
  subtotal: number | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCoord(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export default function RideQuotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["ride-quotes-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as QuoteRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: QuoteRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("ride_quotes")
        .select("id, user_id, pickup_lat, pickup_lng, dest_lat, dest_lng, ride_type, miles, minutes, subtotal, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: quotes.length,
    avg: quotes.length > 0 ? quotes.reduce((s, q) => s + Number(q.subtotal ?? 0), 0) / quotes.length : 0,
    miles: quotes.reduce((s, q) => s + Number(q.miles ?? 0), 0),
  }), [quotes]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Ride Quotes · ZIVO" description="Your ride price quotes." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Ride Quotes</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Quotes</p>
          <p className="text-3xl font-bold mt-1">{stats.total} requested</p>
          <p className="text-sm text-white/80 mt-1">Avg ${stats.avg.toFixed(2)} · {stats.miles.toFixed(0)} mi quoted</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && quotes.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Car className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No quotes yet</p>
            <p className="text-xs text-muted-foreground mb-4">Get a ride estimate to see fare ranges before booking.</p>
            <Button onClick={() => navigate("/ride")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">
              Get a ride
            </Button>
          </div>
        )}

        {!isLoading && quotes.length > 0 && (
          <div className="space-y-2">
            {quotes.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 12) * 0.02 }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border"
              >
                <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center">
                  <Car className="h-4 w-4 text-ig-gradient" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-foreground capitalize">{q.ride_type ?? "Ride"}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="font-mono">{formatCoord(q.pickup_lat, q.pickup_lng)}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span className="font-mono">{formatCoord(q.dest_lat, q.dest_lng)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    {typeof q.miles === "number" && <span>{q.miles.toFixed(1)} mi</span>}
                    {typeof q.minutes === "number" && <><span>·</span><span>{Math.round(q.minutes)} min</span></>}
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(q.created_at)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-ig-gradient inline-flex items-center gap-0.5">
                    <DollarSign className="h-3 w-3" />{Number(q.subtotal ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">quote</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
