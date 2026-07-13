/**
 * RidePaymentsAdvanced — Crypto, BNPL, expense auto-categorization, receipt OCR
 */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Bitcoin, CreditCard, ScanLine, Tag, Receipt, Clock, CheckCircle2, Wallet, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const bnplPlans = [
  { id: "4x", label: "Pay in 4", desc: "4 bi-weekly payments", fee: "0%", example: "$6.25 × 4" },
  { id: "monthly", label: "Monthly", desc: "3 monthly payments", fee: "2.9%", example: "$8.75 × 3" },
];

const categories = [
  { name: "Commute", amount: 245.80, pct: 45, color: "bg-blue-500" },
  { name: "Business", amount: 180.20, pct: 33, color: "bg-emerald-500" },
  { name: "Personal", amount: 89.50, pct: 16, color: "bg-amber-500" },
  { name: "Airport", amount: 32.00, pct: 6, color: "bg-purple-500" },
];

const receipts = [
  { id: "1", date: "Today", route: "Home → Office", amount: 14.50, category: "Commute", scanned: true },
  { id: "2", date: "Yesterday", route: "Airport → Hotel", amount: 32.00, category: "Business", scanned: true },
  { id: "3", date: "Mar 4", route: "Mall → Home", amount: 8.75, category: "Personal", scanned: false },
];

const CRYPTO_KEY = "zivo_enabled_crypto";

export default function RidePaymentsAdvanced() {
  const [selectedBnpl, setSelectedBnpl] = useState<string | null>(null);
  const [enabledCoins, setEnabledCoins] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CRYPTO_KEY) || "[]"); } catch { return []; }
  });
  const scanInputRef = useRef<HTMLInputElement>(null);

  const toggleCoin = (coin: string) => {
    setEnabledCoins(prev => {
      const next = prev.includes(coin) ? prev.filter(c => c !== coin) : [...prev, coin];
      localStorage.setItem(CRYPTO_KEY, JSON.stringify(next));
      toast.success(prev.includes(coin) ? `${coin} disabled` : `${coin} payment enabled!`);
      return next;
    });
  };

  const exportExpenseCSV = () => {
    const rows = [["Date", "Route", "Amount", "Category"], ...receipts.map(r => [r.date, r.route, `$${r.amount.toFixed(2)}`, r.category])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "zivo-expenses.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Expense report exported!");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="crypto">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
          <TabsTrigger value="bnpl" className="text-xs">BNPL</TabsTrigger>
          <TabsTrigger value="expense" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="ocr" className="text-xs">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bitcoin className="w-4 h-4 text-amber-500" /> Crypto Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">BTC Balance</span>
                  <span className="font-bold">0.0024 BTC</span>
                </div>
                <span className="text-xs text-muted-foreground">≈ $156.80</span>
              </div>
              {["Bitcoin (BTC)", "Ethereum (ETH)", "USDC"].map((coin) => (
                <div key={coin} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium">{coin}</span>
                  <Button size="sm" variant={enabledCoins.includes(coin) ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleCoin(coin)}>
                    {enabledCoins.includes(coin) ? "Enabled ✓" : "Enable"}
                  </Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground text-center">Converted to USD at time of ride. Network fees apply.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bnpl" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Buy Now, Pay Later
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Split ride costs into installments for rides over $20.</p>
              {bnplPlans.map((plan) => (
                <motion.button
                  key={plan.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedBnpl(plan.id); toast.success(`${plan.label} selected`); }}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${selectedBnpl === plan.id ? "border-primary bg-primary/5" : "border-border/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{plan.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{plan.fee} fee</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.desc} · e.g. {plan.example}</p>
                </motion.button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> Auto-Categorization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">${cat.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={cat.pct} className="h-2 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-8">{cat.pct}%</span>
                  </div>
                </div>
              ))}
              <Button className="w-full mt-2" variant="outline" size="sm" onClick={exportExpenseCSV}>
                Export Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-primary" /> Smart Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border border-border/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.route}</span>
                      {r.scanned && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{r.date}</span>
                      <Badge variant="outline" className="text-[9px] h-4">{r.category}</Badge>
                    </div>
                  </div>
                  <span className="font-bold text-sm">${r.amount.toFixed(2)}</span>
                </div>
              ))}
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                if (e.target.files?.[0]) toast.success("Receipt scanned! Extracting details...");
              }} />
              <Button className="w-full" variant="outline" size="sm" onClick={() => scanInputRef.current?.click()}>
                <ScanLine className="w-4 h-4 mr-2" /> Scan Paper Receipt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
