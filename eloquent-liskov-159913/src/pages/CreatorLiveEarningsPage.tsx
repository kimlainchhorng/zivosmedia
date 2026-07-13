/**
 * CreatorLiveEarningsPage — Dedicated page for live-stream gift earnings.
 * Route: /creator/live-earnings
 *
 * v2026 — Dark glassmorphic, animated counters, real-time gift ticker,
 * upgraded stream cards, polished withdrawal flow.
 *
 * Conversion: 1 coin = $0.01 (gross), creator receives 70%, platform 30%.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Gift, Coins, Users, TrendingUp, Wallet, Sparkles,
  Clock, Radio, Heart, Eye, Banknote, Info, Zap, CheckCircle2,
  CreditCard, Building2, ArrowDownToLine,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CountUp } from "@/components/ui/count-up";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { useLiveEarnings, useRequestLiveEarningsPayout } from "@/hooks/useLiveEarnings";

const QUICK_AMOUNTS = [10, 25, 50, 100];
const PAYOUT_METHODS = [
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2, eta: "1–3 business days" },
  { id: "aba_payway", label: "ABA / Payway", icon: CreditCard, eta: "Same day (KH)" },
];

export default function CreatorLiveEarningsPage() {
  const navigate = useNavigate();
  const { totals, streams, payouts, isLoading } = useLiveEarnings();
  const requestPayout = useRequestLiveEarningsPayout();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("bank_transfer");
  const [pulseKey, setPulseKey] = useState(0);

  const earningsCents = totals?.earnings_cents ?? 0;
  const totalCoins = totals?.total_coins_received ?? 0;
  const totalGifts = totals?.total_gifts_received ?? 0;
  const uniqueGifters = totals?.unique_gifters ?? 0;

  // Pulse the hero card whenever earnings increase (new gift arrived via realtime)
  useEffect(() => {
    if (earningsCents > 0) setPulseKey((k) => k + 1);
  }, [earningsCents]);

  const pendingCents = useMemo(
    () =>
      payouts
        .filter((p: any) => p.status === "pending" || p.status === "processing")
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0),
    [payouts]
  );
  const paidCents = useMemo(
    () =>
      payouts
        .filter((p: any) => p.status === "paid")
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0),
    [payouts]
  );
  const availableCents = Math.max(0, earningsCents - pendingCents - paidCents);

  const amountNum = parseFloat(amount) || 0;
  const amountCents = Math.round(amountNum * 100);
  const validAmount = amountCents >= 1000 && amountCents <= availableCents;

  const handleWithdraw = async () => {
    if (!validAmount) return;
    await requestPayout.mutateAsync({ amount_cents: amountCents, method });
    setWithdrawOpen(false);
    setAmount("");
  };

  const stats = [
    { label: "Coins", value: totalCoins, icon: Coins, accent: "hsl(38 92% 50%)" },
    { label: "Gifts", value: totalGifts, icon: Gift, accent: "hsl(340 75% 55%)" },
    { label: "Gifters", value: uniqueGifters, icon: Users, accent: "hsl(221 83% 53%)" },
    { label: "Sessions", value: streams.length, icon: Radio, accent: "hsl(263 70% 58%)" },
  ];

  return (
    <div className="min-h-dvh bg-background pb-28">
      <SEOHead
        title="Live Earnings – ZIVO Creator"
        description="Track your live-stream gift earnings and withdraw to your bank."
        noIndex
      />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/85 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="h-11 w-11 -ml-2 rounded-full hover:bg-muted/50 active:scale-95 touch-manipulation flex items-center justify-center transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Live Earnings</h1>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] gap-1 h-6 px-2">
            <Sparkles className="w-2.5 h-2.5" /> 70% share
          </Badge>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero — dark glassmorphic earnings card */}
        <motion.div
          key={pulseKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[28px] overflow-hidden shadow-2xl"
        >
          {/* Layered dark gradient + glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-zinc-900 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(38_92%_50%/0.25),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_90%,hsl(340_75%_55%/0.2),transparent_50%)]" />
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-secondary blur-2xl" />

          {/* Glass overlay */}
          <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[2px] border border-white/10 rounded-[28px]" />

          <div className="relative z-10 p-6 text-white">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em]">
                    Available
                  </p>
                  <p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
                    <span className="relative flex w-1.5 h-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    Live updates
                  </p>
                </div>
              </div>
              <button type="button"
                onClick={() => navigate("/account/wallet")}
                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white/90 active:scale-95 transition"
              >
                Wallet
              </button>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-white/60 text-2xl font-bold">$</span>
              <CountUp
                value={availableCents / 100}
                decimals={2}
                duration={900}
                className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums"
              />
            </div>
            <p className="text-white/50 text-[11px] mt-2 flex items-center gap-1.5">
              <Coins className="w-3 h-3" />
              <CountUp value={totalCoins} className="font-bold text-white/80" /> coins lifetime ·
              ${(earningsCents / 100).toFixed(2)} earned
            </p>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
              <div className="rounded-xl bg-white/[0.03] p-2.5">
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Pending</p>
                <p className="font-extrabold text-sm mt-1 tabular-nums text-amber-300">
                  ${(pendingCents / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2.5">
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Paid</p>
                <p className="font-extrabold text-sm mt-1 tabular-nums text-emerald-300">
                  ${(paidCents / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2.5">
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Min</p>
                <p className="font-extrabold text-sm mt-1 tabular-nums text-white/80">$10</p>
              </div>
            </div>

            <Button
              onClick={() => setWithdrawOpen(true)}
              disabled={availableCents < 1000}
              className="w-full mt-5 h-14 rounded-2xl bg-white text-zinc-900 hover:bg-white/95 font-extrabold text-[15px] gap-2 disabled:opacity-40 disabled:bg-white/20 disabled:text-white/60 shadow-xl active:scale-[0.98]"
            >
              <ArrowDownToLine className="w-5 h-5" />
              {availableCents < 1000
                ? `Earn $${((1000 - availableCents) / 100).toFixed(2)} more to withdraw`
                : "Withdraw to bank"}
            </Button>
          </div>
        </motion.div>

        {/* Stats grid — animated counters, larger tap targets */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="zivo-card-organic p-4 min-h-[72px] flex items-center"
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${s.accent}18` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
                <div className="min-w-0">
                  <CountUp
                    value={s.value}
                    className="font-extrabold text-[17px] tabular-nums leading-none block"
                  />
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border border-emerald-500/15 p-3.5 flex gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How it works:</strong> Viewers send Z Coins
            during your live streams (1 coin = $0.01). You keep{" "}
            <strong className="text-emerald-600">70%</strong>, ZIVO retains 30% for processing
            & moderation. Withdrawals process in 1–3 business days.
          </div>
        </div>

        {/* Per-stream earnings history — upgraded cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Stream History
            </h2>
            <span className="text-[10px] text-muted-foreground font-bold">
              {streams.length} {streams.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : streams.length === 0 ? (
            <EmptyStreamsState onGoLive={() => navigate("/go-live")} />
          ) : (
            <div className="space-y-2.5">
              {streams.map((s, i) => {
                // Simple gift-vs-best ratio for visual bar
                const maxCoins = Math.max(
                  ...streams.map((x) => x.coins_received || 0),
                  1
                );
                const fillPct = ((s.coins_received || 0) / maxCoins) * 100;
                const isLive = s.status === "live";

                return (
                  <motion.button
                    key={s.stream_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => navigate("/live-streams")}
                    className="w-full text-left zivo-card-organic p-4 active:scale-[0.99] transition-transform hover:border-primary/30"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isLive
                            ? "bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30"
                            : "bg-gradient-to-br from-zinc-700 to-zinc-900"
                        }`}
                      >
                        <Radio className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-[14px] truncate max-w-[170px]">
                            {s.title || "Untitled stream"}
                          </p>
                          {isLive && (
                            <Badge className="bg-foreground text-white border-0 text-[9px] font-extrabold px-1.5 py-0 h-4 animate-pulse">
                              ● LIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {s.started_at
                            ? formatDistanceToNow(new Date(s.started_at), { addSuffix: true })
                            : "Scheduled"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {(s.viewer_count ?? 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {(s.like_count ?? 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gift className="w-3 h-3" /> {s.gifts_received.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {s.unique_gifters.toLocaleString()}
                          </span>
                        </div>
                        {/* Mini progress bar comparing to best stream */}
                        <div className="mt-2.5 h-1 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-base text-emerald-600 tabular-nums">
                          ${(s.earnings_cents / 100).toFixed(2)}
                        </p>
                        <p className="text-[9px] text-muted-foreground tabular-nums font-bold mt-0.5">
                          {s.coins_received.toLocaleString()} 🪙
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Withdrawal history */}
        {payouts.length > 0 && (
          <div>
            <h2 className="font-extrabold text-base mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Withdrawals
            </h2>
            <div className="space-y-2">
              {payouts.map((p: any) => (
                <div
                  key={p.id}
                  className="zivo-card-organic p-3.5 flex items-center gap-3 min-h-[60px]"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      p.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : p.status === "pending" || p.status === "processing"
                        ? "bg-amber-500/15 text-amber-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.status === "paid" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Banknote className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-[13px] tabular-nums">
                      ${(p.amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {p.status} ·{" "}
                      {p.paid_at
                        ? format(new Date(p.paid_at), "MMM d, yyyy")
                        : formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge
                    className={`text-[9px] border-0 ${
                      p.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-amber-500/15 text-amber-600"
                    }`}
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Withdraw dialog — polished, with method selector + fee preview */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
          {/* Header gradient */}
          <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
            <DialogHeader className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
                <ArrowDownToLine className="w-6 h-6" />
              </div>
              <DialogTitle className="text-white text-xl font-extrabold">
                Withdraw Earnings
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs">
                Available: <strong>${(availableCents / 100).toFixed(2)}</strong> · Min $10.00
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4">
            {/* Amount input */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Amount
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 pl-10 text-2xl font-extrabold rounded-2xl tabular-nums"
                  min={10}
                  max={availableCents / 100}
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 flex-wrap">
              {QUICK_AMOUNTS.filter((a) => a * 100 <= availableCents).map((a) => (
                <button type="button"
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="h-10 px-4 rounded-xl bg-muted text-sm font-extrabold hover:bg-muted/70 active:scale-95 transition tabular-nums"
                >
                  ${a}
                </button>
              ))}
              {availableCents >= 1000 && (
                <button type="button"
                  onClick={() => setAmount((availableCents / 100).toFixed(2))}
                  className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-extrabold hover:bg-emerald-500/20 active:scale-95 transition"
                >
                  Max
                </button>
              )}
            </div>

            {/* Payout method */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Payout method
              </label>
              <div className="mt-1.5 space-y-2">
                {PAYOUT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const selected = method === m.id;
                  return (
                    <button type="button"
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`w-full h-14 px-3.5 rounded-2xl border-2 flex items-center gap-3 active:scale-[0.99] transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          selected
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-[13px]">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{m.eta}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <AnimatePresence>
              {amountCents > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-muted/40 p-3.5 space-y-1.5 overflow-hidden"
                >
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Withdraw</span>
                    <span className="font-bold tabular-nums">${amountNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Processing fee</span>
                    <span className="font-bold tabular-nums text-emerald-600">$0.00</span>
                  </div>
                  <div className="border-t border-border/50 pt-1.5 flex justify-between text-[13px]">
                    <span className="font-bold">You'll receive</span>
                    <span className="font-extrabold text-emerald-600 tabular-nums">
                      ${amountNum.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleWithdraw}
              disabled={requestPayout.isPending || !validAmount}
              className="w-full h-14 rounded-2xl font-extrabold text-[15px] gap-2 bg-ig-gradient hover:opacity-90 text-white shadow-md shadow-rose-500/25 border-0 disabled:opacity-40"
            >
              {requestPayout.isPending ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" /> Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirm withdrawal
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Funds typically arrive in 1–3 business days
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <ZivoMobileNav />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state with mini illustration                                        */
/* -------------------------------------------------------------------------- */
function EmptyStreamsState({ onGoLive }: { onGoLive: () => void }) {
  return (
    <div className="zivo-card-organic p-8 text-center border-dashed relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />
      <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-secondary blur-2xl" />

      <div className="relative">
        {/* Illustration: stacked floating gift icons */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-0 left-2 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl"
          >
            <Gift className="w-7 h-7 text-white" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0], rotate: [8, -8, 8] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-0 right-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl bg-secondary"
          >
            <Heart className="w-6 h-6 text-white" />
          </motion.div>
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-xl"
          >
            <Coins className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        <p className="text-sm font-extrabold mb-1.5">No live streams yet</p>
        <p className="text-[11px] text-muted-foreground mb-5 max-w-[240px] mx-auto leading-relaxed">
          Go live to start receiving Z Coin gifts from viewers — every coin counts toward
          your earnings!
        </p>
        <Button
          onClick={onGoLive}
          className="h-12 px-6 rounded-2xl text-sm font-extrabold gap-2 hover:opacity-90 text-white shadow-lg active:scale-[0.97] bg-foreground"
        >
          <Radio className="w-4 h-4" /> Go Live Now
        </Button>
      </div>
    </div>
  );
}
