/**
 * Build R.O. — "Estimate Profitability" (gross-profit breakdown).
 * Read-only view of the live estimate: parts cost vs. sell, labor revenue,
 * and gross profit $ / % per category and overall — the GP numbers VSM shops
 * watch on every ticket. Pure computation over the current line set (declined
 * lines are excluded, matching the Estimate Summary). No backend.
 */
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp } from "lucide-react";

/** Minimal line shape (structurally satisfied by the section's ROLine). */
export type ProfitLine = {
  kind: string;
  qty: number;
  unit_cents: number;
  cost_cents: number;
  disc: number;
  disc_type: "%" | "$";
  declined: boolean;
  job?: number;
  description?: string;
};

/** Kinds that carry a real cost of goods (everything else is full margin). */
const COGS_KINDS = new Set(["part", "tire", "sublet"]);
/** Parts below this gross-profit % are flagged for a pricing review. */
const LOW_MARGIN_PCT = 20;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lines: ProfitLine[];
}

const money = (cents: number) =>
  `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${Math.round(n)}%`;

// Mirror of the section's lineDiscountCents / lineTotalCents so GP reconciles with the grid.
const discCents = (l: ProfitLine) => {
  const base = (l.qty || 0) * (l.unit_cents || 0);
  return l.disc_type === "%" ? Math.round((base * (l.disc || 0)) / 100) : Math.round((l.disc || 0) * 100);
};
const sellCents = (l: ProfitLine) => Math.max(0, (l.qty || 0) * (l.unit_cents || 0) - discCents(l));
const costCents = (l: ProfitLine) => (l.qty || 0) * (l.cost_cents || 0);

const GROUPS: { key: string; label: string; kinds: string[]; cogs: boolean }[] = [
  { key: "parts", label: "Parts", kinds: ["part", "tire"], cogs: true },
  { key: "sublet", label: "Sublet", kinds: ["sublet"], cogs: true },
  { key: "labor", label: "Labor", kinds: ["labor", "diagnosis"], cogs: false },
  { key: "fees", label: "Fees", kinds: ["fee"], cogs: false },
];

