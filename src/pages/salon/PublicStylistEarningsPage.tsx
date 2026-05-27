/**
 * Per-stylist earnings view at /stylist/:stylistId/earnings. Same trust model
 * as PublicStylistDayPage — the stylist UUID in the URL is the unguessable
 * token, no auth required. Read-only. Shows the stylist:
 *   - service count + gross revenue + tips + commission earned for a date range
 *   - total paid out in that same range
 *   - recent payouts with method + reference
 *
 * Numbers are derived from the same data the owner sees in SalonCommissionsSection.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Loader2, AlertCircle, ChevronLeft, BadgeDollarSign, Wallet, ReceiptText, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Earnings {
  display_name: string;
  store_name: string;
  store_slug: string;
  commission_percent: number;
  service_count: number;
  service_revenue_cents: number;
  tips_cents: number;
  commission_earned_cents: number;
  total_paid_out_cents: number;
}

interface PayoutRow {
  id: string;
  period_from: string;
  period_to: string;
  services_count: number;
  service_revenue_cents: number;
  tips_cents: number;
  commission_cents: number;
  total_paid_cents: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  check: "Check",
  ach: "ACH",
  stripe: "Stripe",
  other: "Other",
};

const formatPrice = (cents: number | null | undefined) =>
  `$${((Number(cents) || 0) / 100).toFixed(2)}`;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function PublicStylistEarningsPage() {
  const { stylistId = "" } = useParams<{ stylistId: string }>();
  const [from, setFrom] = useState<string>(daysAgoIso(30));
  const [to, setTo] = useState<string>(todayIso());
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stylistId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [{ data: eData, error: eErr }, { data: pData, error: pErr }] = await Promise.all([
        supabase.rpc("salon_public_get_stylist_earnings", {
          p_stylist_id: stylistId,
          p_from: from,
          p_to: to,
        } as never),
        supabase.rpc("salon_public_get_stylist_payouts", {
          p_stylist_id: stylistId,
          p_limit: 20,
        } as never),
      ]);
      if (cancelled) return;
      if (eErr || pErr) {
        console.error("[PublicStylistEarnings] load failed", eErr || pErr);
        setError("Couldn't load earnings.");
        setLoading(false);
        return;
      }
      const row = (Array.isArray(eData) ? eData[0] : null) as Earnings | null;
      if (!row) {
        setError("This page isn't available.");
        setLoading(false);
        return;
      }
      setEarnings(row);
      setPayouts(((pData ?? []) as unknown as PayoutRow[]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stylistId, from, to]);

  const netInPeriod = useMemo(() => {
    if (!earnings) return 0;
    return earnings.commission_earned_cents + earnings.tips_cents;
  }, [earnings]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error}</p>
          <Link to={`/stylist/${stylistId}`} className="mt-3 inline-block text-xs text-primary hover:underline">
            ← Back to my schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{earnings?.display_name ?? "Earnings"} · {earnings?.store_name ?? ""}</title>
      </Helmet>
      <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
        <Link
          to={`/stylist/${stylistId}`}
          className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to schedule
        </Link>

        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {earnings?.store_name ?? " "}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">My earnings</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Commission tier: {earnings?.commission_percent ?? 0}% · services + add-ons
          </p>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="erFrom" className="text-[10px] font-bold uppercase tracking-wider">From</Label>
            <Input
              id="erFrom"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="erTo" className="text-[10px] font-bold uppercase tracking-wider">To</Label>
            <Input
              id="erTo"
              type="date"
              value={to}
              min={from}
              max={todayIso()}
              onChange={(e) => setTo(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <RangeChip onClick={() => { setFrom(daysAgoIso(7)); setTo(todayIso()); }} label="7d" />
          <RangeChip onClick={() => { setFrom(daysAgoIso(30)); setTo(todayIso()); }} label="30d" />
          <RangeChip onClick={() => { setFrom(daysAgoIso(90)); setTo(todayIso()); }} label="90d" />
          <RangeChip onClick={() => {
            const now = new Date();
            const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
            setFrom(first); setTo(todayIso());
          }} label="This month" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading earnings…
          </div>
        ) : earnings ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Tile
                Icon={ReceiptText}
                label="Services"
                value={String(earnings.service_count)}
              />
              <Tile
                Icon={TrendingUp}
                label="Gross revenue"
                value={formatPrice(earnings.service_revenue_cents)}
              />
              <Tile
                Icon={BadgeDollarSign}
                label="Commission"
                value={formatPrice(earnings.commission_earned_cents)}
              />
              <Tile
                Icon={Wallet}
                label="Tips"
                value={formatPrice(earnings.tips_cents)}
              />
            </div>

            <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/8 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                You earned in this window
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {formatPrice(netInPeriod)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Commission {formatPrice(earnings.commission_earned_cents)} + tips {formatPrice(earnings.tips_cents)}
              </p>
              {earnings.total_paid_out_cents > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Recorded payouts in window: {formatPrice(earnings.total_paid_out_cents)}
                </p>
              )}
            </div>
          </>
        ) : null}

        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Recent payouts
          </h2>
          {payouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No payouts recorded yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {payouts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {formatDate(p.period_from)} → {formatDate(p.period_to)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.services_count} service{p.services_count === 1 ? "" : "s"} · paid{" "}
                        {new Date(p.paid_at).toLocaleDateString()}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                          {METHOD_LABEL[p.method] ?? p.method}
                        </span>
                        {p.reference && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {p.reference}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-base font-bold text-foreground">
                      {formatPrice(p.total_paid_cents)}
                    </p>
                  </div>
                  {p.notes && (
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-foreground/85">
                      {p.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Read-only. Talk to the front desk if anything looks off.
        </p>
      </div>
    </div>
  );
}

function Tile({
  Icon, label, value,
}: { Icon: typeof BadgeDollarSign; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function RangeChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className="h-7 rounded-full px-2.5 text-[11px] font-bold"
    >
      {label}
    </Button>
  );
}
