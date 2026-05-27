/**
 * Auto Repair Finance — Profit & Loss
 * Full accountant-grade dashboard: KPIs, trends, breakdowns, AR aging, cash flow, taxes,
 * statement view, exports (CSV / Print / Email).
 */
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart3, LayoutDashboard, FileText } from "lucide-react";

import {
  computeKpis,
  computeAging,
  groupSeries,
  presetRange,
  comparePreviousRange,
  type Preset,
  type GroupBy,
  type CompareMode,
  type PaymentRow,
  type ExpenseRow,
  type InvoiceRow,
  type PayoutRow,
} from "@/lib/admin/pnlCalculations";
import { exportPnlCsv, downloadCsv } from "@/lib/admin/pnlCsvExport";

import PnLDateRangeBar from "./pnl/PnLDateRangeBar";
import PnLKpiStrip from "./pnl/PnLKpiStrip";
import PnLTrendChart from "./pnl/PnLTrendChart";
import PnLIncomeBreakdown from "./pnl/PnLIncomeBreakdown";
import PnLExpenseBreakdown from "./pnl/PnLExpenseBreakdown";
import PnLCashFlow from "./pnl/PnLCashFlow";
import PnLArAging from "./pnl/PnLArAging";
import PnLTaxEstimate from "./pnl/PnLTaxEstimate";
import PnLStatementView from "./pnl/PnLStatementView";

interface Props { storeId: string; storeName?: string }

