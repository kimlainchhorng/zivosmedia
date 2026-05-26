/**
 * StorePromoCodesPage — Active store promo codes you can use.
 * Backed by `marketing_promo_codes` (orphan, public SELECT).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Tag, Sparkles, Clock, Copy, Store, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PromoRow {
  id: string;
  store_id: string;
  code: string;
  type: string;
  value: number;
  min_order_cents: number;
  max_redemptions: number | null;
  per_customer_limit: number;
  redemption_count: number;
  is_active?: boolean;
  ends_at?: string | null;
  created_at?: string;
}

interface StoreRow { id: string; name: string; logo_url: string | null; slug: string | null; }

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "ended";
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d left`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StorePromoCodesPage() {
  const navigate = useNavigate();
  const [justCopied, setJustCopied] = useState<string | null>(null);

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["store-promo-codes"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: PromoRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("marketing_promo_codes").select("id, store_id, code, type, value, min_order_cents, max_redemptions, per_customer_limit, redemption_count, is_active, ends_at, created_at").order("created_at", { ascending: false }).limit(60);
      return (data ?? []).filter((p) => p.is_active !== false && (!p.ends_at || new Date(p.ends_at).getTime() > Date.now()));
    },
    staleTime: 60_000,
  });

  const storeIds = useMemo(() => Array.from(new Set(promos.map((p) => p.store_id))), [promos]);

  const { data: stores = [] } = useQuery({
    queryKey: ["store-promo-stores", storeIds.join(",")],
    queryFn: async () => {
      if (storeIds.length === 0) return [] as StoreRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: StoreRow[] | null }> } } };
      const { data } = await sb.from("store_profiles").select("id, name, logo_url, slug").in("id", storeIds);
      return data ?? [];
    },
    enabled: storeIds.length > 0,
    staleTime: 120_000,
  });

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setJustCopied(code);
      toast.success(`Copied: ${code}`);
      setTimeout(() => setJustCopied(null), 1500);
    } catch { toast.error("Couldn't copy"); }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Store Promo Codes · ZIVO" description="Active promo codes from stores." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Store Promos</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Active promos</p>
          <p className="text-3xl font-bold mt-1">{promos.length}</p>
          <p className="text-sm text-white/80 mt-1">Codes you can use at checkout</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && promos.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Tag className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No active promos</p>
            <p className="text-xs text-muted-foreground">Check back later — stores add new codes regularly.</p>
          </div>
        )}

        {!isLoading && promos.length > 0 && (
          <div className="space-y-2">
            {promos.map((p, idx) => {
              const s = storeMap.get(p.store_id);
              const valueStr = p.type === "percent" ? `${Number(p.value).toFixed(0)}% off` : `$${(Number(p.value) / 100).toFixed(0)} off`;
              const isCopied = justCopied === p.code;
              const remaining = p.max_redemptions ? p.max_redemptions - p.redemption_count : null;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-start gap-3">
                    {s?.logo_url ? (
                      <img src={s.logo_url} alt="" className="shrink-0 h-10 w-10 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Store className="h-4 w-4 text-ig-gradient" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => s?.slug ? navigate(`/store/${s.slug}`) : null} className="text-sm font-bold text-foreground line-clamp-1 hover:underline">{s?.name ?? "Store"}</button>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-2xl font-extrabold text-ig-gradient">{valueStr}</span>
                        {p.min_order_cents > 0 && <span className="text-[11px] text-muted-foreground">on ${(p.min_order_cents / 100).toFixed(0)}+ orders</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {p.ends_at && <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(p.ends_at)}</span>}
                        {remaining !== null && <><span>·</span><span>{remaining} left</span></>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(p.code)}
                    className={cn("mt-3 w-full h-10 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]", isCopied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-ig-gradient text-white shadow-sm hover:opacity-90")}
                  >
                    {isCopied ? <><CheckCircle2 className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> {p.code}</>}
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
