/**
 * AffiliateLinksPage — Your link-in-bio affiliate dashboard.
 * Backed by the real `affiliate_links` table (orphan, per-user via owner_id).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, Copy, ExternalLink, TrendingUp, DollarSign, MousePointerClick, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LinkRow {
  id: string;
  slug: string;
  target_url: string;
  category: string | null;
  click_count: number;
  conversion_count: number;
  earnings_cents: number;
  created_at: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function publicLinkFor(slug: string): string {
  if (typeof window === "undefined") return `https://hizivo.com/r/${slug}`;
  return `${window.location.origin}/r/${slug}`;
}

export default function AffiliateLinksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["affiliate-links", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LinkRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: LinkRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("affiliate_links")
        .select("id, slug, target_url, category, click_count, conversion_count, earnings_cents, created_at")
        .eq("owner_id", user.id)
        .order("earnings_cents", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    links.forEach((l) => { if (l.category) set.add(l.category); });
    return Array.from(set);
  }, [links]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return links;
    return links.filter((l) => l.category === activeCategory);
  }, [links, activeCategory]);

  const totals = useMemo(() => {
    return links.reduce(
      (acc, l) => ({
        clicks: acc.clicks + (l.click_count ?? 0),
        conversions: acc.conversions + (l.conversion_count ?? 0),
        earnings: acc.earnings + (l.earnings_cents ?? 0),
      }),
      { clicks: 0, conversions: 0, earnings: 0 },
    );
  }, [links]);

  const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicLinkFor(slug));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Affiliate Links · ZIVO" description="Track your link earnings." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Link2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Affiliate Links</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Earnings banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Earnings</p>
          <p className="text-4xl font-extrabold leading-tight mt-1">{formatCents(totals.earnings)}</p>
          <p className="text-sm text-white/80 mt-1">
            from {formatCount(totals.clicks)} click{totals.clicks === 1 ? "" : "s"} · {formatCount(totals.conversions)} conversion{totals.conversions === 1 ? "" : "s"}
          </p>
        </motion.div>

        {/* 3-stat split */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <MousePointerClick className="h-3 w-3 text-ig-gradient" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clicks</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{formatCount(totals.clicks)}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <Target className="h-3 w-3 text-ig-gradient" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Convert</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{conversionRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="h-3 w-3 text-ig-gradient" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Links</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{links.length}</p>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && links.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Link2 className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No affiliate links yet</p>
            <p className="text-xs text-muted-foreground">Become a partner and earn from links you share in posts, bio, and DMs.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((l, idx) => {
              const cr = l.click_count > 0 ? (l.conversion_count / l.click_count) * 100 : 0;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient flex items-center justify-center">
                      <Link2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">/r/{l.slug}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{l.target_url}</p>
                      {l.category && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                          {l.category}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-ig-gradient">{formatCents(l.earnings_cents)}</p>
                      <p className="text-[10px] text-muted-foreground">earnings</p>
                    </div>
                  </div>
                  {/* Stat split row */}
                  <div className="flex items-center gap-1 mt-3 text-[11px]">
                    <div className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/40 flex items-center justify-between">
                      <span className="text-muted-foreground inline-flex items-center gap-0.5">
                        <MousePointerClick className="h-2.5 w-2.5" /> clicks
                      </span>
                      <span className="font-bold text-foreground">{formatCount(l.click_count)}</span>
                    </div>
                    <div className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/40 flex items-center justify-between">
                      <span className="text-muted-foreground inline-flex items-center gap-0.5">
                        <Target className="h-2.5 w-2.5" /> rate
                      </span>
                      <span className="font-bold text-foreground">{cr.toFixed(1)}%</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => copyLink(l.slug)}
                      className="flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(l.target_url, "_blank", "noopener,noreferrer")}
                      className="flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </button>
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
