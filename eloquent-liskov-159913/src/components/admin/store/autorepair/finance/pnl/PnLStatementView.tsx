/**
 * P&L Statement view — accountant-style printable P&L.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { fmtMoney, type PnLKpis } from "@/lib/admin/pnlCalculations";

interface Props {
  storeName?: string;
  from: string;
  to: string;
  kpis: PnLKpis;
  expensesByCategory: Record<string, number>;
  taxRatePct?: number;
}

const COGS_KEYS = ["parts", "supplies", "materials", "inventory"];

function Line({ label, value, indent = 0, bold, paren }: { label: string; value: number; indent?: number; bold?: boolean; paren?: boolean }) {
  const cls = `flex justify-between border-b border-dashed border-border/60 py-1 ${bold ? "font-semibold" : ""}`;
  const display = paren && value > 0 ? `(${fmtMoney(value)})` : fmtMoney(value);
  return (
    <div className={cls} style={{ paddingLeft: indent * 12 }}>
      <span>{label}</span>
      <span className="tabular-nums">{display}</span>
    </div>
  );
}

export default function PnLStatementView({ storeName, from, to, kpis, expensesByCategory, taxRatePct = 15 }: Props) {
  const cogsRows = Object.entries(expensesByCategory).filter(([k]) => COGS_KEYS.includes(k.toLowerCase()));
  const opexRows = Object.entries(expensesByCategory).filter(([k]) => !COGS_KEYS.includes(k.toLowerCase())).sort(([, a], [, b]) => b - a);
  const taxes = Math.max(0, Math.round((kpis.net * taxRatePct) / 100));
  const finalNet = kpis.net - taxes;

  return (
    <Card className="print:shadow-none print:border-0">
      <CardHeader className="pb-2 print:pb-4">
        <CardTitle className="text-sm flex items-center gap-2 print:text-lg">
          <FileText className="w-4 h-4 text-primary print:hidden" />
          Profit & Loss Statement
        </CardTitle>
        <div className="text-[11px] text-muted-foreground print:text-sm">
          {storeName ? <div className="font-medium">{storeName}</div> : null}
          <div>Period: {from} → {to}</div>
          <div className="hidden print:block text-[10px] mt-1">Generated {new Date().toLocaleString()}</div>
        </div>
      </CardHeader>
      <CardContent className="text-xs print:text-sm">
        <div className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground mt-1 mb-1">Revenue</div>
        <Line label="Service & parts revenue (paid)" value={kpis.revenue} indent={1} />
        <Line label="Total Revenue" value={kpis.revenue} bold />

        <div className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground mt-3 mb-1">Cost of Goods Sold</div>
        {cogsRows.length === 0 ? <Line label="None" value={0} indent={1} /> : cogsRows.map(([k, v]) => <Line key={k} label={k} indent={1} value={v} paren />)}
        <Line label="Total COGS" value={kpis.cogs} bold paren />
        <Line label={`Gross Profit (${kpis.grossMargin.toFixed(1)}%)`} value={kpis.grossProfit} bold />

        <div className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground mt-3 mb-1">Operating Expenses</div>
        {opexRows.length === 0 ? <Line label="None" value={0} indent={1} /> : opexRows.map(([k, v]) => <Line key={k} label={k} indent={1} value={v} paren />)}
        <Line label="Total Operating Expenses" value={kpis.opex} bold paren />

        <Line label="Net Operating Income" value={kpis.net} bold />
        <Line label={`Estimated taxes (${taxRatePct}%)`} value={taxes} paren />

        <div className="border-t-2 border-foreground mt-2 pt-2">
          <Line label={`NET PROFIT (${kpis.netMargin.toFixed(1)}%)`} value={finalNet} bold />
        </div>

        <p className="text-[10px] text-muted-foreground mt-4 print:mt-8">
          This statement is generated from invoice payments and recorded expenses. Tax estimate is illustrative only — confirm with your accountant.
        </p>
      </CardContent>
    </Card>
  );
}