function fetchPayments(storeId: string, from: string, to: string) {
  return supabase
    .from("ar_invoice_payments" as any)
    .select("amount_cents,paid_at,method")
    .eq("store_id", storeId)
    .gte("paid_at", from)
    .lte("paid_at", `${to}T23:59:59`)
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as PaymentRow[]; });
}
function fetchExpenses(storeId: string, from: string, to: string) {
  return supabase
    .from("ar_expenses" as any)
    .select("id,amount_cents,category,vendor,payment_method,expense_date,description,receipt_url")
    .eq("store_id", storeId)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as ExpenseRow[]; });
}
function fetchInvoices(storeId: string, from: string, to: string) {
  return supabase
    .from("ar_invoices" as any)
    .select("id,total_cents,amount_paid_cents,subtotal_cents,tax_cents,status,due_at,paid_at,created_at,customer_name,items")
    .eq("store_id", storeId)
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`)
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as InvoiceRow[]; });
}
function fetchAllUnpaid(storeId: string) {
  return supabase
    .from("ar_invoices" as any)
    .select("id,total_cents,amount_paid_cents,subtotal_cents,tax_cents,status,due_at,paid_at,created_at,customer_name,items")
    .eq("store_id", storeId)
    .neq("status", "paid")
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as InvoiceRow[]; });
}
function fetchPayouts(storeId: string, from: string, to: string) {
  return supabase
    .from("ar_payouts" as any)
    .select("amount_cents,payout_date,source")
    .eq("store_id", storeId)
    .gte("payout_date", from)
    .lte("payout_date", to)
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as PayoutRow[]; });
}

export default function FinanceProfitLossSection({ storeId, storeName }: Props) {
  const [, setSearchParams] = useSearchParams();
  const [preset, setPreset] = useState<Preset>("custom");
  const initial = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return { from: d.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
  }, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupByMode, setGroupByMode] = useState<GroupBy>("day");
  const [compareMode, setCompareMode] = useState<CompareMode>("none");
  const [view, setView] = useState<"dashboard" | "statement">("dashboard");

  const prevRange = useMemo(() => comparePreviousRange(from, to, compareMode), [from, to, compareMode]);

  const queries = useQueries({
    queries: [
      { queryKey: ["ar-pnl-payments", storeId, from, to], queryFn: () => fetchPayments(storeId, from, to), staleTime: 30_000 },
      { queryKey: ["ar-pnl-expenses", storeId, from, to], queryFn: () => fetchExpenses(storeId, from, to), staleTime: 30_000 },
      { queryKey: ["ar-pnl-invoices", storeId, from, to], queryFn: () => fetchInvoices(storeId, from, to), staleTime: 30_000 },
      { queryKey: ["ar-pnl-unpaid", storeId], queryFn: () => fetchAllUnpaid(storeId), staleTime: 60_000 },
      { queryKey: ["ar-pnl-payouts", storeId, from, to], queryFn: () => fetchPayouts(storeId, from, to), staleTime: 60_000 },
      ...(prevRange ? [
        { queryKey: ["ar-pnl-payments", storeId, prevRange.from, prevRange.to], queryFn: () => fetchPayments(storeId, prevRange.from, prevRange.to), staleTime: 60_000 },
        { queryKey: ["ar-pnl-expenses", storeId, prevRange.from, prevRange.to], queryFn: () => fetchExpenses(storeId, prevRange.from, prevRange.to), staleTime: 60_000 },
        { queryKey: ["ar-pnl-invoices", storeId, prevRange.from, prevRange.to], queryFn: () => fetchInvoices(storeId, prevRange.from, prevRange.to), staleTime: 60_000 },
      ] : []),
    ],
  });

  const loading = queries.slice(0, 5).some((q) => q.isLoading);
  const payments = (queries[0].data ?? []) as PaymentRow[];
  const expenses = (queries[1].data ?? []) as ExpenseRow[];
  const invoices = (queries[2].data ?? []) as InvoiceRow[];
  const unpaid   = (queries[3].data ?? []) as InvoiceRow[];
  const payouts  = (queries[4].data ?? []) as PayoutRow[];

  const prevPayments = (prevRange ? (queries[5]?.data ?? []) : []) as PaymentRow[];
  const prevExpenses = (prevRange ? (queries[6]?.data ?? []) : []) as ExpenseRow[];
  const prevInvoices = (prevRange ? (queries[7]?.data ?? []) : []) as InvoiceRow[];

  const kpis = useMemo(() => computeKpis(payments, expenses, invoices), [payments, expenses, invoices]);
  const prevKpis = useMemo(() => prevRange ? computeKpis(prevPayments, prevExpenses, prevInvoices) : null, [prevRange, prevPayments, prevExpenses, prevInvoices]);
  const series = useMemo(() => groupSeries(payments, expenses, groupByMode), [payments, expenses, groupByMode]);
  const aging = useMemo(() => computeAging(unpaid), [unpaid]);

  const expensesByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach((e) => { const k = e.category || "Uncategorized"; m[k] = (m[k] || 0) + (e.amount_cents ?? 0); });
    return m;
  }, [expenses]);
  const expensesByVendor = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach((e) => { const k = e.vendor || "Unknown"; m[k] = (m[k] || 0) + (e.amount_cents ?? 0); });
    return m;
  }, [expenses]);
  const incomeByMethod = useMemo(() => {
    const m: Record<string, number> = {};
    payments.forEach((p) => { const k = (p.method || "Unknown").trim(); m[k] = (m[k] || 0) + (p.amount_cents ?? 0); });
    return m;
  }, [payments]);

  const onExportCsv = () => {
    const csv = exportPnlCsv({
      storeName, from, to, kpis, prevKpis,
      series, expensesByCategory, expensesByVendor, incomeByMethod, aging,
    });
    const safe = (storeName || "store").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`pnl-${safe}-${from}-to-${to}.csv`, csv);
    toast.success("CSV exported");
  };
  const onPrint = () => { setView("statement"); setTimeout(() => window.print(), 300); };
  const onEmail = () => {
    const subject = encodeURIComponent(`P&L ${from} to ${to}${storeName ? ` — ${storeName}` : ""}`);
    const body = encodeURIComponent(`Hi,\n\nAttached is the Profit & Loss for ${from} – ${to}.\n\n— Sent from ZIVO`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onExportCsv();
  };
  const openInvoice = (id: string) => {
    setSearchParams((sp) => { sp.set("tab", "ar-invoices"); sp.set("invoice", id); return sp; });
  };
  const jumpToTax = () => {
    setSearchParams((sp) => { sp.set("tab", "ar-fin-tax"); return sp; });
  };

  const empty = !loading && payments.length === 0 && expenses.length === 0 && invoices.length === 0;

  return (
    <div className="space-y-3 print:space-y-2">
      <Card className="print:hidden">
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Profit & Loss
          </CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="dashboard" className="text-xs h-7"><LayoutDashboard className="w-3.5 h-3.5 mr-1" />Dashboard</TabsTrigger>
              <TabsTrigger value="statement" className="text-xs h-7"><FileText className="w-3.5 h-3.5 mr-1" />Statement</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <PnLDateRangeBar
            from={from} to={to} preset={preset} groupBy={groupByMode} compareMode={compareMode}
            onPreset={setPreset}
            onFrom={(v) => setFrom(v)}
            onTo={(v) => setTo(v)}
            onGroupBy={setGroupByMode}
            onCompare={setCompareMode}
            onExportCsv={onExportCsv} onPrint={onPrint} onEmail={onEmail}
          />
        </CardContent>
      </Card>

      {empty ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-medium">No financial activity yet</h3>
            <p className="text-xs text-muted-foreground">Record your first invoice, payment, or expense to see your P&L come alive.</p>
          </CardContent>
        </Card>
      ) : view === "statement" ? (
        <PnLStatementView storeName={storeName} from={from} to={to} kpis={kpis} expensesByCategory={expensesByCategory} />
      ) : (
        <>
          <PnLKpiStrip kpis={kpis} prev={prevKpis} series={series} loading={loading} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2 space-y-3">
              <PnLTrendChart series={series} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PnLIncomeBreakdown payments={payments} invoices={invoices} />
                <PnLExpenseBreakdown expenses={expenses} />
              </div>
            </div>
            <div className="space-y-3">
              <PnLCashFlow payments={payments} expenses={expenses} payouts={payouts} />
              <PnLArAging aging={aging} onOpenInvoice={openInvoice} />
              <PnLTaxEstimate salesTax={kpis.taxes} netProfit={kpis.net} onJumpToTax={jumpToTax} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
