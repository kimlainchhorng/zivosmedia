/**
 * AdsStudioWalletGuard — Ads Studio wallet with Stripe top-up + auto-recharge + ledger.
 * Drives `ads_studio_wallet` and `ads_wallet_ledger` (separate from food/restaurant wallet).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/ui/responsive-modal";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Zap, Loader2, Plus, History, ArrowDownCircle, ArrowUpCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { WalletSkeleton } from "./ads/MarketingSkeletons";
import MarketingEmptyState from "./ads/MarketingEmptyState";
import { mkBody, mkInput, mkLabel, mkMeta } from "./ads/marketing-tokens";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

interface LedgerRow {
  id: string;
  entry_type: string;
  amount_cents: number;
  balance_after_cents: number;
  description: string | null;
  created_at: string;
}

const TOPUP_PRESETS = [25, 50, 100, 250];

export default function AdsStudioWalletGuard({ storeId }: Props) {
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(0);
  const [hasCard, setHasCard] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [amount, setAmount] = useState(50);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(50);
  const [topupBusy, setTopupBusy] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerDetail, setLedgerDetail] = useState<LedgerRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ads_studio_wallet" as any)
      .select("balance_cents, auto_recharge_enabled, threshold_cents, recharge_amount_cents, stripe_payment_method_id")
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) {
      const w = data as any;
      setBalance(w.balance_cents ?? 0);
      setEnabled(!!w.auto_recharge_enabled);
      setThreshold((w.threshold_cents ?? 1000) / 100);
      setAmount((w.recharge_amount_cents ?? 5000) / 100);
      setHasCard(!!w.stripe_payment_method_id);
    }
    const { data: lg } = await supabase
      .from("ads_wallet_ledger" as any)
      .select("id, entry_type, amount_cents, balance_after_cents, description, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLedger((lg as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (storeId) load(); }, [storeId]);

  // Verify Stripe Checkout session on return
  useEffect(() => {
    const sessionId = params.get("session_id");
    const topup = params.get("topup");
    if (topup === "success" && sessionId) {
      (async () => {
        const { data, error } = await supabase.functions.invoke("verify-ads-wallet-topup", {
          body: { session_id: sessionId },
        });
        if (error) toast.error(error.message);
        else if ((data as any)?.status === "credited") toast.success("Wallet topped up!");
        else if ((data as any)?.status === "already_credited") { /* silent */ }
        else toast.message("Top-up still processing…");
        params.delete("topup"); params.delete("session_id");
        setParams(params, { replace: true });
        load();
      })();
    } else if (topup === "cancelled") {
      toast.info("Top-up cancelled");
      params.delete("topup");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ads_studio_wallet" as any)
      .upsert({
        store_id: storeId,
        auto_recharge_enabled: enabled,
        threshold_cents: Math.round(threshold * 100),
        recharge_amount_cents: Math.round(amount * 100),
      }, { onConflict: "store_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Auto-recharge settings saved");
  };

  const startTopup = async () => {
    if (topupAmount < 5) { toast.error("Minimum $5"); return; }
    setTopupBusy(true);
    const { data, error } = await supabase.functions.invoke("create-ads-wallet-topup", {
      body: {
        store_id: storeId,
        amount_cents: Math.round(topupAmount * 100),
        save_card: enabled,
        return_url: window.location.pathname,
      },
    });
    setTopupBusy(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.url) window.location.href = (data as any).url;
  };

  if (loading) return <WalletSkeleton />;

  const isLow = balance < threshold * 100;
  const balanceColor = isLow ? "text-destructive" : "text-emerald-600";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">Ads wallet</h3>
              <p className={mkMeta}>Powered by Stripe</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-lg sm:text-xl font-bold tracking-tight tabular-nums", balanceColor)}>
              ${(balance / 100).toFixed(2)}
            </p>
            {isLow && <Badge variant="destructive" className="text-[9px] h-4">Low</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="h-10 sm:h-9 text-xs gap-1" onClick={() => { setTopupAmount(50); setTopupOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Top up
          </Button>
          <Button size="sm" variant="outline" className="h-10 sm:h-9 text-xs gap-1" onClick={() => setShowLedger((s) => !s)}>
            <History className="h-3.5 w-3.5" /> History
          </Button>
        </div>

        <div className="rounded-lg border border-border p-2.5 sm:p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <Label className="text-xs cursor-pointer">Auto-recharge when low</Label>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          {enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className={mkLabel}>Below ($)</Label>
                  <Input type="number" min={1} step={1} value={threshold}
                    onChange={(e) => setThreshold(+e.target.value || 1)} className={mkInput} />
                </div>
                <div>
                  <Label className={mkLabel}>Add ($)</Label>
                  <Input type="number" min={5} step={5} value={amount}
                    onChange={(e) => setAmount(+e.target.value || 50)} className={mkInput} />
                </div>
              </div>
              {!hasCard && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                  Top up once to save a card for future auto-recharges.
                </p>
              )}
              <Button size="sm" variant="secondary" className="w-full h-9 text-xs" onClick={save} disabled={saving || loading}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} Save settings
              </Button>
            </>
          )}
        </div>

        {showLedger && (
          <div className="rounded-lg border border-border max-h-72 overflow-y-auto overscroll-contain divide-y divide-border">
            {ledger.length === 0 ? (
              <div className="p-3">
                <MarketingEmptyState
                  icon={Receipt}
                  title="No transactions yet"
                  body="Top-ups and AI generations will appear here."
                />
              </div>
            ) : ledger.map((row) => {
              const credit = row.entry_type === "topup" || row.entry_type === "refund";
              return (
                <button type="button"
                  key={row.id}
                  onClick={() => setLedgerDetail(row)}
                  className="flex items-center gap-2 p-2.5 sm:p-2 text-[12px] sm:text-[11px] w-full text-left hover:bg-muted/30 active:bg-muted/50 transition touch-manipulation"
                >
                  {credit ? (
                    <ArrowDownCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{row.description || row.entry_type}</p>
                    <p className="text-[10px] sm:text-[9px] text-muted-foreground">
                      {format(new Date(row.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <span className={cn("font-semibold tabular-nums", credit ? "text-emerald-600" : "text-foreground")}>
                    {credit ? "+" : "−"}${(row.amount_cents / 100).toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Top-up modal — bottom sheet on mobile, dialog on desktop */}
      <ResponsiveModal
        open={topupOpen}
        onOpenChange={setTopupOpen}
        title="Top up Ads wallet"
        description={enabled && !hasCard ? "Card will be saved with Stripe for future auto-recharges." : undefined}
        footer={
          <ResponsiveModalFooter>
            <Button variant="outline" className="w-full sm:w-auto h-10" onClick={() => setTopupOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto h-10" onClick={startTopup} disabled={topupBusy || topupAmount < 5}>
              {topupBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Pay ${topupAmount.toFixed(2)}
            </Button>
          </ResponsiveModalFooter>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOPUP_PRESETS.map((v) => (
              <button type="button"
                key={v}
                onClick={() => setTopupAmount(v)}
                className={cn(
                  "h-12 sm:h-11 rounded-lg border text-base sm:text-sm font-semibold transition active:scale-95 touch-manipulation tabular-nums",
                  topupAmount === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                ${v}
              </button>
            ))}
          </div>
          <div>
            <Label className={mkLabel}>Custom amount ($)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={5}
              step={5}
              value={topupAmount}
              onChange={(e) => setTopupAmount(+e.target.value || 0)}
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
          </div>
        </div>
      </ResponsiveModal>

      {/* Ledger detail modal */}
      <ResponsiveModal
        open={!!ledgerDetail}
        onOpenChange={(o) => !o && setLedgerDetail(null)}
        title="Transaction details"
        footer={
          <Button className="w-full sm:w-auto h-10 sm:ml-auto" onClick={() => setLedgerDetail(null)}>
            Close
          </Button>
        }
      >
        {ledgerDetail && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className={mkLabel}>Type</span>
                <Badge variant="secondary" className="text-[10px] capitalize">{ledgerDetail.entry_type}</Badge>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className={mkLabel}>Amount</span>
                <span className={cn(
                  "text-base font-bold tabular-nums",
                  (ledgerDetail.entry_type === "topup" || ledgerDetail.entry_type === "refund")
                    ? "text-emerald-600" : "text-foreground"
                )}>
                  ${(ledgerDetail.amount_cents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className={mkLabel}>Balance after</span>
                <span className="text-sm font-semibold tabular-nums">
                  ${(ledgerDetail.balance_after_cents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className={mkLabel}>When</span>
                <span className="text-sm">{format(new Date(ledgerDetail.created_at), "MMM d, yyyy h:mm a")}</span>
              </div>
            </div>
            {ledgerDetail.description && (
              <div>
                <p className={mkLabel}>Description</p>
                <p className={cn(mkBody, "mt-1")}>{ledgerDetail.description}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              For receipts and refund requests, contact support with the transaction ID:
              <code className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px] break-all">{ledgerDetail.id}</code>
            </p>
          </div>
        )}
      </ResponsiveModal>
    </Card>
  );
}
