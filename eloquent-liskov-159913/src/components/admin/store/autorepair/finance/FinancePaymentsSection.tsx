/**
 * Auto Repair Finance — Payments Received (full dashboard).
 * Period bar, KPI strip, trend chart, method breakdown, outstanding panel,
 * smart record-payment dialog, payments table with edit/refund/delete.
 */
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  computePaymentsKpis,
  groupPaymentsSeries,
  methodBreakdown,
  outstandingInvoices,
  paymentsPresetRange,
  previousPaymentsRange,
  type GroupBy,
  type PaymentsPreset,
  type PaymentRowFull,
  type PaymentInvoiceLite,
} from "@/lib/admin/paymentsCalculations";
import { exportPaymentsCsv, downloadCsv } from "@/lib/admin/paymentsCsvExport";

import PaymentsPeriodBar from "./payments/PaymentsPeriodBar";
import PaymentsKpiStrip from "./payments/PaymentsKpiStrip";
import PaymentsTrendChart from "./payments/PaymentsTrendChart";
import PaymentsMethodBreakdown from "./payments/PaymentsMethodBreakdown";
import PaymentsOutstandingPanel from "./payments/PaymentsOutstandingPanel";
import PaymentsTable from "./payments/PaymentsTable";
import RecordPaymentDialog from "./payments/RecordPaymentDialog";

interface Props { storeId: string; storeName?: string }

function fetchPayments(storeId: string, from: string, to: string) {
  return supabase
    .from("ar_invoice_payments" as any)
    .select("id,amount_cents,method,reference,notes,paid_at,invoice_id")
    .eq("store_id", storeId)
    .gte("paid_at", from)
    .lte("paid_at", `${to}T23:59:59`)
    .order("paid_at", { ascending: false })
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as PaymentRowFull[]; });
}
function fetchInvoices(storeId: string) {
  return supabase
    .from("ar_invoices" as any)
    .select("id,number,customer_name,vehicle_label,total_cents,amount_paid_cents,status,created_at,due_at")
    .eq("store_id", storeId)
    .neq("status", "void")
    .order("created_at", { ascending: false })
    .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as PaymentInvoiceLite[]; });
}

export default function FinancePaymentsSection({ storeId, storeName }: Props) {
  const [, setSearchParams] = useSearchParams();
  const initial = useMemo(() => paymentsPresetRange("month"), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupByMode, setGroupByMode] = useState<GroupBy>("day");
  const [compare, setCompare] = useState(false);
  const [, setPreset] = useState<PaymentsPreset>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetInvoiceId, setPresetInvoiceId] = useState<string | null>(null);

  const prevRange = useMemo(() => compare ? previousPaymentsRange(from, to) : null, [compare, from, to]);

  const queries = useQueries({
    queries: [
      { queryKey: ["ar-payments-list", storeId, from, to], queryFn: () => fetchPayments(storeId, from, to), staleTime: 30_000 },
      { queryKey: ["ar-payments-invoices", storeId], queryFn: () => fetchInvoices(storeId), staleTime: 30_000 },
      ...(prevRange ? [
        { queryKey: ["ar-payments-list", storeId, prevRange.from, prevRange.to], queryFn: () => fetchPayments(storeId, prevRange.from, prevRange.to), staleTime: 60_000 },
      ] : []),
    ],
  });

  const loading = queries.slice(0, 2).some((q) => q.isLoading);
  const payments = (queries[0].data ?? []) as PaymentRowFull[];
  const invoices = (queries[1].data ?? []) as PaymentInvoiceLite[];
  const prevPayments = (prevRange ? (queries[2]?.data ?? []) : []) as PaymentRowFull[];

  const kpis = useMemo(() => computePaymentsKpis(payments, invoices), [payments, invoices]);
  const prevKpis = useMemo(() => prevRange ? computePaymentsKpis(prevPayments, invoices) : null, [prevRange, prevPayments, invoices]);
  const series = useMemo(() => groupPaymentsSeries(payments, groupByMode), [payments, groupByMode]);
  const methods = useMemo(() => methodBreakdown(payments), [payments]);
  const outstanding = useMemo(() => outstandingInvoices(invoices), [invoices]);

  const openInvoice = (id: string) => {
    setSearchParams((sp) => { sp.set("tab", "ar-invoices"); sp.set("invoice", id); return sp; });
  };
  const openDialogFor = (invoiceId?: string) => {
    setPresetInvoiceId(invoiceId ?? null);
    setDialogOpen(true);
  };

  const onExportCsv = () => {
    const csv = exportPaymentsCsv({ storeName, from, to, kpis, prev: prevKpis, series, methods, payments, invoices });
    const safe = (storeName || "store").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`payments-${safe}-${from}-to-${to}.csv`, csv);
    toast.success("CSV exported");
  };
  const onPrint = () => window.print();

  const empty = !loading && payments.length === 0 && outstanding.length === 0;

  return (
    <div className="space-y-3 print:space-y-2">
      <Card className="print:hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" /> Payments Received
          </CardTitle>
          <Button size="sm" className="h-8 text-xs" onClick={() => openDialogFor()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Record payment
          </Button>
        </CardHeader>
        <CardContent>
          <PaymentsPeriodBar
            from={from} to={to} groupBy={groupByMode} compare={compare}
            onFrom={setFrom} onTo={setTo} onPreset={setPreset}
            onGroupBy={setGroupByMode} onCompare={setCompare}
            onExportCsv={onExportCsv} onPrint={onPrint}
          />
        </CardContent>
      </Card>

      {empty ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Banknote className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <h3 className="text-sm font-medium">No payments yet</h3>
            <p className="text-xs text-muted-foreground">Record your first payment to see analytics here.</p>
            <Button size="sm" className="mt-2" onClick={() => openDialogFor()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Record payment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <PaymentsKpiStrip kpis={kpis} prev={prevKpis} series={series} loading={loading} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2 space-y-3">
              <PaymentsTrendChart series={series} />
              <PaymentsMethodBreakdown methods={methods} />
            </div>
            <div className="space-y-3">
              <PaymentsOutstandingPanel
                items={outstanding}
                onApply={(id) => openDialogFor(id)}
                onOpenInvoice={openInvoice}
              />
            </div>
          </div>

          <PaymentsTable storeId={storeId} payments={payments} invoices={invoices} onOpenInvoice={openInvoice} />
        </>
      )}

      <RecordPaymentDialog
        storeId={storeId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoices={invoices}
        presetInvoiceId={presetInvoiceId}
      />
    </div>
  );
}
