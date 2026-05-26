/**
 * RideSpendingAnalytics — Spending breakdown, trip analytics, exportable reports
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, DollarSign, TrendingUp, TrendingDown, Download, Calendar, Car, Route, Clock, Percent, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const monthlySpending = [
  { month: "Oct", amount: 280 },
  { month: "Nov", amount: 345 },
  { month: "Dec", amount: 420 },
  { month: "Jan", amount: 310 },
  { month: "Feb", amount: 385 },
  { month: "Mar", amount: 412 },
];

const categoryBreakdown = [
  { label: "Commute", pct: 45, amount: 185.40, color: "bg-primary" },
  { label: "Airport", pct: 25, amount: 103.00, color: "bg-emerald-500" },
  { label: "Social", pct: 20, amount: 82.50, color: "bg-amber-500" },
  { label: "Other", pct: 10, amount: 41.60, color: "bg-muted-foreground" },
];

const savingsHighlights = [
  { label: "Ride Pass savings", amount: "$32.00", icon: Percent },
  { label: "Promo codes used", amount: "$18.50", icon: DollarSign },
  { label: "Shared ride savings", amount: "$24.75", icon: Car },
];

export default function RideSpendingAnalytics() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const maxSpend = Math.max(...monthlySpending.map(m => m.amount));

  const downloadCSV = () => {
    const rows = [["Month", "Amount"], ...monthlySpending.map(m => [m.month, `$${m.amount.toFixed(2)}`])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "zivo-spending.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  const downloadPDF = () => {
    const content = [
      "ZIVO Spending Report",
      `Period: ${period}`,
      "",
      ...monthlySpending.map(m => `${m.month}: $${m.amount.toFixed(2)}`),
      "",
      `Total: $${monthlySpending.reduce((s, m) => s + m.amount, 0).toFixed(2)}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "zivo-spending-report.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };
  const currentSpend = monthlySpending[monthlySpending.length - 1].amount;
  const prevSpend = monthlySpending[monthlySpending.length - 2].amount;
  const spendChange = ((currentSpend - prevSpend) / prevSpend * 100).toFixed(0);
  const isUp = currentSpend > prevSpend;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 justify-center">
        {(["month", "quarter", "year"] as const).map(p => (
          <button type="button" key={p} onClick={() => setPeriod(p)} className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold transition-all capitalize", period === p ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground")}>
            {p === "month" ? "This Month" : p === "quarter" ? "Quarter" : "Year"}
          </button>
        ))}
      </div>

      {/* Total spend card */}
      <div className="rounded-2xl bg-card border border-border/40 p-5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Total Spending</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-black text-foreground">${currentSpend.toFixed(2)}</span>
          <div className={cn("flex items-center gap-0.5 text-xs font-bold", isUp ? "text-red-500" : "text-emerald-500")}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(Number(spendChange))}%
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">vs. last month</p>
      </div>

      {/* Spending chart */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Monthly Trend</span>
        <div className="flex items-end gap-2 mt-3 h-24">
          {monthlySpending.map((m, i) => {
            const isLast = i === monthlySpending.length - 1;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-bold text-muted-foreground">${m.amount}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.amount / maxSpend) * 100}%` }}
                  transition={{ delay: i * 0.05, type: "spring" }}
                  className={cn("w-full rounded-t-md min-h-[4px]", isLast ? "bg-primary" : "bg-primary/25")}
                />
                <span className="text-[9px] text-muted-foreground">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">By Category</span>
        </div>
        {/* Visual bar */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {categoryBreakdown.map(c => (
            <div key={c.label} className={cn("h-full", c.color)} style={{ width: `${c.pct}%` }} />
          ))}
        </div>
        {/* Legend */}
        <div className="space-y-1.5">
          {categoryBreakdown.map(c => (
            <div key={c.label} className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-sm shrink-0", c.color)} />
              <span className="text-xs text-foreground flex-1">{c.label}</span>
              <span className="text-xs font-bold text-foreground">${c.amount.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" /> You Saved $75.25 This Month
        </h3>
        {savingsHighlights.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-foreground flex-1">{s.label}</span>
              <span className="text-xs font-bold text-emerald-500">{s.amount}</span>
            </div>
          );
        })}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Avg/Ride", value: "$14.73", icon: DollarSign },
          { label: "Avg Distance", value: "4.8 mi", icon: Route },
          { label: "Avg Duration", value: "16 min", icon: Clock },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
              <p className="text-sm font-black text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-bold">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Export */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-bold gap-1.5" onClick={downloadPDF}>
          <Download className="w-3.5 h-3.5" /> Download PDF
        </Button>
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-bold gap-1.5" onClick={downloadCSV}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>
    </div>
  );
}
