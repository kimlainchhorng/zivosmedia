import { useEffect, useMemo, useState } from "react";
import { Wallet, DollarSign, TrendingUp, Calendar, CalendarClock, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel, NextActions, SectionShell, StatCard, money, useLodgingOpsData } from "./LodgingOperationsShared";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { useConnectStatus, useConnectOnboard } from "@/hooks/useStripeConnect";
import LodgingPayoutAccountCard from "./LodgingPayoutAccountCard";
import PayoutInstructionsPanel from "./PayoutInstructionsPanel";
import LodgingPayoutHistoryTable from "./LodgingPayoutHistoryTable";
import LodgingAutoPayoutLedger from "./LodgingAutoPayoutLedger";
import LodgingRequestPayoutSheet from "./LodgingRequestPayoutSheet";
import { supabase } from "@/integrations/supabase/client";
import { recommendedRail, normalizeCountry } from "@/lib/payouts/payoutRails";

/**
 * Payouts & Finance — full multi-rail flow:
 *  - Stripe Connect (US + supported countries) with auto-fallback to manual rails
 *  - ABA / bank wire / PayPal for unsupported markets (Cambodia, etc.)
 *  - Country-aware fees & instructions
 *  - Real payout history with status flow (requested → processing → completed/failed)
 *  - Host-initiated payout request sheet
 */
