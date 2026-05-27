/**
 * Payments table with search, method filter, sortable columns, edit/delete/refund.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListChecks, Search, ArrowUpDown, Trash2, RotateCcw, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  fmtMoney,
  PAYMENT_METHODS,
  type PaymentRowFull,
  type PaymentInvoiceLite,
} from "@/lib/admin/paymentsCalculations";

interface Props {
  storeId: string;
  payments: PaymentRowFull[];
  invoices: PaymentInvoiceLite[];
  onOpenInvoice?: (id: string) => void;
}

type SortField = "date" | "amount";

const METHOD_TONE: Record<string, string> = {
  cash:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  card:  "bg-blue-100 text-blue-700 border-blue-200",
  check: "bg-violet-100 text-violet-700 border-violet-200",
  aba:   "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function PaymentsTable({ storeId, payments, invoices, onOpenInvoice }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const invoiceMap = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = payments.filter((p) => {
      if (method !== "all" && (p.method ?? "other") !== method) return false;
      if (!q) return true;
      const inv = p.invoice_id ? invoiceMap.get(p.invoice_id) : null;
      return (
        (p.reference ?? "").toLowerCase().includes(q) ||
        (inv?.number ?? "").toLowerCase().includes(q) ||
        (inv?.customer_name ?? "").toLowerCase().includes(q)
      );
    });
    arr = [...arr].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "amount") return ((a.amount_cents - b.amount_cents) * dir);
      return (a.paid_at < b.paid_at ? -1 : a.paid_at > b.paid_at ? 1 : 0) * dir;
    });
    return arr;
  }, [payments, search, method, sortField, sortDir, invoiceMap]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_invoice_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment deleted");
      qc.invalidateQueries({ queryKey: ["ar-payments-list", storeId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const refund = useMutation({
    mutationFn: async (p: PaymentRowFull) => {
      if (p.amount_cents <= 0) throw new Error("Cannot refund a refund");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_invoice_payments" as any).insert({
        store_id: storeId,
        invoice_id: p.invoice_id,
        amount_cents: -p.amount_cents,
        method: p.method,
        reference: `Refund of ${p.reference || p.id.slice(0, 8)}`,
        notes: "Auto refund",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Refund recorded");
      qc.invalidateQueries({ queryKey: ["ar-payments-list", storeId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" /> Recent payments
          <span className="text-[11px] font-normal text-muted-foreground">· {filtered.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search reference, invoice #, customer" value={search}
              onChange={(e) => setSearch(e.target.value)} className="h-8 pl-7 text-xs" />
          </div>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b">
                <th className="px-2 py-1.5 font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("date")}>
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-2 py-1.5 font-medium">Method</th>
                <th className="px-2 py-1.5 font-medium">Invoice</th>
                <th className="px-2 py-1.5 font-medium">Customer</th>
                <th className="px-2 py-1.5 font-medium">Reference</th>
                <th className="px-2 py-1.5 font-medium text-right">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("amount")}>
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-2 py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">No payments match.</td></tr>
              ) : filtered.slice(0, 50).map((p) => {
                const inv = p.invoice_id ? invoiceMap.get(p.invoice_id) : null;
                const closed = inv && inv.status === "paid";
                const isRefund = p.amount_cents < 0;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{p.paid_at.slice(0, 16).replace("T", " ")}</td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border ${METHOD_TONE[p.method ?? "other"]}`}>
                        {(p.method ?? "other").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5">
                      {inv ? (
                        <button type="button" onClick={() => onOpenInvoice?.(inv.id)} className="hover:underline inline-flex items-center gap-1">
                          {inv.number || inv.id.slice(0, 8)}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[140px]">{inv?.customer_name || "—"}</td>
                    <td className="px-2 py-1.5 truncate max-w-[140px] text-muted-foreground">{p.reference || "—"}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${isRefund ? "text-rose-600" : ""}`}>
                      {fmtMoney(p.amount_cents)}
                      {closed && !isRefund && (
                        <CheckCircle2 className="inline w-3 h-3 ml-1 text-emerald-600" />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      {!isRefund && (
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => refund.mutate(p)} title="Refund this payment">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => { if (confirm("Delete this payment?")) remove.mutate(p.id); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <p className="text-[10px] text-muted-foreground text-center">Showing first 50 of {filtered.length}.</p>
        )}
      </CardContent>
    </Card>
  );
}
