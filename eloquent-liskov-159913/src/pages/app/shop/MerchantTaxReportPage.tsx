/**
 * MerchantTaxReportPage — Automated monthly tax summaries with duplicate flagging
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ArrowLeft, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PLATFORM_FEE_RATE = 0.02;

interface MonthSummary {
  month: string;
  label: string;
  totalSales: number;
  orderCount: number;
  platformFee: number;
  netEarnings: number;
  duplicateCount: number;
}

export default function MerchantTaxReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: store } = useQuery({
    queryKey: ["merchant-store-tax", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: monthlySummaries = [], isLoading } = useQuery({
    queryKey: ["merchant-tax-reports", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data: orders } = await (supabase as any)
        .from("store_orders")
        .select("id, total_cents, status, created_at, meta_event_id")
        .eq("store_id", store.id)
        .in("status", ["completed", "delivered"])
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!orders?.length) return [];

      // Group by month
      const monthMap = new Map<string, { orders: any[]; eventIds: Set<string> }>();
      for (const order of orders) {
        const date = new Date(order.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { orders: [], eventIds: new Set() });
        const entry = monthMap.get(key)!;
        entry.orders.push(order);

        // Track Meta event_ids for duplicate detection
        if (order.meta_event_id) {
          entry.eventIds.add(order.meta_event_id);
        }
      }

      const summaries: MonthSummary[] = [];
      for (const [key, { orders: monthOrders, eventIds }] of monthMap) {
        const [y, m] = key.split("-");
        const totalSales = monthOrders.reduce((s: number, o: any) => s + (o.total_cents || 0), 0) / 100;
        const platformFee = totalSales * PLATFORM_FEE_RATE;
        // Duplicate = orders with identical meta_event_id
        const duplicateCount = monthOrders.length - eventIds.size;

        summaries.push({
          month: key,
          label: new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          totalSales,
          orderCount: monthOrders.length,
          platformFee,
          netEarnings: totalSales - platformFee,
          duplicateCount: Math.max(0, duplicateCount),
        });
      }

      return summaries.sort((a, b) => b.month.localeCompare(a.month));
    },
    enabled: !!store?.id,
  });

  const handleDownload = (summary: MonthSummary) => {
    const csv = [
      "Tax Summary Report",
      `Store: ${store?.name}`,
      `Period: ${summary.label}`,
      "",
      "Metric,Value",
      `Total Sales,$${summary.totalSales.toFixed(2)}`,
      `Order Count,${summary.orderCount}`,
      `Platform Fee (2%),$${summary.platformFee.toFixed(2)}`,
      `Net Earnings,$${summary.netEarnings.toFixed(2)}`,
      `Flagged Duplicates,${summary.duplicateCount}`,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-summary-${summary.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 safe-area-top">
      <div className="flex items-center gap-3">
        <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Tax Reports</h1>
          <p className="text-xs text-muted-foreground">Automated monthly summaries</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading reports...</p>
      ) : monthlySummaries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No sales data yet. Reports will appear after your first completed sale.</p>
          </CardContent>
        </Card>
      ) : (
        monthlySummaries.map((summary) => (
          <Card key={summary.month} className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {summary.label}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(summary)} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Gross Sales</p>
                  <p className="text-lg font-bold">${summary.totalSales.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Net Earnings</p>
                  <p className="text-lg font-bold text-green-600">${summary.netEarnings.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Orders</p>
                  <p className="text-lg font-bold">{summary.orderCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Platform Fee</p>
                  <p className="text-lg font-bold text-amber-600">-${summary.platformFee.toFixed(2)}</p>
                </div>
              </div>

              {summary.duplicateCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">
                    {summary.duplicateCount} potential duplicate transaction{summary.duplicateCount > 1 ? "s" : ""} flagged via Meta event_id matching
                  </p>
                </div>
              )}
              {summary.duplicateCount === 0 && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-green-500/5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <p className="text-[10px] text-green-600">No duplicate transactions detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
