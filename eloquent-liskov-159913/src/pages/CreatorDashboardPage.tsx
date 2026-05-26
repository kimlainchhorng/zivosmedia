/**
 * CreatorDashboardPage — ZIVO Signature Design (2026)
 * Organic layout, aurora mesh, emerald identity
 * Creator types: "content" (general) | "of" (18+ adult / OnlyFans-style)
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveEarnings } from "@/hooks/useLiveEarnings";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import {
  ArrowLeft, DollarSign, Users, TrendingUp, Heart, Crown, BarChart3, Wallet,
  Eye, Video, Gift, Star, Zap, Clock, ChevronRight, ArrowUpRight,
  Download, Calendar, Target, Award, Store, PenTool, Share2, Bell,
  Sparkles, ArrowRight, Radio, Coins, CheckCircle2, Circle, ShieldCheck,
  CreditCard, UserCircle2, Rocket, Lock, Flame, ImagePlus, MessageSquare,
  ChevronDown, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";
import CreatorTipsLedger from "@/components/creator/CreatorTipsLedger";
import { VerifyIdentityButton } from "@/components/creator/VerifyIdentityButton";
import { cn } from "@/lib/utils";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";

// ─── Creator type persistence ─────────────────────────────────────────────────
const CREATOR_TYPE_KEY = "zivo:creator_type";
type CreatorType = "content" | "of" | null;

function getStoredCreatorType(): CreatorType {
  try { return (localStorage.getItem(CREATOR_TYPE_KEY) as CreatorType) ?? null; }
  catch { return null; }
}
function setStoredCreatorType(t: CreatorType) {
  try { if (t) localStorage.setItem(CREATOR_TYPE_KEY, t); else localStorage.removeItem(CREATOR_TYPE_KEY); }
  catch { /* ignore */ }
}

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { totals: liveEarnings } = useLiveEarnings();
  const { setOFMode } = useZivoOFMode();

  // Creator type state
  const [creatorType, setCreatorType] = useState<CreatorType>(getStoredCreatorType);
  const [showTypePicker, setShowTypePicker] = useState<boolean>(creatorType === null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [pendingType, setPendingType] = useState<"content" | "of" | null>(null);

  const { data: creator } = useQuery({
    queryKey: ["creator-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("creator_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tips = [] } = useQuery({
    queryKey: ["creator-tips", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("creator_tips").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["creator-subscribers", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("creator_subscriptions").select("*").eq("creator_id", user!.id).eq("status", "active").limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["subscription-tiers", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("subscription_tiers").select("*").eq("creator_id", user!.id).order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: postCount = 0 } = useQuery({
    queryKey: ["creator-post-count", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("store_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return (count as number) || 0;
    },
    enabled: !!user,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["creator-followers", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user!.id);
      return (count as number) || 0;
    },
    enabled: !!user,
  });

  const { data: totalViews = 0 } = useQuery({
    queryKey: ["creator-views", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_posts")
        .select("view_count")
        .eq("user_id", user!.id);
      return ((data as any[]) || []).reduce((s: number, p: any) => s + (p.view_count ?? 0), 0);
    },
    enabled: !!user,
  });

  const totalTips = tips.reduce((sum: number, t: any) => sum + (t.amount_cents || 0), 0);
  const liveEarningsCents = liveEarnings?.earnings_cents ?? 0;
  const liveCoins = liveEarnings?.total_coins_received ?? 0;
  const totalEarnings = (creator?.total_earnings_cents || 0) + totalTips + liveEarningsCents;

  // ─── Apply creator type ───────────────────────────────────────────────────
  const applyCreatorType = async (type: "content" | "of") => {
    setStoredCreatorType(type);
    setCreatorType(type);
    setShowTypePicker(false);
    setPendingType(null);
    setAgeConfirmed(false);
    // OF mode: enable ZIVO OF mode globally
    if (type === "of") setOFMode(true);
    else setOFMode(false);
    // Persist OF status to Supabase so discovery/search can filter this profile
    if (user) {
      await (supabase as any)
        .from("profiles")
        .update({ is_of_creator: type === "of" })
        .eq("user_id", user.id);
    }
  };

  // ─── OF-specific quick actions ────────────────────────────────────────────
  const ofQuickActions = [
    { label: "Exclusive Content", icon: Lock, href: "/digital-products", accent: "hsl(340 75% 55%)" },
    { label: "Subscriptions", icon: Crown, href: "/monetization", accent: "hsl(38 92% 50%)" },
    { label: "Tips & PPV", icon: Heart, href: "/monetization#tips", accent: "hsl(0 84% 60%)" },
    { label: "Gallery", icon: ImagePlus, href: "/digital-products", accent: "hsl(263 70% 58%)" },
    { label: "DM Requests", icon: MessageSquare, href: "/chat", accent: "hsl(199 89% 48%)" },
    { label: "Promotions", icon: Flame, href: "/affiliate-hub", accent: "hsl(25 95% 53%)" },
    { label: "Analytics", icon: BarChart3, href: "/creator-analytics", accent: "hsl(172 66% 50%)" },
    { label: "Wallet", icon: Wallet, href: "/wallet", accent: "hsl(142 71% 45%)" },
    { label: "Share Profile", icon: Share2, href: "/qr-profile", accent: "hsl(221 83% 53%)" },
  ];

  // ─── OF-specific setup steps ──────────────────────────────────────────────
  const ofSetupSteps = [
    { label: "Complete your profile", desc: "Add bio, avatar & links", icon: UserCircle2, href: "/account/profile-edit", done: !!(creator?.display_name && creator?.bio), accent: "hsl(263 70% 58%)" },
    { label: "Verify your identity (18+)", desc: "Required for adult content payouts", icon: ShieldCheck, href: "/account/verification", done: !!creator?.is_verified, accent: "hsl(340 75% 55%)" },
    { label: "Add payout method", desc: "Bank, PayPal or Wallet", icon: CreditCard, href: "/creator/setup?step=payout", done: !!creator?.payout_method, accent: "hsl(38 92% 50%)" },
    { label: "Create subscriber tiers", desc: "Free / paid / premium", icon: Crown, href: "/monetization", done: tiers.length > 0, accent: "hsl(0 84% 60%)" },
    { label: "Enable tips & PPV", desc: "Sell exclusive content & messages", icon: Heart, href: "/monetization#tips", done: !!creator?.tips_enabled, accent: "hsl(25 95% 53%)" },
    { label: "Set your OnlyFans link", desc: "Add your OF link in profile", icon: Flame, href: "/account/profile-edit", done: !!(creator as any)?.social_onlyfans, accent: "hsl(0 84% 60%)" },
  ];

  const overviewCards = [
    { label: "Earnings", value: `$${(totalEarnings / 100).toFixed(2)}`, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "Subscribers", value: String(subscribers.length), icon: Users, accent: "hsl(221 83% 53%)" },
    { label: "Tips", value: `$${(totalTips / 100).toFixed(2)}`, icon: Heart, accent: "hsl(340 75% 55%)" },
    { label: "Live Gifts", value: `$${(liveEarningsCents / 100).toFixed(2)}`, icon: Gift, accent: "hsl(25 95% 53%)" },
    { label: "Tier Plans", value: String(tiers.length), icon: Crown, accent: "hsl(38 92% 50%)" },
    { label: "Views", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews), icon: Eye, accent: "hsl(263 70% 58%)" },
  ];

  // OF-specific overview — subscriber-centric stats
  const ofOverviewCards = [
    { label: "Subscribers", value: String(subscribers.length), icon: Users, accent: "hsl(340 75% 55%)" },
    { label: "Total Earned", value: `$${(totalEarnings / 100).toFixed(2)}`, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "Tips Income", value: `$${(totalTips / 100).toFixed(2)}`, icon: Heart, accent: "hsl(0 84% 60%)" },
    { label: "Live Gifts", value: `$${(liveEarningsCents / 100).toFixed(2)}`, icon: Gift, accent: "hsl(25 95% 53%)" },
    { label: "Sub Tiers", value: String(tiers.length), icon: Crown, accent: "hsl(38 92% 50%)" },
    { label: "PPV / DMs", value: "—", icon: Lock, accent: "hsl(263 70% 58%)" },
  ];

  const quickActions = [
    { label: "Live Earnings", icon: Radio, href: "/creator/live-earnings", accent: "hsl(25 95% 53%)" },
    { label: "Analytics", icon: BarChart3, href: "/creator-analytics", accent: "hsl(263 70% 58%)" },
    { label: "Monetization", icon: DollarSign, href: "/monetization", accent: "hsl(142 71% 45%)" },
    { label: "Affiliate Hub", icon: Gift, href: "/affiliate-hub", accent: "hsl(172 66% 50%)" },
    { label: "Digital Products", icon: PenTool, href: "/digital-products", accent: "hsl(300 70% 55%)" },
    { label: "ZIVO Shop", icon: Store, href: "/shop-dashboard", accent: "hsl(142 71% 45%)" },
    { label: "Wallet", icon: Wallet, href: "/wallet", accent: "hsl(38 92% 50%)" },
    { label: "Scheduler", icon: Calendar, href: "/content-scheduler", accent: "hsl(263 70% 58%)" },
    { label: "Share", icon: Share2, href: "/qr-profile", accent: "hsl(199 89% 48%)" },
  ];

  const milestones = [
    { label: "First Post", target: 1, current: postCount, icon: Video, accent: "hsl(263 70% 58%)" },
    { label: "10 Followers", target: 10, current: followerCount, icon: Users, accent: "hsl(221 83% 53%)" },
    { label: "First Tip", target: 1, current: tips.length > 0 ? 1 : 0, icon: Heart, accent: "hsl(340 75% 55%)" },
    { label: "First Sub", target: 1, current: subscribers.length > 0 ? 1 : 0, icon: Crown, accent: "hsl(38 92% 50%)" },
    { label: "$100 Earned", target: 100, current: totalEarnings / 100, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "1K Views", target: 1000, current: totalViews, icon: Eye, accent: "hsl(263 70% 58%)" },
  ];

  // OF-specific milestones — subscriber & revenue focused
  const ofMilestones = [
    { label: "First Subscriber", target: 1, current: subscribers.length > 0 ? 1 : 0, icon: Users, accent: "hsl(340 75% 55%)" },
    { label: "10 Subscribers", target: 10, current: subscribers.length, icon: Users, accent: "hsl(0 84% 60%)" },
    { label: "First Tip", target: 1, current: tips.length > 0 ? 1 : 0, icon: Heart, accent: "hsl(25 95% 53%)" },
    { label: "First PPV Sale", target: 1, current: 0, icon: Lock, accent: "hsl(263 70% 58%)" },
    { label: "$100 from Subs", target: 100, current: totalEarnings / 100, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "50 Subscribers", target: 50, current: subscribers.length, icon: Crown, accent: "hsl(38 92% 50%)" },
  ];

  const growthTips = [
    { icon: Video, title: "Post consistently", desc: "3-5 posts/week keeps you visible.", accent: "hsl(263 70% 58%)" },
    { icon: Zap, title: "Go LIVE weekly", desc: "LIVE creators earn 3x more.", accent: "hsl(38 92% 50%)" },
    { icon: Target, title: "Engage early", desc: "Reply to comments in the first hour.", accent: "hsl(221 83% 53%)" },
    { icon: Gift, title: "Promote affiliates", desc: "Share links in bio & pinned posts.", accent: "hsl(172 66% 50%)" },
    { icon: Star, title: "Create exclusives", desc: "Sub-only content drives 5x conversions.", accent: "hsl(340 75% 55%)" },
  ];

  // OF-specific growth tips — monetization-first advice
  const ofGrowthTips = [
    { icon: Lock, title: "Post exclusive content daily", desc: "Subscribers expect fresh content — consistency is key to retaining paying fans.", accent: "hsl(340 75% 55%)" },
    { icon: MessageSquare, title: "Reply to every DM", desc: "DM engagement boosts retention. Charge for custom DMs to increase revenue.", accent: "hsl(263 70% 58%)" },
    { icon: Flame, title: "Schedule PPV drops weekly", desc: "Tease PPV content on your feed to create FOMO and drive purchases.", accent: "hsl(0 84% 60%)" },
    { icon: Crown, title: "Offer a free trial tier", desc: "A 7-day free trial converts 3x more visitors into paying subscribers.", accent: "hsl(38 92% 50%)" },
    { icon: Zap, title: "Run limited-time promos", desc: "Time-limited discounts (25% off, 3-day deal) spike subscriber sign-ups.", accent: "hsl(25 95% 53%)" },
    { icon: Users, title: "Cross-promote on socials", desc: "Share teaser content on Twitter/X, TikTok and Reddit to drive traffic.", accent: "hsl(221 83% 53%)" },
  ];

  const accentClasses: Record<string, { text: string; bg: string; bar: string }> = {
    "hsl(263 70% 58%)": { text: "text-violet-500", bg: "bg-violet-500/15", bar: "bg-violet-500" },
    "hsl(142 71% 45%)": { text: "text-emerald-500", bg: "bg-emerald-500/15", bar: "bg-emerald-500" },
    "hsl(38 92% 50%)": { text: "text-amber-500", bg: "bg-amber-500/15", bar: "bg-amber-500" },
    "hsl(340 75% 55%)": { text: "text-rose-500", bg: "bg-rose-500/15", bar: "bg-rose-500" },
    "hsl(199 89% 48%)": { text: "text-sky-500", bg: "bg-sky-500/15", bar: "bg-sky-500" },
    "hsl(172 66% 50%)": { text: "text-teal-500", bg: "bg-teal-500/15", bar: "bg-teal-500" },
    "hsl(0 84% 60%)": { text: "text-red-500", bg: "bg-red-500/15", bar: "bg-red-500" },
    "hsl(25 95% 53%)": { text: "text-orange-500", bg: "bg-orange-500/15", bar: "bg-orange-500" },
    "hsl(221 83% 53%)": { text: "text-blue-500", bg: "bg-blue-500/15", bar: "bg-blue-500" },
    "hsl(300 70% 55%)": { text: "text-fuchsia-500", bg: "bg-fuchsia-500/15", bar: "bg-fuchsia-500" },
  };
  const getAccentClasses = (accent: string) => accentClasses[accent] ?? { text: "text-primary", bg: "bg-primary/15", bar: "bg-primary" };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Creator Dashboard – ZIVO" description="Manage your creator earnings, subscribers, and content on ZIVO." noIndex />

      {/* ── Creator Type Picker Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showTypePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm flex flex-col gap-5"
            >
              {/* Title */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-[22px] font-extrabold tracking-tight">Choose your creator type</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Pick the workflow that matches how you create. You can switch anytime.
                </p>
              </div>

              {/* Content Creator card */}
              <button
                type="button"
                onClick={() => { setPendingType("content"); setAgeConfirmed(false); }}
                className={cn(
                  "w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                  pendingType === "content"
                    ? "border-primary bg-primary/8"
                    : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/4"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-[15px]">Content Creator</p>
                      {pendingType === "content" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                      Videos, posts, live streams, affiliate links, digital products & subscriptions. Open to all ages.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Posts & Reels", "Live", "Subscriptions", "Shop", "Affiliates"].map((t) => (
                        <span key={t} className="text-[10px] font-semibold bg-muted/60 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>

              {/* OF Creator card */}
              <button
                type="button"
                onClick={() => { setPendingType("of"); setAgeConfirmed(false); }}
                className={cn(
                  "w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98]",
                  pendingType === "of"
                    ? "border-rose-500 bg-rose-500/8"
                    : "border-border/50 bg-card hover:border-rose-500/40 hover:bg-rose-500/4"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                    <Flame className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-[15px]">OF Creator</p>
                      <span className="text-[9px] font-extrabold bg-rose-500/15 text-rose-500 rounded-full px-2 py-0.5 uppercase tracking-wide">18+</span>
                      {pendingType === "of" && <CheckCircle2 className="h-4 w-4 text-rose-500 shrink-0" />}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                      OnlyFans-style workflow — exclusive paid content, PPV, tips, DMs and subscriber tiers. Adults only.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Exclusive Content", "PPV", "Paid DMs", "Tips", "Subscriber Tiers"].map((t) => (
                        <span key={t} className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 18+ age confirmation — only shown when OF is selected */}
                <AnimatePresence>
                  {pendingType === "of" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-rose-500/20">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <div
                            onClick={(e) => { e.stopPropagation(); setAgeConfirmed((v) => !v); }}
                            className={cn(
                              "mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                              ageConfirmed ? "bg-rose-500 border-rose-500" : "border-border"
                            )}
                          >
                            {ageConfirmed && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-[12px] text-muted-foreground leading-relaxed" onClick={(e) => { e.stopPropagation(); setAgeConfirmed((v) => !v); }}>
                            I confirm I am 18 years of age or older and agree to ZIVO's adult content terms.
                          </span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Apply button */}
              <button
                type="button"
                disabled={!pendingType || (pendingType === "of" && !ageConfirmed)}
                onClick={() => pendingType && applyCreatorType(pendingType)}
                className={cn(
                  "w-full h-13 rounded-2xl font-extrabold text-[15px] transition-all active:scale-[0.98]",
                  pendingType === "of" && ageConfirmed
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : pendingType === "content"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                )}
              >
                {pendingType === "of" ? "Apply OF Creator Workflow" : pendingType === "content" ? "Apply Content Creator" : "Select a creator type"}
              </button>

              {/* Skip — only show if user already has a type set */}
              {creatorType && (
                <button type="button" onClick={() => setShowTypePicker(false)} className="text-center text-[13px] text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with ZIVO ribbon */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/more")} aria-label="Back" title="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Creator Dashboard</h1>
          {/* Creator type badge — tap to switch */}
          <button
            type="button"
            onClick={() => { setPendingType(creatorType); setAgeConfirmed(false); setShowTypePicker(true); }}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition-colors",
              creatorType === "of"
                ? "bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25"
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            )}
          >
            {creatorType === "of" ? <Flame className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {creatorType === "of" ? "OF Creator" : creatorType === "content" ? "Content" : "Set Type"}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <button type="button" onClick={() => navigate("/creator-analytics")} aria-label="Open analytics" title="Open analytics" className="p-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <BarChart3 className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>

      {/* OF Creator mode banner */}
      {creatorType === "of" && (
        <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-pink-500/5 px-4 py-3">
          <Flame className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 flex-1">
            OF Creator workflow active — 18+ exclusive content tools enabled
          </p>
          <button
            type="button"
            onClick={() => { setPendingType(null); setAgeConfirmed(false); setShowTypePicker(true); }}
            className="text-[10px] font-bold text-rose-500 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      )}

      <div className="px-4 py-5 space-y-6 zivo-aurora">
        {/* Hero Earnings — ZIVO organic card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="zivo-card-organic p-5 text-center"
        >
          <div className="absolute top-3 right-3">
            <span className={cn("zivo-badge", creatorType === "of" && "!bg-rose-500/15 !text-rose-500")}>
              {creatorType === "of" ? <Flame className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
              {creatorType === "of" ? "OF Creator" : "Creator"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
            {creatorType === "of" ? "OF Total Earnings" : "Lifetime Earnings"}
          </p>
          <p className="text-4xl font-extrabold tracking-tight">${(totalEarnings / 100).toFixed(2)}</p>

          {/* OF earnings breakdown strip */}
          {creatorType === "of" && (
            <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-border/20">
              <div className="text-center">
                <p className="text-[13px] font-extrabold text-rose-500">${(totalTips / 100).toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Tips</p>
              </div>
              <div className="w-px bg-border/30" />
              <div className="text-center">
                <p className="text-[13px] font-extrabold">${(liveEarningsCents / 100).toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Live Gifts</p>
              </div>
              <div className="w-px bg-border/30" />
              <div className="text-center">
                <p className="text-[13px] font-extrabold text-amber-500">{subscribers.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Subscribers</p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 mt-4">
            <button type="button" onClick={() => navigate("/wallet")} className="zivo-btn-signature px-5 py-2.5 text-xs flex items-center gap-1.5 touch-manipulation">
              <Wallet className="w-3.5 h-3.5" /> Withdraw
            </button>
            <button type="button" onClick={() => navigate("/creator-analytics")} className="px-5 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center gap-1.5 border border-border/30">
              <TrendingUp className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>
        </motion.div>

        {/* Setup Your Monetization — onboarding checklist (type-aware) */}
        {(() => {
          const setupSteps = creatorType === "of" ? ofSetupSteps : [
            { label: "Complete your profile", desc: "Add bio, avatar & links", icon: UserCircle2, href: "/creator/setup?step=profile", done: !!(creator?.display_name && creator?.bio), accent: "hsl(263 70% 58%)" },
            { label: "Verify your identity", desc: "Required for payouts", icon: ShieldCheck, href: "/creator/setup?step=verify", done: !!creator?.is_verified, accent: "hsl(142 71% 45%)" },
            { label: "Add payout method", desc: "Bank, PayPal or Wallet", icon: CreditCard, href: "/creator/setup?step=payout", done: !!creator?.payout_method, accent: "hsl(38 92% 50%)" },
            { label: "Create a subscription tier", desc: "Set your monthly price", icon: Crown, href: "/creator/setup?step=tier", done: tiers.length > 0, accent: "hsl(340 75% 55%)" },
            { label: "Enable tips", desc: "Let fans support you", icon: Heart, href: "/creator/setup?step=tips", done: !!creator?.tips_enabled, accent: "hsl(199 89% 48%)" },
            { label: "Launch your first program", desc: "Affiliate, shop or digital", icon: Rocket, href: "/creator/setup?step=launch", done: (creator?.total_earnings_cents ?? 0) > 0, accent: "hsl(172 66% 50%)" },
          ];
          const completed = setupSteps.filter((s) => s.done).length;
          const pct = Math.round((completed / setupSteps.length) * 100);
          if (completed === setupSteps.length) return null;
          const setupAccentClass = creatorType === "of" ? "text-rose-500 bg-rose-500/20" : "text-emerald-500 bg-emerald-500/20";
          const setupIconClass = creatorType === "of" ? "text-rose-500" : "text-emerald-500";
          const setupProgressClass = creatorType === "of"
            ? "bg-gradient-to-r from-rose-500 to-red-500"
            : "bg-gradient-to-r from-emerald-500 to-teal-500";

          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="zivo-card-organic p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("zivo-icon-pill w-9 h-9 rounded-xl", setupAccentClass)}>
                    {creatorType === "of" ? <Flame className={cn("w-4 h-4", setupIconClass)} /> : <Rocket className={cn("w-4 h-4", setupIconClass)} />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[15px] leading-tight">
                      {creatorType === "of" ? "OF Creator Setup" : "Setup Your Monetization"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">{completed} of {setupSteps.length} complete</p>
                  </div>
                </div>
                <span className={cn("text-xs font-extrabold", setupIconClass)}>{pct}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", setupProgressClass)}
                />
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {setupSteps.map((step) => (
                  <Link
                    key={step.label}
                    to={step.href}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border touch-manipulation active:scale-[0.98] transition-transform ${
                      step.done ? "border-border/20 bg-muted/20 opacity-70" : "border-border/40 bg-card hover:bg-muted/30"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className={cn("w-5 h-5 shrink-0", setupIconClass)} />
                    ) : (
                      <div className={cn("zivo-icon-pill w-9 h-9 rounded-xl shrink-0", getAccentClasses(step.accent).text, getAccentClasses(step.accent).bg)}>
                        <step.icon className={cn("w-4 h-4", getAccentClasses(step.accent).text)} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-tight ${step.done ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                    {!step.done && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {/* Live Earnings Spotlight — only shown if user has earned from gifts */}
        {liveEarningsCents > 0 && (
          <motion.button
            onClick={() => navigate("/creator/live-earnings")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-left relative rounded-[20px] overflow-hidden touch-manipulation active:scale-[0.99] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500" />
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15" />
            <div className="relative z-10 p-4 flex items-center gap-3 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-base">${(liveEarningsCents / 100).toFixed(2)}</p>
                  <span className="text-[9px] bg-white/20 rounded-full px-1.5 py-0.5 font-bold">LIVE</span>
                </div>
                <p className="text-[11px] text-white/85 flex items-center gap-1 mt-0.5">
                  <Coins className="w-3 h-3" />
                  {liveCoins.toLocaleString()} coins from gifts · Tap to withdraw
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 shrink-0" />
            </div>
          </motion.button>
        )}

        {/* Stats Grid — ZIVO icon pills */}
        <div className="grid grid-cols-3 gap-2.5">
          {(creatorType === "of" ? ofOverviewCards : overviewCards).map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
              className="zivo-card-organic p-3 text-center"
            >
              <div className={cn("zivo-icon-pill mx-auto mb-1.5 w-9 h-9 rounded-xl", getAccentClasses(card.accent).text, getAccentClasses(card.accent).bg)}>
                <card.icon className={cn("w-4 h-4", getAccentClasses(card.accent).text)} />
              </div>
              <p className="text-sm font-bold">{card.value}</p>
              <p className="text-[9px] text-muted-foreground">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions — 3x3 grid (type-aware) */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            {creatorType === "of" ? <Flame className="w-4 h-4 text-rose-500" /> : <Zap className="w-4 h-4 text-primary" />}
            {creatorType === "of" ? "OF Quick Actions" : "Quick Actions"}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(creatorType === "of" ? ofQuickActions : quickActions).map((action, i) => (
              <Link key={action.label} to={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                  className="zivo-card-organic p-3 flex flex-col items-center gap-1.5 touch-manipulation"
                >
                  <div className={cn("zivo-icon-pill w-9 h-9 rounded-xl", getAccentClasses(action.accent).text, getAccentClasses(action.accent).bg)}>
                    <action.icon className={cn("w-4 h-4", getAccentClasses(action.accent).text)} />
                  </div>
                  <span className="text-[9px] font-bold text-center leading-tight">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            {creatorType === "of"
              ? <><Flame className="w-4 h-4 text-rose-500" /><span>OF Milestones</span></>
              : <><Target className="w-4 h-4 text-primary" /><span>Milestones</span></>
            }
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {(creatorType === "of" ? ofMilestones : milestones).map((m, i) => {
              const pct = Math.min(100, (m.current / m.target) * 100);
              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  className="zivo-card-organic p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className={cn("w-4 h-4", getAccentClasses(m.accent).text)} />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden mb-1">
                    <motion.div
                      initial={false}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={cn("h-full rounded-full origin-left", getAccentClasses(m.accent).bar)}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground">{m.current} / {m.target}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* KYC banner — required for payouts. Show if creator profile exists
            but isn't verified yet. */}
        {user?.id && creator && !creator.is_verified && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Verify your identity to enable payouts</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Stripe Identity runs the check (ID + selfie). Takes ~2 minutes. Required by every payout rail.
              </p>
              <div className="mt-2.5">
                <VerifyIdentityButton size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" label="Start verification" />
              </div>
            </div>
          </div>
        )}

        {/* Tips ledger — full per-tip breakdown with rail + status */}
        {user?.id && (
          <div className="mb-4">
            <CreatorTipsLedger creatorId={user.id} />
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            {creatorType === "of"
              ? <><Flame className="w-4 h-4 text-rose-500" /><span>OF Activity</span></>
              : <><Clock className="w-4 h-4 text-primary" /><span>Recent Activity</span></>
            }
          </h2>
          <div className="space-y-1.5">
            {tips.length > 0 ? tips.slice(0, 5).map((tip: any) => (
              <div key={tip.id} className="zivo-card-organic flex items-center gap-3 p-3">
                <div className="zivo-icon-pill w-8 h-8 rounded-lg text-rose-500 bg-rose-500/15">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Tip received</p>
                  <p className="text-[10px] text-muted-foreground">${(tip.amount_cents / 100).toFixed(2)} · {formatDistanceToNow(new Date(tip.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            )) : (
              <>
                {(creatorType === "of" ? [
                  { text: "Post exclusive content to attract your first subscriber.", icon: Lock, accent: "hsl(340 75% 55%)" },
                  { text: "Set up a PPV post — fans pay to unlock your content.", icon: Flame, accent: "hsl(0 84% 60%)" },
                  { text: "Enable paid DMs to start monetizing conversations.", icon: MessageSquare, accent: "hsl(263 70% 58%)" },
                ] : [
                  { text: "Share content to start earning tips!", icon: Heart, accent: "hsl(340 75% 55%)" },
                  { text: "Create exclusives to attract subscribers!", icon: Crown, accent: "hsl(38 92% 50%)" },
                  { text: "Post your first content to track views.", icon: Eye, accent: "hsl(221 83% 53%)" },
                ]).map((act, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="zivo-card-organic flex items-center gap-3 p-3"
                  >
                    <act.icon className={cn("w-4 h-4 shrink-0", getAccentClasses(act.accent).text)} />
                    <p className="text-[11px] text-muted-foreground flex-1">{act.text}</p>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Subscription / Subscriber Tiers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[15px] flex items-center gap-2">
              {creatorType === "of"
                ? <><Flame className="w-4 h-4 text-rose-500" /><span>Subscriber Tiers & Plans</span></>
                : <><Crown className="w-4 h-4 text-primary" /><span>Subscription Tiers</span></>
              }
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{tiers.length} tiers</span>
              <Link to="/monetization" className="text-[10px] font-bold text-primary hover:underline">+ Add</Link>
            </div>
          </div>
          {tiers.length > 0 ? (
            <div className="space-y-1.5">
              {tiers.map((tier: any) => {
                const interval = (tier.billing_interval || "month").replace("_", " ");
                const priceLabel = tier.is_free
                  ? "Free"
                  : `${tier.is_custom_price ? "From $" : "$"}${((tier.price_cents || 0) / 100).toFixed(2)} / ${interval}`;
                const tierAccent = creatorType === "of" ? "hsl(340 75% 55%)" : "hsl(38 92% 50%)";
                return (
                  <div key={tier.id} className="zivo-card-organic flex items-center gap-3 p-3">
                    <div className={cn("zivo-icon-pill w-9 h-9 rounded-xl", creatorType === "of" ? "text-rose-500 bg-rose-500/20" : "text-amber-500 bg-amber-500/20")}>
                      {(creatorType as string) === "of" ? <Flame className={cn("w-4 h-4", (creatorType as string) === "of" ? "text-rose-500" : "text-amber-500")} /> : <Crown className={cn("w-4 h-4", (creatorType as string) === "of" ? "text-rose-500" : "text-amber-500")} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm truncate">{tier.name}</p>
                        {tier.is_free && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600">Free</span>}
                        {tier.is_custom_price && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-secondary text-foreground">PWYW</span>}
                        {tier.trial_days > 0 && <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-secondary text-foreground">{tier.trial_days}d trial</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{priceLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Link to="/monetization" className="block">
              <div className="zivo-card-organic p-6 text-center border-dashed hover:border-primary/40 transition-colors">
                {creatorType === "of"
                  ? <Flame className="w-10 h-10 text-rose-500/20 mx-auto mb-2" />
                  : <Crown className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                }
                <p className="text-xs font-bold mb-1">{creatorType === "of" ? "No subscriber tiers yet" : "No tiers yet"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {creatorType === "of"
                    ? "Create a free + paid tier to start monetizing your OF page."
                    : "Create subscription tiers for exclusive content."
                  }
                </p>
                <span className="mt-3 inline-block text-[11px] font-bold text-primary">Set up tiers →</span>
              </div>
            </Link>
          )}
        </div>

        {/* Growth Tips — type-aware */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            {creatorType === "of"
              ? <><Flame className="w-4 h-4 text-rose-500" /><span>OF Creator Tips</span></>
              : <><Sparkles className="w-4 h-4 text-primary" /><span>Growth Tips</span></>
            }
          </h2>
          <div className="space-y-1.5">
            {(creatorType === "of" ? ofGrowthTips : growthTips).map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                className="zivo-card-organic flex items-start gap-3 p-3"
              >
                <div className={cn("zivo-icon-pill w-8 h-8 rounded-lg shrink-0", getAccentClasses(tip.accent).text, getAccentClasses(tip.accent).bg)}>
                  <tip.icon className={cn("w-3.5 h-3.5", getAccentClasses(tip.accent).text)} />
                </div>
                <div>
                  <p className="font-bold text-[12px]">{tip.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Watermark */}
        <div className="flex justify-center pt-4">
          <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO Creator • 2026</span>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
