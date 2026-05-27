import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Users, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight,
  Eye, Package, Car, UserPlus, Plane, Store, Activity, Wallet, Zap,
  Megaphone, Bell, UserCheck, Utensils, Radio, Film, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { FeedIncidentSummaryCard } from "@/components/admin/FeedIncidentSummaryCard";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "30d" | "90d" | "1y";

function rangeDays(range: TimeRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
}

function getDateRange(range: TimeRange): string {
  const d = new Date();
  d.setDate(d.getDate() - rangeDays(range));
  return d.toISOString();
}

function getPrevDateRange(range: TimeRange): string {
  const d = new Date();
  d.setDate(d.getDate() - rangeDays(range) * 2);
  return d.toISOString();
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

const PIE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(35, 91%, 55%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 80%, 50%)",
];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  },
};

function StatCard({
  title, value, icon: Icon, trend, subtitle, color = "green",
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  subtitle?: string;
  color?: "green" | "blue" | "orange" | "purple" | "sky" | "red";
}) {
  const colorMap: Record<string, string> = {
    green: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    sky: "text-sky-500 bg-sky-500/10",
    red: "text-red-500 bg-red-500/10",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
            <Icon className="w-4 h-4" />
          </div>
          {trend !== undefined && (
            <span className={cn("flex items-center gap-0.5 text-xs font-semibold", trend >= 0 ? "text-emerald-500" : "text-red-500")}>
              {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsDashboard() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const since = useMemo(() => getDateRange(timeRange), [timeRange]);
  const prevSince = useMemo(() => getPrevDateRange(timeRange), [timeRange]);

  // Travel bookings
  const { data: bookingStats } = useQuery({
    queryKey: ["admin-booking-stats", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_orders")
        .select("id, provider, status, total, currency, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Page views
  const { data: pageViews } = useQuery({
    queryKey: ["admin-page-views", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, page, created_at, device_type")
        .eq("event_name", "page_view")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(50000);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // New user signups in period
  const { data: userGrowthData } = useQuery({
    queryKey: ["admin-user-growth", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Total platform user count
  const { data: totalUsersCount } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
  });

  // Ride trips
  const { data: tripData } = useQuery({
    queryKey: ["admin-trips", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, status, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Store orders
  const { data: storeOrderData } = useQuery({
    queryKey: ["admin-store-orders", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, status, total, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Delivery orders
  const { data: deliveryData } = useQuery({
    queryKey: ["admin-deliveries", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("id, status, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Feedback / support submissions
  const { data: feedbackData } = useQuery({
    queryKey: ["admin-feedback", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_submissions")
        .select("id, category, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Active users — fixed 30-day window so DAU/WAU/MAU stay stable across timeRange.
  // Returns user_id + created_at only; distinct counts computed client-side.
  const { data: activeUsersRaw } = useQuery({
    queryKey: ["admin-active-users-30d"],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data, error } = await supabase
        .from("analytics_events")
        .select("user_id, created_at")
        .not("user_id", "is", null)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: true })
        .limit(50000);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Ride revenue — paid trips only
  const { data: tripRevenueRaw } = useQuery({
    queryKey: ["admin-trip-revenue", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("fare_amount, created_at")
        .gte("created_at", since)
        .eq("payment_status", "paid");
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Store revenue — non-cancelled, non-pending only. total_cents stored in cents.
  const { data: storeRevenueRaw } = useQuery({
    queryKey: ["admin-store-revenue", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("total_cents, created_at")
        .gte("created_at", since)
        .in("status", ["payment_confirmed", "assigned", "picked_up", "delivered"]);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Operational queue counts (always "now" — not period-bound)
  const { data: opsQueues } = useQuery({
    queryKey: ["admin-ops-queues"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [pendingDrivers, queuedRefunds, openReports, openIncidents, activeAlerts, suspiciousLogins] = await Promise.all([
        supabase.from("drivers").select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("refund_requests").select("id", { count: "exact", head: true })
          .in("status", ["queued", "processing"]),
        supabase.from("user_reports").select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("flight_incident_logs").select("id", { count: "exact", head: true })
          .is("resolved_at", null),
        supabase.from("flight_price_alerts").select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("login_history").select("id", { count: "exact", head: true })
          .eq("is_suspicious", true).gte("logged_in_at", sevenDaysAgo),
      ]);
      return {
        pendingDrivers: pendingDrivers.count || 0,
        queuedRefunds: queuedRefunds.count || 0,
        openReports: openReports.count || 0,
        openIncidents: openIncidents.count || 0,
        activeAlerts: activeAlerts.count || 0,
        suspiciousLogins: suspiciousLogins.count || 0,
      };
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  // Last-24h performance for system health pill
  const { data: recentPerf } = useQuery({
    queryKey: ["admin-recent-perf"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("performance_metrics")
        .select("success, value_ms, service, error_code, created_at")
        .gte("created_at", cutoff)
        .limit(5000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 120_000,
  });

  // Referrals in period
  const { data: referralsRaw } = useQuery({
    queryKey: ["admin-referrals", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zivo_referrals")
        .select("status, referrer_credit_amount, referee_credit_amount, first_booking_service, created_at, first_booking_at")
        .gte("created_at", since)
        .limit(20000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Active referral codes (live count)
  const { data: activeReferralCodes } = useQuery({
    queryKey: ["admin-active-referral-codes"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("zivo_referral_codes")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
  });

  // Lodging reviews (period)
  const { data: lodgingReviews } = useQuery({
    queryKey: ["admin-lodging-reviews", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodging_reviews")
        .select("rating, cleanliness, staff, location_score, value, comfort, replied_at, created_at")
        .gte("created_at", since)
        .limit(10000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Outstanding credits (live liability snapshot)
  const { data: outstandingCredits } = useQuery({
    queryKey: ["admin-outstanding-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zivo_credits")
        .select("amount, used_amount, expires_at")
        .eq("is_expired", false)
        .limit(50000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Partner redirect logs (period)
  const { data: partnerRedirects } = useQuery({
    queryKey: ["admin-partner-redirects", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_redirect_logs")
        .select("partner_name, status, created_at")
        .gte("created_at", since)
        .limit(20000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Loyalty tier distribution (live snapshot)
  const { data: loyaltyTiers } = useQuery({
    queryKey: ["admin-loyalty-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("tier")
        .limit(50000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Email logs (transactional + marketing email health)
  const { data: emailLogs } = useQuery({
    queryKey: ["admin-email-logs", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("status, email_type, created_at")
        .gte("created_at", since)
        .limit(20000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Push notification logs (for real CTR / open rate)
  const { data: pushLogs } = useQuery({
    queryKey: ["admin-push-logs", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notification_logs")
        .select("status, created_at")
        .gte("created_at", since)
        .limit(20000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Abandoned searches (for cart recovery rate)
  const { data: abandonedSearches } = useQuery({
    queryKey: ["admin-abandoned-searches", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_searches")
        .select("checkout_initiated, search_type, created_at")
        .gte("created_at", since)
        .limit(20000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Order ratings (avg driver / merchant rating)
  const { data: orderRatings } = useQuery({
    queryKey: ["admin-order-ratings", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_ratings")
        .select("driver_rating, merchant_rating, created_at")
        .gte("created_at", since)
        .limit(10000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Login history (for geography breakdown)
  const { data: loginHistoryRaw } = useQuery({
    queryKey: ["admin-login-history", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("country, device_type, logged_in_at")
        .gte("logged_in_at", since)
        .limit(10000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Travel payments — for payment funnel + success rate
  const { data: travelPayments } = useQuery({
    queryKey: ["admin-travel-payments", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_payments")
        .select("status, amount, provider, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Eats (food_orders) revenue + count in period
  const { data: foodOrders } = useQuery({
    queryKey: ["admin-food-orders", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_orders")
        .select("total_amount, status, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Live streams in period
  const { data: liveStreamsRaw } = useQuery({
    queryKey: ["admin-live-streams", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("status, ended_at, viewer_count, like_count, created_at")
        .gte("created_at", since)
        .limit(5000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Stories in period
  const { data: storiesRaw } = useQuery({
    queryKey: ["admin-stories", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("view_count, created_at")
        .gte("created_at", since)
        .limit(10000);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Store posts (head:true count)
  const { data: storePostsCount } = useQuery({
    queryKey: ["admin-store-posts-count", timeRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("store_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("is_published", true);
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
  });

  // Push campaigns in period
  const { data: pushCampaigns } = useQuery({
    queryKey: ["admin-push-campaigns", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_campaigns")
        .select("status, sent_count, targeted_count, failed_count, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Marketing campaign events in period (revenue + conversions)
  const { data: marketingEvents } = useQuery({
    queryKey: ["admin-marketing-events", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_campaign_events")
        .select("event_type, revenue_cents, channel, created_at")
        .gte("created_at", since);
      if (error) return [];
      return data || [];
    },
    enabled: isAdmin,
  });

  // Driver fleet snapshot (always now)
  const { data: driverFleet } = useQuery({
    queryKey: ["admin-driver-fleet"],
    queryFn: async () => {
      const [online, verified, total] = await Promise.all([
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
      ]);
      return {
        online: online.count || 0,
        verified: verified.count || 0,
        total: total.count || 0,
      };
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  // Previous-period counts (head:true → no row payload, just count)
  const { data: prevCounts } = useQuery({
    queryKey: ["admin-prev-counts", timeRange],
    queryFn: async () => {
      const [bookings, signups, pageViews, trips, storeOrders, deliveries, feedback] = await Promise.all([
        supabase.from("travel_orders").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
        supabase.from("analytics_events").select("id", { count: "exact", head: true })
          .eq("event_name", "page_view").gte("created_at", prevSince).lt("created_at", since),
        supabase.from("trips").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
        supabase.from("store_orders").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
        supabase.from("deliveries").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
        supabase.from("feedback_submissions").select("id", { count: "exact", head: true })
          .gte("created_at", prevSince).lt("created_at", since),
      ]);
      return {
        bookings: bookings.count || 0,
        signups: signups.count || 0,
        pageViews: pageViews.count || 0,
        trips: trips.count || 0,
        storeOrders: storeOrders.count || 0,
        deliveries: deliveries.count || 0,
        feedback: feedback.count || 0,
      };
    },
    enabled: isAdmin,
  });

  // --- Computed booking stats ---
  const stats = useMemo(() => {
    if (!bookingStats) return null;
    const total = bookingStats.length;
    const confirmed = bookingStats.filter((b) => b.status === "confirmed").length;
    const pending = bookingStats.filter((b) => b.status === "pending").length;
    const cancelled = bookingStats.filter((b) => b.status === "cancelled").length;
    const revenue = bookingStats
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    const avgValue = confirmed > 0 ? revenue / confirmed : 0;
    const confirmRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const byService: Record<string, number> = {};
    bookingStats.forEach((b) => {
      const key = b.provider || "other";
      byService[key] = (byService[key] || 0) + 1;
    });
    return { total, confirmed, pending, cancelled, revenue, avgValue, confirmRate, byService };
  }, [bookingStats]);

  // --- Daily bookings & revenue chart ---
  const dailyData = useMemo(() => {
    if (!bookingStats) return [];
    const byDay: Record<string, { date: string; bookings: number; revenue: number }> = {};
    bookingStats.forEach((b) => {
      const day = b.created_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, bookings: 0, revenue: 0 };
      byDay[day].bookings++;
      if (b.status === "confirmed") byDay[day].revenue += Number(b.total) || 0;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookingStats]);

  // --- Service breakdown bar chart ---
  const serviceData = useMemo(() => {
    if (!stats?.byService) return [];
    const labels: Record<string, string> = {
      flight: "Flights", hotel: "Hotels", car_rental: "Car Rental", activity: "Activities",
    };
    return Object.entries(stats.byService).map(([service, count]) => ({
      service: labels[service] || service,
      count,
    }));
  }, [stats]);

  // --- Revenue breakdown pie chart ---
  const revenuePieData = useMemo(() => {
    if (!bookingStats) return [];
    const rev: Record<string, number> = {};
    bookingStats.forEach((b) => {
      if (b.status === "confirmed") {
        const key = b.provider || "other";
        rev[key] = (rev[key] || 0) + (Number(b.total) || 0);
      }
    });
    const labels: Record<string, string> = {
      flight: "Flights", hotel: "Hotels", car_rental: "Car Rental", activity: "Activities",
    };
    return Object.entries(rev).map(([k, v]) => ({ name: labels[k] || k, value: Math.round(v) }));
  }, [bookingStats]);

  // --- Top pages list ---
  const topPages = useMemo(() => {
    if (!pageViews) return [];
    const counts: Record<string, number> = {};
    pageViews.forEach((pv) => {
      const page = pv.page || "/";
      counts[page] = (counts[page] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [pageViews]);

  // --- User growth bar chart ---
  const userGrowthChart = useMemo(() => {
    if (!userGrowthData) return [];
    const byDay: Record<string, number> = {};
    userGrowthData.forEach((u) => {
      const day = u.created_at.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [userGrowthData]);

  // --- Rides by day chart ---
  const tripsChart = useMemo(() => {
    if (!tripData) return [];
    const byDay: Record<string, { date: string; trips: number; completed: number }> = {};
    (tripData as any[]).forEach((t) => {
      const day = (t.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, trips: 0, completed: 0 };
      byDay[day].trips++;
      if (t.status === "completed") byDay[day].completed++;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [tripData]);

  // --- Store orders by day chart ---
  const storeOrdersChart = useMemo(() => {
    if (!storeOrderData) return [];
    const byDay: Record<string, { date: string; orders: number; revenue: number }> = {};
    (storeOrderData as any[]).forEach((o) => {
      const day = (o.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, orders: 0, revenue: 0 };
      byDay[day].orders++;
      if (o.total) byDay[day].revenue += Number(o.total) || 0;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [storeOrderData]);

  // --- Device breakdown ---
  const deviceBreakdown = useMemo(() => {
    if (!pageViews) return [];
    const counts: Record<string, number> = {};
    pageViews.forEach((pv) => {
      const device = (pv as any).device_type || "unknown";
      counts[device] = (counts[device] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [pageViews]);

  // --- Active user metrics (DAU/WAU/MAU) ---
  const activeUserMetrics = useMemo(() => {
    if (!activeUsersRaw) return null;
    const now = Date.now();
    const dayMs = 86_400_000;
    const dau = new Set<string>();
    const wau = new Set<string>();
    const mau = new Set<string>();
    activeUsersRaw.forEach((e: any) => {
      if (!e.user_id) return;
      const ts = new Date(e.created_at).getTime();
      const age = now - ts;
      if (age <= 30 * dayMs) mau.add(e.user_id);
      if (age <= 7 * dayMs) wau.add(e.user_id);
      if (age <= 1 * dayMs) dau.add(e.user_id);
    });
    return { dau: dau.size, wau: wau.size, mau: mau.size };
  }, [activeUsersRaw]);

  // --- Active users per day (last 30 days) ---
  const activeUsersChart = useMemo(() => {
    if (!activeUsersRaw) return [];
    const byDay: Record<string, Set<string>> = {};
    activeUsersRaw.forEach((e: any) => {
      if (!e.user_id) return;
      const day = (e.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = new Set();
      byDay[day].add(e.user_id);
    });
    return Object.entries(byDay)
      .map(([date, users]) => ({ date, activeUsers: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activeUsersRaw]);

  // --- GMV (combined revenue across travel + rides + store + eats) ---
  const gmv = useMemo(() => {
    const travel = stats?.revenue ?? 0;
    const rides = (tripRevenueRaw || []).reduce(
      (s, t: any) => s + (Number(t.fare_amount) || 0),
      0,
    );
    const store = (storeRevenueRaw || []).reduce(
      (s, o: any) => s + (Number(o.total_cents) || 0),
      0,
    ) / 100;
    const eats = (foodOrders || [])
      .filter((o: any) => o.status !== "cancelled")
      .reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0);
    return { travel, rides, store, eats, total: travel + rides + store + eats };
  }, [stats, tripRevenueRaw, storeRevenueRaw, foodOrders]);

  // --- Social & content metrics ---
  const socialMetrics = useMemo(() => {
    const streams = liveStreamsRaw || [];
    const liveNow = streams.filter(
      (s: any) => s.status === "live" && !s.ended_at,
    ).length;
    const totalStreamViewers = streams.reduce(
      (s, x: any) => s + (Number(x.viewer_count) || 0),
      0,
    );
    const totalStreamLikes = streams.reduce(
      (s, x: any) => s + (Number(x.like_count) || 0),
      0,
    );

    const stories = storiesRaw || [];
    const storyViews = stories.reduce(
      (s, x: any) => s + (Number(x.view_count) || 0),
      0,
    );

    return {
      streamsCount: streams.length,
      liveNow,
      totalStreamViewers,
      totalStreamLikes,
      storiesCount: stories.length,
      storyViews,
      storePostsCount: storePostsCount ?? 0,
    };
  }, [liveStreamsRaw, storiesRaw, storePostsCount]);

  // --- Flight subset of travel bookings ---
  const flightStats = useMemo(() => {
    if (!bookingStats) return null;
    const flightOnly = bookingStats.filter((b: any) => b.provider === "flight");
    const confirmed = flightOnly.filter((b: any) => b.status === "confirmed");
    const revenue = confirmed.reduce((s, b: any) => s + (Number(b.total) || 0), 0);
    return { total: flightOnly.length, confirmed: confirmed.length, revenue };
  }, [bookingStats]);

  // --- System health (last 24h success rate from performance_metrics) ---
  const systemHealth = useMemo(() => {
    if (!recentPerf || recentPerf.length === 0) {
      return { status: "unknown" as const, successRate: 0, sampleSize: 0, p95Ms: 0 };
    }
    const total = recentPerf.length;
    const successes = recentPerf.filter((m: any) => m.success).length;
    const successRate = (successes / total) * 100;
    const latencies = recentPerf
      .map((m: any) => Number(m.value_ms))
      .filter((v: number) => Number.isFinite(v))
      .sort((a, b) => a - b);
    const p95Ms = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const status: "ok" | "warn" | "down" =
      successRate >= 99 ? "ok" : successRate >= 95 ? "warn" : "down";
    return { status, successRate, sampleSize: total, p95Ms };
  }, [recentPerf]);

  // --- Payment funnel metrics ---
  const paymentMetrics = useMemo(() => {
    const payments = travelPayments || [];
    const total = payments.length;
    const succeeded = payments.filter((p: any) => p.status === "succeeded").length;
    const failed = payments.filter((p: any) => p.status === "failed").length;
    const refunded = payments.filter((p: any) => p.status === "refunded").length;
    const pending = payments.filter(
      (p: any) => p.status === "pending" || p.status === "processing",
    ).length;
    const successRate = total > 0 ? (succeeded / total) * 100 : 0;
    const failedAmount = payments
      .filter((p: any) => p.status === "failed")
      .reduce((s, p: any) => s + (Number(p.amount) || 0), 0);
    const refundedAmount = payments
      .filter((p: any) => p.status === "refunded")
      .reduce((s, p: any) => s + (Number(p.amount) || 0), 0);
    return { total, succeeded, failed, refunded, pending, successRate, failedAmount, refundedAmount };
  }, [travelPayments]);

  // --- Payment trend (daily by status) ---
  const paymentTrendData = useMemo(() => {
    const byDay: Record<string, { date: string; succeeded: number; failed: number; refunded: number; pending: number }> = {};
    (travelPayments || []).forEach((p: any) => {
      const day = (p.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, succeeded: 0, failed: 0, refunded: 0, pending: 0 };
      if (p.status === "succeeded") byDay[day].succeeded++;
      else if (p.status === "failed") byDay[day].failed++;
      else if (p.status === "refunded") byDay[day].refunded++;
      else byDay[day].pending++;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [travelPayments]);

  // --- Push funnel trend (daily sent / delivered / opened) ---
  const pushTrendData = useMemo(() => {
    const byDay: Record<string, { date: string; sent: number; delivered: number; opened: number; failed: number }> = {};
    (pushLogs || []).forEach((l: any) => {
      const day = (l.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, sent: 0, delivered: 0, opened: 0, failed: 0 };
      if (l.status === "sent" || l.status === "delivered" || l.status === "opened") byDay[day].sent++;
      if (l.status === "delivered" || l.status === "opened") byDay[day].delivered++;
      if (l.status === "opened") byDay[day].opened++;
      if (l.status === "failed") byDay[day].failed++;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [pushLogs]);

  // --- GMV daily trend (stacked by stream) ---
  const gmvTrendData = useMemo(() => {
    const byDay: Record<string, { date: string; travel: number; rides: number; store: number; eats: number; total: number }> = {};
    const ensure = (day: string) => {
      if (!byDay[day]) byDay[day] = { date: day, travel: 0, rides: 0, store: 0, eats: 0, total: 0 };
      return byDay[day];
    };
    (bookingStats || []).forEach((b: any) => {
      if (b.status === "confirmed") {
        const day = (b.created_at as string).slice(0, 10);
        ensure(day).travel += Number(b.total) || 0;
      }
    });
    (tripRevenueRaw || []).forEach((t: any) => {
      const day = (t.created_at as string).slice(0, 10);
      ensure(day).rides += Number(t.fare_amount) || 0;
    });
    (storeRevenueRaw || []).forEach((o: any) => {
      const day = (o.created_at as string).slice(0, 10);
      ensure(day).store += (Number(o.total_cents) || 0) / 100;
    });
    (foodOrders || []).forEach((o: any) => {
      if (o.status !== "cancelled") {
        const day = (o.created_at as string).slice(0, 10);
        ensure(day).eats += Number(o.total_amount) || 0;
      }
    });
    return Object.values(byDay)
      .map((d) => ({ ...d, total: d.travel + d.rides + d.store + d.eats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bookingStats, tripRevenueRaw, storeRevenueRaw, foodOrders]);

  // --- Marketing metrics (push + campaign events) ---
  const marketingMetrics = useMemo(() => {
    const pushSent = (pushCampaigns || []).reduce(
      (s, c: any) => s + (Number(c.sent_count) || 0),
      0,
    );
    const pushTargeted = (pushCampaigns || []).reduce(
      (s, c: any) => s + (Number(c.targeted_count) || 0),
      0,
    );
    const pushFailed = (pushCampaigns || []).reduce(
      (s, c: any) => s + (Number(c.failed_count) || 0),
      0,
    );
    const deliveryRate = pushTargeted > 0 ? (pushSent / pushTargeted) * 100 : 0;
    const campaignsRun = (pushCampaigns || []).filter(
      (c: any) => c.status === "sent",
    ).length;

    const events = marketingEvents || [];
    const conversions = events.filter(
      (e: any) => e.event_type === "conversion" || e.event_type === "redemption",
    ).length;
    const attributedRevenue = events.reduce(
      (s, e: any) => s + (Number(e.revenue_cents) || 0),
      0,
    ) / 100;

    return {
      pushSent, pushTargeted, pushFailed, deliveryRate, campaignsRun,
      conversions, attributedRevenue, totalEvents: events.length,
    };
  }, [pushCampaigns, marketingEvents]);

  // --- Referrals metrics ---
  const referralMetrics = useMemo(() => {
    const refs = referralsRaw || [];
    const total = refs.length;
    const qualified = refs.filter(
      (r: any) => r.status === "qualified" || r.status === "credited",
    ).length;
    const credited = refs.filter((r: any) => r.status === "credited").length;
    const pending = refs.filter((r: any) => r.status === "pending").length;
    const expired = refs.filter((r: any) => r.status === "expired").length;
    const qualificationRate = total > 0 ? (qualified / total) * 100 : 0;
    const creditsIssued = refs.reduce(
      (s, r: any) =>
        s +
        (Number(r.referrer_credit_amount) || 0) +
        (Number(r.referee_credit_amount) || 0),
      0,
    );
    return { total, qualified, credited, pending, expired, qualificationRate, creditsIssued };
  }, [referralsRaw]);

  // --- Lodging review metrics (avg rating + reply rate) ---
  const lodgingMetrics = useMemo(() => {
    const reviews = lodgingReviews || [];
    const ratings = reviews
      .map((r: any) => Number(r.rating))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const replied = reviews.filter((r: any) => r.replied_at).length;
    const replyRate = reviews.length > 0 ? (replied / reviews.length) * 100 : 0;
    return { count: reviews.length, avg, replied, replyRate };
  }, [lodgingReviews]);

  // --- Top error codes (last 24h) ---
  const errorBreakdown = useMemo(() => {
    if (!recentPerf) return [];
    const counts: Record<string, number> = {};
    recentPerf.forEach((m: any) => {
      if (m.success) return;
      const code = (m.error_code as string) || "UNKNOWN";
      counts[code] = (counts[code] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [recentPerf]);

  // --- Outstanding credits liability (unused + unexpired) ---
  const creditsLiability = useMemo(() => {
    const credits = outstandingCredits || [];
    const now = Date.now();
    const active = credits.filter((c: any) =>
      !c.expires_at || new Date(c.expires_at).getTime() > now,
    );
    const total = active.reduce(
      (s, c: any) =>
        s + Math.max(0, (Number(c.amount) || 0) - (Number(c.used_amount) || 0)),
      0,
    );
    return { total, count: active.length };
  }, [outstandingCredits]);

  // --- Activity by hour of day (0–23) from page_view events ---
  const activityByHour = useMemo(() => {
    const buckets: { hour: string; views: number }[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h.toString().padStart(2, "0"),
      views: 0,
    }));
    (pageViews || []).forEach((pv: any) => {
      const ts = new Date(pv.created_at as string);
      const h = ts.getHours();
      if (h >= 0 && h < 24) buckets[h].views++;
    });
    return buckets;
  }, [pageViews]);

  // --- Email health by type (success rate per email_type) ---
  const emailHealthByType = useMemo(() => {
    const logs = emailLogs || [];
    const byType: Record<string, { type: string; total: number; sent: number; failed: number }> = {};
    logs.forEach((l: any) => {
      const t = (l.email_type as string) || "unknown";
      if (!byType[t]) byType[t] = { type: t, total: 0, sent: 0, failed: 0 };
      byType[t].total++;
      if (l.status === "sent" || l.status === "delivered") byType[t].sent++;
      if (l.status === "failed" || l.status === "bounced") byType[t].failed++;
    });
    return Object.values(byType)
      .map((x) => ({
        ...x,
        successRate: x.total > 0 ? (x.sent / x.total) * 100 : 0,
      }))
      .sort((a, b) => a.successRate - b.successRate); // worst first
  }, [emailLogs]);

  // --- Top 10 partners by click volume in period ---
  const partnerData = useMemo(() => {
    const logs = partnerRedirects || [];
    const byPartner: Record<string, number> = {};
    logs.forEach((l: any) => {
      const p = (l.partner_name as string) || "unknown";
      byPartner[p] = (byPartner[p] || 0) + 1;
    });
    return Object.entries(byPartner)
      .map(([partner, clicks]) => ({ partner, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [partnerRedirects]);

  // --- Loyalty tier distribution ---
  const loyaltyDistribution = useMemo(() => {
    const tiers = loyaltyTiers || [];
    const counts: Record<string, number> = {};
    tiers.forEach((l: any) => {
      const tier = (l.tier as string) || "standard";
      counts[tier] = (counts[tier] || 0) + 1;
    });
    const order = ["standard", "bronze", "silver", "gold"];
    return order
      .filter((t) => counts[t])
      .map((t) => ({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: counts[t],
      }));
  }, [loyaltyTiers]);

  // --- Email health (transactional + marketing) ---
  const emailHealth = useMemo(() => {
    const logs = emailLogs || [];
    const total = logs.length;
    const sent = logs.filter(
      (l: any) => l.status === "sent" || l.status === "delivered",
    ).length;
    const failed = logs.filter(
      (l: any) => l.status === "failed" || l.status === "bounced",
    ).length;
    const pending = logs.filter((l: any) => l.status === "pending").length;
    const successRate = total > 0 ? (sent / total) * 100 : 0;
    return { total, sent, failed, pending, successRate };
  }, [emailLogs]);

  // --- Trip status breakdown (pie) ---
  const tripStatusData = useMemo(() => {
    if (!tripData) return [];
    const counts: Record<string, number> = {};
    (tripData as any[]).forEach((t: any) => {
      const s = t.status || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    const labels: Record<string, string> = {
      requested: "Requested",
      accepted: "Accepted",
      en_route: "En Route",
      arrived: "Arrived",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return Object.entries(counts)
      .map(([s, count]) => ({ name: labels[s] || s, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [tripData]);

  // --- Push notification health (real CTR from per-message logs) ---
  const pushHealth = useMemo(() => {
    const logs = pushLogs || [];
    const total = logs.length;
    const sent = logs.filter(
      (l: any) => l.status === "sent" || l.status === "delivered" || l.status === "opened",
    ).length;
    const delivered = logs.filter(
      (l: any) => l.status === "delivered" || l.status === "opened",
    ).length;
    const opened = logs.filter((l: any) => l.status === "opened").length;
    const failed = logs.filter((l: any) => l.status === "failed").length;
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    return { total, sent, delivered, opened, failed, deliveryRate, openRate };
  }, [pushLogs]);

  // --- Abandonment / cart recovery ---
  const abandonmentMetrics = useMemo(() => {
    const searches = abandonedSearches || [];
    const total = searches.length;
    const recovered = searches.filter((s: any) => s.checkout_initiated).length;
    const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
    return { total, recovered, recoveryRate };
  }, [abandonedSearches]);

  // --- Customer ratings (driver + merchant averages) ---
  const ratingMetrics = useMemo(() => {
    const ratings = orderRatings || [];
    const driverRatings = ratings
      .map((r: any) => Number(r.driver_rating))
      .filter((r: number) => Number.isFinite(r) && r > 0);
    const merchantRatings = ratings
      .map((r: any) => Number(r.merchant_rating))
      .filter((r: number) => Number.isFinite(r) && r > 0);
    const avgDriver = driverRatings.length
      ? driverRatings.reduce((s, r) => s + r, 0) / driverRatings.length
      : 0;
    const avgMerchant = merchantRatings.length
      ? merchantRatings.reduce((s, r) => s + r, 0) / merchantRatings.length
      : 0;
    return {
      totalRatings: ratings.length,
      avgDriver,
      avgMerchant,
      driverRatingCount: driverRatings.length,
      merchantRatingCount: merchantRatings.length,
    };
  }, [orderRatings]);

  // --- Service health breakdown (per-service success rate, last 24h) ---
  const serviceHealthData = useMemo(() => {
    if (!recentPerf) return [];
    const byService: Record<string, { service: string; total: number; successes: number }> = {};
    recentPerf.forEach((m: any) => {
      const svc = m.service || "unknown";
      if (!byService[svc]) byService[svc] = { service: svc, total: 0, successes: 0 };
      byService[svc].total++;
      if (m.success) byService[svc].successes++;
    });
    return Object.values(byService)
      .map((x) => ({
        service: x.service,
        successRate: x.total > 0 ? (x.successes / x.total) * 100 : 0,
        total: x.total,
      }))
      .sort((a, b) => a.successRate - b.successRate); // worst first
  }, [recentPerf]);

  // --- Geography (logins by country + device) ---
  const geographyData = useMemo(() => {
    const logins = loginHistoryRaw || [];
    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    logins.forEach((l: any) => {
      const country = (l.country as string) || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
      const device = (l.device_type as string) || "unknown";
      byDevice[device] = (byDevice[device] || 0) + 1;
    });
    return {
      byCountry: Object.entries(byCountry)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byDevice: Object.entries(byDevice).map(([name, value]) => ({ name, value })),
      total: logins.length,
    };
  }, [loginHistoryRaw]);

  // --- Period-over-period trends ---
  const trends = useMemo(() => {
    if (!prevCounts) return null;
    return {
      bookings: pct(stats?.total ?? 0, prevCounts.bookings),
      signups: pct(userGrowthData?.length ?? 0, prevCounts.signups),
      pageViews: pct(pageViews?.length ?? 0, prevCounts.pageViews),
      trips: pct((tripData as any[])?.length ?? 0, prevCounts.trips),
      storeOrders: pct((storeOrderData as any[])?.length ?? 0, prevCounts.storeOrders),
      deliveries: pct((deliveryData as any[])?.length ?? 0, prevCounts.deliveries),
      feedback: pct((feedbackData as any[])?.length ?? 0, prevCounts.feedback),
    };
  }, [prevCounts, stats, userGrowthData, pageViews, tripData, storeOrderData, deliveryData, feedbackData]);

  // --- Feedback by category ---
  const feedbackByCategory = useMemo(() => {
    if (!feedbackData) return [];
    const counts: Record<string, number> = {};
    (feedbackData as any[]).forEach((f) => {
      const cat = f.category || "general";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [feedbackData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-ig-gradient mb-2">Access Denied</h1>
            <p className="text-muted-foreground">This page is restricted to administrators.</p>
            <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rangeLabel = timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : timeRange === "90d" ? "90 days" : "1 year";

  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Platform-wide performance · last {rangeLabel}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                systemHealth.status === "ok" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                systemHealth.status === "warn" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                systemHealth.status === "down" && "bg-red-500/10 text-red-600 dark:text-red-400",
                systemHealth.status === "unknown" && "bg-muted text-muted-foreground",
              )}
              title={
                systemHealth.sampleSize > 0
                  ? `Last 24h · ${systemHealth.sampleSize} samples · p95 ${Math.round(systemHealth.p95Ms)}ms`
                  : "No performance data in last 24h"
              }
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  systemHealth.status === "ok" && "bg-emerald-500",
                  systemHealth.status === "warn" && "bg-amber-500",
                  systemHealth.status === "down" && "bg-red-500",
                  systemHealth.status === "unknown" && "bg-muted-foreground",
                )}
              />
              {systemHealth.status === "unknown"
                ? "Health: no data"
                : `Health: ${systemHealth.successRate.toFixed(1)}%`}
            </span>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {(["7d", "30d", "90d", "1y"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs h-7 px-3"
              >
                {range === "7d" ? "7D" : range === "30d" ? "30D" : range === "90d" ? "90D" : "1Y"}
              </Button>
            ))}
          </div>
        </div>

        <FeedIncidentSummaryCard range="24h" title="Incident Radar" />

        {/* ── Section 1: Travel & Bookings ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plane className="w-3.5 h-3.5" /> Travel & Bookings
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Bookings"
              value={stats?.total ?? "—"}
              icon={ShoppingBag}
              trend={trends?.bookings}
              color="green"
            />
            <StatCard
              title="Confirmed"
              value={stats?.confirmed ?? "—"}
              icon={TrendingUp}
              subtitle={stats ? `${stats.confirmRate}% confirm rate` : undefined}
              color="blue"
            />
            <StatCard
              title="Travel Revenue"
              value={stats ? `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              icon={DollarSign}
              color="orange"
            />
            <StatCard
              title="Avg. Booking Value"
              value={stats ? `$${stats.avgValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              icon={TrendingUp}
              subtitle={stats ? `${stats.pending} pending · ${stats.cancelled} cancelled` : undefined}
              color="purple"
            />
          </div>
        </section>

        {/* ── Section: Revenue & GMV ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5" /> Revenue & GMV
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total GMV"
              value={`$${gmv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              subtitle="Travel + Rides + Store + Eats"
              color="green"
            />
            <StatCard
              title="Travel"
              value={`$${gmv.travel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Plane}
              color="blue"
            />
            <StatCard
              title="Rides"
              value={`$${gmv.rides.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Car}
              subtitle={`${(tripRevenueRaw || []).length} paid trips`}
              color="orange"
            />
            <StatCard
              title="Store"
              value={`$${gmv.store.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Store}
              subtitle={`${(storeRevenueRaw || []).length} fulfilled orders`}
              color="purple"
            />
            <StatCard
              title="Eats"
              value={`$${gmv.eats.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Utensils}
              subtitle={
                foodOrders
                  ? `${foodOrders.filter((o: any) => o.status !== "cancelled").length} non-cancelled orders`
                  : undefined
              }
              color="red"
            />
          </div>
        </section>

        {/* ── Section 2: Users & Growth ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Users & Growth
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={totalUsersCount !== undefined ? totalUsersCount.toLocaleString() : "—"}
              icon={Users}
              color="sky"
            />
            <StatCard
              title="New Signups"
              value={userGrowthData?.length?.toLocaleString() ?? "—"}
              icon={UserPlus}
              trend={trends?.signups}
              subtitle="In selected period"
              color="green"
            />
            <StatCard
              title="Page Views"
              value={pageViews?.length?.toLocaleString() ?? "—"}
              icon={Eye}
              trend={trends?.pageViews}
              color="blue"
            />
            <StatCard
              title="Support Submissions"
              value={(feedbackData as any[])?.length?.toLocaleString() ?? "—"}
              icon={Activity}
              trend={trends?.feedback}
              color="purple"
            />
          </div>
        </section>

        {/* ── Section: Active Users ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Active Users <span className="text-[10px] font-normal normal-case opacity-60">· rolling windows from now</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="DAU"
              value={activeUserMetrics?.dau?.toLocaleString() ?? "—"}
              icon={Activity}
              subtitle="Last 24 hours"
              color="green"
            />
            <StatCard
              title="WAU"
              value={activeUserMetrics?.wau?.toLocaleString() ?? "—"}
              icon={Users}
              subtitle="Last 7 days"
              color="blue"
            />
            <StatCard
              title="MAU"
              value={activeUserMetrics?.mau?.toLocaleString() ?? "—"}
              icon={Users}
              subtitle="Last 30 days"
              color="purple"
            />
            <StatCard
              title="Stickiness"
              value={activeUserMetrics && activeUserMetrics.mau > 0
                ? `${Math.round((activeUserMetrics.dau / activeUserMetrics.mau) * 100)}%`
                : "—"}
              icon={TrendingUp}
              subtitle="DAU / MAU"
              color="orange"
            />
          </div>
        </section>

        {/* ── Section 3: Operations ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Car className="w-3.5 h-3.5" /> Operations
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Ride Trips"
              value={(tripData as any[])?.length?.toLocaleString() ?? "—"}
              icon={Car}
              trend={trends?.trips}
              subtitle={(tripData as any[]) ? `${(tripData as any[]).filter((t: any) => t.status === "completed").length} completed` : undefined}
              color="orange"
            />
            <StatCard
              title="Store Orders"
              value={(storeOrderData as any[])?.length?.toLocaleString() ?? "—"}
              icon={Store}
              trend={trends?.storeOrders}
              color="green"
            />
            <StatCard
              title="Delivery Orders"
              value={(deliveryData as any[])?.length?.toLocaleString() ?? "—"}
              icon={Package}
              trend={trends?.deliveries}
              color="sky"
            />
            <StatCard
              title="Eats Orders"
              value={(foodOrders as any[])?.length?.toLocaleString() ?? "—"}
              icon={Utensils}
              subtitle={
                foodOrders
                  ? `${foodOrders.filter((o: any) => o.status !== "cancelled").length} non-cancelled`
                  : undefined
              }
              color="blue"
            />
          </div>
        </section>

        {/* ── Section: Flights ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plane className="w-3.5 h-3.5" /> Flights
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Flight Bookings"
              value={flightStats?.total?.toLocaleString() ?? "—"}
              icon={Plane}
              subtitle={flightStats ? `${flightStats.confirmed} confirmed` : undefined}
              color="blue"
            />
            <StatCard
              title="Flight Revenue"
              value={flightStats
                ? `$${flightStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Active Price Alerts"
              value={opsQueues?.activeAlerts?.toLocaleString() ?? "—"}
              icon={TrendingUp}
              subtitle="Currently watching"
              color="purple"
            />
            <StatCard
              title="Open Incidents"
              value={opsQueues?.openIncidents?.toLocaleString() ?? "—"}
              icon={Activity}
              subtitle="Unresolved"
              color={opsQueues && opsQueues.openIncidents > 0 ? "red" : "sky"}
            />
          </div>
        </section>

        {/* ── Section: Driver Fleet ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" /> Driver Fleet <span className="text-[10px] font-normal normal-case opacity-60">· live snapshot</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Online Now"
              value={driverFleet?.online?.toLocaleString() ?? "—"}
              icon={Car}
              subtitle={driverFleet ? `of ${driverFleet.verified} verified` : undefined}
              color="green"
            />
            <StatCard
              title="Verified Drivers"
              value={driverFleet?.verified?.toLocaleString() ?? "—"}
              icon={UserCheck}
              color="blue"
            />
            <StatCard
              title="Total Registered"
              value={driverFleet?.total?.toLocaleString() ?? "—"}
              icon={Users}
              subtitle={driverFleet && driverFleet.total > 0
                ? `${Math.round((driverFleet.verified / driverFleet.total) * 100)}% verified`
                : undefined}
              color="purple"
            />
            <StatCard
              title="Utilization"
              value={driverFleet && driverFleet.verified > 0
                ? `${Math.round((driverFleet.online / driverFleet.verified) * 100)}%`
                : "—"}
              icon={TrendingUp}
              subtitle="Online / verified"
              color="orange"
            />
          </div>
        </section>

        {/* ── Section: Ops Queues ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Operational Queues <span className="text-[10px] font-normal normal-case opacity-60">· needs attention</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button type="button"
              onClick={() => navigate("/admin/drivers/verification")}
              className="text-left"
              aria-label="Open drivers pending verification queue"
              title="Open drivers pending verification queue"
            >
              <StatCard
                title="Drivers Pending"
                value={opsQueues?.pendingDrivers?.toLocaleString() ?? "—"}
                icon={UserPlus}
                subtitle="Awaiting verification"
                color={opsQueues && opsQueues.pendingDrivers > 0 ? "orange" : "sky"}
              />
            </button>
            <button type="button"
              onClick={() => navigate("/admin/payments/refunds")}
              className="text-left"
              aria-label="Open queued refunds"
              title="Open queued refunds"
            >
              <StatCard
                title="Refunds Queued"
                value={opsQueues?.queuedRefunds?.toLocaleString() ?? "—"}
                icon={Wallet}
                subtitle="Queued or processing"
                color={opsQueues && opsQueues.queuedRefunds > 0 ? "orange" : "sky"}
              />
            </button>
            <button type="button"
              onClick={() => navigate("/admin/moderation")}
              className="text-left"
              aria-label="Open pending moderation reports"
              title="Open pending moderation reports"
            >
              <StatCard
                title="Open Reports"
                value={opsQueues?.openReports?.toLocaleString() ?? "—"}
                icon={Activity}
                subtitle="User reports pending"
                color={opsQueues && opsQueues.openReports > 0 ? "red" : "sky"}
              />
            </button>
            <StatCard
              title="Suspicious Logins"
              value={opsQueues?.suspiciousLogins?.toLocaleString() ?? "—"}
              icon={Activity}
              subtitle="Flagged · last 7 days"
              color={opsQueues && opsQueues.suspiciousLogins > 0 ? "red" : "sky"}
            />
          </div>
        </section>

        {/* ── Section: Payments ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5" /> Payments <span className="text-[10px] font-normal normal-case opacity-60">· travel_payments</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Payment Success"
              value={
                paymentMetrics.total > 0
                  ? `${paymentMetrics.successRate.toFixed(1)}%`
                  : "—"
              }
              icon={Activity}
              subtitle={
                paymentMetrics.total > 0
                  ? `${paymentMetrics.succeeded.toLocaleString()} of ${paymentMetrics.total.toLocaleString()}`
                  : "No payments in period"
              }
              color={
                paymentMetrics.total === 0 ? "sky" :
                paymentMetrics.successRate >= 95 ? "green" :
                paymentMetrics.successRate >= 85 ? "orange" : "red"
              }
            />
            <StatCard
              title="Failed"
              value={paymentMetrics.failed.toLocaleString()}
              icon={Activity}
              subtitle={
                paymentMetrics.failedAmount > 0
                  ? `$${paymentMetrics.failedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lost`
                  : "None"
              }
              color={paymentMetrics.failed > 0 ? "red" : "sky"}
            />
            <StatCard
              title="Refunded"
              value={paymentMetrics.refunded.toLocaleString()}
              icon={DollarSign}
              subtitle={
                paymentMetrics.refundedAmount > 0
                  ? `$${paymentMetrics.refundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "None"
              }
              color={paymentMetrics.refunded > 0 ? "orange" : "sky"}
            />
            <StatCard
              title="In Flight"
              value={paymentMetrics.pending.toLocaleString()}
              icon={TrendingUp}
              subtitle="Pending or processing"
              color="purple"
            />
          </div>
        </section>

        {/* ── Section: Marketing & Engagement ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5" /> Marketing & Engagement
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Push Reach"
              value={marketingMetrics.pushSent.toLocaleString()}
              icon={Bell}
              subtitle={`${marketingMetrics.campaignsRun} campaigns sent`}
              color="blue"
            />
            <StatCard
              title="Delivery Rate"
              value={
                marketingMetrics.pushTargeted > 0
                  ? `${marketingMetrics.deliveryRate.toFixed(1)}%`
                  : "—"
              }
              icon={TrendingUp}
              subtitle={
                marketingMetrics.pushFailed > 0
                  ? `${marketingMetrics.pushFailed.toLocaleString()} failed`
                  : "All delivered"
              }
              color={
                marketingMetrics.pushTargeted === 0 ? "sky" :
                marketingMetrics.deliveryRate >= 95 ? "green" :
                marketingMetrics.deliveryRate >= 80 ? "orange" : "red"
              }
            />
            <StatCard
              title="Email Delivered"
              value={
                emailHealth.total > 0
                  ? `${emailHealth.successRate.toFixed(1)}%`
                  : "—"
              }
              icon={Bell}
              subtitle={
                emailHealth.total > 0
                  ? `${emailHealth.sent.toLocaleString()} of ${emailHealth.total.toLocaleString()}${emailHealth.failed > 0 ? ` · ${emailHealth.failed} failed` : ""}`
                  : "No emails in period"
              }
              color={
                emailHealth.total === 0 ? "sky" :
                emailHealth.successRate >= 98 ? "green" :
                emailHealth.successRate >= 90 ? "orange" : "red"
              }
            />
            <StatCard
              title="Attributed Revenue"
              value={`$${marketingMetrics.attributedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              subtitle="From campaigns"
              color="green"
            />
          </div>
        </section>

        {/* ── Section: Engagement & Conversion ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" /> Engagement & Conversion
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Push Open Rate"
              value={
                pushHealth.delivered > 0
                  ? `${pushHealth.openRate.toFixed(1)}%`
                  : "—"
              }
              icon={Bell}
              subtitle={
                pushHealth.delivered > 0
                  ? `${pushHealth.opened.toLocaleString()} of ${pushHealth.delivered.toLocaleString()} delivered`
                  : "No deliveries in period"
              }
              color={
                pushHealth.delivered === 0 ? "sky" :
                pushHealth.openRate >= 5 ? "green" :
                pushHealth.openRate >= 2 ? "orange" : "red"
              }
            />
            <StatCard
              title="Cart Recovery"
              value={
                abandonmentMetrics.total > 0
                  ? `${abandonmentMetrics.recoveryRate.toFixed(1)}%`
                  : "—"
              }
              icon={ShoppingBag}
              subtitle={
                abandonmentMetrics.total > 0
                  ? `${abandonmentMetrics.recovered.toLocaleString()} of ${abandonmentMetrics.total.toLocaleString()} reached checkout`
                  : "No abandoned searches"
              }
              color={
                abandonmentMetrics.total === 0 ? "sky" :
                abandonmentMetrics.recoveryRate >= 30 ? "green" :
                abandonmentMetrics.recoveryRate >= 15 ? "orange" : "red"
              }
            />
            <StatCard
              title="Driver Rating"
              value={
                ratingMetrics.driverRatingCount > 0
                  ? `${ratingMetrics.avgDriver.toFixed(2)} ★`
                  : "—"
              }
              icon={UserCheck}
              subtitle={
                ratingMetrics.driverRatingCount > 0
                  ? `${ratingMetrics.driverRatingCount.toLocaleString()} ratings`
                  : "No ratings in period"
              }
              color={
                ratingMetrics.driverRatingCount === 0 ? "sky" :
                ratingMetrics.avgDriver >= 4.5 ? "green" :
                ratingMetrics.avgDriver >= 4.0 ? "orange" : "red"
              }
            />
            <StatCard
              title="Merchant Rating"
              value={
                ratingMetrics.merchantRatingCount > 0
                  ? `${ratingMetrics.avgMerchant.toFixed(2)} ★`
                  : "—"
              }
              icon={Store}
              subtitle={
                ratingMetrics.merchantRatingCount > 0
                  ? `${ratingMetrics.merchantRatingCount.toLocaleString()} ratings`
                  : "No ratings in period"
              }
              color={
                ratingMetrics.merchantRatingCount === 0 ? "sky" :
                ratingMetrics.avgMerchant >= 4.5 ? "green" :
                ratingMetrics.avgMerchant >= 4.0 ? "orange" : "red"
              }
            />
            <StatCard
              title="Lodging Rating"
              value={
                lodgingMetrics.count > 0
                  ? `${lodgingMetrics.avg.toFixed(2)} ★`
                  : "—"
              }
              icon={Plane}
              subtitle={
                lodgingMetrics.count > 0
                  ? `${lodgingMetrics.count.toLocaleString()} reviews · ${lodgingMetrics.replyRate.toFixed(0)}% replied`
                  : "No reviews in period"
              }
              color={
                lodgingMetrics.count === 0 ? "sky" :
                lodgingMetrics.avg >= 4.5 ? "green" :
                lodgingMetrics.avg >= 4.0 ? "orange" : "red"
              }
            />
          </div>
        </section>

        {/* ── Section: Growth & Loyalty ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> Growth & Loyalty
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="New Referrals"
              value={referralMetrics.total.toLocaleString()}
              icon={UserPlus}
              subtitle={
                referralMetrics.pending > 0
                  ? `${referralMetrics.pending.toLocaleString()} pending`
                  : "Period total"
              }
              color="purple"
            />
            <StatCard
              title="Qualification Rate"
              value={
                referralMetrics.total > 0
                  ? `${referralMetrics.qualificationRate.toFixed(1)}%`
                  : "—"
              }
              icon={TrendingUp}
              subtitle={
                referralMetrics.total > 0
                  ? `${referralMetrics.qualified.toLocaleString()} qualified · ${referralMetrics.expired.toLocaleString()} expired`
                  : "No referrals in period"
              }
              color={
                referralMetrics.total === 0 ? "sky" :
                referralMetrics.qualificationRate >= 50 ? "green" :
                referralMetrics.qualificationRate >= 25 ? "orange" : "red"
              }
            />
            <StatCard
              title="Credits Issued"
              value={`$${referralMetrics.creditsIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              subtitle="Referrer + referee in period"
              color="orange"
            />
            <StatCard
              title="Credits Outstanding"
              value={`$${creditsLiability.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Wallet}
              subtitle={`${creditsLiability.count.toLocaleString()} active credits`}
              color="red"
            />
            <StatCard
              title="Active Codes"
              value={(activeReferralCodes ?? 0).toLocaleString()}
              icon={Zap}
              subtitle="Currently shareable"
              color="blue"
            />
          </div>
        </section>

        {/* ── Section: Social & Content ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Film className="w-3.5 h-3.5" /> Social & Content
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Live Streams"
              value={socialMetrics.streamsCount.toLocaleString()}
              icon={Radio}
              subtitle={
                socialMetrics.liveNow > 0
                  ? `${socialMetrics.liveNow} live now`
                  : "In selected period"
              }
              color={socialMetrics.liveNow > 0 ? "red" : "purple"}
            />
            <StatCard
              title="Stream Engagement"
              value={socialMetrics.totalStreamViewers.toLocaleString()}
              icon={Eye}
              subtitle={`${socialMetrics.totalStreamLikes.toLocaleString()} likes`}
              color="blue"
            />
            <StatCard
              title="Stories Posted"
              value={socialMetrics.storiesCount.toLocaleString()}
              icon={Film}
              subtitle={`${socialMetrics.storyViews.toLocaleString()} views`}
              color="orange"
            />
            <StatCard
              title="Store Posts"
              value={socialMetrics.storePostsCount.toLocaleString()}
              icon={Heart}
              subtitle="Published in period"
              color="green"
            />
          </div>
        </section>

        {/* ── Charts ── */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="bookings" className="text-xs">Bookings Trend</TabsTrigger>
            <TabsTrigger value="gmvtrend" className="text-xs">GMV Trend</TabsTrigger>
            <TabsTrigger value="paymenttrend" className="text-xs">Payments</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs">Revenue Breakdown</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active Users</TabsTrigger>
            <TabsTrigger value="service-health" className="text-xs">Service Health</TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">Top Errors</TabsTrigger>
            <TabsTrigger value="geography" className="text-xs">Geography</TabsTrigger>
            <TabsTrigger value="pushfunnel" className="text-xs">Push Funnel</TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs">Loyalty Tiers</TabsTrigger>
            <TabsTrigger value="partners" className="text-xs">Partners</TabsTrigger>
            <TabsTrigger value="hours" className="text-xs">Activity Hours</TabsTrigger>
            <TabsTrigger value="emailtypes" className="text-xs">Email Types</TabsTrigger>
            <TabsTrigger value="users" className="text-xs">User Growth</TabsTrigger>
            <TabsTrigger value="rides" className="text-xs">Ride Activity</TabsTrigger>
            <TabsTrigger value="ridestatus" className="text-xs">Trip Status</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">Store Orders</TabsTrigger>
            <TabsTrigger value="services" className="text-xs">By Service</TabsTrigger>
            <TabsTrigger value="pages" className="text-xs">Top Pages</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
          </TabsList>

          {/* Bookings Trend */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Bookings & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend />
                      <Area type="monotone" dataKey="bookings" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} name="Bookings" />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} name="Revenue ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No booking data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GMV Trend (stacked) */}
          <TabsContent value="gmvtrend">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily GMV by Stream</CardTitle>
                {gmv.total > 0 && (
                  <Badge variant="secondary">
                    ${gmv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {gmvTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={gmvTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: number) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="travel"
                        stackId="1"
                        stroke="hsl(217, 91%, 60%)"
                        fill="hsl(217, 91%, 60%)"
                        fillOpacity={0.6}
                        name="Travel"
                      />
                      <Area
                        type="monotone"
                        dataKey="rides"
                        stackId="1"
                        stroke="hsl(35, 91%, 55%)"
                        fill="hsl(35, 91%, 55%)"
                        fillOpacity={0.6}
                        name="Rides"
                      />
                      <Area
                        type="monotone"
                        dataKey="store"
                        stackId="1"
                        stroke="hsl(280, 65%, 60%)"
                        fill="hsl(280, 65%, 60%)"
                        fillOpacity={0.6}
                        name="Store"
                      />
                      <Area
                        type="monotone"
                        dataKey="eats"
                        stackId="1"
                        stroke="hsl(0, 84%, 60%)"
                        fill="hsl(0, 84%, 60%)"
                        fillOpacity={0.6}
                        name="Eats"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No revenue activity in this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Trend (daily by status) */}
          <TabsContent value="paymenttrend">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily Payment Outcomes</CardTitle>
                {paymentMetrics.total > 0 && (
                  <Badge variant="secondary">
                    {paymentMetrics.successRate.toFixed(1)}% success · {paymentMetrics.total.toLocaleString()} total
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {paymentTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={paymentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="succeeded"
                        stackId="1"
                        stroke="hsl(142, 71%, 45%)"
                        fill="hsl(142, 71%, 45%)"
                        fillOpacity={0.6}
                        name="Succeeded"
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        stackId="1"
                        stroke="hsl(0, 84%, 60%)"
                        fill="hsl(0, 84%, 60%)"
                        fillOpacity={0.6}
                        name="Failed"
                      />
                      <Area
                        type="monotone"
                        dataKey="refunded"
                        stackId="1"
                        stroke="hsl(35, 91%, 55%)"
                        fill="hsl(35, 91%, 55%)"
                        fillOpacity={0.6}
                        name="Refunded"
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stackId="1"
                        stroke="hsl(280, 65%, 60%)"
                        fill="hsl(280, 65%, 60%)"
                        fillOpacity={0.6}
                        name="Pending"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No payment activity in this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Breakdown Pie */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Service</CardTitle>
              </CardHeader>
              <CardContent>
                {revenuePieData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={revenuePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={125}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {revenuePieData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 min-w-[200px]">
                      <p className="text-sm font-semibold text-foreground">Breakdown</p>
                      {revenuePieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-sm text-foreground">{entry.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">${entry.value.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Total</span>
                          <span className="text-sm font-bold text-primary">
                            ${revenuePieData.reduce((s, e) => s + e.value, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No revenue data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Users (last 30 days) */}
          <TabsContent value="active">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily Active Users (last 30 days)</CardTitle>
                {activeUserMetrics && (
                  <Badge variant="secondary">
                    {activeUserMetrics.dau.toLocaleString()} DAU · {activeUserMetrics.mau.toLocaleString()} MAU
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {activeUsersChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={activeUsersChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Area
                        type="monotone"
                        dataKey="activeUsers"
                        stroke="hsl(280, 65%, 60%)"
                        fill="hsl(280, 65%, 60%)"
                        fillOpacity={0.15}
                        name="Active Users"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No active-user activity yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Health (per service success rate, last 24h) */}
          <TabsContent value="service-health">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Service Success Rate · last 24h</CardTitle>
                {recentPerf && recentPerf.length > 0 && (
                  <Badge variant="secondary">
                    {recentPerf.length.toLocaleString()} samples
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {serviceHealthData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(280, serviceHealthData.length * 38)}
                  >
                    <BarChart data={serviceHealthData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="service"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: number, _, p: any) => [
                          `${Number(v).toFixed(1)}% (${p.payload.total} calls)`,
                          "Success",
                        ]}
                      />
                      <Bar dataKey="successRate" radius={[0, 4, 4, 0]} name="Success %">
                        {serviceHealthData.map((s, i) => (
                          <Cell
                            key={i}
                            fill={
                              s.successRate >= 99 ? "hsl(142, 71%, 45%)" :
                              s.successRate >= 95 ? "hsl(35, 91%, 55%)" : "hsl(0, 84%, 60%)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No service performance data in last 24h.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Errors (last 24h) */}
          <TabsContent value="errors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Top Error Codes · last 24h</CardTitle>
                {recentPerf && (() => {
                  const fails = recentPerf.filter((m: any) => !m.success).length;
                  return fails > 0 ? (
                    <Badge variant="secondary">{fails.toLocaleString()} failures</Badge>
                  ) : null;
                })()}
              </CardHeader>
              <CardContent>
                {errorBreakdown.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(280, errorBreakdown.length * 38)}
                  >
                    <BarChart data={errorBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="code"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={170}
                      />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar
                        dataKey="count"
                        fill="hsl(0, 84%, 60%)"
                        radius={[0, 4, 4, 0]}
                        name="Failures"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No failures in last 24h. 🎉</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geography (top countries + login devices) */}
          <TabsContent value="geography">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Top Countries</CardTitle>
                  {geographyData.total > 0 && (
                    <Badge variant="secondary">
                      {geographyData.total.toLocaleString()} logins
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {geographyData.byCountry.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={geographyData.byCountry} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar
                          dataKey="count"
                          fill="hsl(190, 80%, 50%)"
                          radius={[0, 4, 4, 0]}
                          name="Logins"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No login data for this period.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Login Devices</CardTitle>
                </CardHeader>
                <CardContent>
                  {geographyData.byDevice.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={geographyData.byDevice}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {geographyData.byDevice.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No device data.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Push Funnel (daily sent → delivered → opened) */}
          <TabsContent value="pushfunnel">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily Push Funnel</CardTitle>
                {pushHealth.delivered > 0 && (
                  <Badge variant="secondary">
                    {pushHealth.openRate.toFixed(1)}% open · {pushHealth.deliveryRate.toFixed(1)}% delivery
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {pushTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={pushTrendData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="sent"
                        stroke="hsl(217, 91%, 60%)"
                        fill="hsl(217, 91%, 60%)"
                        fillOpacity={0.15}
                        name="Sent"
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        stroke="hsl(142, 71%, 45%)"
                        fill="hsl(142, 71%, 45%)"
                        fillOpacity={0.15}
                        name="Delivered"
                      />
                      <Area
                        type="monotone"
                        dataKey="opened"
                        stroke="hsl(280, 65%, 60%)"
                        fill="hsl(280, 65%, 60%)"
                        fillOpacity={0.2}
                        name="Opened"
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        stroke="hsl(0, 84%, 60%)"
                        fill="hsl(0, 84%, 60%)"
                        fillOpacity={0.15}
                        name="Failed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No push notifications in this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Tier Distribution */}
          <TabsContent value="loyalty">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Users by Loyalty Tier</CardTitle>
                {loyaltyTiers && loyaltyTiers.length > 0 && (
                  <Badge variant="secondary">
                    {loyaltyTiers.length.toLocaleString()} enrolled users
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {loyaltyDistribution.length > 0 ? (
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={loyaltyDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={125}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {loyaltyDistribution.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.name === "Gold" ? "hsl(45, 100%, 50%)" :
                                entry.name === "Silver" ? "hsl(220, 8%, 70%)" :
                                entry.name === "Bronze" ? "hsl(30, 60%, 50%)" :
                                "hsl(217, 91%, 60%)"
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 min-w-[200px]">
                      <p className="text-sm font-semibold text-foreground">Breakdown</p>
                      {loyaltyDistribution.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  entry.name === "Gold" ? "hsl(45, 100%, 50%)" :
                                  entry.name === "Silver" ? "hsl(220, 8%, 70%)" :
                                  entry.name === "Bronze" ? "hsl(30, 60%, 50%)" :
                                  "hsl(217, 91%, 60%)",
                              }}
                            />
                            <span className="text-sm text-foreground">{entry.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {entry.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No loyalty enrollments yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partner Clicks (top 10) */}
          <TabsContent value="partners">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Top Travel Partners by Click Volume</CardTitle>
                {partnerRedirects && partnerRedirects.length > 0 && (
                  <Badge variant="secondary">
                    {partnerRedirects.length.toLocaleString()} redirects
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {partnerData.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(280, partnerData.length * 36)}
                  >
                    <BarChart data={partnerData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="partner"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar
                        dataKey="clicks"
                        fill="hsl(280, 65%, 60%)"
                        radius={[0, 4, 4, 0]}
                        name="Clicks"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No partner redirects in this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity by Hour of Day */}
          <TabsContent value="hours">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Page Views by Hour of Day</CardTitle>
                {pageViews && pageViews.length > 0 && (
                  <Badge variant="secondary">
                    {pageViews.length.toLocaleString()} views · times shown in your local timezone
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {activityByHour.some((h) => h.views > 0) ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={activityByHour}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: number) => [`${v.toLocaleString()} views`, ""]}
                        labelFormatter={(h) => `${h}:00`}
                      />
                      <Bar
                        dataKey="views"
                        fill="hsl(190, 80%, 50%)"
                        radius={[4, 4, 0, 0]}
                        name="Page Views"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No page-view data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Types — success rate per type */}
          <TabsContent value="emailtypes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Email Delivery by Type</CardTitle>
                {emailHealth.total > 0 && (
                  <Badge variant="secondary">
                    {emailHealth.successRate.toFixed(1)}% overall · {emailHealth.total.toLocaleString()} sent
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {emailHealthByType.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(280, emailHealthByType.length * 38)}
                  >
                    <BarChart data={emailHealthByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="type"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={170}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: number, _, p: any) => [
                          `${Number(v).toFixed(1)}% (${p.payload.sent}/${p.payload.total})`,
                          "Delivered",
                        ]}
                      />
                      <Bar dataKey="successRate" radius={[0, 4, 4, 0]} name="Delivered %">
                        {emailHealthByType.map((s, i) => (
                          <Cell
                            key={i}
                            fill={
                              s.successRate >= 98 ? "hsl(142, 71%, 45%)" :
                              s.successRate >= 90 ? "hsl(35, 91%, 55%)" : "hsl(0, 84%, 60%)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No emails sent in this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Growth */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">New User Signups per Day</CardTitle>
                {userGrowthData && (
                  <Badge variant="secondary">{userGrowthData.length.toLocaleString()} total in period</Badge>
                )}
              </CardHeader>
              <CardContent>
                {userGrowthChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={userGrowthChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="New Users" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No signup data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ride Activity */}
          <TabsContent value="rides">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Daily Ride Activity</CardTitle>
                {tripData && (
                  <Badge variant="secondary">{(tripData as any[]).length.toLocaleString()} trips in period</Badge>
                )}
              </CardHeader>
              <CardContent>
                {tripsChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={tripsChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend />
                      <Area type="monotone" dataKey="trips" stroke="hsl(35, 91%, 55%)" fill="hsl(35, 91%, 55%)" fillOpacity={0.15} name="Total Trips" />
                      <Area type="monotone" dataKey="completed" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} name="Completed" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No ride data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trip Status Breakdown (pie) */}
          <TabsContent value="ridestatus">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Trip Outcomes</CardTitle>
                {tripData && (() => {
                  const trips = tripData as any[];
                  const completed = trips.filter((t: any) => t.status === "completed").length;
                  const cancelled = trips.filter((t: any) => t.status === "cancelled").length;
                  const finished = completed + cancelled;
                  const completionRate = finished > 0 ? (completed / finished) * 100 : 0;
                  return finished > 0 ? (
                    <Badge variant="secondary">
                      {completionRate.toFixed(1)}% completion · {cancelled} cancelled
                    </Badge>
                  ) : null;
                })()}
              </CardHeader>
              <CardContent>
                {tripStatusData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={tripStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={75}
                          outerRadius={125}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {tripStatusData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.name === "Completed" ? "hsl(142, 71%, 45%)" :
                                entry.name === "Cancelled" ? "hsl(0, 84%, 60%)" :
                                PIE_COLORS[index % PIE_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 min-w-[200px]">
                      <p className="text-sm font-semibold text-foreground">Breakdown</p>
                      {tripStatusData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  entry.name === "Completed" ? "hsl(142, 71%, 45%)" :
                                  entry.name === "Cancelled" ? "hsl(0, 84%, 60%)" :
                                  PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                            <span className="text-sm text-foreground">{entry.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {entry.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No trip data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Store Orders */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Store & Eats Orders</CardTitle>
                {storeOrderData && (
                  <Badge variant="secondary">{(storeOrderData as any[]).length.toLocaleString()} orders in period</Badge>
                )}
              </CardHeader>
              <CardContent>
                {storeOrdersChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={storeOrdersChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend />
                      <Area type="monotone" dataKey="orders" stroke="hsl(280, 65%, 60%)" fill="hsl(280, 65%, 60%)" fillOpacity={0.15} name="Orders" />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} name="Revenue ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No store order data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Service */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bookings by Service Type</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={serviceData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="service" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No service data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Pages */}
          <TabsContent value="pages">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 10 Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPages.length > 0 ? (
                    <div className="space-y-2">
                      {topPages.map((p, i) => (
                        <div key={p.page} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs p-0 shrink-0">
                              {i + 1}
                            </Badge>
                            <span className="text-sm text-foreground font-medium truncate max-w-[240px]">{p.page}</span>
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground shrink-0">{p.views.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No page view data for this period.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={deviceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceBreakdown.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No device data.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Feedback & Support by Category</CardTitle>
                {feedbackData && (
                  <Badge variant="secondary">{(feedbackData as any[]).length.toLocaleString()} submissions</Badge>
                )}
              </CardHeader>
              <CardContent>
                {feedbackByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={feedbackByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="hsl(190, 80%, 50%)" radius={[0, 4, 4, 0]} name="Submissions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No feedback data for this period.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Quick Access ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Access</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {[
              { label: "Flight Orders", path: "/admin/flight-orders", emoji: "✈️" },
              { label: "Trip Heatmap", path: "/admin/operations/heatmap", emoji: "🗺️" },
              { label: "Driver Verify", path: "/admin/drivers/verification", emoji: "🪪" },
              { label: "Moderation", path: "/admin/moderation", emoji: "🛡️" },
              { label: "Support", path: "/admin/support", emoji: "🎧" },
              { label: "System Health", path: "/admin/system-health", emoji: "💚" },
              { label: "God View", path: "/admin/god-view", emoji: "👁️" },
              { label: "Refunds", path: "/admin/payments/refunds", emoji: "↩️" },
              { label: "Stores", path: "/admin/stores", emoji: "🏪" },
              { label: "Ads Analytics", path: "/admin/ads/analytics", emoji: "📊" },
              { label: "Remote Config", path: "/admin/remote-config", emoji: "⚙️" },
              { label: "Auth Shield", path: "/admin/auth-shield", emoji: "🔐" },
            ].map((link) => (
              <button type="button"
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-center"
              >
                <span className="text-xl">{link.emoji}</span>
                <span className="text-[11px] font-medium text-foreground leading-tight">{link.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
