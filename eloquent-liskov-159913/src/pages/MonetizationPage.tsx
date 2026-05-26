/**
 * MonetizationPage — ZIVO Signature Design (2026)
 * Real wallet data, complete program hub, creator tools
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, DollarSign, Crown, Gift, Heart, Sparkles,
  ChevronRight, TrendingUp, Zap, Star, Lock, Store,
  Video, Megaphone, ShieldCheck, BadgeCheck, Wallet,
  BookOpen, Users, Target, BarChart3, Headphones,
  PenTool, Package, Globe, Award, Mic, Camera,
  Palette, Music, Radio, Calendar, MessageCircle, ArrowRight,
  CheckCircle, Search, Filter, Eye, Play, Clock, Save,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { Switch } from "@/components/ui/switch";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { showToast } from "@/lib/native/toast";

const OF_SUB_PRICE_KEY = "zivo:of:sub_monthly_cents";
const OF_PPV_PRICE_KEY = "zivo:of:ppv_default_cents";
const OF_TIP_PRESETS_KEY = "zivo:of:tip_presets_cents";
const OF_WELCOME_MSG_KEY = "zivo:of:welcome_msg";

const readNumberStorage = (key: string, fallback: number): number => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const readPresetsStorage = (fallback: number[]): number[] => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(OF_TIP_PRESETS_KEY);
  if (!raw) return fallback;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((v) => typeof v === "number" && v >= 0)) return arr;
  } catch {}
  return fallback;
};

const centsToDollars = (cents: number) => (cents / 100).toFixed(2);
const dollarsToCents = (dollars: string) => {
  const n = parseFloat(dollars);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
};

type ProgramStatus = "join" | "explore" | "active" | "coming_soon";

interface Program {
  icon: any;
  label: string;
  description: string;
  status: ProgramStatus;
  programId: string;
  accent: string;
  badge?: string;
  lockInfo?: string;
}

const monetizationPrograms: Program[] = [
  { icon: Gift, label: "Creator Rewards", description: "Get Gifts for your top-performing videos and content.", status: "join", programId: "creator-rewards", accent: "hsl(340 75% 55%)" },
  { icon: Zap, label: "Service+", description: "Build connections with potential clients when you're LIVE.", status: "join", badge: "Recommended", programId: "service-plus", accent: "hsl(221 83% 53%)" },
  { icon: Crown, label: "Subscription", description: "Connect more closely with viewers through subscriber-only content.", status: "explore", lockInfo: "3/4", programId: "subscription", accent: "hsl(38 92% 50%)" },
  { icon: Heart, label: "Tips & Donations", description: "Let your audience show appreciation with direct tips.", status: "join", programId: "tips-donations", accent: "hsl(340 75% 55%)" },
  { icon: Video, label: "LIVE Gifts", description: "Receive virtual gifts from viewers during LIVE streams.", status: "join", programId: "live-gifts", accent: "hsl(263 70% 58%)" },
  { icon: Store, label: "ZIVO Shop", description: "Sell products directly to your audience.", status: "join", programId: "zivo-shop", accent: "hsl(142 71% 45%)" },
  { icon: Megaphone, label: "Brand Partnerships", description: "Get matched with brands for sponsored content.", status: "explore", badge: "New", programId: "brand-partnerships", accent: "hsl(25 95% 53%)" },
  { icon: Lock, label: "Locked Media", description: "Monetize exclusive photos and videos with pay-to-unlock.", status: "join", programId: "locked-media", accent: "hsl(263 70% 58%)" },
  { icon: PenTool, label: "Digital Products", description: "Sell e-books, courses, templates, and digital bundles.", status: "join", badge: "New", programId: "digital-products", accent: "hsl(300 70% 55%)" },
  { icon: Target, label: "Affiliate Marketing", description: "Earn commissions promoting ZIVO services.", status: "join", programId: "affiliate-marketing", accent: "hsl(172 66% 50%)" },
  { icon: Radio, label: "Audio Monetization", description: "Monetize live audio rooms with tickets and tips.", status: "explore", programId: "audio-monetization", accent: "hsl(263 70% 58%)" },
  { icon: Calendar, label: "Paid Events", description: "Host and sell tickets to events.", status: "explore", badge: "Soon", programId: "paid-events", accent: "hsl(199 89% 48%)" },
  { icon: BookOpen, label: "Course Builder", description: "Create and sell structured courses.", status: "join", programId: "course-builder", accent: "hsl(198 93% 59%)" },
  { icon: Palette, label: "Creator Marketplace", description: "Offer freelance services on ZIVO.", status: "explore", programId: "creator-marketplace", accent: "hsl(340 75% 55%)" },
  { icon: Music, label: "Sound Licensing", description: "License your original music to others.", status: "explore", programId: "sound-licensing", accent: "hsl(38 92% 50%)" },
  { icon: MessageCircle, label: "Paid DMs", description: "Charge for priority messages.", status: "explore", programId: "paid-dms", accent: "hsl(142 71% 45%)" },
  { icon: Camera, label: "Merch & Prints", description: "Sell physical products and merchandise.", status: "explore", badge: "Soon", programId: "merch-prints", accent: "hsl(340 75% 55%)" },
  { icon: Mic, label: "Podcast", description: "Monetize podcasts with premium episodes.", status: "explore", programId: "podcast", accent: "hsl(263 70% 58%)" },
];

const learningResources = [
  { title: "Getting started with Subscription", description: "Your key to deeper audience connections...", views: "7.7M views", icon: Crown, accent: "hsl(38 92% 50%)" },
  { title: "Going LIVE on ZIVO!", description: "Real-time fun, self-expression, and connecting...", views: "5.7M views", icon: Video, accent: "hsl(263 70% 58%)" },
  { title: "Unlocking LIVE monetization", description: "Explore all ways to monetize your streams...", views: "5.7M views", icon: DollarSign, accent: "hsl(142 71% 45%)" },
  { title: "Monetizing your content", description: "Turn views into real earnings...", views: "9.2M views", icon: TrendingUp, accent: "hsl(221 83% 53%)" },
  { title: "Building affiliate business", description: "Earn $10K+ monthly through referrals...", views: "3.1M views", icon: Target, accent: "hsl(172 66% 50%)" },
  { title: "Selling digital products", description: "Create and sell digital products...", views: "2.8M views", icon: PenTool, accent: "hsl(300 70% 55%)" },
];

const resourceTabs = ["Recommended", "Subscription", "LIVE rewards", "Creator Rewards", "Affiliate", "Digital Products"];

const quickActions = [
  { label: "Dashboard", icon: BarChart3, href: "/creator-dashboard", accent: "hsl(198 93% 59%)" },
  { label: "Analytics", icon: TrendingUp, href: "/creator-analytics", accent: "hsl(263 70% 58%)" },
  { label: "Affiliate", icon: Gift, href: "/affiliate-hub", accent: "hsl(172 66% 50%)" },
  { label: "Digital", icon: PenTool, href: "/digital-products", accent: "hsl(300 70% 55%)" },
  { label: "Shop", icon: Store, href: "/shop-dashboard", accent: "hsl(142 71% 45%)" },
  { label: "Wallet", icon: Wallet, href: "/wallet", accent: "hsl(38 92% 50%)" },
];

const programFilter = ["All", "Joined", "Available", "Coming Soon"] as const;
const zivoOFProgramIds = new Set([
  "subscription",
  "locked-media",
  "paid-dms",
  "live-gifts",
  "tips-donations",
  "creator-rewards",
]);
const zivoOFQuickActionHrefs = new Set([
  "/creator-dashboard",
  "/creator-analytics",
  "/wallet",
]);
const zivoOFResourceTitles = new Set([
  "Getting started with Subscription",
  "Going LIVE on ZIVO!",
  "Unlocking LIVE monetization",
  "Monetizing your content",
]);
const zivoOFResourceTabs = ["Recommended", "Subscription", "LIVE rewards", "Creator Rewards"];

const accentClassMap: Record<string, { text: string; bg: string }> = {
  "hsl(340 75% 55%)": { text: "text-rose-500", bg: "bg-rose-500/15" },
  "hsl(221 83% 53%)": { text: "text-blue-500", bg: "bg-blue-500/15" },
  "hsl(38 92% 50%)": { text: "text-amber-500", bg: "bg-amber-500/15" },
  "hsl(263 70% 58%)": { text: "text-violet-500", bg: "bg-violet-500/15" },
  "hsl(142 71% 45%)": { text: "text-emerald-500", bg: "bg-emerald-500/15" },
  "hsl(25 95% 53%)": { text: "text-orange-500", bg: "bg-orange-500/15" },
  "hsl(300 70% 55%)": { text: "text-fuchsia-500", bg: "bg-fuchsia-500/15" },
  "hsl(172 66% 50%)": { text: "text-teal-500", bg: "bg-teal-500/15" },
  "hsl(199 89% 48%)": { text: "text-sky-500", bg: "bg-sky-500/15" },
  "hsl(198 93% 59%)": { text: "text-cyan-500", bg: "bg-cyan-500/15" },
};

const getAccentClasses = (accent: string) => accentClassMap[accent] ?? { text: "text-primary", bg: "bg-primary/15" };

export default function MonetizationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeResTab, setActiveResTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState<typeof programFilter[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { isOFMode: zivoOFMode, setOFMode: setZivoOFMode } = useZivoOFMode();

  // OnlyFans-style pricing & settings (persisted in localStorage)
  const [subPrice, setSubPrice] = useState<string>(() => centsToDollars(readNumberStorage(OF_SUB_PRICE_KEY, 999)));
  const [ppvPrice, setPpvPrice] = useState<string>(() => centsToDollars(readNumberStorage(OF_PPV_PRICE_KEY, 500)));
  const [tipPresets, setTipPresets] = useState<string[]>(() =>
    readPresetsStorage([200, 500, 1000]).map(centsToDollars)
  );
  const [welcomeMsg, setWelcomeMsg] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(OF_WELCOME_MSG_KEY) ?? "";
  });
  const [savingOF, setSavingOF] = useState(false);

  const updateTipPreset = (idx: number, value: string) => {
    setTipPresets((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const saveOFSettings = async () => {
    setSavingOF(true);
    try {
      const subCents = dollarsToCents(subPrice);
      window.localStorage.setItem(OF_SUB_PRICE_KEY, String(subCents));
      window.localStorage.setItem(OF_PPV_PRICE_KEY, String(dollarsToCents(ppvPrice)));
      window.localStorage.setItem(
        OF_TIP_PRESETS_KEY,
        JSON.stringify(tipPresets.map(dollarsToCents))
      );
      window.localStorage.setItem(OF_WELCOME_MSG_KEY, welcomeMsg.trim());

      // Sync monthly price + welcome DM to a 'VIP' subscription tier so the
      // public/visitor profile shows the actual price (not the default Free tier).
      if (user && subCents > 0) {
        const tierPayload = {
          creator_id: user.id,
          name: "VIP",
          description: "Exclusive content, full access.",
          price_cents: subCents,
          billing_interval: "month",
          is_active: true,
          is_free: false,
          is_custom_price: false,
          welcome_message: welcomeMsg.trim() || null,
          sort_order: 0,
          badge_emoji: "👑",
        };
        const { data: existing, error: selectErr } = await (supabase as any)
          .from("subscription_tiers")
          .select("id")
          .eq("creator_id", user.id)
          .eq("name", "VIP")
          .maybeSingle();
        if (selectErr) throw selectErr;
        if (existing?.id) {
          const { error: updErr } = await (supabase as any)
            .from("subscription_tiers")
            .update(tierPayload)
            .eq("id", existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await (supabase as any)
            .from("subscription_tiers")
            .insert(tierPayload);
          if (insErr) throw insErr;
        }

        // Deactivate the free Supporter tier so visitors only see the paid VIP.
        // (Reactivate from the Creator Setup page if you want both later.)
        await (supabase as any)
          .from("subscription_tiers")
          .update({ is_active: false })
          .eq("creator_id", user.id)
          .eq("is_free", true);

        // Invalidate the public-tier cache so the visitor preview refetches.
        qc.invalidateQueries({ queryKey: ["public-creator-tiers", user.id] });
        qc.invalidateQueries({ queryKey: ["setup-tiers", user.id] });
      }

      await showToast("ZIVO OF settings saved", "success");
    } catch (err: any) {
      console.error("[saveOFSettings]", err);
      const msg = err?.message ? `Save failed: ${err.message}` : "Failed to save settings";
      await showToast(msg, "error");
    } finally {
      setSavingOF(false);
    }
  };

  // Real customer wallet balance (cents)
  const { balance: walletBalanceCents } = useCustomerWallet();

  // Lifetime tips received (Tips & Donations program payouts)
  const { data: tipsCount = 0 } = useQuery({
    queryKey: ["monetization-tips-count", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("creator_tips")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user!.id);
      return (count as number) || 0;
    },
    enabled: !!user,
  });

  // OF Mode — this-week earnings snapshot
  const { data: ofWeek } = useQuery({
    queryKey: ["of-week-earnings", user?.id],
    enabled: !!user && zivoOFMode,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [subsRes, tipsRes] = await Promise.all([
        (supabase as any)
          .from("creator_subscriptions")
          .select("id, price_cents, status")
          .eq("creator_id", user!.id)
          .eq("status", "active"),
        (supabase as any)
          .from("creator_tips")
          .select("amount_cents, created_at")
          .eq("creator_id", user!.id)
          .gte("created_at", sevenDaysAgo),
      ]);
      const subs = (subsRes.data as any[]) ?? [];
      const tips = (tipsRes.data as any[]) ?? [];
      const tipsCents = tips.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
      const mrrCents = subs.reduce((sum, s) => sum + (s.price_cents || 0), 0);
      return {
        activeSubs: subs.length,
        mrrCents,
        tipsCents,
        tipsCount: tips.length,
      };
    },
  });

  // Fetch all user enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["program-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_program_enrollments")
        .select("program_id, status")
        .eq("user_id", user!.id) as any;
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  // Fetch referral count
  const { data: referralCount } = useQuery({
    queryKey: ["monetization-referrals", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user!.id);
      return (count as number) || 0;
    },
    enabled: !!user,
  });

  const enrolledIds = new Set(enrollments.map((e: any) => e.program_id));
  const enrolledCount = enrolledIds.size;
  const balance = walletBalanceCents;

  // Filter programs
  const filteredPrograms = monetizationPrograms.filter((prog) => {
    if (zivoOFMode && !zivoOFProgramIds.has(prog.programId)) {
      return false;
    }

    const matchesSearch = !searchQuery || 
      prog.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (activeFilter) {
      case "Joined": return enrolledIds.has(prog.programId);
      case "Available": return prog.status === "join" && !enrolledIds.has(prog.programId);
      case "Coming Soon": return prog.badge === "Soon";
      default: return true;
    }
  });

  const visibleQuickActions = zivoOFMode
    ? quickActions.filter((action) => zivoOFQuickActionHrefs.has(action.href))
    : quickActions;

  const visibleResourceTabs = zivoOFMode ? zivoOFResourceTabs : resourceTabs;

  const visibleLearningResources = zivoOFMode
    ? learningResources.filter((res) => zivoOFResourceTitles.has(res.title))
    : learningResources;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Monetization – ZIVO" description="Earn money on ZIVO with subscriptions, tips, gifts, and creator rewards." />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" title="Back" aria-label="Back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/profile"))} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {searchOpen ? (
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programs..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            />
          ) : (
            <h1 className="text-lg font-extrabold flex-1 tracking-tight">Monetization</h1>
          )}
          <button type="button"
            title={searchOpen ? "Close search" : "Open search"}
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
            className="p-2 -mr-1 rounded-full hover:bg-muted/50 touch-manipulation"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 zivo-aurora">
        {/* ZIVO OF mode */}
        <div className="zivo-card-organic p-4 flex items-start gap-3">
          <div className="zivo-icon-pill w-10 h-10 rounded-xl shrink-0 text-rose-500 bg-rose-500/10">
            <Crown className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[13px]">ZIVO OF Mode</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Turn on the ZIVO OF workflow — exclusive content, paid subscriptions, PPV, and tips.</p>
              </div>
              <Switch
                checked={zivoOFMode}
                onCheckedChange={setZivoOFMode}
                aria-label="Toggle ZIVO OF Mode"
              />
            </div>
            {zivoOFMode && (
              <p className="text-[10px] font-semibold text-primary mt-2">OF Mode is ON: focused programs are shown first.</p>
            )}
          </div>
        </div>

        {/* OF Mode — This Week earnings snapshot */}
        {zivoOFMode && user && (
          <div className="zivo-card-organic p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="zivo-icon-pill w-10 h-10 rounded-xl shrink-0 text-emerald-500 bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px]">This Week</p>
                <p className="text-[11px] text-muted-foreground">Subscribers, tips, and recurring revenue at a glance.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Active subs", value: String(ofWeek?.activeSubs ?? 0), accent: "text-[#00AEEF]" },
                { label: "MRR", value: `$${((ofWeek?.mrrCents ?? 0) / 100).toFixed(0)}`, accent: "text-emerald-500" },
                { label: "Tips (7d)", value: `$${((ofWeek?.tipsCents ?? 0) / 100).toFixed(0)}`, accent: "text-amber-500" },
                { label: "Tip count", value: String(ofWeek?.tipsCount ?? 0), accent: "text-rose-500" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-muted/30 p-2 text-center border border-border/20">
                  <p className={`text-sm font-extrabold ${stat.accent}`}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate("/creator/subscribers")}
                className="rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all"
              >
                View subscribers
              </button>
              <button
                type="button"
                onClick={() => navigate("/wallet")}
                className="rounded-full border border-border/50 bg-muted/30 px-3 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] transition-all"
              >
                Payouts &amp; wallet
              </button>
            </div>
          </div>
        )}

        {/* OnlyFans-style pricing & settings */}
        {zivoOFMode && (
          <div className="zivo-card-organic p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="zivo-icon-pill w-10 h-10 rounded-xl shrink-0 text-[#00AEEF] bg-[#00AEEF]/10">
                <DollarSign className="h-5 w-5 text-[#00AEEF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px]">ZIVO OF Pricing</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Set your monthly subscription, default pay-per-view, and tip jar presets.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wide">
                  Monthly subscription (USD)
                </span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 focus-within:ring-2 focus-within:ring-[#00AEEF]/40">
                  <span className="text-sm font-bold text-muted-foreground">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={subPrice}
                    onChange={(e) => setSubPrice(e.target.value)}
                    placeholder="9.99"
                    className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground/70">/ month</span>
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wide">
                  Default PPV price (USD)
                </span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 focus-within:ring-2 focus-within:ring-[#00AEEF]/40">
                  <span className="text-sm font-bold text-muted-foreground">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    placeholder="5.00"
                    className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground/70">/ unlock</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Used as the suggested price for locked photos, videos, and DMs.
                </p>
              </label>

              <div>
                <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wide">
                  Tip jar presets (USD)
                </span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {tipPresets.map((amount, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/20 px-2.5 py-2 focus-within:ring-2 focus-within:ring-[#00AEEF]/40"
                    >
                      <span className="text-xs font-bold text-muted-foreground">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => updateTipPreset(i, e.target.value)}
                        className="flex-1 bg-transparent text-sm font-semibold outline-none w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wide">
                  Welcome DM for new subscribers
                </span>
                <textarea
                  value={welcomeMsg}
                  onChange={(e) => setWelcomeMsg(e.target.value.slice(0, 500))}
                  placeholder="Hey! Thanks for subscribing 💕 Drop me a DM and I'll send you something special."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00AEEF]/40 resize-none"
                />
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Sent automatically when a fan subscribes. {welcomeMsg.length}/500
                </p>
              </label>
            </div>

            <button
              type="button"
              onClick={() => { navigate("/feed?compose=locked"); }}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-4 py-2.5 text-[12px] font-bold text-[#00AEEF] hover:bg-[#00AEEF]/10 active:scale-[0.97] transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              Create locked post (PPV)
            </button>

            <button
              type="button"
              onClick={saveOFSettings}
              disabled={savingOF}
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-bold text-white bg-gradient-to-r from-[#00AEEF] to-[#0099D9] hover:from-[#00B8F5] hover:to-[#00A3E5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none transition-all shadow-lg shadow-[#00AEEF]/30 disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {savingOF ? "Saving..." : "Save settings"}
            </button>
          </div>
        )}

        {/* Creator workflow + public profile preview */}
        {zivoOFMode && user && (
          <div className="zivo-card-organic p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[13px]">Creator Workflow</p>
                <p className="text-[11px] text-muted-foreground">Set up, preview, and test your subscription funnel end-to-end.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/user/${user.id}?from=monetization&as=visitor`)}
                className="zivo-btn-signature px-3.5 py-2 text-[11px] flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Preview profile
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { title: "1. Setup tiers", desc: "Create or edit your subscription plans.", href: "/creator/setup?step=tier" },
                { title: "2. Public profile preview", desc: "Check how your profile page appears to fans.", href: `/user/${user.id}?from=monetization&as=visitor` },
                { title: "3. Go live with programs", desc: "Enable monetization programs and launch.", href: "/creator/setup?step=launch" },
                { title: "4. Account subscriptions", desc: "Review active subscriptions from account side.", href: "/account/subscriptions" },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/35 transition-colors touch-manipulation"
                >
                  <p className="text-[12px] font-bold leading-tight">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Earnings Hero — Real Data */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="zivo-card-organic p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="zivo-icon-pill w-10 h-10 rounded-xl text-emerald-500 bg-emerald-500/15">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Wallet Balance</p>
                  <p className="text-xl font-extrabold">${(balance / 100).toFixed(2)}</p>
                </div>
              </div>
              <Link to="/creator-dashboard" className="zivo-btn-signature px-4 py-2 text-[11px] flex items-center gap-1 touch-manipulation">
                Dashboard <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Programs", value: String(enrolledCount) },
                { label: "Referrals", value: String(referralCount ?? 0) },
                { label: "Tips", value: String(tipsCount) },
                { label: "Status", value: enrolledCount > 0 ? "Active" : "Start" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-muted/30 p-2 text-center border border-border/20">
                  <p className="text-xs font-bold">{stat.value}</p>
                  <p className="text-[8px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {visibleQuickActions.map((action, i) => (
              <Link key={action.label} to={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="zivo-card-organic p-3 flex flex-col items-center gap-2 touch-manipulation"
                >
                  <div className={`zivo-icon-pill w-10 h-10 rounded-xl ${getAccentClasses(action.accent).text} ${getAccentClasses(action.accent).bg}`}>
                    <action.icon className={`w-5 h-5 ${getAccentClasses(action.accent).text}`} />
                  </div>
                  <span className="text-[10px] font-bold text-center leading-tight">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Programs with Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[15px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Programs
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium">{filteredPrograms.length} shown</span>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
            {programFilter.map((filter) => (
              <button type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeFilter === filter
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {filter}
                {filter === "Joined" && enrolledCount > 0 && (
                  <span className="ml-1 text-[10px]">({enrolledCount})</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {filteredPrograms.map((prog, i) => {
                const isEnrolled = enrolledIds.has(prog.programId);
                return (
                  <motion.div
                    key={prog.programId}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Link to={`/monetization/program/${prog.programId}`}>
                      <div className="zivo-card-organic flex items-start gap-3 p-3.5 touch-manipulation">
                        <div className={`zivo-icon-pill w-9 h-9 rounded-xl shrink-0 mt-0.5 ${getAccentClasses(prog.accent).text} ${getAccentClasses(prog.accent).bg}`}>
                          <prog.icon className={`h-4 w-4 ${getAccentClasses(prog.accent).text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-[13px]">{prog.label}</p>
                            {prog.badge && <span className="zivo-badge">{prog.badge}</span>}
                            {prog.lockInfo && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-lg bg-muted text-muted-foreground flex items-center gap-0.5">
                                <Lock className="w-2 h-2" /> {prog.lockInfo}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{prog.description}</p>
                        </div>
                        {isEnrolled ? (
                          <span className="shrink-0 mt-1 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            <CheckCircle className="w-3 h-3" /> Joined
                          </span>
                        ) : prog.status === "join" ? (
                          <span className="shrink-0 mt-1 zivo-btn-signature px-3.5 py-1.5 text-[11px]">
                            Join
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-2" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredPrograms.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No programs match your filter</p>
                <button type="button" onClick={() => { setActiveFilter("All"); setSearchQuery(""); }} className="text-xs text-primary font-semibold mt-2">
                  Show all programs
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="zivo-divider" />

        {/* Learning Resources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[15px] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Resources
            </h2>
            <button type="button"
              onClick={() => navigate("/monetization/articles")}
              className="text-xs text-primary font-semibold flex items-center gap-0.5 touch-manipulation"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
            {visibleResourceTabs.map((tab, i) => (
              <button type="button"
                key={tab}
                onClick={() => setActiveResTab(i)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  i === activeResTab
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visibleLearningResources.map((res, i) => (
              <motion.button
                key={res.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                onClick={() => navigate(`/monetization/articles/${res.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`)}
                className="w-full flex items-start gap-3 text-left touch-manipulation active:bg-muted/10 rounded-xl p-2 -mx-2 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] leading-tight mb-1">{res.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{res.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Eye className="w-3 h-3 text-muted-foreground/50" />
                    <p className="text-[10px] text-muted-foreground/60">{res.views}</p>
                  </div>
                </div>
                <div className={`zivo-icon-pill w-14 h-14 rounded-2xl shrink-0 ${getAccentClasses(res.accent).text} ${getAccentClasses(res.accent).bg}`}>
                  <res.icon className={`w-6 h-6 ${getAccentClasses(res.accent).text}`} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="zivo-divider" />

        {/* Creator Progress */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Your Creator Journey
          </h2>
          <div className="zivo-card-organic p-4 space-y-4">
            {[
              { step: "Create Account", done: true },
              { step: "Complete Verification", done: false, href: "/account/verification" },
              { step: "Join First Program", done: enrolledCount > 0 },
              { step: "Earn Your First Dollar", done: balance > 0 },
              { step: "Reach 1K Followers", done: false },
            ].map((item, i) => (
              <button type="button"
                key={item.step}
                onClick={() => item.href && navigate(item.href)}
                className="flex items-center gap-3 w-full text-left touch-manipulation"
                disabled={!item.href || item.done}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  item.done ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                }`}>
                  {item.done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <p className={`text-sm font-medium flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>
                  {item.step}
                </p>
                {item.href && !item.done && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
              </button>
            ))}
          </div>
        </div>

        <div className="zivo-divider" />

        {/* CTAs */}
        {[
          { icon: BadgeCheck, title: "Get Verified", desc: "Unlock payouts and build trust.", href: "/account/verification", accent: "hsl(221 83% 53%)" },
          { icon: ShieldCheck, title: "Community Guidelines", desc: "Standards for creating on ZIVO.", href: "/monetization/articles", accent: "hsl(142 71% 45%)" },
          { icon: Award, title: "Creator Academy", desc: "500+ guides and tutorials.", href: "/monetization/articles", accent: "hsl(25 95% 53%)" },
          { icon: Globe, title: "Partner Program", desc: "Exclusive partner benefits.", href: "/affiliate-hub", accent: "hsl(263 70% 58%)" },
        ].map((cta, i) => (
          <Link key={cta.title} to={cta.href}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="zivo-card-organic p-4 flex items-center gap-3 touch-manipulation"
            >
              <div className={`zivo-icon-pill w-10 h-10 rounded-xl shrink-0 ${getAccentClasses(cta.accent).text} ${getAccentClasses(cta.accent).bg}`}>
                <cta.icon className={`h-5 w-5 ${getAccentClasses(cta.accent).text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px]">{cta.title}</p>
                <p className="text-[11px] text-muted-foreground">{cta.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            </motion.div>
          </Link>
        ))}

        {/* Watermark */}
        <div className="flex justify-center pt-4">
          <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO Monetization • 2026</span>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
