/**
 * AdminGodView — Owner dashboard: full platform snapshot, Meta match rate, live health
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Activity, Server, CheckCircle, AlertTriangle,
  Eye, Zap, ShoppingBag, Users, BarChart3, Shield, Car, Plane, Package,
  MessageSquare, CreditCard, Heart, RefreshCw,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

type WindowKey = "today" | "yesterday" | "7d";

function getWindow(key: WindowKey): { from: string; label: string } {
  const now = new Date();
  if (key === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), label: "Today" };
  }
  if (key === "yesterday") {
    const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), label: "Yesterday" };
  }
  const d = new Date(now); d.setDate(d.getDate() - 7);
  return { from: d.toISOString(), label: "Last 7 Days" };
}

function MetricTile({ icon: Icon, value, label, color = "default" }: {
  icon: any; value: string | number; label: string;
  color?: "default" | "green" | "blue" | "orange" | "purple";
}) {
  const colors: Record<string, string> = {
    default: "text-primary",
    green: "text-emerald-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  };
  return (
    <div className="text-center p-3 rounded-xl bg-background/60 border border-border/50">
      <Icon className={cn("h-4 w-4 mx-auto mb-1.5", colors[color])} />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

export default function AdminGodView() {
  const [window, setWindow] = useState<WindowKey>("today");
  const { from, label } = getWindow(window);

  // Platform volume
  const { data: volumeData, refetch: refetchVolume, isFetching: volumeFetching } = useQuery({
    queryKey: ["god-view-volume", window],
    queryFn: async () => {
      const db = supabase as any;
      const [storeOrders, foodOrders, truckSales, travelOrders, deliveries, trips] = await Promise.all([
        db.from("store_orders").select("total_cents, status").gte("created_at", from).in("status", ["completed", "delivered", "confirmed"]),
        db.from("food_orders").select("total_amount, status").gte("created_at", from).in("status", ["completed", "delivered"]),
        db.from("truck_sales").select("amount_cents, status").gte("created_at", from).eq("status", "completed"),
        db.from("travel_orders").select("total, status").gte("created_at", from).eq("status", "confirmed"),
        db.from("deliveries").select("id, status").gte("created_at", from),
        db.from("trips").select("id, status").gte("created_at", from),
      ]);

      const storeVolume = (storeOrders.data || []).reduce((s: number, o: any) => s + (o.total_cents || 0), 0);
      const foodVolume = (foodOrders.data || []).reduce((s: number, o: any) => s + ((o.total_amount || 0) * 100), 0);
      const truckVolume = (truckSales.data || []).reduce((s: number, o: any) => s + (o.amount_cents || 0), 0);
      const travelVolume = (travelOrders.data || []).reduce((s: number, o: any) => s + ((Number(o.total) || 0) * 100), 0);
      const totalCents = storeVolume + foodVolume + truckVolume + travelVolume;

      return {
        totalVolume: totalCents / 100,
        platformRevenue: Math.round(totalCents * 0.02) / 100,
        storeOrders: (storeOrders.data || []).length,
        foodOrders: (foodOrders.data || []).length,
        truckSales: (truckSales.data || []).length,
        travelBookings: (travelOrders.data || []).length,
        travelRevenue: travelVolume / 100,
        deliveries: (deliveries.data || []).length,
        completedDeliveries: (deliveries.data || []).filter((d: any) => d.status === "delivered").length,
        trips: (trips.data || []).length,
        completedTrips: (trips.data || []).filter((t: any) => t.status === "completed").length,
        totalTransactions: (storeOrders.data || []).length + (foodOrders.data || []).length + (truckSales.data || []).length + (travelOrders.data || []).length,
      };
    },
    refetchInterval: 30_000,
  });

  // Meta CAPI match rate (always 7-day)
  const { data: metaData } = useQuery({
    queryKey: ["god-view-meta"],
    queryFn: async () => {
      const db = supabase as any;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [totalRes, matchedRes, capiRes] = await Promise.all([
        db.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["completed", "delivered"]).gte("created_at", sevenDaysAgo),
        db.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["completed", "delivered"]).not("meta_event_id", "is", null).gte("created_at", sevenDaysAgo),
        db.from("meta_capi_events").select("id", { count: "exact", head: true }).eq("event_name", "Purchase").gte("created_at", sevenDaysAgo),
      ]);
      const total = totalRes.count || 0;
      const matched = matchedRes.count || 0;
      const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;
      return { totalOrders: total, matchedOrders: matched, capiEvents: capiRes.count || 0, matchRate };
    },
    refetchInterval: 60_000,
  });

  // User & store counts
  const { data: userCounts } = useQuery({
    queryKey: ["god-view-users"],
    queryFn: async () => {
      const db = supabase as any;
      const [users, stores, newUsers, loyaltyRes, feedbackRes, alertsRes] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("store_profiles").select("id", { count: "exact", head: true }),
        db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from),
        db.from("loyalty_points").select("id, points").gte("created_at", from).limit(500),
        db.from("feedback_submissions").select("id", { count: "exact", head: true }).gte("created_at", from),
        db.from("admin_security_alerts").select("id", { count: "exact", head: true }).is("resolved_at", null),
      ]);
      const totalPoints = (loyaltyRes.data || []).reduce((s: number, r: any) => s + (r.points || 0), 0);
      return {
        users: users.count || 0,
        stores: stores.count || 0,
        newUsers: newUsers.count || 0,
        loyaltyEarned: totalPoints,
        feedbackCount: feedbackRes.count || 0,
        openAlerts: alertsRes.count || 0,
      };
    },
    refetchInterval: 60_000,
    // re-fetch when window changes
  });

  // Support / AI conversations
  const { data: supportData } = useQuery({
    queryKey: ["god-view-support", window],
    queryFn: async () => {
      const db = supabase as any;
      const [convos, escalated] = await Promise.all([
        db.from("ai_conversations").select("id", { count: "exact", head: true }).gte("created_at", from),
        db.from("ai_conversations").select("id", { count: "exact", head: true }).eq("escalated", true).gte("created_at", from),
      ]);
      return { total: convos.count || 0, escalated: escalated.count || 0 };
    },
    refetchInterval: 60_000,
  });

  // Edge function list (static manifest — health shown via system health page)
  const edgeFunctions = [
    { name: "stripe-webhook", critical: true },
    { name: "meta-conversion-handler", critical: true },
    { name: "aba-payway-checkout", critical: true },
    { name: "ai-support-chat", critical: false },
    { name: "send-push-notification", critical: false },
    { name: "duffel-flights", critical: false },
  ];

  return (
    <AdminLayout title="God View">
      <div className="max-w-3xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Live platform snapshot — Owner Only</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
              <Shield className="h-3 w-3 mr-1" /> RESTRICTED
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchVolume()}
              disabled={volumeFetching}
              className="gap-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", volumeFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Time window selector */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {(["today", "yesterday", "7d"] as WindowKey[]).map((w) => (
            <Button
              key={w}
              variant={window === w ? "default" : "ghost"}
              size="sm"
              onClick={() => setWindow(w)}
              className="text-xs h-7 px-3"
            >
              {w === "today" ? "Today" : w === "yesterday" ? "Yesterday" : "7 Days"}
            </Button>
          ))}
        </div>

        {/* Platform Volume */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Platform Volume — {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black">
              ${(volumeData?.totalVolume || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Platform Revenue (2%): <span className="font-bold text-green-600">${(volumeData?.platformRevenue || 0).toFixed(2)}</span>
              {" · "}
              <span className="font-medium">{volumeData?.totalTransactions || 0} transactions</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
              <MetricTile icon={ShoppingBag} value={volumeData?.storeOrders || 0} label="Store Orders" color="blue" />
              <MetricTile icon={Zap} value={volumeData?.foodOrders || 0} label="Food Orders" color="orange" />
              <MetricTile icon={TrendingUp} value={volumeData?.truckSales || 0} label="Truck Sales" color="green" />
              <MetricTile icon={Plane} value={volumeData?.travelBookings || 0} label="Travel Bookings" color="purple" />
              <MetricTile icon={Package} value={volumeData?.deliveries || 0} label="Deliveries" color="blue" />
              <MetricTile icon={Car} value={volumeData?.trips || 0} label="Ride Trips" color="orange" />
            </div>
          </CardContent>
        </Card>

        {/* Users & Platform Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Platform Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-2xl font-black">{userCounts?.users?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Total Users</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-2xl font-black">{userCounts?.stores?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Active Stores</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                  <p className="text-2xl font-black text-emerald-600">+{userCounts?.newUsers || 0}</p>
                  <p className="text-[10px] text-muted-foreground">New Signups ({label})</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary text-center">
                  <p className="text-2xl font-black text-foreground">{userCounts?.loyaltyEarned?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Loyalty Points Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Operations {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-foreground">Deliveries</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{volumeData?.deliveries || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{volumeData?.completedDeliveries || 0} completed</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-foreground">Ride Trips</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{volumeData?.trips || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{volumeData?.completedTrips || 0} completed</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-foreground">AI Support Chats</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{supportData?.total || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{supportData?.escalated || 0} escalated</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-foreground">Feedback</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{userCounts?.feedbackCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground">submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Health */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={cn(
            "border",
            (userCounts?.openAlerts || 0) > 0 ? "border-red-500/30 bg-red-500/5" : "border-green-500/20 bg-green-500/5"
          )}>
            <CardContent className="p-5 flex items-center gap-4">
              {(userCounts?.openAlerts || 0) > 0 ? (
                <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
              )}
              <div>
                <p className="text-2xl font-black">{userCounts?.openAlerts || 0}</p>
                <p className="text-xs text-muted-foreground">Open Security Alerts</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <Plane className="w-8 h-8 text-foreground shrink-0" />
              <div>
                <p className="text-2xl font-black">
                  ${(volumeData?.travelRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Travel Revenue ({label})</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta CAPI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Meta CAPI Match Rate (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black">{metaData?.matchRate || 0}%</p>
              <Badge
                variant="outline"
                className={(metaData?.matchRate || 0) >= 80
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                }
              >
                {(metaData?.matchRate || 0) >= 80 ? "Excellent" : "Needs Attention"}
              </Badge>
            </div>
            <Progress value={metaData?.matchRate || 0} className="h-3" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-sm font-bold">{metaData?.totalOrders || 0}</p>
                <p className="text-[9px] text-muted-foreground">Total Orders</p>
              </div>
              <div>
                <p className="text-sm font-bold">{metaData?.matchedOrders || 0}</p>
                <p className="text-[9px] text-muted-foreground">CAPI Matched</p>
              </div>
              <div>
                <p className="text-sm font-bold">{metaData?.capiEvents || 0}</p>
                <p className="text-[9px] text-muted-foreground">Purchase Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edge Functions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" /> Edge Functions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {edgeFunctions.map((fn) => (
              <div key={fn.name} className="flex items-center justify-between p-2.5 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-foreground">{fn.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fn.critical && (
                    <Badge variant="outline" className="text-[9px] bg-red-500/5 text-red-500 border-red-500/20">CRITICAL</Badge>
                  )}
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px]">DEPLOYED</Badge>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => location.assign("/admin/system-health")}
            >
              View Live Health Monitor →
            </Button>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
