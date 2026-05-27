/**
 * ReactionPacksPage — Browse reaction emoji packs.
 * Backed by the real `reaction_packs` table (creator-driven catalog).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Download, Lock, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PackRow {
  id: string;
  name: string;
  preview_url: string | null;
  is_premium: boolean | null;
  price_cents: number | null;
  download_count: number | null;
  creator_id: string | null;
  is_active: boolean | null;
}

function formatPrice(cents: number | null, premium: boolean): string {
  if (!premium) return "Free";
  if (!cents) return "Premium";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function ReactionPacksPage() {
  const navigate = useNavigate();
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("zivo:reaction-packs:installed:v1");
      const arr: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.filter((v): v is string => typeof v === "string") : []);
    } catch { return new Set(); }
  });

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ["reaction-packs"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PackRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("reaction_packs")
        .select("id, name, preview_url, is_premium, price_cents, download_count, creator_id, is_active")
        .eq("is_active", true)
        .order("download_count", { ascending: false });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const install = (p: PackRow) => {
    if (p.is_premium) {
      toast.info(`Premium pack · ${formatPrice(p.price_cents, true)} — checkout flow rolls out in beta`);
      return;
    }
    const next = new Set(installedIds);
    next.add(p.id);
    setInstalledIds(next);
    try { localStorage.setItem("zivo:reaction-packs:installed:v1", JSON.stringify(Array.from(next))); } catch { /* private mode */ }
    toast.success(`${p.name} installed`);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Reaction Packs · ZIVO" description="Express yourself with reaction emoji packs." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Reaction Packs</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Installed</p>
          <p className="text-3xl font-bold mt-1">{installedIds.size} {installedIds.size === 1 ? "pack" : "packs"}</p>
          <p className="text-sm text-white/80 mt-1">{packs.length} in the catalog</p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && packs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No packs yet</p>
            <p className="text-xs text-muted-foreground">Reaction packs will publish here.</p>
          </div>
        )}

        {!isLoading && packs.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {packs.map((p, idx) => {
              const installed = installedIds.has(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                >
                  <div className="relative aspect-square bg-muted">
                    {p.preview_url ? (
                      <img src={p.preview_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient flex items-center justify-center text-5xl">
                        ❤️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                    {p.is_premium && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-ig-gradient text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm">
                        <Lock className="h-2.5 w-2.5" /> Premium
                      </span>
                    )}
                    {p.download_count != null && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> {formatCount(p.download_count)}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatPrice(p.price_cents, !!p.is_premium)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={installed && !p.is_premium}
                      onClick={() => install(p)}
                      className={cn(
                        "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all",
                        installed && !p.is_premium
                          ? "bg-secondary text-foreground"
                          : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
                      )}
                    >
                      {installed && !p.is_premium ? "Added" : <><Download className="h-2.5 w-2.5" />Get</>}
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
