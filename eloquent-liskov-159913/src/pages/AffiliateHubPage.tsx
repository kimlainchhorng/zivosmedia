/**
 * AffiliateHubPage — Real affiliate data from Supabase
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, Gift, DollarSign, Users, Link2, Copy, Share2,
  TrendingUp, ChevronRight, BarChart3, Target,
  Clock, Zap, Wallet, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

const programs = [
  { title: "ZIVO Rides Referral", desc: "Earn $5 for every new rider you refer.", commission: "$5 per signup", icon: "🚗", status: "active", accent: "hsl(221 83% 53%)" },
  { title: "ZIVO Eats Referral", desc: "Share food delivery. You earn $3 per order.", commission: "$3 per order", icon: "🍔", status: "active", accent: "hsl(25 95% 53%)" },
  { title: "ZIVO Shop Affiliate", desc: "Promote shop products. Earn 5% commission.", commission: "5% per sale", icon: "🛍️", status: "active", accent: "hsl(142 71% 45%)" },
  { title: "ZIVO Flights Affiliate", desc: "Share flight deals. Earn $2 per booking.", commission: "$2 per booking", icon: "✈️", status: "active", accent: "hsl(199 89% 48%)" },
  { title: "ZIVO Hotels Affiliate", desc: "Recommend hotels. Earn 3% of booking value.", commission: "3% per booking", icon: "🏨", status: "active", accent: "hsl(263 70% 58%)" },
  { title: "Creator Program", desc: "Top creators get custom commission rates.", commission: "Custom rates", icon: "⭐", status: "invite_only", accent: "hsl(38 92% 50%)" },
];

export default function AffiliateHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const referralCode = user?.id?.slice(0, 8) || "ZIVO2026";

  // Real referral data
  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("referrals")
        .select("id, status, reward_cents, created_at")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Real wallet balance
  const { data: walletData } = useQuery({
    queryKey: ["affiliate-wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wallets")
        .select("balance_cents")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalEarnings = referrals.reduce((s: number, r: any) => s + (r.reward_cents || 0), 0);
  const completedReferrals = referrals.filter((r: any) => r.status === "completed").length;
  const pendingReferrals = referrals.filter((r: any) => r.status === "pending").length;
  const convRate = referrals.length > 0 ? ((completedReferrals / referrals.length) * 100).toFixed(0) : "0";

  const stats = [
    { label: "Total Earnings", value: `$${(totalEarnings / 100).toFixed(2)}`, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "Total Referrals", value: String(referrals.length), icon: Users, accent: "hsl(221 83% 53%)" },
    { label: "Conversion Rate", value: `${convRate}%`, icon: Target, accent: "hsl(38 92% 50%)" },
    { label: "Wallet Balance", value: `$${((walletData?.balance_cents || 0) / 100).toFixed(2)}`, icon: Wallet, accent: "hsl(263 70% 58%)" },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(`https://hizivo.com/ref/${referralCode}`);
    toast.success("Referral link copied!");
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Affiliate Hub – ZIVO" description="Earn money through ZIVO referrals and affiliate programs." noIndex />

      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Affiliate Hub</h1>
          <Gift className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 zivo-aurora">
        {/* Referral Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="zivo-card-organic p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">Your Referral Link</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-3 mb-3 border border-border/20">
            <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
              hizivo.com/ref/{referralCode}
            </span>
            <button type="button" onClick={copyLink} className="p-1.5 rounded-lg bg-primary/10 touch-manipulation active:scale-95">
              <Copy className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyLink} className="flex-1 zivo-btn-signature py-2.5 text-xs flex items-center justify-center gap-1.5 touch-manipulation">
              <Copy className="w-3 h-3" /> Copy Link
            </button>
            <button type="button"
              onClick={() => {
                if (navigator.share) navigator.share({ url: `https://hizivo.com/ref/${referralCode}`, title: "Join ZIVO" });
                else copyLink();
              }}
              className="flex-1 py-2.5 rounded-2xl bg-muted/60 text-foreground text-xs font-bold touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 border border-border/30"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="zivo-card-organic p-3.5 text-center"
            >
              <div className="zivo-icon-pill mx-auto mb-1.5 w-9 h-9 rounded-xl" style={{ color: s.accent, background: `${s.accent}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.accent }} />
              </div>
              <p className="text-lg font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Programs */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Affiliate Programs
          </h2>
          <div className="space-y-1.5">
            {programs.map((prog, i) => (
              <motion.div
                key={prog.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                className="zivo-card-organic flex items-start gap-3 p-3.5 touch-manipulation"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${prog.accent}12` }}>
                  {prog.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-[13px]">{prog.title}</p>
                    {prog.status === "coming_soon" && <span className="zivo-badge text-[8px]">Soon</span>}
                    {prog.status === "invite_only" && <span className="zivo-badge text-[8px]">Invite</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{prog.desc}</p>
                  <p className="text-[11px] font-bold text-primary mt-1">{prog.commission}</p>
                </div>
                {prog.status === "active" ? (
                  <span className="shrink-0 mt-1 zivo-btn-signature px-3.5 py-1.5 text-[11px]">Join</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-2" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> How It Works
          </h2>
          <div className="space-y-1.5">
            {[
              { step: "1", title: "Share Your Link", desc: "Copy your unique referral link and share it with friends or on social media." },
              { step: "2", title: "Friends Sign Up", desc: "When someone uses your link to create an account or make a purchase, it's tracked." },
              { step: "3", title: "Earn Commission", desc: "You earn a commission for every successful referral added to your ZIVO Wallet." },
              { step: "4", title: "Cash Out", desc: "Withdraw your earnings anytime via bank transfer when you reach the $5 minimum." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="zivo-card-organic flex items-start gap-3 p-3.5"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{s.step}</span>
                </div>
                <div>
                  <p className="font-bold text-[13px]">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Wallet", icon: Wallet, href: "/wallet", accent: "hsl(38 92% 50%)" },
            { label: "Referrals", icon: Users, href: "/referral", accent: "hsl(221 83% 53%)" },
            { label: "Dashboard", icon: BarChart3, href: "/creator-dashboard", accent: "hsl(198 93% 59%)" },
            { label: "Monetization", icon: TrendingUp, href: "/monetization", accent: "hsl(142 71% 45%)" },
          ].map((a) => (
            <Link key={a.label} to={a.href}>
              <div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">
                <div className="zivo-icon-pill w-9 h-9 rounded-xl" style={{ color: a.accent, background: `${a.accent}15` }}>
                  <a.icon className="w-4 h-4" style={{ color: a.accent }} />
                </div>
                <span className="text-xs font-bold">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO Affiliate • 2026</span>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
