/**
 * CreatorAnalyticsPage — Real analytics from Supabase for ZIVO creators
 */
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Share2, Users,
  BarChart3, Clock, Globe, Play, Image, FileText, Zap, Target,
  Award, Calendar, ArrowUpRight, ArrowDownRight, Sparkles, Flame, Lock,
  DollarSign, Crown,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorType } from "@/hooks/useCreatorType";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

const timeRanges = ["7 days", "30 days", "90 days", "1 year", "All time"];

export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOFCreator } = useCreatorType();
  const [activeRange, setActiveRange] = useState(1);

  // Real posts data
  const { data: posts = [] } = useQuery({
    queryKey: ["creator-analytics-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_posts")
        .select("id, caption, media_type, likes_count, comments_count, shares_count, views_count, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Real follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["creator-follower-count", user?.id],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Real profile data
  const { data: profile } = useQuery({
    queryKey: ["creator-profile-views", user?.id],
    queryFn: async () => {
      // profiles has no profile_views column; views are rows in the
      // profile_views table. Selecting it as a column made PostgREST reject
      // the request, so the Profile Visits tile always read 0.
      const { count, error } = await (supabase as any)
        .from("profile_views")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user!.id);
      if (error) throw error;
      return { profile_views: count ?? 0 };
    },
    enabled: !!user,
  });

  // ─── OF Revenue analytics ─────────────────────────────────────────────────
  // PPV unlocks for this creator, last 30 days
  const { data: ppvUnlocks30d = [] } = useQuery({
    queryKey: ["creator-ppv-unlocks-30d", user?.id],
    queryFn: async (): Promise<{ amount_cents_paid: number; unlocked_at: string; unlocker_id: string }[]> => {
      if (!user) return [];
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("ppv_unlocks")
        .select("amount_cents_paid, unlocked_at, unlocker_id")
        .eq("creator_id", user.id)
        .gte("unlocked_at", since);
      if (error) return [];
      return (data as any[]) ?? [];
    },
    enabled: !!user && isOFCreator,
    staleTime: 60 * 1000,
  });

  // Paid DM unlocks for this creator, last 30 days
  const { data: dmUnlocks30d = [] } = useQuery({
    queryKey: ["creator-dm-unlocks-30d", user?.id],
    queryFn: async (): Promise<{ amount_cents_paid: number; unlocked_at: string; unlocker_id: string }[]> => {
      if (!user) return [];
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("direct_message_unlocks")
        .select("amount_cents_paid, unlocked_at, unlocker_id")
        .eq("creator_id", user.id)
        .gte("unlocked_at", since);
      if (error) return [];
      return (data as any[]) ?? [];
    },
    enabled: !!user && isOFCreator,
    staleTime: 60 * 1000,
  });

  // Top-earning PPV posts (all-time)
  const { data: topPPV = [] } = useQuery({
    queryKey: ["creator-top-ppv", user?.id],
    queryFn: async (): Promise<{ id: string; title: string; revenue_cents: number; unlock_count: number }[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("ppv_posts")
        .select("id, title, revenue_cents, unlock_count")
        .eq("creator_id", user.id)
        .order("revenue_cents", { ascending: false })
        .limit(5);
      if (error) return [];
      return (data as any[]) ?? [];
    },
    enabled: !!user && isOFCreator,
    staleTime: 60 * 1000,
  });

  // Build the 30-day revenue chart series + top spenders aggregate
  const ofChartData = useMemo(() => {
    const buckets: Record<string, { day: string; ppv: number; dm: number; total: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      buckets[key] = { day: label, ppv: 0, dm: 0, total: 0 };
    }
    for (const r of ppvUnlocks30d) {
      const key = (r.unlocked_at as string).slice(0, 10);
      if (buckets[key]) {
        buckets[key].ppv += r.amount_cents_paid ?? 0;
        buckets[key].total += r.amount_cents_paid ?? 0;
      }
    }
    for (const r of dmUnlocks30d) {
      const key = (r.unlocked_at as string).slice(0, 10);
      if (buckets[key]) {
        buckets[key].dm += r.amount_cents_paid ?? 0;
        buckets[key].total += r.amount_cents_paid ?? 0;
      }
    }
    return Object.values(buckets).map((b) => ({
      day: b.day,
      ppv: b.ppv / 100,
      dm: b.dm / 100,
      total: b.total / 100,
    }));
  }, [ppvUnlocks30d, dmUnlocks30d]);

  const ofTotals = useMemo(() => {
    const ppv = ppvUnlocks30d.reduce((s, r) => s + (r.amount_cents_paid ?? 0), 0);
    const dm = dmUnlocks30d.reduce((s, r) => s + (r.amount_cents_paid ?? 0), 0);
    return { ppv, dm, total: ppv + dm };
  }, [ppvUnlocks30d, dmUnlocks30d]);

  // Top 5 spenders across PPV + DM
  const topSpenders = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ppvUnlocks30d) {
      map.set(r.unlocker_id, (map.get(r.unlocker_id) ?? 0) + (r.amount_cents_paid ?? 0));
    }
    for (const r of dmUnlocks30d) {
      map.set(r.unlocker_id, (map.get(r.unlocker_id) ?? 0) + (r.amount_cents_paid ?? 0));
    }
    return Array.from(map.entries())
      .map(([unlocker_id, cents]) => ({ unlocker_id, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5);
  }, [ppvUnlocks30d, dmUnlocks30d]);

  // Resolve spender display names in one round-trip
  const { data: spenderProfiles = {} as Record<string, { full_name: string | null; avatar_url: string | null }> } = useQuery({
    queryKey: ["analytics-spender-profiles", topSpenders.map((s) => s.unlocker_id).join(",")],
    queryFn: async () => {
      const ids = topSpenders.map((s) => s.unlocker_id);
      if (ids.length === 0) return {};
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      ((data as any[]) ?? []).forEach((p) => {
        map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: topSpenders.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const totalViews = posts.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
  const totalLikes = posts.reduce((s: number, p: any) => s + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((s: number, p: any) => s + (p.comments_count || 0), 0);
  const totalShares = posts.reduce((s: number, p: any) => s + (p.shares_count || 0), 0);
  const engRate = totalViews > 0 ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(1) : "0.0";

  const overviewStats = [
    { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, accent: "hsl(221 83% 53%)" },
    { label: "Engagement", value: `${engRate}%`, icon: Heart, accent: "hsl(340 75% 55%)" },
    { label: "Followers", value: followerCount.toLocaleString(), icon: Users, accent: "hsl(263 70% 58%)" },
    { label: "Profile Visits", value: (profile?.profile_views || 0).toLocaleString(), icon: TrendingUp, accent: "hsl(142 71% 45%)" },
    { label: "Total Likes", value: totalLikes.toLocaleString(), icon: Heart, accent: "hsl(38 92% 50%)" },
    { label: "Shares", value: totalShares.toLocaleString(), icon: Share2, accent: "hsl(198 93% 59%)" },
  ];

  // Content breakdown by type
  const videoCount = posts.filter((p: any) => p.media_type === "video" || p.media_type === "reel").length;
  const imageCount = posts.filter((p: any) => p.media_type === "image").length;
  const otherCount = posts.length - videoCount - imageCount;

  const contentBreakdown = [
    { type: "Videos", icon: Play, count: videoCount, views: posts.filter((p: any) => p.media_type === "video" || p.media_type === "reel").reduce((s: number, p: any) => s + (p.views_count || 0), 0), accent: "hsl(263 70% 58%)" },
    { type: "Photos", icon: Image, count: imageCount, views: posts.filter((p: any) => p.media_type === "image").reduce((s: number, p: any) => s + (p.views_count || 0), 0), accent: "hsl(340 75% 55%)" },
    { type: "Other", icon: FileText, count: otherCount, views: posts.filter((p: any) => p.media_type !== "video" && p.media_type !== "reel" && p.media_type !== "image").reduce((s: number, p: any) => s + (p.views_count || 0), 0), accent: "hsl(221 83% 53%)" },
  ];

  const bestPostingTimes = [
    { day: "Mon", hours: [9, 12, 18, 21] },
    { day: "Tue", hours: [10, 13, 19, 22] },
    { day: "Wed", hours: [8, 11, 17, 20] },
    { day: "Thu", hours: [9, 12, 18, 21] },
    { day: "Fri", hours: [10, 14, 19, 23] },
    { day: "Sat", hours: [11, 15, 20, 22] },
    { day: "Sun", hours: [10, 14, 18, 21] },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Creator Analytics – ZIVO" description="Deep content analytics and audience insights for ZIVO creators." noIndex />

      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Back" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Creator Analytics</h1>
          <button type="button" aria-label="Open creator dashboard" onClick={() => navigate("/creator-dashboard")} className="p-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BarChart3 className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 zivo-aurora">
        {/* Time Range */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {timeRanges.map((range, i) => (
            <button type="button"
              key={range}
              onClick={() => setActiveRange(i)}
              aria-pressed={i === activeRange}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                i === activeRange ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Overview
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {overviewStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="zivo-card-organic p-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="zivo-icon-pill w-8 h-8 rounded-lg" style={{ color: stat.accent, background: `${stat.accent}15` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
                  </div>
                </div>
                <p className="text-lg font-extrabold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* OF Revenue — locked-content monetization, last 30 days */}
        {isOFCreator && (
          <div>
            <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" /> OF Revenue · last 30 days
            </h2>

            {/* Revenue totals card with sparkline */}
            <div className="zivo-card-organic p-4 mb-3">
              <div className="flex items-baseline justify-between mb-1">
                <div>
                  <p className="text-[28px] font-extrabold tracking-tight">
                    ${(ofTotals.total / 100).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PPV ${(ofTotals.ppv / 100).toFixed(2)} · DMs ${(ofTotals.dm / 100).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Unlocks</p>
                  <p className="text-[14px] font-extrabold">
                    {ppvUnlocks30d.length + dmUnlocks30d.length}
                  </p>
                </div>
              </div>
              <div className="h-24 mt-2 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ofChartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(340 75% 55%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(340 75% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(340 75% 55%)"
                      strokeWidth={2}
                      fill="url(#rev-grad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top PPV posts */}
            <div className="mb-3">
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                Top PPV posts
              </h3>
              {topPPV.length === 0 ? (
                <Link to="/ppv/create" className="block zivo-card-organic p-4 text-center hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Lock className="h-8 w-8 text-rose-500/40 mx-auto mb-1.5" />
                  <p className="text-[12px] font-bold">No PPV posts yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Drop your first locked post →</p>
                </Link>
              ) : (
                <div className="space-y-1.5">
                  {topPPV.map((p, i) => (
                    <Link
                      key={p.id}
                      to={`/ppv?post=${p.id}`}
                      className="zivo-card-organic flex items-center gap-3 p-3 hover:border-rose-500/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="h-8 w-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-extrabold text-rose-500">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-[13px] truncate">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">{p.unlock_count} unlock{p.unlock_count === 1 ? "" : "s"}</p>
                      </div>
                      <span className="text-[12px] font-extrabold text-emerald-500 shrink-0">
                        ${((p.revenue_cents ?? 0) / 100).toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top spenders */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                Top spenders · last 30 days
              </h3>
              {topSpenders.length === 0 ? (
                <div className="zivo-card-organic p-4 text-center">
                  <Crown className="h-8 w-8 text-amber-500/40 mx-auto mb-1.5" />
                  <p className="text-[12px] font-bold">No unlocks yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Big spenders will show up here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {topSpenders.map((s, i) => {
                    const prof = spenderProfiles[s.unlocker_id];
                    return (
                      <div key={s.unlocker_id} className="zivo-card-organic flex items-center gap-3 p-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-extrabold text-amber-500">{i + 1}</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                          {prof?.avatar_url ? (
                            <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-500/30 to-orange-500/15" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-[13px] truncate">
                            {prof?.full_name || "Fan"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Top supporter</p>
                        </div>
                        <span className="text-[12px] font-extrabold text-emerald-500 shrink-0">
                          ${(s.cents / 100).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Performance */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Content Performance
          </h2>
          <div className="space-y-1.5">
            {contentBreakdown.map((item, i) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                className="zivo-card-organic flex items-center gap-3 p-3.5"
              >
                <div className="zivo-icon-pill w-10 h-10 rounded-xl" style={{ color: item.accent, background: `${item.accent}15` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.accent }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.type}</p>
                  <p className="text-[10px] text-muted-foreground">{item.count} posts · {item.views.toLocaleString()} views</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Best Posting Times */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Best Posting Times
          </h2>
          <div className="zivo-card-organic p-4 space-y-2.5">
            {bestPostingTimes.map((d) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-[11px] font-bold w-8">{d.day}</span>
                <div className="flex gap-1.5 flex-1 flex-wrap">
                  {d.hours.map((h) => (
                    <span key={h} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                      {h > 12 ? `${h - 12}PM` : `${h}AM`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Insights */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Growth Insights
          </h2>
          <div className="space-y-1.5">
            {[
              { icon: Target, title: "Consistency is Key", desc: "Post at least 3 times per week to maintain algorithmic reach.", accent: "hsl(142 71% 45%)" },
              { icon: Zap, title: "Go LIVE More", desc: "Creators who go LIVE weekly see 40% more follower growth.", accent: "hsl(38 92% 50%)" },
              { icon: Award, title: "Engage Your Audience", desc: "Reply to comments within 1 hour for 2x engagement boost.", accent: "hsl(221 83% 53%)" },
              { icon: TrendingUp, title: "Use Trending Audio", desc: "Videos with trending sounds get 60% more distribution.", accent: "hsl(340 75% 55%)" },
            ].map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="zivo-card-organic flex items-start gap-3 p-3.5"
              >
                <div className="zivo-icon-pill w-9 h-9 rounded-xl shrink-0" style={{ color: tip.accent, background: `${tip.accent}15` }}>
                  <tip.icon className="w-4 h-4" style={{ color: tip.accent }} />
                </div>
                <div>
                  <p className="font-bold text-[13px]">{tip.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Schedule Post", icon: Calendar, href: "/content-scheduler", accent: "hsl(263 70% 58%)" },
            { label: "Dashboard", icon: BarChart3, href: "/creator-dashboard", accent: "hsl(198 93% 59%)" },
            { label: "Monetize", icon: TrendingUp, href: "/monetization", accent: "hsl(142 71% 45%)" },
            { label: "Academy", icon: Award, href: "/monetization/articles", accent: "hsl(25 95% 53%)" },
          ].map((action) => (
            <Link key={action.label} to={action.href} className="block rounded-2xl transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">
                <div className="zivo-icon-pill w-9 h-9 rounded-xl" style={{ color: action.accent, background: `${action.accent}15` }}>
                  <action.icon className="w-4 h-4" style={{ color: action.accent }} />
                </div>
                <span className="text-xs font-bold">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO Analytics • 2026</span>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
