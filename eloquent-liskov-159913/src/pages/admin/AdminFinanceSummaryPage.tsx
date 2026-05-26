import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, ShoppingBag, Car, Utensils, Hotel, Package } from "lucide-react";

interface VerticalStat {
  label: string;
  icon: React.ElementType;
  color: string;
  gmv: number;
  count: number;
}

function fmtUsd(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function AdminFinanceSummaryPage() {
  // Rides GMV
  const { data: ridesData } = useQuery({
    queryKey: ["finance-rides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("payment_amount, status")
        .in("status", ["completed", "finished"]);
      const rows = data ?? [];
      const gmv = rows.reduce((s: number, r: any) => s + (Number(r.payment_amount) * 100 || 0), 0);
      return { gmv, count: rows.length };
    },
  });

  // Store orders (eats + grocery + shopping) GMV
  const { data: storeOrdersData } = useQuery({
    queryKey: ["finance-store-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_orders")
        .select("total_amount, status")
        .neq("status", "cancelled");
      const rows = data ?? [];
      const gmv = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) * 100 || 0), 0);
      return { gmv, count: rows.length };
    },
  });

  // Deliveries GMV
  const { data: deliveriesData } = useQuery({
    queryKey: ["finance-deliveries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("total_amount, status")
        .neq("status", "cancelled");
      const rows = data ?? [];
      const gmv = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) * 100 || 0), 0);
      return { gmv, count: rows.length };
    },
  });

  // Lodging GMV
  const { data: lodgingData } = useQuery({
    queryKey: ["finance-lodging"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lodge_reservations")
        .select("total_price, status")
        .in("status", ["confirmed", "checked_in", "completed"]);
      const rows = data ?? [];
      const gmv = rows.reduce((s: number, r: any) => s + (Number(r.total_price) * 100 || 0), 0);
      return { gmv, count: rows.length };
    },
  });

  // Wallet transactions
  const { data: walletData } = useQuery({
    queryKey: ["finance-wallet"],
    queryFn: async () => {
      const { data: deposits } = await (supabase as any)
        .from("customer_wallet_transactions")
        .select("amount_cents")
        .eq("transaction_type", "credit")
        .eq("is_redeemed", true);
      const { data: withdrawals } = await (supabase as any)
        .from("customer_wallet_transactions")
        .select("amount_cents")
        .eq("transaction_type", "debit")
        .eq("is_redeemed", true);
      const totalDeposits = (deposits ?? []).reduce((s: number, r: any) => s + (r.amount_cents || 0), 0);
      const totalWithdrawals = (withdrawals ?? []).reduce((s: number, r: any) => s + (r.amount_cents || 0), 0);
      return {
        deposits: totalDeposits,
        withdrawals: totalWithdrawals,
        depositCount: (deposits ?? []).length,
        withdrawalCount: (withdrawals ?? []).length,
      };
    },
  });

  // Recent wallet transactions
  const { data: recentTxns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ["finance-recent-txns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_wallet_transactions")
        .select("*, profiles(email, full_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const totalGMV =
    (ridesData?.gmv ?? 0) +
    (storeOrdersData?.gmv ?? 0) +
    (deliveriesData?.gmv ?? 0) +
    (lodgingData?.gmv ?? 0);

  const verticals: VerticalStat[] = [
    {
      label: "Rides",
      icon: Car,
      color: "text-violet-600",
      gmv: ridesData?.gmv ?? 0,
      count: ridesData?.count ?? 0,
    },
    {
      label: "Store Orders",
      icon: ShoppingBag,
      color: "text-blue-600",
      gmv: storeOrdersData?.gmv ?? 0,
      count: storeOrdersData?.count ?? 0,
    },
    {
      label: "Delivery",
      icon: Package,
      color: "text-orange-600",
      gmv: deliveriesData?.gmv ?? 0,
      count: deliveriesData?.count ?? 0,
    },
    {
      label: "Lodging",
      icon: Hotel,
      color: "text-rose-600",
      gmv: lodgingData?.gmv ?? 0,
      count: lodgingData?.count ?? 0,
    },
  ];

  const txnTypeColor: Record<string, string> = {
    credit: "bg-emerald-500/15 text-emerald-600",
    debit: "bg-red-500/15 text-red-600",
  };

  return (
    <AdminLayout title="Finance Summary">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-2xl font-bold">Finance Summary</h2>
          <p className="text-sm text-muted-foreground">
            GMV by vertical, wallet activity, and platform revenue overview.
          </p>
        </div>

        {/* Top GMV */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total GMV"
            value={fmtUsd(totalGMV)}
            sub="all verticals"
            icon={TrendingUp}
            color="text-primary"
          />
          <StatCard
            label="Wallet Deposits"
            value={fmtUsd(walletData?.deposits ?? 0)}
            sub={`${walletData?.depositCount ?? 0} processed`}
            icon={DollarSign}
            color="text-emerald-600"
          />
          <StatCard
            label="Wallet Withdrawals"
            value={fmtUsd(walletData?.withdrawals ?? 0)}
            sub={`${walletData?.withdrawalCount ?? 0} processed`}
            icon={DollarSign}
            color="text-red-600"
          />
          <StatCard
            label="Net Platform Flow"
            value={fmtUsd((walletData?.deposits ?? 0) - (walletData?.withdrawals ?? 0))}
            sub="deposits minus withdrawals"
            icon={TrendingUp}
            color="text-blue-600"
          />
        </div>

        {/* Vertical breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">GMV by Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verticals.map(({ label, icon: Icon, color, gmv, count }) => {
                const pct = totalGMV > 0 ? Math.round((gmv / totalGMV) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">{count.toLocaleString()} orders</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{fmtUsd(gmv)}</span>
                        <Badge variant="outline" className="text-xs">{pct}%</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          label === "Rides" ? "bg-violet-500" :
                          label === "Store Orders" ? "bg-blue-500" :
                          label === "Delivery" ? "bg-orange-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Wallet Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Wallet Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {txnsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : recentTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
            ) : (
              <div className="divide-y divide-border">
                {(recentTxns as any[]).map((txn) => {
                  const profile = txn.profiles as any;
                  return (
                    <div key={txn.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge className={`${txnTypeColor[txn.transaction_type] || "bg-muted"} text-xs capitalize`}>
                            {txn.transaction_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {profile?.email || profile?.full_name || txn.user_id?.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {txn.description || txn.reference_type || "—"} · {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="shrink-0 font-semibold text-sm">
                        {txn.transaction_type === "credit" ? "+" : "-"}
                        {fmtUsd(txn.amount_cents || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
