/**
 * RestaurantReviewDetailsPage — Your restaurant reviews with food/service/atmosphere/value ratings.
 * Backed by `reviews` filtered service_type='restaurant' joined w/ `restaurant_reviews`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UtensilsCrossed, Sparkles, Star, ThumbsUp, ThumbsDown, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ReviewRow {
  id: string;
  reviewer_id: string;
  service_type: string;
  service_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  helpful_count: number;
  unhelpful_count: number;
  verified_purchase: boolean;
  status: string;
  created_at: string;
}

interface RestaurantReviewExtra {
  review_id: string;
  food_rating: number | null;
  service_rating: number | null;
  atmosphere_rating: number | null;
  value_rating: number | null;
  would_recommend: boolean | null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StarsInline({ value, size = 3 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("fill-current", n <= value ? "text-amber-500" : "text-muted-foreground/30")} style={{ height: size * 4, width: size * 4 }} />
      ))}
    </div>
  );
}

export default function RestaurantReviewDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["my-restaurant-reviews", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ReviewRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: ReviewRow[] | null }> } } } } };
      const { data } = await sb.from("reviews").select("id, reviewer_id, service_type, service_id, rating, title, body, helpful_count, unhelpful_count, verified_purchase, status, created_at").eq("reviewer_id", user.id).eq("service_type", "restaurant").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const reviewIds = useMemo(() => reviews.map((r) => r.id), [reviews]);

  const { data: extras = [] } = useQuery({
    queryKey: ["restaurant-review-extras", reviewIds.join(",")],
    queryFn: async () => {
      if (reviewIds.length === 0) return [] as RestaurantReviewExtra[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: RestaurantReviewExtra[] | null }> } } };
      const { data } = await sb.from("restaurant_reviews").select("review_id, food_rating, service_rating, atmosphere_rating, value_rating, would_recommend").in("review_id", reviewIds);
      return data ?? [];
    },
    enabled: reviewIds.length > 0,
    staleTime: 60_000,
  });

  const extraMap = useMemo(() => new Map(extras.map((e) => [e.review_id, e])), [extras]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const recommended = reviews.filter((r) => extraMap.get(r.id)?.would_recommend).length;
    return { total, avg, recommended };
  }, [reviews, extraMap]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Restaurant Reviews · ZIVO" description="Your restaurant reviews with details." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><UtensilsCrossed className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Restaurant Reviews</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your reviews</p>
          <p className="text-3xl font-bold mt-1">{stats.total} · avg {stats.avg.toFixed(1)} ★</p>
          <p className="text-sm text-white/80 mt-1">{stats.recommended} restaurants you'd recommend</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && reviews.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><UtensilsCrossed className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No restaurant reviews</p>
            <p className="text-xs text-muted-foreground">Try a restaurant, then leave a review with food/service/atmosphere/value ratings.</p>
          </div>
        )}
        {!isLoading && reviews.length > 0 && (
          <div className="space-y-2">
            {reviews.map((r, idx) => {
              const x = extraMap.get(r.id);
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.03 }} className="rounded-2xl bg-card border border-border p-3.5">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <StarsInline value={r.rating} size={3} />
                    {r.verified_purchase && <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="h-2.5 w-2.5" />Verified</span>}
                  </div>
                  {r.title && <p className="text-sm font-bold text-foreground line-clamp-1">{r.title}</p>}
                  {r.body && <p className="text-xs text-foreground/85 line-clamp-3 mt-0.5">{r.body}</p>}
                  {x && (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                      {x.food_rating != null && <div className="flex items-center justify-between"><span className="text-muted-foreground">Food</span><span className="font-bold text-foreground">{x.food_rating}/5</span></div>}
                      {x.service_rating != null && <div className="flex items-center justify-between"><span className="text-muted-foreground">Service</span><span className="font-bold text-foreground">{x.service_rating}/5</span></div>}
                      {x.atmosphere_rating != null && <div className="flex items-center justify-between"><span className="text-muted-foreground">Atmosphere</span><span className="font-bold text-foreground">{x.atmosphere_rating}/5</span></div>}
                      {x.value_rating != null && <div className="flex items-center justify-between"><span className="text-muted-foreground">Value</span><span className="font-bold text-foreground">{x.value_rating}/5</span></div>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(r.created_at)}</span>
                    {r.helpful_count > 0 && <><span>·</span><span className="inline-flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" /> {r.helpful_count}</span></>}
                    {r.unhelpful_count > 0 && <><span>·</span><span className="inline-flex items-center gap-0.5"><ThumbsDown className="h-2.5 w-2.5" /> {r.unhelpful_count}</span></>}
                    {x?.would_recommend && (<><span>·</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Recommends</span></>)}
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
