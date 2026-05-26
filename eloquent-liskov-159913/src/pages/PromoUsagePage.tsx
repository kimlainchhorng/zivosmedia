/**
 * PromoUsagePage — Promo codes you've redeemed and the discounts you got.
 * Backed by `promotion_usage` (orphan, FK → promotions).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ticket, Sparkles, Clock, DollarSign, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UsageRow {
  id: string;
  promotion_id: string;
  user_id: string;
  trip_id: string | null;
  food_order_id: string | null;
  discount_applied: number | null;
  created_at: string;
}

interface PromoRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: string | null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PromoUsagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: usage = [], isLoading } = useQuery({
    queryKey: ["promotion-usage", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as UsageRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: UsageRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("promotion_usage")
        .select("id, promotion_id, user_id, trip_id, food_order_id, discount_applied, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const promoIds = useMemo(() => Array.from(new Set(usage.map((u) => u.promotion_id))), [usage]);

  const { data: promos = [] } = useQuery({
    queryKey: ["promotion-usage-promos", promoIds.join(",")],
    queryFn: async () => {
      if (promoIds.length === 0) return [] as PromoRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: PromoRow[] | null }>;
          };
        };
      };
      const { data } = await sb.from("promotions").select("id, code, name, description, discount_type").in("id", promoIds);
      return data ?? [];
    },
    enabled: promoIds.length > 0,
    staleTime: 60_000,
  });

  const promoMap = useMemo(() => new Map(promos.map((p) => [p.id, p])), [promos]);

  const totals = useMemo(() => ({
    count: usage.length,
    saved: usage.reduce((s, u) => s + Number(u.discount_applied ?? 0), 0),
  }), [usage]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Promo Usage · ZIVO" description="Promo codes you've redeemed." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Ticket className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Promo Usage</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Total saved</p>
          <p className="text-4xl font-extrabold mt-1">${totals.saved.toFixed(2)}</p>
          <p className="text-sm text-white/80 mt-1">{totals.count} {totals.count === 1 ? "code" : "codes"} redeemed</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>
        )}

        {!isLoading && usage.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Ticket className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No promos redeemed yet</p>
            <p className="text-xs text-muted-foreground">Codes you apply at checkout for rides, food, or services will appear here.</p>
          </div>
        )}

        {!isLoading && usage.length > 0 && (
          <div className="space-y-2">
            {usage.map((u, idx) => {
              const promo = promoMap.get(u.promotion_id);
              const target = u.trip_id ? "Trip" : u.food_order_id ? "Food order" : "Order";
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center">
                    <Ticket className="h-4 w-4 text-ig-gradient" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{promo?.name ?? "Promo"}</p>
                      {promo?.code && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider bg-secondary text-foreground px-1.5 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" /> {promo.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{target}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(u.created_at)}</span>
                    </div>
                    {promo?.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{promo.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-ig-gradient inline-flex items-center gap-0.5">
                      <DollarSign className="h-3 w-3" />{Number(u.discount_applied ?? 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">saved</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