export default function BuildROProfitDialog({ open, onOpenChange, lines }: Props) {
  const data = useMemo(() => {
    const active = (lines || []).filter((l) => !l.declined);
    const rows = GROUPS.map((g) => {
      const ls = active.filter((l) => g.kinds.includes(l.kind));
      const sell = ls.reduce((s, l) => s + sellCents(l), 0);
      const cost = g.cogs ? ls.reduce((s, l) => s + costCents(l), 0) : 0;
      return { ...g, sell, cost, gp: sell - cost, present: ls.length > 0 };
    });
    const revenue = rows.reduce((s, r) => s + r.sell, 0);
    const cogs = rows.reduce((s, r) => s + r.cost, 0);
    const laborHours = active.filter((l) => l.kind === "labor").reduce((s, l) => s + (l.qty || 0), 0);
    const laborSell = active.filter((l) => l.kind === "labor").reduce((s, l) => s + sellCents(l), 0);
    const declined = (lines || []).filter((l) => l.declined).length;

    // Per-job rollup (VSM groups work into jobs; profit is tracked per job).
    const jobMap = new Map<number, { sell: number; cost: number }>();
    for (const l of active) {
      const j = Number(l.job) || 1;
      const cur = jobMap.get(j) || { sell: 0, cost: 0 };
      cur.sell += sellCents(l);
      cur.cost += COGS_KINDS.has(l.kind) ? costCents(l) : 0;
      jobMap.set(j, cur);
    }
    const perJob = [...jobMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([job, v]) => ({ job, sell: v.sell, cost: v.cost, gp: v.sell - v.cost }));

    // Underpriced parts — sell set but gross profit below the healthy threshold.
    const lowMargin = active
      .filter((l) => (l.kind === "part" || l.kind === "tire") && sellCents(l) > 0)
      .map((l) => {
        const s = sellCents(l);
        const c = costCents(l);
        return { description: l.description || "Part", sell: s, gpPct: ((s - c) / s) * 100 };
      })
      .filter((x) => x.gpPct < LOW_MARGIN_PCT)
      .sort((a, b) => a.gpPct - b.gpPct);

    return { rows, revenue, cogs, gp: revenue - cogs, laborHours, laborSell, declined, perJob, lowMargin };
  }, [lines]);

  const gpPct = data.revenue > 0 ? (data.gp / data.revenue) * 100 : 0;
  const effRate = data.laborHours > 0 ? data.laborSell / data.laborHours : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Estimate Profitability</DialogTitle>
        </DialogHeader>

        {data.revenue === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Add priced lines to see gross-profit numbers.</p>
        ) : (
          <div className="space-y-4">
            {/* Headline cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Revenue</div>
                <div className="text-lg font-semibold tabular-nums">{money(data.revenue)}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Gross profit</div>
                <div className="text-lg font-semibold tabular-nums text-emerald-600">{money(data.gp)}</div>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3">
                <div className="text-[10px] uppercase text-muted-foreground">GP margin</div>
                <div className="text-lg font-semibold tabular-nums text-emerald-700">{pct(gpPct)}</div>
              </div>
            </div>

            {/* Per-category breakdown */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase text-muted-foreground">
                  <th className="px-2 py-1 text-left">Category</th>
                  <th className="px-2 py-1 text-right">Cost</th>
                  <th className="px-2 py-1 text-right">Sell</th>
                  <th className="px-2 py-1 text-right">GP $</th>
                  <th className="px-2 py-1 text-right">GP %</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.filter((r) => r.present).map((r) => (
                  <tr key={r.key} className="border-b last:border-0">
                    <td className="px-2 py-1">{r.label}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{r.cogs ? money(r.cost) : "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(r.sell)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(r.gp)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{r.sell > 0 ? pct((r.gp / r.sell) * 100) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-2 py-1">Total</td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{money(data.cogs)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(data.revenue)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-emerald-600">{money(data.gp)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-emerald-700">{pct(gpPct)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Per-job breakdown (only meaningful with more than one job) */}
            {data.perJob.length > 1 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">By job</p>
                <table className="w-full text-xs">
                  <tbody>
                    {data.perJob.map((j) => (
                      <tr key={j.job} className="border-b last:border-0">
                        <td className="px-2 py-1">Job {j.job}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{money(j.cost)} cost</td>
                        <td className="px-2 py-1 text-right tabular-nums">{money(j.sell)}</td>
                        <td className="px-2 py-1 text-right font-medium tabular-nums text-emerald-700">{j.sell > 0 ? pct((j.gp / j.sell) * 100) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Low-margin watchlist — catch underpriced parts before they ship */}
            {data.lowMargin.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
                <p className="font-medium">
                  {data.lowMargin.length} part{data.lowMargin.length === 1 ? "" : "s"} under {LOW_MARGIN_PCT}% GP — review pricing
                </p>
                <ul className="mt-1 space-y-0.5">
                  {data.lowMargin.slice(0, 4).map((x, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{x.description}</span>
                      <span className="shrink-0 tabular-nums">{pct(x.gpPct)}</span>
                    </li>
                  ))}
                  {data.lowMargin.length > 4 && <li className="text-amber-700">+{data.lowMargin.length - 4} more…</li>}
                </ul>
              </div>
            )}

            {/* Footnotes */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                Effective labor rate: <strong className="text-foreground">{effRate > 0 ? money(effRate) : "—"}</strong>
                {data.laborHours > 0 ? ` /hr · ${data.laborHours}h billed` : ""}
              </span>
              {data.declined > 0 && <span>{data.declined} declined line{data.declined === 1 ? "" : "s"} excluded</span>}
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              GP% = (sell − parts/sublet cost) ÷ sell. Labor &amp; fees carry no cost, so they show as full margin. Keep part
              costs filled in for accurate numbers.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
