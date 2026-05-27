/**
 * PromotePage — Boost reach for the creator's posts, reels, and stories.
 * Lists the user's own posts and offers tiered boost packages. Mock pricing
 * for v1 — a real payments flow can drop in without UI changes.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Sparkles, TrendingUp, Eye, Image as ImageIcon, Film, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserPostRow {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string;
  created_at: string | null;
}

interface BoostTier {
  id: "starter" | "growth" | "viral";
  name: string;
  price: number;
  duration: string;
  expectedReach: string;
  benefits: string[];
  highlight?: boolean;
}

const TIERS: BoostTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: 5,
    duration: "1 day",
    expectedReach: "500 - 2K",
    benefits: ["1-day audience boost", "Basic targeting"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 25,
    duration: "5 days",
    expectedReach: "5K - 20K",
    benefits: ["5-day boost", "Audience targeting", "Analytics report"],
    highlight: true,
  },
  {
    id: "viral",
    name: "Viral",
    price: 75,
    duration: "14 days",
    expectedReach: "25K - 100K",
    benefits: ["14-day boost", "Priority placement", "Detailed analytics", "Creator support"],
  },
];

function firstMediaUrl(post: UserPostRow): string | null {
  if (post.media_url) return post.media_url;
  if (post.media_urls && post.media_urls.length > 0) return post.media_urls[0];
  return null;
}

export default function PromotePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<BoostTier["id"]>("growth");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["promote-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as UserPostRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: UserPostRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("user_posts")
        .select("id, caption, media_url, media_urls, media_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const selectedPost = posts.find((p) => p.id === selectedPostId);
  const tier = TIERS.find((t) => t.id === selectedTier)!;

  const handleBoost = () => {
    if (!selectedPost) {
      toast.error("Pick a post to boost first.");
      return;
    }
    toast.success(`${tier.name} boost queued — billing rolls out in beta.`);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-32">
      <SEOHead title="Promote · ZIVO" description="Boost reach for your posts, reels, and stories." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Promote</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Reach more travelers</p>
            <p className="text-2xl font-bold leading-tight mt-1">Boost any post for as little as $5</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> Track every view</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Daily insights</span>
            </div>
          </div>
        </motion.div>

        {/* Step 1: pick a post */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-ig-gradient text-white text-xs font-bold">1</span>
            Pick a post
          </h2>

          {isLoading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && posts.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-ig-gradient flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground mb-4">Share a photo or video first, then come back to boost it.</p>
              <Button
                onClick={() => navigate("/feed/new")}
                className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
              >
                Share a post
              </Button>
            </div>
          )}

          {!isLoading && posts.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => {
                const url = firstMediaUrl(post);
                const isVideo = post.media_type?.startsWith("video");
                const isSelected = post.id === selectedPostId;
                return (
                  <motion.button
                    key={post.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedPostId(post.id)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 transition-all",
                      isSelected ? "ring-transparent" : "ring-border/0",
                    )}
                    aria-label={`Select post${post.caption ? `: ${post.caption.slice(0, 40)}` : ""}`}
                  >
                    {isSelected && <div className="absolute inset-0 bg-ig-gradient p-[3px] rounded-xl" aria-hidden />}
                    <div className="absolute inset-[3px] rounded-[9px] overflow-hidden bg-muted">
                      {url ? (
                        isVideo ? (
                          <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      {isVideo && <Film className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow-md" />}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3 text-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 2: pick a tier */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-ig-gradient text-white text-xs font-bold">2</span>
            Pick a boost
          </h2>
          <div className="space-y-2.5">
            {TIERS.map((t, idx) => {
              const isSelected = t.id === selectedTier;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelectedTier(t.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden",
                    isSelected
                      ? "border-transparent ring-2 ring-rose-500/30 bg-card shadow-md"
                      : "border-border bg-card hover:bg-secondary/30",
                  )}
                  aria-pressed={isSelected}
                >
                  {isSelected && <div className="absolute inset-0 bg-ig-gradient opacity-[0.04] pointer-events-none" />}
                  <div className="relative z-10 flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-ig-gradient text-white" : "bg-secondary text-foreground",
                    )}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-bold text-foreground">{t.name}</p>
                        {t.highlight && !isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ig-gradient">Most popular</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.duration} · Est. {t.expectedReach} views</p>
                      <ul className="mt-2 space-y-1">
                        {t.benefits.map((b) => (
                          <li key={b} className="text-xs text-foreground flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-ig-gradient" strokeWidth={3} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-foreground">${t.price}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Boost packages preview pricing. Payment processing rolls out in beta.
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border/60 pb-[var(--zivo-safe-bottom,0px)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">${tier.price}<span className="text-sm font-medium text-muted-foreground"> / {tier.duration}</span></p>
          </div>
          <Button
            onClick={handleBoost}
            disabled={!selectedPostId}
            className="bg-ig-gradient text-white font-bold rounded-full h-11 px-6 hover:opacity-90 border-0 shadow-md disabled:opacity-40"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Boost post
          </Button>
        </div>
      </div>
    </SwipeBackContainer>
  );
}
