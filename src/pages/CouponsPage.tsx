/**
 * CouponsPage — Browse and copy active coupons.
 * Backed by the real `coupons` table (admin-managed catalog).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ticket, Copy, Clock, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CouponRow {
  id: string;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  created_at: string | null;
}

function formatDiscount(c: CouponRow): string {
  if (!c.discount_value) return "Discount";
  if ((c.discount_type ?? "").toLowerCase() === "percent") return `${c.discount_value}% off`;
  if ((c.discount_type ?? "").toLowerCase() === "amount") return `$${c.discount_value} off`;
  return `${c.discount_value}`;
}

function expiryLabel(iso: string | null): { label: string; expired: boolean; soon: boolean } {
  if (!iso) return { label: "No expiry", expired: false, soon: false };
  const t = new Date(iso).getTime();
  const ms = t - Date.now();
  if (ms <= 0) return { label: "Expired", expired: true, soon: false };
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return { label: "Expires today", expired: false, soon: true };
  if (days < 7) return { label: `Expires in ${days}d`, expired: false, soon: true };
  return { label: `Expires ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, expired: false, soon: false };
}

export default function CouponsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "active" | "expiring">("active");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons-catalog"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: CouponRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("coupons")
        .select("id, code, discount_type, discount_value, expires_at, usage_limit, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      const exp = expiryLabel(c.expires_at);
      if (filter === "active") return !exp.expired;
      if (filter === "expiring") return exp.soon && !exp.expired;
      return true;
    });
  }, [coupons, filter]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${code} copied`);
    } catch {
      toast.error("Couldn't copy — try long-pressing the code");
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Coupons · ZIVO" description="Active discount codes and promotions." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Ticket className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Coupons</h1>
          </div>
          <Button aria-label="Filter" variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <Filter className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Savings</p>
          <p className="text-3xl font-bold mt-1">{coupons.filter((c) => !expiryLabel(c.expires_at).expired).length} active</p>
          <p className="text-sm text-white/80 mt-1">Apply at checkout to unlock the discount.</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(["active", "expiring", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Expiring soon"}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && coupons.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Ticket className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No coupons yet</p>
            <p className="text-xs text-muted-foreground">Promo codes will show here as they publish.</p>
          </div>
        )}

        {!isLoading && coupons.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nothing in this filter.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((c, idx) => {
              const exp = expiryLabel(c.expires_at);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "relative rounded-2xl overflow-hidden border bg-card",
                    exp.expired ? "opacity-60 border-border" : "border-border",
                  )}
                >
                  <div className="flex">
                    {/* Discount side */}
                    <div className={cn(
                      "shrink-0 w-24 p-4 flex flex-col items-center justify-center text-center text-white",
                      exp.expired ? "bg-muted text-muted-foreground" : "bg-ig-gradient",
                    )}>
                      <p className="text-2xl font-extrabold leading-none">{c.discount_value ?? "—"}</p>
                      <p className="text-[10px] font-bold tracking-wider mt-1">
                        {(c.discount_type ?? "").toLowerCase() === "percent" ? "% OFF" : (c.discount_type ?? "").toLowerCase() === "amount" ? "OFF" : ""}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 p-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{formatDiscount(c)}</p>
                        <p className="text-xs font-mono mt-0.5 text-foreground tracking-wider truncate">{c.code}</p>
                        <p className={cn(
                          "text-[10px] mt-1 flex items-center gap-1",
                          exp.expired ? "text-destructive" : exp.soon ? "text-ig-gradient font-bold" : "text-muted-foreground",
                        )}>
                          <Clock className="h-2.5 w-2.5" /> {exp.label}
                          {c.usage_limit != null && <span>· max {c.usage_limit} uses</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={exp.expired}
                        onClick={() => handleCopy(c.code)}
                        aria-label={`Copy code ${c.code}`}
                        className={cn(
                          "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-95",
                          exp.expired
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute left-[6.05rem] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" aria-hidden>
                    <span className="h-3 w-3 rounded-full bg-background -mt-1.5" />
                    <span className="h-3 w-3 rounded-full bg-background mt-auto -mb-1.5 absolute -translate-y-[100%] bottom-[-6px]" />
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
