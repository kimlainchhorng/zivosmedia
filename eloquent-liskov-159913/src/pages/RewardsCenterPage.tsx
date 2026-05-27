/**
 * RewardsCenterPage — Personal rewards center (different from /rewards).
 * Backed by the real `rewards` table (per-user issued rewards).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gift, Clock, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface RewardRow {
  id: string;
  reward_type: string | null;
  reward_value: number | null;
  status: string | null;
  expires_at: string | null;
  created_at: string | null;
}

type RewardStatus = "available" | "redeemed" | "expired" | "pending";

function getStatus(r: RewardRow): RewardStatus {
  const s = (r.status ?? "").toLowerCase();
  if (s === "redeemed" || s === "used") return "redeemed";
  if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) return "expired";
  if (s === "pending") return "pending";
  return "available";
}

function formatValue(r: RewardRow): string {
  if (!r.reward_value) return "Reward";
  const t = (r.reward_type ?? "").toLowerCase();
  if (t === "credit" || t === "money") return `$${r.reward_value}`;
  if (t === "points") return `${r.reward_value} pts`;
  if (t === "percent" || t === "percent_off") return `${r.reward_value}% off`;
  return `${r.reward_value}`;
}

function expiryLabel(iso: string | null): string {
  if (!iso) return "No expiry";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "Expires today";
  if (days < 7) return `Expires in ${days}d`;
  return `Expires ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function RewardsCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards-center", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as RewardRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: RewardRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("rewards")
        .select("id, reward_type, reward_value, status, expires_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const out: Record<RewardStatus, RewardRow[]> = { available: [], redeemed: [], expired: [], pending: [] };
    rewards.forEach((r) => {
      out[getStatus(r)].push(r);
    });
    return out;
  }, [rewards]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Rewards Center · ZIVO" description="Track rewards you've earned." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Rewards Center</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Available now</p>
          <p className="text-3xl font-bold mt-1">{grouped.available.length} rewards</p>
          <p className="text-sm text-white/80 mt-1">
            {grouped.redeemed.length} redeemed · {grouped.expired.length} expired
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && rewards.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No rewards yet</p>
            <p className="text-xs text-muted-foreground">
              Earn rewards by booking, referring friends, or completing missions.
            </p>
          </div>
        )}

        {!isLoading && rewards.length > 0 && (
          <>
            {(["available", "pending", "redeemed", "expired"] as RewardStatus[]).map((status) => {
              const list = grouped[status];
              if (list.length === 0) return null;
              return (
                <section key={status}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2 capitalize">
                    {status} · {list.length}
                  </p>
                  <div className="space-y-2">
                    {list.map((r, idx) => {
                      const active = status === "available";
                      const StatusIcon = status === "redeemed" ? CheckCircle2 : status === "expired" ? XCircle : Gift;
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl bg-card border border-border",
                            !active && "opacity-70",
                          )}
                        >
                          <div className={cn(
                            "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
                            active ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-muted-foreground",
                          )}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{formatValue(r)}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{r.reward_type ?? "reward"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "text-[11px] flex items-center gap-0.5 justify-end",
                              status === "expired" ? "text-destructive" : "text-muted-foreground",
                            )}>
                              <Clock className="h-2.5 w-2.5" /> {expiryLabel(r.expires_at)}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </SwipeBackContainer>
  );
}