export default function LodgingPayoutsSection({ storeId }: { storeId: string }) {
  const { reservations, isLoading } = useLodgingOpsData(storeId);
  const { data: connect, isLoading: connectLoading } = useConnectStatus();
  const onboard = useConnectOnboard();
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);

  // Pull store country from the store profile (more reliable than reservation rows)
  const { data: store } = useQuery({
    queryKey: ["lodge-store-country", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, market")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; market: string | null } | null;
    },
    enabled: !!storeId,
  });
  const storeCountry = normalizeCountry(store?.market || (reservations[0] as any)?.country || "US");

  // Already-requested amount (so available = net − pending/approved)
  const { data: openRequests = [] } = useQuery({
    queryKey: ["lodge-payout-open-amounts", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("lodge_payout_requests") as any)
        .select("amount_cents,status")
        .eq("store_id", storeId)
        .in("status", ["pending", "approved"]);
      if (error) throw error;
      return (data || []) as { amount_cents: number; status: string }[];
    },
    enabled: !!storeId,
  });

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "done") {
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status"] });
      toast.success("Stripe setup updated — refreshing status…");
      params.delete("connect");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
    }
  }, [queryClient]);

  const stats = useMemo(() => {
    const paid = reservations.filter((r) => r.payment_status === "paid" || r.status === "checked_out");
    const pending = reservations.filter((r) => r.payment_status === "pending" || r.payment_status === "deposit");
    const upcoming = reservations.filter((r) => ["confirmed", "checked_in"].includes(r.status));

    const totalRevenue = paid.reduce((s: number, r: any) => s + (r.total_cents || 0), 0);
    const platformFee = Math.round(totalRevenue * 0.02);
    const netPayout = totalRevenue - platformFee;
    const pendingAmount = pending.reduce((s: number, r: any) => s + (r.total_cents || 0), 0);
    const upcomingAmount = upcoming.reduce((s: number, r: any) => s + (r.total_cents || 0), 0);

    const byMonth: Record<string, number> = {};
    paid.forEach((r: any) => {
      const month = (r.check_out || r.check_in || r.created_at || "").slice(0, 7);
      if (!month) return;
      byMonth[month] = (byMonth[month] || 0) + (r.total_cents || 0);
    });
    const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

    const reservedForPayout = openRequests.reduce((s, r) => s + (r.amount_cents || 0), 0);
    const available = Math.max(0, netPayout - reservedForPayout);

    return {
      totalRevenue, platformFee, netPayout, pendingAmount, upcomingAmount,
      paidCount: paid.length, upcomingCount: upcoming.length, months,
      paidReservations: paid, available,
    };
  }, [reservations, openRequests]);

  const exportCsv = () => {
    const header = "Reservation ID,Guest,Check-in,Check-out,Status,Gross USD,Platform Fee USD,Net USD";
    const rows = stats.paidReservations.map((r: any) => {
      const gross = (r.total_cents || 0) / 100;
      const fee = Math.round((r.total_cents || 0) * 0.02) / 100;
      const net = gross - fee;
      const guest = (r.guest_name || r.guest_email || "—").replace(/,/g, " ");
      return `${r.id || ""},${guest},${r.check_in || ""},${r.check_out || ""},${r.status || ""},${gross.toFixed(2)},${fee.toFixed(2)},${net.toFixed(2)}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lodging-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Re-use the country-aware fallback logic when host clicks "Finish setup"
  const startOnboarding = () => {
    const recommended = recommendedRail(storeCountry);
    if (recommended !== "stripe") {
      toast.info(`Stripe Connect isn't available in ${storeCountry}. Set up a manual payout method below.`);
      return;
    }
    onboard.mutate(storeCountry);
  };

  const payoutsEnabled = !!connect?.payouts_enabled;
  const showPayoutBlockedBanner = !connectLoading && !payoutsEnabled && stats.pendingAmount > 0 && recommendedRail(storeCountry) === "stripe";

  return (
    <SectionShell
      title="Payouts & Finance"
      subtitle="Revenue, platform fees, payout methods, and status of every payout."
      icon={Wallet}
      actions={
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm" onClick={() => setRequestOpen(true)} disabled={stats.available <= 0}>
            <Send className="h-3.5 w-3.5 mr-1.5" />Request payout
          </Button>
        </div>
      }
    >
      <LodgingQuickJump active="lodge-payouts" />
      <LodgingSectionStatusBanner title="Payouts & Finance" icon={Wallet} countLabel="Pending revenue" countValue={money(stats.pendingAmount)} fixLabel="Open Reports" fixTab="lodge-reports" />
      {isLoading ? <LoadingPanel /> : <>
        {showPayoutBlockedBanner && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Payouts are paused</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {money(stats.pendingAmount)} pending. Complete Stripe onboarding to receive funds in your bank account.
              </p>
            </div>
            <Button size="sm" onClick={startOnboarding} disabled={onboard.isPending}>
              {onboard.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Finish setup"}
            </Button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total revenue" value={money(stats.totalRevenue)} icon={DollarSign} />
          <StatCard label="Platform fee (2%)" value={money(stats.platformFee)} icon={TrendingUp} />
          <StatCard label="Available" value={money(stats.available)} icon={Wallet} />
          <StatCard label="Upcoming revenue" value={money(stats.upcomingAmount)} icon={CalendarClock} />
          <StatCard label="Pending" value={money(stats.pendingAmount)} icon={Calendar} />
          <StatCard label="Paid bookings" value={String(stats.paidCount)} icon={CheckCircle2} />
        </div>

        {/* Country-aware fees + processing time + admin notes */}
        <PayoutInstructionsPanel country={storeCountry} />

        {/* Multi-rail payout account setup */}
        <LodgingPayoutAccountCard storeId={storeId} storeCountry={storeCountry} />

        {/* Monthly revenue */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Monthly revenue</p>
            <Badge variant="outline">{stats.months.length} month{stats.months.length === 1 ? "" : "s"}</Badge>
          </div>
          {stats.months.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid reservations yet. Once guests check out, monthly totals will appear here.</p>
          ) : (
            <div className="space-y-2">
              {stats.months.map(([month, value]) => {
                const max = Math.max(...stats.months.map(([, v]) => v));
                const pct = max > 0 ? (value / max) * 100 : 0;
                return (
                  <div key={month}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{new Date(month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</span>
                      <span className="text-muted-foreground">{money(value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Automatic Stripe Connect transfers (auto-paid on every Stripe-paid booking) */}
        <LodgingAutoPayoutLedger storeId={storeId} />

        {/* Manual payout request history with status badges + failure reasons */}
        <LodgingPayoutHistoryTable storeId={storeId} />

        <NextActions actions={[
          { label: "Review reservations", tab: "lodge-reservations", hint: "Confirm bookings are tagged with correct payment status." },
          { label: "Tune rate plans", tab: "lodge-rate-plans", hint: "Optimize pricing to grow revenue." },
          { label: "Run promotions", tab: "lodge-promos", hint: "Drive occupancy with discounts and codes." },
        ]} />
      </>}

      <LodgingRequestPayoutSheet
        storeId={storeId}
        storeCountry={storeCountry}
        availableCents={stats.available}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </SectionShell>
  );
}
