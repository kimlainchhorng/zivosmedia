import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Users, Loader2, MessageCircle, Crown, Search, TrendingUp, DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

type Tab = "active" | "ended";

interface SubscriberRow {
  id: string;
  subscriber_id: string;
  tier_id: string | null;
  status: string | null;
  price_cents: number | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  tier?: {
    name: string;
    badge_emoji: string | null;
    badge_color: string | null;
    billing_interval: string;
  } | null;
  subscriber?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CreatorSubscribersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery<SubscriberRow[]>({
    queryKey: ["creator-subscribers-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_subscriptions")
        .select("id, subscriber_id, tier_id, status, price_cents, started_at, expires_at, cancelled_at")
        .eq("creator_id", user!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;

      const list = (data || []) as SubscriberRow[];
      const tierIds = Array.from(new Set(list.map((r) => r.tier_id).filter(Boolean))) as string[];
      const subIds = Array.from(new Set(list.map((r) => r.subscriber_id)));

      const [tiersRes, profilesRes] = await Promise.all([
        tierIds.length
          ? (supabase as any)
              .from("subscription_tiers")
              .select("id, name, badge_emoji, badge_color, billing_interval")
              .in("id", tierIds)
          : Promise.resolve({ data: [] }),
        subIds.length
          ? supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", subIds)
          : Promise.resolve({ data: [] }),
      ]);

      const tiers = new Map<string, SubscriberRow["tier"]>();
      for (const t of (tiersRes.data || []) as any[]) tiers.set(t.id, t);
      const profiles = new Map<string, SubscriberRow["subscriber"]>();
      for (const p of (profilesRes.data || []) as any[]) profiles.set(p.user_id, p);

      return list.map((r) => ({
        ...r,
        tier: r.tier_id ? tiers.get(r.tier_id) ?? null : null,
        subscriber: profiles.get(r.subscriber_id) ?? null,
      }));
    },
  });

  const lifetimeBySub = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const cents = r.price_cents ?? 0;
      const start = r.started_at ? new Date(r.started_at).getTime() : Date.now();
      const end = r.cancelled_at
        ? new Date(r.cancelled_at).getTime()
        : r.expires_at && r.status !== "active"
          ? new Date(r.expires_at).getTime()
          : Date.now();
      const interval = (r.tier?.billing_interval || "month") as string;
      const intervalMs =
        interval === "year" ? 365 * 86400000
        : interval === "quarter" ? 90 * 86400000
        : interval === "week" ? 7 * 86400000
        : 30 * 86400000;
      const periods = Math.max(1, Math.round((end - start) / intervalMs));
      map.set(r.subscriber_id, (map.get(r.subscriber_id) ?? 0) + cents * periods);
    }
    return map;
  }, [rows]);

  const tierOptions = useMemo(() => {
    const m = new Map<string, { id: string; name: string; emoji: string; color: string }>();
    for (const r of rows) {
      if (r.tier_id && r.tier) {
        m.set(r.tier_id, {
          id: r.tier_id,
          name: r.tier.name,
          emoji: r.tier.badge_emoji || "⭐",
          color: r.tier.badge_color || "hsl(var(--primary))",
        });
      }
    }
    return Array.from(m.values());
  }, [rows]);

  const active = rows.filter((r) => r.status === "active");
  const ended = rows.filter((r) => r.status !== "active");

  const list = (tab === "active" ? active : ended)
    .filter((r) => !tierFilter || r.tier_id === tierFilter)
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (r.subscriber?.full_name || "").toLowerCase().includes(q);
    });

  const monthlyRevenue = active.reduce((sum, r) => {
    const cents = r.price_cents ?? 0;
    const interval = (r.tier?.billing_interval || "month") as string;
    if (interval === "year") return sum + Math.round(cents / 12);
    if (interval === "quarter") return sum + Math.round(cents / 3);
    if (interval === "week") return sum + Math.round(cents * 4.33);
    return sum + cents;
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/40 safe-area-top">
        <div className="flex items-center gap-3 px-3 h-14 max-w-3xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            My fans
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-transparent p-3.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Active fans
            </p>
            <p className="text-2xl font-extrabold mt-1">{active.length}</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              MRR
            </p>
            <p className="text-2xl font-extrabold mt-1">${(monthlyRevenue / 100).toFixed(2)}</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fans"
            className="pl-9 h-10"
          />
        </div>

        {tierOptions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-none">
            <button type="button"
              onClick={() => setTierFilter(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${
                !tierFilter ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              All tiers
            </button>
            {tierOptions.map((t) => (
              <button type="button"
                key={t.id}
                onClick={() => setTierFilter(tierFilter === t.id ? null : t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all flex items-center gap-1 ${
                  tierFilter === t.id ? "text-white" : "bg-muted/50 text-muted-foreground"
                }`}
                style={tierFilter === t.id ? { backgroundColor: t.color } : undefined}
              >
                <span>{t.emoji}</span>
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-xl">
          {(["active", "ended"] as const).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t} ({t === "active" ? active.length : ended.length})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-border/40 bg-muted/20">
            <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Crown className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold mb-1.5">
              {tab === "active" ? "No fans yet" : "No past fans"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-5">
              {tab === "active"
                ? "Promote your subscription tiers to start growing your fanbase."
                : "Cancelled and expired fans appear here."}
            </p>
            {tab === "active" && (
              <Button onClick={() => navigate("/creator/setup?step=tier")} className="rounded-full">
                Manage tiers
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((r) => {
              const initials = (r.subscriber?.full_name || "?").trim().slice(0, 2).toUpperCase();
              const cents = r.price_cents ?? 0;
              const ltv = lifetimeBySub.get(r.subscriber_id) ?? 0;
              const badgeColor = r.tier?.badge_color || "hsl(var(--primary))";
              const isActive = r.status === "active";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/user/${r.subscriber_id}`)}
                    className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={r.subscriber?.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{r.subscriber?.full_name || "Fan"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {r.tier && (
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: badgeColor + "26", color: badgeColor }}
                          >
                            {r.tier.badge_emoji || "⭐"} {r.tier.name}
                          </span>
                        )}
                        {!isActive && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {r.status || "ended"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide flex items-center gap-0.5 justify-end">
                        <DollarSign className="h-2.5 w-2.5" />
                        LTV
                      </p>
                      <p className="text-sm font-extrabold">${(ltv / 100).toFixed(2)}</p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1 border-t border-border/40">
                    <p className="text-[11px] text-muted-foreground">
                      {isActive
                        ? r.started_at
                          ? `Joined ${format(new Date(r.started_at), "MMM d, yyyy")}`
                          : ""
                        : r.cancelled_at
                          ? `Left ${format(new Date(r.cancelled_at), "MMM d, yyyy")}`
                          : "Ended"}
                      {cents > 0 && ` · $${(cents / 100).toFixed(2)} / ${(r.tier?.billing_interval || "month")}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/chat`, {
                          state: {
                            openChat: {
                              recipientId: r.subscriber_id,
                              recipientName: r.subscriber?.full_name || "Fan",
                              recipientAvatar: r.subscriber?.avatar_url,
                            },
                          },
                        });
                      }}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Message
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}
