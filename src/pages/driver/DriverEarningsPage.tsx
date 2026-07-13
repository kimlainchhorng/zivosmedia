/**
 * DriverEarningsPage - Full earnings dashboard with today/week breakdown
 * Ported from Zivo Driver Connect
 */
import { useState, useCallback } from "react";
import { ArrowLeft, Calendar, RefreshCw, Package, Truck, Gift } from "lucide-react";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { useDriverDashboardData } from "@/hooks/useDriverDashboardData";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import { motion } from "framer-motion";

export default function DriverEarningsPage() {
  const navigate = useNavigate();
  const { stats, isLoading, refetch } = useDriverDashboardData();
  const [activeTab, setActiveTab] = useState<"today" | "week">("today");
  const handlePullRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const todayTotal = stats.todayEarnings;
  const weekTotal = stats.weekEarnings;
  const todayCount = stats.todayDeliveries;
  const weekCount = stats.weekDeliveries;

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-[100dvh] bg-background pb-24 overscroll-none">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Earnings</h1>
              <p className="text-xs text-muted-foreground">Track your income</p>
            </div>
          </div>
          <Button aria-label="Refresh" variant="ghost" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "hsl(var(--card) / 0.85)",
            backdropFilter: "saturate(180%) blur(24px)",
            border: "0.5px solid hsl(var(--border) / 0.2)",
            boxShadow: "0 4px 24px -8px hsl(0 0% 0% / 0.08)",
          }}
        >
          <div className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Today's Earnings</p>
            <p className="text-4xl font-black tracking-tight" style={{ color: "hsl(var(--primary))" }}>
              ${todayTotal.toFixed(2)}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{todayCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Deliveries</p>
              </div>
              <div className="w-px h-8 bg-border/30" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">${weekTotal.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">This Week</p>
              </div>
              <div className="w-px h-8 bg-border/30" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{weekCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Week Total</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Period Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "today" | "week")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today ({todayCount})
            </TabsTrigger>
            <TabsTrigger value="week" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              This Week ({weekCount})
            </TabsTrigger>
          </TabsList>

          {/* Today */}
          <TabsContent value="today" className="mt-4 space-y-4">
            {/* Earnings Breakdown */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Earnings Breakdown
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Earnings</span>
                  <span className="font-semibold text-foreground">${(todayTotal - stats.todayTips).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tips</span>
                  <span className="font-semibold text-primary">${stats.todayTips.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">${todayTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : todayCount === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No deliveries completed today</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Complete orders to see your earnings breakdown
                </p>
              </div>
            ) : null}
          </TabsContent>

          {/* Week Summary */}
          <TabsContent value="week" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  This Week Summary
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">${weekTotal.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">{weekCount}</p>
                    <p className="text-xs text-muted-foreground">Deliveries</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      ${weekCount > 0 ? (weekTotal / weekCount).toFixed(2) : "0.00"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg per Delivery</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">${stats.weekTips.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Tips</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <DriverBottomNav />
    </PullToRefresh>
  );
}
