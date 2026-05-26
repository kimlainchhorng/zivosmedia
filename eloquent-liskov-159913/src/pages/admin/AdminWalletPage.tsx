/**
 * Admin Wallet Management — View customer wallets & withdrawal requests
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet, ArrowDownLeft, Search, DollarSign, Users, Clock, CheckCircle2,
  Banknote, Building2, Loader2, XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function AdminWalletPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"withdrawals" | "wallets">("withdrawals");
  const [actingId, setActingId] = useState<string | null>(null);

  const processWithdrawal = async (id: string, approve: boolean) => {
    setActingId(id);
    try {
      const { error } = await (supabase as any)
        .from("customer_wallet_transactions")
        .update({ is_redeemed: approve, redeemed_at: approve ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success(approve ? "Withdrawal marked as processed" : "Withdrawal denied");
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActingId(null);
    }
  };

  // Fetch all withdrawal transactions
  const { data: withdrawals = [], isLoading: wLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_wallet_transactions")
        .select("id, user_id, amount_cents, balance_after_cents, type, description, created_at, is_redeemed, redeemed_at")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all wallets
  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_wallets")
        .select("id, user_id, balance_cents, lifetime_credits_cents, created_at, updated_at")
        .order("balance_cents", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payout methods for context
  const { data: payoutMethods = [] } = useQuery({
    queryKey: ["admin-payout-methods"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_payout_methods")
        .select("*")
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const totalBalance = wallets.reduce((s: number, w: any) => s + (w.balance_cents || 0), 0);
  const totalWithdrawals = withdrawals.reduce((s: number, w: any) => s + Math.abs(w.amount_cents || 0), 0);
  const activeWallets = wallets.filter((w: any) => (w.balance_cents || 0) > 0).length;

  const filteredWithdrawals = withdrawals.filter((w: any) =>
    !search || w.user_id?.includes(search) || w.description?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWallets = wallets.filter((w: any) =>
    !search || w.user_id?.includes(search)
  );

  const getPayoutForUser = (userId: string) =>
    payoutMethods.filter((p: any) => p.user_id === userId);

  return (
    <AdminLayout title="Wallet Management">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Balance (All Users)", value: `$${(totalBalance / 100).toFixed(2)}`, icon: Wallet, color: "text-emerald-500" },
          { label: "Total Withdrawals", value: `$${(totalWithdrawals / 100).toFixed(2)}`, icon: ArrowDownLeft, color: "text-orange-500" },
          { label: "Active Wallets", value: activeWallets, icon: Users, color: "text-blue-500" },
          { label: "Payout Accounts", value: payoutMethods.length, icon: Building2, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {(["withdrawals", "wallets"] as const).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Withdrawals Tab */}
      {tab === "withdrawals" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Withdrawal Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No withdrawals yet</p>
            ) : (
              <div className="space-y-2">
                {filteredWithdrawals.map((w: any) => {
                  const userPayouts = getPayoutForUser(w.user_id);
                  return (
                    <div key={w.id} className="rounded-xl border border-border/40 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{w.description || "Withdrawal"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            User: {w.user_id?.slice(0, 8)}… · {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                          </p>
                          {userPayouts.length > 0 && (
                            <p className="text-[11px] text-blue-500 mt-0.5">
                              {userPayouts[0].method_type === "aba" ? "ABA" : "Bank"}: {userPayouts[0].account_holder_name || "—"} · {
                                userPayouts[0].method_type === "aba"
                                  ? userPayouts[0].aba_account_id
                                  : `${userPayouts[0].bank_name} •••${userPayouts[0].account_number?.slice(-4) || ""}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-orange-500">
                          -${(Math.abs(w.amount_cents) / 100).toFixed(2)}
                        </p>
                        {w.is_redeemed ? (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Processed
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                              disabled={actingId === w.id}
                              onClick={() => processWithdrawal(w.id, true)}
                            >
                              {actingId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                              disabled={actingId === w.id}
                              onClick={() => processWithdrawal(w.id, false)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wallets Tab */}
      {tab === "wallets" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Customer Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No wallets found</p>
            ) : (
              <div className="space-y-2">
                {filteredWallets.map((w: any) => (
                  <div key={w.id} className="rounded-xl border border-border/40 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">User: {w.user_id?.slice(0, 12)}…</p>
                      <p className="text-[11px] text-muted-foreground">
                        Lifetime: ${((w.lifetime_credits_cents || 0) / 100).toFixed(2)} · Updated {formatDistanceToNow(new Date(w.updated_at || w.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${(w.balance_cents || 0) > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                      ${((w.balance_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
