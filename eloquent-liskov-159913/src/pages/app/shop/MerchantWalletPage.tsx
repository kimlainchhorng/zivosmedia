/**
 * MerchantWalletPage — Self-service wallet with balance, payouts, and fee tracking
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, DollarSign, Percent, Send, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const PLATFORM_FEE_RATE = 0.02; // 2%

interface PayoutRequest {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  bank_name?: string;
}

export default function MerchantWalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Get store for this merchant
  const { data: store } = useQuery({
    queryKey: ["merchant-store", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get total sales
  const { data: salesData } = useQuery({
    queryKey: ["merchant-sales", store?.id],
    queryFn: async () => {
      if (!store?.id) return { totalCents: 0, orderCount: 0 };
      const { data } = await (supabase as any)
        .from("store_orders")
        .select("total_cents, status")
        .eq("store_id", store.id)
        .in("status", ["completed", "delivered"]);

      const totalCents = (data || []).reduce((s: number, o: any) => s + (o.total_cents || 0), 0);
      return { totalCents, orderCount: (data || []).length };
    },
    enabled: !!store?.id,
  });

  // Get payout history
  const { data: payouts = [] } = useQuery({
    queryKey: ["merchant-payouts", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await (supabase as any)
        .from("merchant_payouts")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!store?.id,
  });

  const totalSales = (salesData?.totalCents || 0) / 100;
  const platformFee = totalSales * PLATFORM_FEE_RATE;
  const totalPaidOut = payouts
    .filter((p: PayoutRequest) => p.status === "completed")
    .reduce((s: number, p: PayoutRequest) => s + p.amount_cents / 100, 0);
  const pendingPayouts = payouts
    .filter((p: PayoutRequest) => p.status === "pending")
    .reduce((s: number, p: PayoutRequest) => s + p.amount_cents / 100, 0);
  const availableBalance = totalSales - platformFee - totalPaidOut - pendingPayouts;

  const requestPayout = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payoutAmount);
      if (isNaN(amount) || amount < 5) throw new Error("Minimum payout is $5.00");
      if (amount > availableBalance) throw new Error("Insufficient balance");
      if (!bankName.trim()) throw new Error("Enter bank name");

      await (supabase as any).from("merchant_payouts").insert({
        store_id: store.id,
        merchant_id: user!.id,
        amount_cents: Math.round(amount * 100),
        bank_name: bankName.trim(),
        status: "pending",
      });
    },
    onSuccess: () => {
      toast.success("Payout requested! Processing in 1-3 business days.");
      setPayoutAmount("");
      setBankName("");
      setShowPayoutForm(false);
      queryClient.invalidateQueries({ queryKey: ["merchant-payouts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    completed: "bg-green-500/10 text-green-600 border-green-500/20",
    failed: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4 safe-area-top">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Merchant Wallet</h1>
          <p className="text-xs text-muted-foreground">{store?.name || "Your Store"}</p>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
            </div>
            <p className="text-4xl font-black text-foreground">${availableBalance.toFixed(2)}</p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">${totalSales.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <ArrowDownLeft className="h-3 w-3 text-green-500" /> Total Sales
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">-${platformFee.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Percent className="h-3 w-3 text-amber-500" /> 2% Fee
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">-${totalPaidOut.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-blue-500" /> Paid Out
                </p>
              </div>
            </div>

            <Button
              className="w-full rounded-xl gap-2"
              onClick={() => setShowPayoutForm(!showPayoutForm)}
              disabled={availableBalance < 5}
            >
              <Send className="h-4 w-4" />
              Request Payout
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payout Form */}
      {showPayoutForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm font-bold">Request Payout</p>
              <Input
                type="number"
                placeholder="Amount ($5.00 minimum)"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="rounded-xl"
              />
              <Input
                placeholder="Bank name (e.g., ABA, ACLEDA)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Payouts are processed within 1-3 business days via bank transfer.
              </p>
              <Button
                className="w-full rounded-xl"
                onClick={() => requestPayout.mutate()}
                disabled={requestPayout.isPending}
              >
                {requestPayout.isPending ? "Submitting..." : "Submit Payout Request"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Auto-Settlement Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Percent className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold">Auto-Settlement Active</p>
              <p className="text-xs text-muted-foreground">
                A 2% platform service fee is automatically deducted from each completed sale.
                This fee is locked into the ZiVo Admin ledger for transparency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Payout History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No payouts yet</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p: PayoutRequest) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-sm font-bold">${(p.amount_cents / 100).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.bank_name || "Bank"} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[p.status] || ""}>
                    {p.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {p.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
