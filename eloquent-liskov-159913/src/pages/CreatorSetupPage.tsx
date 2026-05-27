/**
 * CreatorSetupPage — End-to-end monetization onboarding flow
 * Walks the creator through 6 setup steps with inline forms and real DB writes.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, UserCircle2,
  ShieldCheck, CreditCard, Crown, Heart, Rocket, Sparkles, Loader2,
  DollarSign, Gift, Store, PenTool,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import UnifiedPayoutCard from "@/components/wallet/UnifiedPayoutCard";
import { useConnectStatus } from "@/hooks/useStripeConnect";

type StepKey = "profile" | "verify" | "payout" | "tier" | "tips" | "launch";

const ACCENT = {
  profile: "hsl(263 70% 58%)",
  verify: "hsl(142 71% 45%)",
  payout: "hsl(38 92% 50%)",
  tier: "hsl(340 75% 55%)",
  tips: "hsl(199 89% 48%)",
  launch: "hsl(172 66% 50%)",
} as const;

export default function CreatorSetupPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: stripeStatus } = useConnectStatus();

  const { data: creator, refetch: refetchCreator } = useQuery({
    queryKey: ["creator-profile-setup", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tiers = [], refetch: refetchTiers } = useQuery({
    queryKey: ["setup-tiers", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_tiers")
        .select("*")
        .eq("creator_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ["setup-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_program_enrollments")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const steps = useMemo(() => ([
    {
      key: "profile" as StepKey,
      label: "Profile",
      title: "Complete your creator profile",
      desc: "A display name and bio help fans find and trust you.",
      icon: UserCircle2,
      done: !!(creator?.display_name && creator?.bio),
    },
    {
      key: "verify" as StepKey,
      label: "Verify",
      title: "Verify your identity",
      desc: "Required before you can withdraw earnings.",
      icon: ShieldCheck,
      done: !!creator?.is_verified,
    },
    {
      key: "payout" as StepKey,
      label: "Payout",
      title: "Set up your payout method",
      desc: "Where should we send your money?",
      icon: CreditCard,
      done: !!stripeStatus?.payouts_enabled,
    },
    {
      key: "tier" as StepKey,
      label: "Tier",
      title: "Create a subscription tier",
      desc: "Set a monthly price and a list of perks.",
      icon: Crown,
      done: tiers.length > 0,
    },
    {
      key: "tips" as StepKey,
      label: "Tips",
      title: "Enable fan tips",
      desc: "Let viewers send one-time support.",
      icon: Heart,
      done: !!creator?.tips_enabled,
    },
    {
      key: "launch" as StepKey,
      label: "Launch",
      title: "Launch your first program",
      desc: "Pick at least one revenue stream to start.",
      icon: Rocket,
      done: enrollments.length > 0,
    },
  ]), [creator, tiers, enrollments, stripeStatus]);

  const initialStep = (() => {
    const requested = params.get("step") as StepKey | null;
    if (requested && steps.some((s) => s.key === requested)) return requested;
    const firstUndone = steps.find((s) => !s.done);
    return firstUndone?.key ?? steps[0].key;
  })();

  const [active, setActive] = useState<StepKey>(initialStep);
  useEffect(() => { setActive(initialStep); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const activeIndex = steps.findIndex((s) => s.key === active);
  const goNext = () => {
    const next = steps[activeIndex + 1];
    if (next) {
      setActive(next.key);
      setParams({ step: next.key });
    } else {
      toast.success("Setup complete! 🎉");
      navigate("/creator-dashboard");
    }
  };
  const goPrev = () => {
    const prev = steps[activeIndex - 1];
    if (prev) {
      setActive(prev.key);
      setParams({ step: prev.key });
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-32">
      <SEOHead title="Creator Setup – ZIVO" description="Set up your monetization on ZIVO." noIndex />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/85 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/creator-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold leading-tight">Monetization Setup</h1>
            <p className="text-[11px] text-muted-foreground">{completed}/{steps.length} complete · {pct}%</p>
          </div>
          <span className="text-xs font-extrabold" style={{ color: "hsl(142 71% 45%)" }}>{pct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
            className="h-full"
            style={{ background: "linear-gradient(90deg, hsl(142 71% 45%), hsl(172 66% 50%))" }}
          />
        </div>
      </div>

      {/* Step rail */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          {steps.map((s, i) => {
            const isActive = s.key === active;
            return (
              <button type="button"
                key={s.key}
                onClick={() => { setActive(s.key); setParams({ step: s.key }); }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors touch-manipulation ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : s.done
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-card text-muted-foreground border-border/40"
                }`}
              >
                {s.done ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="zivo-card-organic p-5"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: `${ACCENT[active]}15`, color: ACCENT[active] }}
              >
                {(() => {
                  const Icon = steps[activeIndex].icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Step {activeIndex + 1} of {steps.length}
                </p>
                <h2 className="font-extrabold text-base leading-tight">{steps[activeIndex].title}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{steps[activeIndex].desc}</p>
              </div>
              {steps[activeIndex].done && (
                <span className="zivo-badge bg-emerald-500/15 text-emerald-600">
                  <Sparkles className="w-2.5 h-2.5" /> Done
                </span>
              )}
            </div>

            {active === "profile" && (
              <ProfileStep creator={creator} userId={user?.id} onSaved={async () => { await refetchCreator(); qc.invalidateQueries({ queryKey: ["creator-profile"] }); }} />
            )}
            {active === "verify" && (
              <VerifyStep verified={!!creator?.is_verified} />
            )}
            {active === "payout" && (
              <PayoutStep creator={creator} userId={user?.id} onSaved={async () => { await refetchCreator(); qc.invalidateQueries({ queryKey: ["creator-profile"] }); }} />
            )}
            {active === "tier" && (
              <TierStep tiers={tiers} userId={user?.id} onSaved={async () => { await refetchTiers(); }} />
            )}
            {active === "tips" && (
              <TipsStep enabled={!!creator?.tips_enabled} userId={user?.id} onSaved={async () => { await refetchCreator(); qc.invalidateQueries({ queryKey: ["creator-profile"] }); }} />
            )}
            {active === "launch" && (
              <LaunchStep enrollments={enrollments} userId={user?.id} onSaved={async () => { await refetchEnrollments(); }} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-5">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={activeIndex === 0} className="text-xs">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button onClick={goNext} size="sm" className="text-xs font-bold">
            {activeIndex === steps.length - 1 ? "Finish" : steps[activeIndex].done ? "Next" : "Skip for now"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================  STEP COMPONENTS  ========================= */

async function ensureCreatorRow(userId: string) {
  const { data: existing } = await (supabase as any)
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return;
  await (supabase as any).from("creator_profiles").insert({ user_id: userId });
}

function ProfileStep({ creator, userId, onSaved }: any) {
  const [displayName, setDisplayName] = useState(creator?.display_name ?? "");
  const [bio, setBio] = useState(creator?.bio ?? "");
  const [category, setCategory] = useState(creator?.category ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!userId) return;
    if (!displayName.trim()) return toast.error("Display name is required");
    setSaving(true);
    try {
      await ensureCreatorRow(userId);
      const { error } = await (supabase as any)
        .from("creator_profiles")
        .update({ display_name: displayName.trim(), bio: bio.trim() || null, category: category.trim() || null })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Profile saved");
      await onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-bold">Display name *</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Alex Creator" maxLength={50} className="mt-1" />
      </div>
      <CategoryPicker value={category} onChange={setCategory} />
      <div>
        <Label className="text-xs font-bold">Bio</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell fans what you create" maxLength={250} rows={3} className="mt-1 resize-none" />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/250</p>
      </div>
      <Button onClick={save} disabled={saving} className="w-full font-bold">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save profile
      </Button>
    </div>
  );
}

const CREATOR_CATEGORIES = [
  "Lifestyle", "Travel", "Content", "Gaming", "Music", "Art & Design",
  "Fashion & Beauty", "Food & Cooking", "Fitness & Health", "Education",
  "Tech", "Business", "Comedy", "Sports", "Photography", "Film & Video",
  "Podcast", "News & Politics", "Family & Parenting", "Pets & Animals",
  "Cars & Vehicles", "DIY & Crafts", "Spirituality", "Other",
];

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const isCustom = value && !CREATOR_CATEGORIES.includes(value);
  return (
    <div>
      <Label className="text-xs font-bold">Category</Label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/40 transition"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Tap to choose a category"}
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card p-2">
          <div className="flex flex-wrap gap-1.5">
            {CREATOR_CATEGORIES.map((c) => {
              const active = value === c;
              return (
                <button type="button"
                  key={c}
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-border">
            <Label className="text-[10px] font-bold text-muted-foreground">Custom</Label>
            <Input
              value={isCustom ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your own…"
              maxLength={40}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VerifyStep({ verified }: { verified: boolean }) {
  const navigate = useNavigate();
  if (verified) {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-extrabold text-sm">You're verified ✓</p>
        <p className="text-[11px] text-muted-foreground mt-1">You can withdraw earnings any time.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-[11px] text-muted-foreground">
        Verification protects your account and is required by law for payouts. We'll ask for a government ID and a quick selfie.
      </div>
      <Button onClick={() => navigate("/account/verification")} className="w-full font-bold">
        <ShieldCheck className="w-4 h-4" /> Start verification
      </Button>
    </div>
  );
}

function PayoutStep({ onSaved }: any) {
  const { data: status, isLoading } = useConnectStatus();

  // Auto-mark step done when Stripe onboarding is complete
  useEffect(() => {
    if (status?.details_submitted && status?.payouts_enabled) {
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.details_submitted, status?.payouts_enabled]);

  if (isLoading) {
    return <div className="h-32 bg-muted/30 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-[11px] text-muted-foreground">
        Choose <span className="font-bold">Stripe</span> for instant debit card payouts (US/EU/45+ countries) or <span className="font-bold">PayPal</span> for global coverage including Cambodia, Vietnam, and beyond.
      </div>
      <UnifiedPayoutCard balanceDollars={0} />
    </div>
  );
}

type TierType = "paid" | "free" | "custom";
type TierInterval = "month" | "3_months" | "6_months" | "year" | "lifetime";
const INTERVAL_OPTS: { v: TierInterval; label: string }[] = [
  { v: "month", label: "1 month" },
  { v: "3_months", label: "3 months" },
  { v: "6_months", label: "6 months" },
  { v: "year", label: "1 year" },
  { v: "lifetime", label: "Lifetime" },
];
const TRIAL_OPTS = [0, 3, 7, 14, 30];
const INTERVAL_MONTHS_LOCAL: Record<TierInterval, number> = {
  month: 1, "3_months": 3, "6_months": 6, year: 12, lifetime: 0,
};

const BADGE_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#ef4444", "#14b8a6", "#0ea5e9", "#a855f7", "#f43f5e",
];
const BADGE_EMOJIS = ["⭐", "👑", "💎", "🔥", "💖", "🚀", "🌟", "🎁", "🏆", "🦄", "✨", "🎯"];

function TierStep({ tiers, userId, onSaved }: any) {
  const [type, setType] = useState<TierType>("paid");
  const [interval, setInterval] = useState<TierInterval>("month");
  const [trialDays, setTrialDays] = useState<number>(0);
  const [name, setName] = useState("Supporter");
  const [price, setPrice] = useState("4.99");
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [discountMonths, setDiscountMonths] = useState<number>(0);
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [badgeColor, setBadgeColor] = useState<string>(BADGE_COLORS[0]);
  const [badgeEmoji, setBadgeEmoji] = useState<string>("⭐");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const cents = Math.round((parseFloat(price) || 0) * 100);
  const months = INTERVAL_MONTHS_LOCAL[interval];
  const monthlyHelper = type !== "free" && months > 1 && cents > 0
    ? `≈ $${(cents / 100 / months).toFixed(2)}/mo`
    : null;
  const discountedCents = discountPct > 0 ? Math.round(cents * (1 - discountPct / 100)) : cents;

  const reset = () => {
    setType("paid"); setInterval("month"); setTrialDays(0);
    setName(""); setPrice(""); setEditingId(null);
    setDiscountPct(0); setDiscountMonths(0);
    setWelcomeMsg(""); setBadgeColor(BADGE_COLORS[0]); setBadgeEmoji("⭐");
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setType(t.is_free ? "free" : t.is_custom_price ? "custom" : "paid");
    setInterval((t.billing_interval || "month") as TierInterval);
    setTrialDays(t.trial_days || 0);
    setName(t.name || "");
    setPrice(((t.price_cents || 0) / 100).toFixed(2));
    setDiscountPct(t.discount_percent || 0);
    setDiscountMonths(t.discount_months || 0);
    setWelcomeMsg(t.welcome_message || "");
    setBadgeColor(t.badge_color || BADGE_COLORS[0]);
    setBadgeEmoji(t.badge_emoji || "⭐");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    const { error } = await (supabase as any).from("subscription_tiers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tier deleted");
    await onSaved();
    if (editingId === id) reset();
  };

  const save = async () => {
    if (!userId) return;
    if (!name.trim()) return toast.error("Tier name required");
    if (type !== "free" && (!Number.isFinite(cents) || cents < 99)) {
      return toast.error("Minimum price is $0.99");
    }
    setSaving(true);
    try {
      const payload: any = {
        creator_id: userId,
        name: name.trim(),
        price_cents: type === "free" ? 0 : cents,
        currency: "USD",
        benefits: [],
        is_active: true,
        billing_interval: type === "free" ? "month" : interval,
        is_free: type === "free",
        is_custom_price: type === "custom",
        trial_days: type === "free" ? 0 : trialDays,
        discount_percent: type === "free" ? 0 : discountPct,
        discount_months: type === "free" || interval === "lifetime" ? 0 : discountMonths,
        welcome_message: welcomeMsg.trim() || null,
        badge_color: badgeColor,
        badge_emoji: badgeEmoji,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("subscription_tiers").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Tier updated");
      } else {
        payload.sort_order = tiers.length;
        const { error } = await (supabase as any).from("subscription_tiers").insert(payload);
        if (error) throw error;
        toast.success("Tier created");
      }
      reset();
      await onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save tier");
    } finally { setSaving(false); }
  };

  const Chip = ({ active, onClick, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border/60 hover:border-border"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-3">
      {tiers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Your tiers</p>
          {tiers.map((t: any) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                editingId === t.id
                  ? "border-primary/60 bg-primary/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: (t.badge_color || "#10b981") + "26", color: t.badge_color || "#10b981" }}
              >
                {t.badge_emoji || "⭐"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold truncate">{t.name}</p>
                  {t.is_free && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600">Free</span>}
                  {t.is_custom_price && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-secondary text-foreground">PWYW</span>}
                  {t.trial_days > 0 && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-secondary text-foreground">{t.trial_days}d trial</span>}
                  {t.discount_percent > 0 && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-600">-{t.discount_percent}%{t.discount_months ? ` x${t.discount_months}mo` : ""}</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t.is_free ? "Free" : `$${((t.price_cents || 0) / 100).toFixed(2)} / ${(t.billing_interval || "month").replace("_", " ")}`}
                </p>
              </div>
              <button type="button" onClick={() => startEdit(t)} className="text-[10px] font-bold text-primary px-2 py-1 hover:underline">Edit</button>
              <button type="button" onClick={() => remove(t.id)} className="text-[10px] font-bold text-destructive px-2 py-1 hover:underline">Delete</button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {editingId ? "Edit tier" : tiers.length > 0 ? "Add another tier" : "Create your first tier"}
          </p>
          {editingId && (
            <button type="button" onClick={reset} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Cancel</button>
          )}
        </div>

        {/* Type chips */}
        <div>
          <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Tier type</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Chip active={type === "paid"} onClick={() => setType("paid")}>Paid</Chip>
            <Chip active={type === "free"} onClick={() => setType("free")}>Free</Chip>
            <Chip active={type === "custom"} onClick={() => setType("custom")}>Pay what you want</Chip>
          </div>
        </div>

        {/* Billing interval */}
        {type !== "free" && (
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Billing period</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {INTERVAL_OPTS.map((o) => (
                <Chip key={o.v} active={interval === o.v} onClick={() => setInterval(o.v)}>{o.label}</Chip>
              ))}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <Label className="text-xs font-bold">Tier name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supporter, VIP…" className="mt-1" />
        </div>

        {/* Price */}
        {type !== "free" && (
          <div>
            <Label className="text-xs font-bold">
              {type === "custom" ? "Suggested minimum (USD)" : `Price every ${INTERVAL_OPTS.find((o) => o.v === interval)?.label.toLowerCase()} (USD)`}
            </Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="4.99"
              className="mt-1"
              inputMode="decimal"
            />
            {monthlyHelper && (
              <p className="text-[10px] text-muted-foreground mt-1">{monthlyHelper}</p>
            )}
          </div>
        )}

        {/* Discount */}
        {type !== "free" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">Launch discount (optional)</Label>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Percent off</p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 10, 20, 25, 50, 75].map((p) => (
                  <Chip key={p} active={discountPct === p} onClick={() => setDiscountPct(p)}>
                    {p === 0 ? "None" : `${p}%`}
                  </Chip>
                ))}
              </div>
            </div>
            {discountPct > 0 && interval !== "lifetime" && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Apply for</p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 3, 6, 12].map((m) => (
                    <Chip key={m} active={discountMonths === m} onClick={() => setDiscountMonths(m)}>
                      {m === 0 ? "First payment only" : m === 1 ? "1 month" : `${m} months`}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            {discountPct > 0 && (
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Fans pay ${(discountedCents / 100).toFixed(2)} {discountMonths > 0 ? `for ${discountMonths} ${discountMonths === 1 ? "month" : "months"}` : "on first payment"}, then ${(cents / 100).toFixed(2)}.
              </p>
            )}
          </div>
        )}

        {/* Trial */}
        {type !== "free" && interval !== "lifetime" && (
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Free trial</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {TRIAL_OPTS.map((d) => (
                <Chip key={d} active={trialDays === d} onClick={() => setTrialDays(d)}>
                  {d === 0 ? "None" : `${d} days`}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1.5">Preview</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-sm"
              style={{ backgroundColor: badgeColor + "26", color: badgeColor }}
            >
              {badgeEmoji}
            </span>
            <p className="font-bold text-sm">{name || "Tier name"}</p>
            {type === "free" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600">Free</span>}
            {type === "custom" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground">PWYW</span>}
            {trialDays > 0 && type !== "free" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary text-foreground">{trialDays}-day trial</span>}
            {discountPct > 0 && type !== "free" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">-{discountPct}%</span>}
          </div>
          <p className="text-base font-bold mt-1">
            {type === "free" ? "Free" : (
              <>
                {discountPct > 0 && (
                  <span className="text-muted-foreground line-through text-xs mr-1.5">${(cents / 100).toFixed(2)}</span>
                )}
                {type === "custom" ? "From $" : "$"}{(discountedCents / 100).toFixed(2)} / {INTERVAL_OPTS.find((o) => o.v === interval)?.label.toLowerCase()}
              </>
            )}
            {monthlyHelper && <span className="text-[10px] font-normal text-muted-foreground ml-1.5">{monthlyHelper}</span>}
          </p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full font-bold">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Save changes" : "Create tier"}
        </Button>
      </div>

      <PromoCodesManager userId={userId} />
    </div>
  );
}

function PromoCodesManager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("20");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: codes = [] } = useQuery({
    queryKey: ["creator-promo-codes", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("creator_promo_codes")
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const create = async () => {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    const pct = parseInt(percent, 10);
    if (!cleanCode) return toast.error("Code required");
    if (!pct || pct < 1 || pct > 100) return toast.error("Percent must be 1-100");
    setCreating(true);
    try {
      const { error } = await (supabase as any).from("creator_promo_codes").insert({
        creator_id: userId,
        code: cleanCode,
        percent_off: pct,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (error) throw error;
      toast.success(`Code ${cleanCode} created`);
      setCode(""); setMaxUses(""); setExpiresAt("");
      qc.invalidateQueries({ queryKey: ["creator-promo-codes", userId] });
    } catch (e: any) {
      toast.error(e.message?.includes("unique") ? "Code already exists" : e.message || "Failed");
    } finally { setCreating(false); }
  };

  const toggle = async (id: string, is_active: boolean) => {
    await (supabase as any).from("creator_promo_codes").update({ is_active: !is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-promo-codes", userId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this code?")) return;
    await (supabase as any).from("creator_promo_codes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-promo-codes", userId] });
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Gift className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Global promo codes</p>
      </div>
      <p className="text-[11px] text-muted-foreground">Codes work across all your tiers. Fans enter them at Stripe checkout.</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[10px] font-bold">Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
            placeholder="LAUNCH50"
            maxLength={24}
            className="mt-1 font-mono uppercase"
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold">% Off</Label>
          <Input value={percent} onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))} placeholder="20" inputMode="numeric" className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] font-bold">Max uses</Label>
          <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder="Unlimited" inputMode="numeric" className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] font-bold">Expires (optional)</Label>
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button onClick={create} disabled={creating} size="sm" className="w-full font-bold">
        {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create code
      </Button>

      {codes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {codes.map((c: any) => (
            <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border ${c.is_active ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-muted/30"}`}>
              <span className="font-mono text-xs font-bold">{c.code}</span>
              <span className="text-[10px] font-bold text-amber-600">−{c.percent_off}%</span>
              <span className="text-[10px] text-muted-foreground flex-1">
                {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""} uses
                {c.expires_at && ` · exp ${new Date(c.expires_at).toLocaleDateString()}`}
              </span>
              <button type="button" onClick={() => toggle(c.id, c.is_active)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">
                {c.is_active ? "Pause" : "Resume"}
              </button>
              <button type="button" onClick={() => remove(c.id)} className="text-[10px] font-bold text-destructive">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TipsStep({ enabled, userId, onSaved }: any) {
  const [on, setOn] = useState(enabled);
  const [saving, setSaving] = useState(false);

  const toggle = async (val: boolean) => {
    if (!userId) return;
    setOn(val);
    setSaving(true);
    try {
      await ensureCreatorRow(userId);
      const { error } = await (supabase as any)
        .from("creator_profiles")
        .update({ tips_enabled: val })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(val ? "Tips enabled" : "Tips disabled");
      await onSaved();
    } catch (e: any) {
      setOn(!val);
      toast.error(e.message || "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Heart className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold">Accept tips</p>
          <p className="text-[11px] text-muted-foreground">Show a "Send a tip" button on your profile</p>
        </div>
        <Switch checked={on} onCheckedChange={toggle} disabled={saving} />
      </div>
      <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-[11px] text-muted-foreground">
        ZIVO keeps 5% of each tip. Funds appear in your wallet within 24 hours.
      </div>
    </div>
  );
}

function LaunchStep({ enrollments, userId, onSaved }: any) {
  const [busy, setBusy] = useState<string | null>(null);
  const programs = [
    { id: "tips", label: "Fan Tips", desc: "One-time support from viewers", icon: Heart, accent: "hsl(340 75% 55%)" },
    { id: "subscriptions", label: "Subscriptions", desc: "Recurring monthly revenue", icon: Crown, accent: "hsl(38 92% 50%)" },
    { id: "affiliate", label: "Affiliate", desc: "Earn from referrals", icon: Gift, accent: "hsl(172 66% 50%)" },
    { id: "shop", label: "ZIVO Shop", desc: "Sell physical products", icon: Store, accent: "hsl(142 71% 45%)" },
    { id: "digital", label: "Digital Products", desc: "Sell guides, presets, courses", icon: PenTool, accent: "hsl(300 70% 55%)" },
  ];

  const enroll = async (programId: string) => {
    if (!userId) return;
    setBusy(programId);
    try {
      const { error } = await (supabase as any).from("creator_program_enrollments").insert({
        user_id: userId,
        program_id: programId,
        status: "active",
      });
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
      toast.success("Enrolled");
      await onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to enroll");
    } finally { setBusy(null); }
  };

  const isEnrolled = (id: string) => enrollments.some((e: any) => e.program_id === id);

  return (
    <div className="space-y-2">
      {programs.map((p) => {
        const enrolled = isEnrolled(p.id);
        return (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${p.accent}15`, color: p.accent }}>
              <p.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">{p.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.desc}</p>
            </div>
            {enrolled ? (
              <span className="zivo-badge bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="w-2.5 h-2.5" /> Active
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => enroll(p.id)} disabled={busy === p.id} className="text-[11px] h-7 px-3">
                {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Enroll"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
