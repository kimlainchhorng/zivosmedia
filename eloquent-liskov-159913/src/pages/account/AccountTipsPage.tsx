import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Gift, Loader2, MessageCircle, Calendar, Sparkles, EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

interface TipRow {
  id: string;
  amount_cents: number;
  created_at: string | null;
  is_anonymous: boolean | null;
  message: string | null;
  status: string | null;
  creator_id: string;
  creator?: { full_name: string | null; avatar_url: string | null } | null;
}

const SUCCESS_STATUSES = new Set(["succeeded", "completed", "paid"]);

export default function AccountTipsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tips = [], isLoading } = useQuery<TipRow[]>({
    queryKey: ["my-tips-sent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_tips")
        .select("id, amount_cents, created_at, is_anonymous, message, status, creator_id")
        .eq("tipper_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const rows = (data || []) as TipRow[];
      const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));
      if (creatorIds.length === 0) return rows;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", creatorIds);

      const map = new Map<string, TipRow["creator"]>();
      for (const p of (profiles || []) as any[]) map.set(p.user_id, p);

      return rows.map((r) => ({
        ...r,
        creator: map.get(r.creator_id) ?? null,
      }));
    },
  });

  const succeeded = tips.filter((t) => !t.status || SUCCESS_STATUSES.has(t.status));
  const totals = useMemo(() => {
    const now = new Date();
    const monthAgo = subDays(now, 30);
    let total = 0;
    let last30 = 0;
    const creatorSet = new Set<string>();
    for (const t of succeeded) {
      total += t.amount_cents ?? 0;
      const created = t.created_at ? new Date(t.created_at) : null;
      if (created && isAfter(created, monthAgo)) last30 += t.amount_cents ?? 0;
      creatorSet.add(t.creator_id);
    }
    return { total, last30, creators: creatorSet.size };
  }, [succeeded]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead title="Tips – ZIVO" description="View all the tips you've sent to creators. Track tip history, amounts, messages, and support contributions across the platform." />
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/40" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <div className="flex items-center gap-3 px-3 h-14 max-w-3xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-foreground" />
            Tips sent
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="rounded-2xl overflow-hidden mb-4 p-4 text-white shadow-lg bg-foreground">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">Lifetime sent</p>
          <p className="text-3xl font-extrabold mt-1">${(totals.total / 100).toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <p className="text-[10px] uppercase font-bold opacity-75">Last 30 days</p>
              <p className="text-sm font-extrabold">${(totals.last30 / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold opacity-75">Creators tipped</p>
              <p className="text-sm font-extrabold">{totals.creators}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : succeeded.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-border/40 bg-muted/20">
            <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold mb-1.5">No tips sent yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-5">
              Find creators you love and send them a tip from their profile.
            </p>
            <Button onClick={() => navigate("/feed?tab=foryou")} className="rounded-full">
              Discover creators
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {succeeded.map((t) => {
              const created = t.created_at ? new Date(t.created_at) : null;
              const name = t.creator?.full_name || "Creator";
              const initials = name.trim().slice(0, 2).toUpperCase();
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/50 bg-card p-3 flex items-start gap-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/user/${t.creator_id}`)}
                    className="shrink-0"
                    aria-label={`View ${name}`}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={t.creator?.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-sm truncate">{name}</p>
                      <p className="text-base font-extrabold text-foreground shrink-0">
                        −${((t.amount_cents ?? 0) / 100).toFixed(2)}
                      </p>
                    </div>
                    {t.message && (
                      <p className="text-xs text-foreground/85 mt-1 flex items-start gap-1.5 leading-snug">
                        <MessageCircle className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="break-words">{t.message}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {created && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDistanceToNow(created, { addSuffix: true })} · {format(created, "MMM d, yyyy")}
                        </p>
                      )}
                      {t.is_anonymous && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                          <EyeOff className="h-2.5 w-2.5" />
                          Anonymous
                        </span>
                      )}
                    </div>
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
