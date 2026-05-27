/**
 * performanceCsvExport — Build & download CSV (campaigns + daily series) for performance reports.
 */

const escapeCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const buildCsv = (rows: (string | number)[][]): string =>
  rows.map((r) => r.map(escapeCell).join(",")).join("\n");

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export interface PerformanceExportData {
  storeName?: string;
  fromLabel: string;
  toLabel: string;
  totals: {
    spend_cents: number;
    revenue_cents: number;
    roas: number;
    conversions: number;
    clicks: number;
    impressions: number;
  };
  series: Array<{ date: string; ads: number; marketing: number; organic: number }>;
  campaigns?: Array<{
    name: string;
    channel: string;
    revenueCents: number;
    spendCents: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
}

export const exportPerformanceCsv = (data: PerformanceExportData) => {
  const safeName = (data.storeName || "store").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `zivo-performance-${safeName}-${data.fromLabel}-to-${data.toLabel}.csv`;

  const rows: (string | number)[][] = [];
  rows.push(["ZIVO Performance Report"]);
  rows.push(["Range", `${data.fromLabel} – ${data.toLabel}`]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Metric", "Value"]);
  rows.push(["Spend (USD)", (data.totals.spend_cents / 100).toFixed(2)]);
  rows.push(["Revenue (USD)", (data.totals.revenue_cents / 100).toFixed(2)]);
  rows.push(["ROAS", data.totals.roas.toFixed(2)]);
  rows.push(["Impressions", data.totals.impressions]);
  rows.push(["Clicks", data.totals.clicks]);
  rows.push(["Conversions", data.totals.conversions]);
  rows.push(["CTR (%)", data.totals.impressions > 0
    ? ((data.totals.clicks / data.totals.impressions) * 100).toFixed(2)
    : "0.00"]);
  rows.push(["CVR (%)", data.totals.clicks > 0
    ? ((data.totals.conversions / data.totals.clicks) * 100).toFixed(2)
    : "0.00"]);
  rows.push([]);

  rows.push(["Daily Revenue by Channel"]);
  rows.push(["Date", "Ads", "Marketing", "Organic", "Total"]);
  for (const s of data.series) {
    rows.push([s.date, s.ads.toFixed(2), s.marketing.toFixed(2), s.organic.toFixed(2), (s.ads + s.marketing + s.organic).toFixed(2)]);
  }

  if (data.campaigns && data.campaigns.length > 0) {
    rows.push([]);
    rows.push(["Campaigns"]);
    rows.push(["Name", "Channel", "Spend", "Revenue", "ROAS", "Impressions", "Clicks", "Conversions", "CTR (%)", "CVR (%)"]);
    for (const c of data.campaigns) {
      const roas = c.spendCents > 0 ? c.revenueCents / c.spendCents : 0;
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      const cvr = c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0;
      rows.push([
        c.name,
        c.channel,
        (c.spendCents / 100).toFixed(2),
        (c.revenueCents / 100).toFixed(2),
        roas.toFixed(2),
        c.impressions,
        c.clicks,
        c.conversions,
        ctr.toFixed(2),
        cvr.toFixed(2),
      ]);
    }
  }

  downloadCsv(filename, buildCsv(rows));
  return filename;
};
