/**
 * CreatorTiersSubscribe — surfaces a creator's active subscription tiers on their public profile.
 * Fans can join free tiers in one tap, enter a custom amount for pay-what-you-want,
 * or initiate Stripe checkout for paid tiers.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, Sparkles, Loader2, Gift, BadgeCheck, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatTierPrice, monthlyEquivalent, INTERVAL_LABEL, type BillingInterval } from "@/lib/tierFormat";
import SubscribeInAppSheet from "./SubscribeInAppSheet";

interface Props {
  creatorId: string;
  creatorName?: string;
  isOwnProfile: boolean;
}

export default function CreatorTiersSubscribe({ creatorId, creatorName, isOwnProfile }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState<string | null>(null);
  const [pwywTier, setPwywTier] = useState<any | null>(null);
  const [welcomeFor, setWelcomeFor] = useState<{ name: string; message: string } | null>(null);
  const [pwywAmount, setPwywAmount] = useState("");
  const [inAppTier, setInAppTier] = useState<any | null>(null);

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["public-creator-tiers", creatorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_tiers")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
  });

  const { data: mySubscription } = useQuery({
    queryKey: ["my-active-subscription", creatorId, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_subscriptions")
        .select("id, tier_id, expires_at")
        .eq("creator_id", creatorId)
        .eq("subscriber_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; tier_id: string | null; expires_at: string | null } | null;
    },
    enabled: !!creatorId && !!user && !isOwnProfile,
  });

  const subscribedTierId = mySubscription?.tier_id ?? null;

  if (isLoading || tiers.length === 0) return null;

  const handleSubscribe = async (tier: any) => {
    if (!user) {
      toast.error("Sign in to subscribe");
      navigate("/auth");
      return;
    }
    if (tier.is_custom_price) {
      setPwywAmount(((tier.price_cents ?? 99) / 100).toFixed(2));
      setPwywTier(tier);
      return;
    }
    if (tier.is_free) {
      await doSubscribe(tier, tier.price_cents);
      return;
    }
    // Paid tier — collect card in-app instead of bouncing to Stripe Checkout.
    setInAppTier(tier);
  };

  const doSubscribe = async (tier: any, cents: number) => {
    setJoining(tier.id);
    try {
      if (tier.is_free) {
        const { error } = await (supabase as any).from("creator_subscriptions").insert({
          creator_id: creatorId,
          subscriber_id: user!.id,
          tier_id: tier.id,
          status: "active",
          price_cents: 0,
        });
        if (error) throw error;
        toast.success(`Joined ${tier.name}`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-active-subscription", creatorId, user?.id] }),
          queryClient.invalidateQueries({ queryKey: ["my-subscriptions", user?.id] }),
          queryClient.invalidateQueries({ queryKey: ["creator-top-supporters", creatorId] }),
        ]);
        if (tier.welcome_message) {
          setWelcomeFor({ name: tier.name, message: tier.welcome_message });
        }
      } else {
        const { data, error } = await (supabase as any).functions.invoke("subscribe-to-tier", {
          body: {
            tier_id: tier.id,
            creator_id: creatorId,
            amount_cents: cents,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        toast.success("Subscription started");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["my-active-subscription", creatorId, user?.id] }),
          queryClient.invalidateQueries({ queryKey: ["my-subscriptions", user?.id] }),
          queryClient.invalidateQueries({ queryKey: ["creator-top-supporters", creatorId] }),
        ]);
        if (tier.welcome_message) {
          setWelcomeFor({ name: tier.name, message: tier.welcome_message });
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to subscribe");
    } finally {
      setJoining(null);
      setPwywTier(null);
    }
  };

  // Featured tier = lowest paid (the headline OF-style "SUBSCRIBE" card)
  const paidTiers = tiers.filter((t: any) => !t.is_free);
  const featured = paidTiers.length > 0
    ? [...paidTiers].sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0))[0]
    : tiers[0];
  const others = tiers.filter((t: any) => t.id !== featured?.id);

  const renderPriceLine = (tier: any) => {
    const interval = (tier.billing_interval || "month") as BillingInterval;
    const cents = tier.price_cents ?? 0;
    const pct = Number(tier.discount_percent || 0);
    const discounted = pct > 0 ? Math.round(cents * (1 - pct / 100)) : cents;
    const intervalLabel = tier.is_free ? "" : `/ ${INTERVAL_LABEL[interval].toLowerCase()}`;
    if (tier.is_free) return <span>FREE</span>;
    return (
      <span className="flex items-baseline gap-1.5 flex-wrap">
        {pct > 0 && (
          <span className="text-base text-white/60 line-through font-semibold">${(cents / 100).toFixed(2)}</span>
        )}
        <span>{tier.is_custom_price ? "FROM " : ""}${(discounted / 100).toFixed(2)}</span>
        <span className="text-xs font-semibold opacity-80">{intervalLabel}</span>
      </span>
    );
  };

  const FeaturedCard = ({ tier }: { tier: any }) => {
    const interval = (tier.billing_interval || "month") as BillingInterval;
    const monthly = !tier.is_free && !tier.is_custom_price
      ? monthlyEquivalent(tier.price_cents ?? 0, interval)
      : null;
    const pct = Number(tier.discount_percent || 0);
    const badgeColor = tier.badge_color || "#00AFF0";
    return (
      <motion.div
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-2xl shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${badgeColor} 0%, ${badgeColor}dd 60%, #0a0a0a 140%)`,
        }}
      >
        {/* discount ribbon */}
        {pct > 0 && (
          <div className="absolute top-3 right-3 bg-yellow-400 text-black text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow">
            Limited offer · Save {pct}%
          </div>
        )}

        <div className="p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{tier.badge_emoji || "⭐"}</span>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">Subscription bundle</p>
          </div>

          <h4 className="text-xl font-extrabold leading-tight">{tier.name?.toUpperCase() || "SUBSCRIBE"}</h4>

          <div className="mt-2 text-3xl font-extrabold">
            {renderPriceLine(tier)}
          </div>
          {monthly && (
            <p className="text-[11px] opacity-80 mt-0.5">{monthly}</p>
          )}

          {/* perks list */}
          {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
            <ul className="mt-3 space-y-1">
              {tier.benefits.slice(0, 6).map((b: string, i: number) => (
                <li key={i} className="text-[12px] flex items-start gap-1.5 opacity-95">
                  <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {!isOwnProfile && (
            subscribedTierId === tier.id ? (
              <button type="button"
                onClick={() => navigate("/account/subscriptions")}
                className="w-full mt-4 bg-white/15 backdrop-blur text-white font-extrabold uppercase tracking-wide rounded-full py-3 text-sm border border-white/30 active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                <BadgeCheck className="w-4 h-4" />
                Subscribed · Manage
              </button>
            ) : (
              <button type="button"
                onClick={() => handleSubscribe(tier)}
                disabled={joining === tier.id || !!subscribedTierId}
                className="w-full mt-4 bg-white text-black font-extrabold uppercase tracking-wide rounded-full py-3 text-sm hover:bg-white/90 active:scale-[0.99] transition shadow disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {joining === tier.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : subscribedTierId ? (
                  "SWITCH TIER"
                ) : tier.is_free ? (
                  "JOIN FOR FREE"
                ) : tier.trial_days > 0 ? (
                  `START ${tier.trial_days}-DAY FREE TRIAL`
                ) : (
                  "SUBSCRIBE"
                )}
              </button>
            )
          )}
        </div>
      </motion.div>
    );
  };

  const MiniTierRow = ({ tier }: { tier: any }) => {
    const interval = (tier.billing_interval || "month") as BillingInterval;
    const cents = tier.price_cents ?? 0;
    const pct = Number(tier.discount_percent || 0);
    const discounted = pct > 0 ? Math.round(cents * (1 - pct / 100)) : cents;
    const badgeColor = tier.badge_color || "hsl(var(--primary))";
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: badgeColor + "26", color: badgeColor }}
        >
          {tier.badge_emoji || (tier.is_free ? "🎁" : "⭐")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm truncate">{tier.name}</p>
            {tier.trial_days > 0 && !tier.is_free && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">{tier.trial_days}d trial</span>
            )}
            {pct > 0 && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">−{pct}%</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {tier.is_free ? "Free" : `$${(discounted / 100).toFixed(2)} / ${INTERVAL_LABEL[interval].toLowerCase()}`}
          </p>
        </div>
        {!isOwnProfile && (
          subscribedTierId === tier.id ? (
            <button type="button"
              onClick={() => navigate("/account/subscriptions")}
              className="text-[11px] font-extrabold uppercase tracking-wide px-3 py-2 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 active:scale-95 transition flex items-center gap-1"
            >
              <BadgeCheck className="w-3 h-3" />
              Joined
            </button>
          ) : (
            <button type="button"
              onClick={() => handleSubscribe(tier)}
              disabled={joining === tier.id || !!subscribedTierId}
              className="text-[11px] font-extrabold uppercase tracking-wide px-3 py-2 rounded-full bg-foreground text-background hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-1"
            >
              {joining === tier.id ? <Loader2 className="w-3 h-3 animate-spin" /> : subscribedTierId ? "Switch" : tier.is_free ? "Join" : "Subscribe"}
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="px-4 max-w-3xl mx-auto mt-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          {subscribedTierId ? (
            <>
              <BadgeCheck className="w-4 h-4 text-emerald-500" />
              Your subscription
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 text-primary" />
              Subscribe
            </>
          )}
        </h3>
        {isOwnProfile ? (
          <button type="button"
            onClick={() => navigate("/creator/setup?step=tier")}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Manage tiers
          </button>
        ) : subscribedTierId ? (
          <button type="button"
            onClick={() => navigate("/account/subscriptions")}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Settings2 className="w-3 h-3" />
            Manage
          </button>
        ) : null}
      </div>

      {featured && <FeaturedCard tier={featured} />}

      {others.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1">More options</p>
          {others.map((t: any) => <MiniTierRow key={t.id} tier={t} />)}
        </div>
      )}

      {/* Pay-what-you-want dialog */}
      <Dialog open={!!pwywTier} onOpenChange={(o) => !o && setPwywTier(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-foreground" />
              Choose your amount
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Suggested minimum: ${((pwywTier?.price_cents ?? 99) / 100).toFixed(2)}
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">$</span>
              <Input
                value={pwywAmount}
                onChange={(e) => setPwywAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="pl-7 text-base font-bold h-12"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwywTier(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const cents = Math.round(parseFloat(pwywAmount) * 100);
                const min = pwywTier?.price_cents ?? 99;
                if (!Number.isFinite(cents) || cents < min) {
                  toast.error(`Minimum is $${(min / 100).toFixed(2)}`);
                  return;
                }
                doSubscribe(pwywTier, cents);
              }}
              disabled={joining === pwywTier?.id}
              className="font-bold"
            >
              {joining === pwywTier?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Welcome message dialog from creator */}
      <Dialog open={!!welcomeFor} onOpenChange={(o) => !o && setWelcomeFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-foreground" />
              Welcome to {welcomeFor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-border/40 to-transparent p-4 bg-secondary">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
              A note from {creatorName || "the creator"}
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {welcomeFor?.message}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setWelcomeFor(null)} className="font-bold w-full">
              Thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubscribeInAppSheet
        open={!!inAppTier}
        onClose={() => setInAppTier(null)}
        creatorId={creatorId}
        creatorName={creatorName || "this creator"}
        tier={inAppTier}
      />
    </div>
  );
}
