import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "US" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "EU" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "GB" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "JP" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "CA" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", flag: "CH" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "CN" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", flag: "MX" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "IN" },
  { code: "KHR", name: "Cambodian Riel", symbol: "៛", flag: "KH" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "SG" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "TH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", flag: "VN" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "KR" },
];

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.50, AUD: 1.53, CAD: 1.36,
  CHF: 0.88, CNY: 7.24, MXN: 17.15, INR: 83.12, KHR: 4100, SGD: 1.35,
  THB: 36.1, VND: 25000, KRW: 1340,
};

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [result, setResult] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState<string>("cached");

  const fetchRates = useCallback(async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencies.map(c => c.code).filter(c => c !== "USD").join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setRates({ USD: 1, ...data.rates });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch {
      // use fallback silently
    } finally {
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[toCurrency] ?? 1;
    setResult((numAmount / fromRate) * toRate);
  }, [amount, fromCurrency, toCurrency, rates]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleRefresh = () => { fetchRates(); };

  const rate = (rates[toCurrency] ?? 1) / (rates[fromCurrency] ?? 1);
  const isRateUp = rate >= 1;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
              💱
            </div>
            <div>
              <CardTitle className="text-lg">Currency Converter</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time exchange rates</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh rates"
            onClick={handleRefresh}
            className={isUpdating ? "animate-spin" : ""}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Currency */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-medium"
              placeholder="0.00"
            />
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="w-32 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            aria-label="Swap currencies"
            onClick={handleSwap}
            className="rounded-full h-10 w-10 active:scale-[0.90] transition-all duration-200 touch-manipulation"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Converted Amount</label>
          <div className="flex gap-2">
            <div className="flex-1 h-12 px-3 rounded-md border border-input bg-muted/30 flex items-center">
              <span className="text-lg font-bold">
                {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="w-32 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Exchange Rate</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
              </span>
              {isRateUp ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-foreground" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {lastUpdated === "cached" ? "Using cached rates" : `Updated: ${lastUpdated}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
