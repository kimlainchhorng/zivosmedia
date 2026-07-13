/**
 * TaxInfoPage — Tax forms, 1099s, and reporting hub.
 * Pulls a real year-to-date receipts summary from the `receipts` table.
 * Tax documents are placeholder rows for v1; structure maps to a future
 * `tax_documents` table 1:1.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Download, AlertCircle, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ReceiptRow {
  id: string;
  total_cents: number;
  currency: string;
  type: string;
  created_at: string;
}

interface TaxDoc {
  id: string;
  name: string;
  description: string;
  available: boolean;
  status: "ready" | "pending" | "unavailable";
}

function formatCents(cents: number, currency: string = "USD"): string {
  const v = (cents ?? 0) / 100;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(v); }
  catch { return `$${v.toFixed(2)}`; }
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function TaxInfoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [yearOpen, setYearOpen] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["tax-receipts", user?.id, year],
    queryFn: async () => {
      if (!user?.id) return [] as ReceiptRow[];
      const start = `${year}-01-01T00:00:00Z`;
      const end = `${year + 1}-01-01T00:00:00Z`;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              gte: (k: string, v: string) => {
                lt: (k: string, v: string) => Promise<{ data: ReceiptRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("receipts")
        .select("id, total_cents, currency, type, created_at")
        .eq("user_id", user.id)
        .gte("created_at", start)
        .lt("created_at", end);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const total = receipts.reduce((s, r) => s + (r.total_cents ?? 0), 0);
    const byType: Record<string, number> = {};
    for (const r of receipts) {
      byType[r.type] = (byType[r.type] ?? 0) + (r.total_cents ?? 0);
    }
    const currency = receipts[0]?.currency || "USD";
    return { total, byType, currency, count: receipts.length };
  }, [receipts]);

  const docs: TaxDoc[] = [
    {
      id: "1099",
      name: `1099-MISC ${year}`,
      description: "Earnings from creator partnerships and driver/host work",
      available: summary.total >= 60000, // 600 USD-cents threshold proxy — adjust per real rules
      status: summary.total >= 60000 ? "ready" : "unavailable",
    },
    {
      id: "summary",
      name: `Annual statement ${year}`,
      description: "All receipts, refunds, and platform fees for the year",
      available: summary.count > 0,
      status: summary.count > 0 ? "ready" : "unavailable",
    },
    {
      id: "w9",
      name: "W-9 (current)",
      description: "Your taxpayer information on file",
      available: false,
      status: "pending",
    },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Tax Info · ZIVO" description="Tax forms, 1099s, and reporting." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Tax Info</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Year picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setYearOpen(!yearOpen)}
            className="w-full h-11 px-4 rounded-xl bg-card border border-border flex items-center justify-between text-sm font-semibold text-foreground"
            aria-expanded={yearOpen}
          >
            <span>Tax year {year}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", yearOpen && "rotate-180")} />
          </button>
          {yearOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full inset-x-0 mt-1.5 rounded-xl bg-card border border-border shadow-lg z-10 overflow-hidden"
            >
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setYear(y); setYearOpen(false); }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    year === y ? "bg-secondary text-ig-gradient font-bold" : "text-foreground hover:bg-secondary/60",
                  )}
                >
                  {y}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* YTD banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{year} total</p>
          <p className="text-3xl font-bold mt-1">
            {isLoading ? "…" : formatCents(summary.total, summary.currency)}
          </p>
          <p className="text-sm text-white/80 mt-1">{summary.count} receipt{summary.count === 1 ? "" : "s"} on file</p>
        </motion.div>

        {/* Breakdown */}
        {!isLoading && Object.keys(summary.byType).length > 0 && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Breakdown by type</h2>
            <div className="space-y-2.5">
              {Object.entries(summary.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, cents]) => {
                  const pct = summary.total > 0 ? (cents / summary.total) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground capitalize">{type}</span>
                        <span className="text-sm font-bold text-foreground">{formatCents(cents, summary.currency)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-ig-gradient rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Documents */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">Documents</h2>
          <div className="space-y-2.5">
            {docs.map((d, idx) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border"
              >
                <div className={cn(
                  "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
                  d.available ? "bg-ig-gradient text-white" : "bg-secondary text-muted-foreground border border-border",
                )}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{d.description}</p>
                </div>
                {d.available ? (
                  <button
                    type="button"
                    aria-label={`Download ${d.name}`}
                    className="shrink-0 h-9 px-3 rounded-full bg-ig-gradient text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground capitalize px-2 py-1 bg-secondary rounded-full">
                    {d.status === "pending" ? "Action required" : "Not eligible"}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Help card */}
        <div className="rounded-2xl bg-secondary/40 border border-border p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-ig-gradient shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Tax filing isn't legal advice</p>
              <p className="text-xs text-muted-foreground mt-1">
                These documents summarize platform activity. Always verify with a qualified tax professional before filing.
              </p>
            </div>
          </div>
          {!summary.count && !isLoading && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>No receipts yet for {year}. Documents become available when there's eligible activity.</span>
            </div>
          )}
        </div>
      </div>
    </SwipeBackContainer>
  );
}
