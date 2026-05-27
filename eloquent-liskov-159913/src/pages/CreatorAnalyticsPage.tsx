/**
 * CreatorAnalyticsPage — Real analytics from Supabase for ZIVO creators
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Share2, Users,
  BarChart3, Clock, Globe, Play, Image, FileText, Zap, Target,
  Award, Calendar, ArrowUpRight, ArrowDownRight, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

const timeRanges = ["7 days", "30 days", "90 days", "1 year", "All time"];

export default function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("profile_views")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Creator Analytics</h1>
          <button type="button" onClick={() => navigate("/creator-dashboard")} className="p-2 rounded-full hover:bg-muted/50 touch-manipulation">
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
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${
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
            <Link key={action.label} to={action.href}>
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
