/**
 * ExchangeRatesPage — Currency converter with live rates.
 * Backed by the real `exchange_rates` table.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, Search, Clock, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RateRow {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function ExchangeRatesPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [query, setQuery] = useState("");

  const { data: rates = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: RateRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("exchange_rates")
        .select("id, base_currency, target_currency, rate, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Latest rate per pair.
  const latestByPair = useMemo(() => {
    const map = new Map<string, RateRow>();
    for (const r of rates) {
      const key = `${r.base_currency}/${r.target_currency}`;
      const cur = map.get(key);
      if (!cur || new Date(r.fetched_at) > new Date(cur.fetched_at)) {
        map.set(key, r);
      }
    }
    return map;
  }, [rates]);

  const currencies = useMemo(() => {
    const set = new Set<string>();
    rates.forEach((r) => { set.add(r.base_currency); set.add(r.target_currency); });
    return Array.from(set).sort();
  }, [rates]);

  // Seed default pair to the first available pair if our defaults aren't in data.
  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(from)) setFrom(currencies[0]);
    if (currencies.length > 1 && !currencies.includes(to)) setTo(currencies[1]);
  }, [currencies, from, to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const directRate = latestByPair.get(`${from}/${to}`);
  const inverseRate = latestByPair.get(`${to}/${from}`);
  const usedRate = directRate?.rate ?? (inverseRate ? 1 / inverseRate.rate : null);
  const usedFetched = directRate?.fetched_at ?? inverseRate?.fetched_at ?? null;

  const amountNum = Math.max(0, Number(amount) || 0);
  const converted = usedRate != null ? amountNum * usedRate : null;

  const filteredPairs = useMemo(() => {
    const pairs = Array.from(latestByPair.values());
    const q = query.trim().toUpperCase();
    if (!q) return pairs;
    return pairs.filter((p) => p.base_currency.includes(q) || p.target_currency.includes(q));
  }, [latestByPair, query]);

  const fromOptions = currencies.length > 0 ? currencies : ["USD", "EUR", "GBP", "JPY"];
  const toOptions = fromOptions;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Exchange Rates · ZIVO" description="Live currency conversion for travelers." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Exchange</h1>
          </div>
          <button
            type="button"
            aria-label="Refresh rates"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Converter card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Convert</p>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 h-11 px-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-2xl font-bold placeholder:text-white/50 focus:outline-none focus:bg-white/25"
              />
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11 px-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-bold focus:outline-none border-0"
              >
                {fromOptions.map((c) => <option key={c} value={c} className="text-foreground">{c}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={swap}
              aria-label="Swap currencies"
              className="mx-auto block h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center active:scale-90 transition-all"
            >
              <ArrowLeftRight className="h-4 w-4 text-white rotate-90" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-11 px-3 rounded-xl bg-white/15 flex items-center text-white text-2xl font-bold">
                {converted != null ? converted.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              </div>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11 px-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-bold focus:outline-none border-0"
              >
                {toOptions.map((c) => <option key={c} value={c} className="text-foreground">{c}</option>)}
              </select>
            </div>
          </div>

          {usedRate != null && (
            <p className="text-xs text-white/80 mt-3">
              1 {from} = {usedRate.toFixed(4)} {to}
              {usedFetched && <> · <Clock className="h-3 w-3 inline" /> {formatRelative(usedFetched)}</>}
            </p>
          )}
          {usedRate == null && !isLoading && (
            <p className="text-xs text-white/85 mt-3">No direct rate yet for {from}→{to}.</p>
          )}
        </motion.div>

        {/* All pairs */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Filter currency code (USD, EUR, JPY…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && filteredPairs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {rates.length === 0 ? "No exchange rates published yet." : "No pairs match your filter."}
          </p>
        )}

        {!isLoading && filteredPairs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">All pairs ({filteredPairs.length})</p>
            {filteredPairs.map((r, idx) => (
              <motion.button
                key={r.id}
                type="button"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 12) * 0.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => { setFrom(r.base_currency); setTo(r.target_currency); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{r.base_currency}</span>
                  <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{r.target_currency}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{r.rate.toFixed(4)}</p>
                  <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {formatRelative(r.fetched_at)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
