import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Crown, Loader2, Sparkles, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { INTERVAL_LABEL, type BillingInterval } from "@/lib/tierFormat";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

interface SubscriptionRow {
  id: string;
  creator_id: string;
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
    is_free: boolean;
  } | null;
  creator?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

type Tab = "active" | "ended";

export default function AccountSubscriptionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const [confirmCancel, setConfirmCancel] = useState<SubscriptionRow | null>(null);

  const { data: subs = [], isLoading } = useQuery<SubscriptionRow[]>({
    queryKey: ["my-subscriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_subscriptions")
        .select("id, creator_id, tier_id, status, price_cents, started_at, expires_at, cancelled_at")
        .eq("subscriber_id", user!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as SubscriptionRow[];
      const tierIds = Array.from(new Set(rows.map((r) => r.tier_id).filter(Boolean))) as string[];
      const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id)));

      const [tiersRes, creatorsRes] = await Promise.all([
        tierIds.length
          ? (supabase as any)
              .from("subscription_tiers")
              .select("id, name, badge_emoji, badge_color, billing_interval, is_free")
              .in("id", tierIds)
          : Promise.resolve({ data: [] }),
        creatorIds.length
          ? supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", creatorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const tiers = new Map<string, SubscriptionRow["tier"]>();
      for (const t of (tiersRes.data || []) as any[]) tiers.set(t.id, t);
      const creators = new Map<string, SubscriptionRow["creator"]>();
      for (const c of (creatorsRes.data || []) as any[]) creators.set(c.user_id, c);

      return rows.map((r) => ({
        ...r,
        tier: r.tier_id ? tiers.get(r.tier_id) ?? null : null,
        creator: creators.get(r.creator_id) ?? null,
      }));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      // Calls Stripe via edge function so recurring billing actually stops.
      // Default to cancel-at-period-end so the user keeps access until the end
      // of the period they already paid for.
      const { data, error } = await supabase.functions.invoke("cancel-creator-subscription", {
        body: { subscription_id: id, immediate: false },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: boolean; provider_cancel: string; ends_at: string | null };
    },
    onSuccess: (data) => {
      const endsAt = data?.ends_at ? new Date(data.ends_at).toLocaleDateString() : null;
      toast.success(
        data?.provider_cancel === "scheduled"
          ? "Subscription will end at the next billing date"
          : "Subscription cancelled",
        endsAt && data?.provider_cancel === "scheduled" ? { description: `You'll keep access until ${endsAt}.` } : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions", user?.id] });
      setConfirmCancel(null);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Could not cancel subscription");
    },
  });

  const active = subs.filter((s) => s.status === "active");
  const ended = subs.filter((s) => s.status !== "active");
  const list = tab === "active" ? active : ended;

  const monthlySpend = active.reduce((sum, s) => {
    const cents = s.price_cents ?? 0;
    const interval = (s.tier?.billing_interval || "month") as BillingInterval;
    if (interval === "year") return sum + Math.round(cents / 12);
    if ((interval as string) === "quarter" || interval === "3_months") return sum + Math.round(cents / 3);
    if ((interval as string) === "week") return sum + Math.round(cents * 4.33);
    if (interval === "6_months") return sum + Math.round(cents / 6);
    return sum + cents;
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead title="My Subscriptions – ZIVO" description="View and manage your creator subscriptions. See active subscriptions, renewal dates, and tier details for the creators you support." />
      <header
        className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/40"
        style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
      >
        <div className="flex items-center gap-3 px-3 h-14 max-w-3xl mx-auto">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-foreground" />
            My subscriptions
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="rounded-2xl border border-border/40 to-transparent p-4 mb-4 bg-secondary">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Monthly spend</p>
          <p className="text-2xl font-extrabold mt-0.5">
            ${(monthlySpend / 100).toFixed(2)}
            <span className="text-xs text-muted-foreground font-medium ml-1">/ month</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {active.length} active subscription{active.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-xl">
          {(["active", "ended"] as const).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t} {t === "active" ? `(${active.length})` : `(${ended.length})`}
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
              <Sparkles className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold mb-1.5">
              {tab === "active" ? "No active subscriptions" : "No past subscriptions"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px] mb-5">
              {tab === "active"
                ? "Discover creators you love and unlock exclusive content."
                : "Cancelled and expired subscriptions appear here."}
            </p>
            {tab === "active" && (
              <Button onClick={() => navigate("/feed?tab=foryou")} className="rounded-full">
                Discover creators
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((s) => {
              const initials = (s.creator?.full_name || "?").trim().slice(0, 2).toUpperCase();
              const interval = (s.tier?.billing_interval || "month") as BillingInterval;
              const cents = s.price_cents ?? 0;
              const intervalLabel = INTERVAL_LABEL[interval]?.toLowerCase() || "month";
              const badgeColor = s.tier?.badge_color || "hsl(var(--primary))";
              const isActive = s.status === "active";
              const expiringSoon =
                isActive &&
                s.expires_at &&
                new Date(s.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border/50 bg-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/user/${s.creator_id}`)}
                    className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={s.creator?.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{s.creator?.full_name || "Creator"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: badgeColor + "26", color: badgeColor }}
                        >
                          {s.tier?.badge_emoji || "⭐"} {s.tier?.name || "Tier"}
                        </span>
                        {expiringSoon && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Renews soon
                          </span>
                        )}
                        {!isActive && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {s.status || "ended"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold">
                        {s.tier?.is_free || cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`}
                      </p>
                      {!s.tier?.is_free && cents > 0 && (
                        <p className="text-[10px] text-muted-foreground">/ {intervalLabel}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1 border-t border-border/40">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {isActive && s.expires_at
                        ? `Renews ${format(new Date(s.expires_at), "MMM d, yyyy")}`
                        : !isActive && s.cancelled_at
                          ? `Cancelled ${format(new Date(s.cancelled_at), "MMM d, yyyy")}`
                          : s.started_at
                            ? `Since ${format(new Date(s.started_at), "MMM d, yyyy")}`
                            : ""}
                    </p>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(s)}
                        className="text-[11px] font-bold text-destructive hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => navigate(`/user/${s.creator_id}`)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Crown className="h-3 w-3" />
                        Resubscribe
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep access to {confirmCancel?.creator?.full_name || "this creator"}'s content
              {confirmCancel?.expires_at
                ? ` until ${format(new Date(confirmCancel.expires_at), "MMM d, yyyy")}`
                : " until the end of your current billing period"}
              . You won't be charged again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCancel && cancelMutation.mutate(confirmCancel.id)}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ZivoMobileNav />
    </div>
  );
}
