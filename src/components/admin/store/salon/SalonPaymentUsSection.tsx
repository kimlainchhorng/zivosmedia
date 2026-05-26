/**
 * SalonPaymentUsSection — USA payment & payouts panel for salon owners.
 * - Connect Stripe (account link initiated server-side; UI shows current status)
 * - Accept card / cash
 * - Tips (presets, pre/post-tax)
 * - Sales tax (single combined rate — owner sets per their state)
 * - Booking policy (deposit %, no-show fee, cancellation window)
 *
 * Stripe Connect onboarding requires a backend endpoint to create the account
 * link; this section calls a placeholder edge function name. Until that's
 * wired, the button shows a toast explaining the next step.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard, Banknote, Sparkles, Receipt, CalendarX2, ShieldCheck,
  AlertCircle, ExternalLink, Loader2, Check, Plus, X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useSalonPaymentSettings,
  type SalonStripeStatus,
} from "@/hooks/salon/useSalonPaymentSettings";

interface SalonPaymentUsSectionProps {
  storeId: string;
}

const STATUS_COPY: Record<SalonStripeStatus, { label: string; description: string; tone: "muted" | "warn" | "ok" | "alert" }> = {
  not_connected: {
    label: "Not connected",
    description: "Connect Stripe to accept cards and receive payouts to your bank.",
    tone: "muted",
  },
  pending: {
    label: "Pending verification",
    description: "Stripe is reviewing your account. You can configure other settings while you wait.",
    tone: "warn",
  },
  active: {
    label: "Active",
    description: "Your account is accepting payments and payouts are enabled.",
    tone: "ok",
  },
  restricted: {
    label: "Action required",
    description: "Stripe needs more info before payouts can resume. Open the dashboard to finish.",
    tone: "alert",
  },
};

const TONE_CLASS: Record<string, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  alert: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function SalonPaymentUsSection({ storeId }: SalonPaymentUsSectionProps) {
  const { settings, loading, saving, error, save } = useSalonPaymentSettings(storeId);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [newPresetDraft, setNewPresetDraft] = useState("");
  // Free-text inputs use local state and commit on blur to avoid firing one
  // upsert per keystroke (typing "Sales tax" would otherwise send 9 saves and
  // open cross-field race windows where stale `settings` get re-merged).
  const [taxRateInput, setTaxRateInput] = useState<string>(String(settings.tax_rate));
  const [taxLabelInput, setTaxLabelInput] = useState<string>(settings.tax_label);
  useEffect(() => { setTaxRateInput(String(settings.tax_rate)); }, [settings.tax_rate]);
  useEffect(() => { setTaxLabelInput(settings.tax_label); }, [settings.tax_label]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payment settings…
      </div>
    );
  }

  const status = STATUS_COPY[settings.stripe_status];

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      if (settings.stripe_status === "not_connected") {
        // Kick off Stripe Connect Express onboarding via the shared
        // connect-onboard edge function. It returns a hosted account-link
        // URL we redirect the owner to. Stripe handles the rest; on return
        // the webhook stamps store_payment_settings.stripe_status='active'.
        const { data, error } = await supabase.functions.invoke("connect-onboard", {
          body: {
            store_id: storeId,
            source: "salon",
            return_url: typeof window !== "undefined" ? window.location.href : undefined,
            refresh_url: typeof window !== "undefined" ? window.location.href : undefined,
          },
        });
        if (error) {
          toast.error(error.message || "Couldn't start Stripe onboarding.");
        } else if ((data as any)?.url) {
          window.location.href = (data as any).url;
        } else {
          toast.error("Stripe didn't return an onboarding URL. Try again.");
        }
      } else {
        // Already connected — just punt them to Stripe's hosted dashboard so
        // they can manage payouts, bank, etc. Opens in a new tab so they
        // don't lose their salon admin context.
        window.open("https://dashboard.stripe.com/dashboard", "_blank", "noopener,noreferrer");
      }
    } finally {
      setConnectingStripe(false);
    }
  };

  const addTipPreset = () => {
    const n = Math.round(Number(newPresetDraft));
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      toast.error("Tip preset must be 1–100%.");
      return;
    }
    if (settings.tip_presets.includes(n)) {
      toast.error("That preset is already in the list.");
      return;
    }
    const next = [...settings.tip_presets, n].sort((a, b) => a - b).slice(0, 5);
    void save({ tip_presets: next });
    setNewPresetDraft("");
  };

  const removeTipPreset = (n: number) => {
    void save({ tip_presets: settings.tip_presets.filter((p) => p !== n) });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stripe Connect */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Accept payments (USA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4", TONE_CLASS[status.tone])}>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">Stripe account · {status.label}</p>
              <p className="mt-1 text-sm">{status.description}</p>
              {settings.stripe_account_id && (
                <p className="mt-1 font-mono text-[11px] opacity-70">
                  acct_…{settings.stripe_account_id.slice(-6)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {settings.stripe_status === "not_connected" ? (
                <Button onClick={handleConnectStripe} disabled={connectingStripe} className="gap-1.5">
                  {connectingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Connect Stripe
                </Button>
              ) : (
                <Button variant="outline" onClick={handleConnectStripe} className="gap-1.5">
                  <ExternalLink className="h-4 w-4" /> Open Stripe
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <Switch
                checked={settings.accept_card}
                onCheckedChange={(v) => void save({ accept_card: v })}
                disabled={saving}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Cards</p>
                <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex via Stripe.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <Switch
                checked={settings.accept_cash}
                onCheckedChange={(v) => void save({ accept_cash: v })}
                disabled={saving}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Cash</p>
                <p className="text-xs text-muted-foreground">Recorded at checkout — no processing fee.</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Show tip presets at checkout</p>
              <p className="text-xs text-muted-foreground">Clients can choose a preset or enter a custom amount.</p>
            </div>
            <Switch
              checked={settings.tips_enabled}
              onCheckedChange={(v) => void save({ tips_enabled: v })}
              disabled={saving}
            />
          </label>

          {settings.tips_enabled && (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Suggested tip percentages</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {settings.tip_presets.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
                      {p}%
                      <button
                        type="button"
                        onClick={() => removeTipPreset(p)}
                        disabled={saving}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${p}% preset`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {settings.tip_presets.length < 5 && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        inputMode="numeric"
                        value={newPresetDraft}
                        onChange={(e) => setNewPresetDraft(e.target.value)}
                        placeholder="25"
                        className="h-8 w-16"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addTipPreset} className="h-8 gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Up to 5 presets, shown in order.</p>
              </div>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Calculate tip before tax</p>
                  <p className="text-xs text-muted-foreground">Recommended — tip is based on the service subtotal, not including sales tax.</p>
                </div>
                <Switch
                  checked={settings.tip_applies_pre_tax}
                  onCheckedChange={(v) => void save({ tip_applies_pre_tax: v })}
                  disabled={saving}
                />
              </label>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sales tax */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-primary" />
            Sales tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Charge sales tax on services</p>
              <p className="text-xs text-muted-foreground">
                Taxability of salon services varies by state. Confirm with your accountant before turning this on.
              </p>
            </div>
            <Switch
              checked={settings.tax_enabled}
              onCheckedChange={(v) => void save({ tax_enabled: v })}
              disabled={saving}
            />
          </label>

          {settings.tax_enabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="taxRate">Combined rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.001"
                  min={0}
                  max={30}
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  onBlur={() => {
                    const n = Number(taxRateInput);
                    const clamped = Number.isFinite(n) ? Math.max(0, Math.min(30, n)) : 0;
                    if (clamped !== settings.tax_rate) void save({ tax_rate: clamped });
                    setTaxRateInput(String(clamped));
                  }}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">e.g. 8.875 for parts of NY, 6.625 for NJ.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxLabel">Label on receipts</Label>
                <Input
                  id="taxLabel"
                  value={taxLabelInput}
                  onChange={(e) => setTaxLabelInput(e.target.value)}
                  onBlur={() => {
                    const trimmed = taxLabelInput.trim() || "Sales tax";
                    if (trimmed !== settings.tax_label) void save({ tax_label: trimmed });
                    setTaxLabelInput(trimmed);
                  }}
                  disabled={saving}
                  maxLength={32}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking policy */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Booking policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="depositPercent">Deposit required (%)</Label>
              <Input
                id="depositPercent"
                type="number"
                min={0}
                max={100}
                value={settings.deposit_percent}
                onChange={(e) => void save({ deposit_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">% charged at booking. 0 = no deposit.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="noShowFee">No-show fee ($)</Label>
              <Input
                id="noShowFee"
                type="number"
                min={0}
                step="1"
                value={settings.no_show_fee_cents / 100}
                onChange={(e) => {
                  const dollars = Math.max(0, Number(e.target.value) || 0);
                  void save({ no_show_fee_cents: Math.round(dollars * 100) });
                }}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">Charged when a client doesn't show.</p>
              {settings.no_show_fee_cents > 0 && settings.deposit_percent === 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Heads up — a no-show fee needs a deposit to be configured.
                  The card is saved during deposit checkout, so without a
                  deposit there's no card on file to charge. Walk-in / phone
                  bookings without a Stripe payment can't be auto-charged.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cancelWindow">Cancellation window (hrs)</Label>
              <Input
                id="cancelWindow"
                type="number"
                min={0}
                max={168}
                value={settings.cancellation_window_hours}
                onChange={(e) => void save({ cancellation_window_hours: Math.max(0, Math.min(168, Number(e.target.value) || 0)) })}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">Free cancel if at least this many hours before.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts preview */}
      <Card className="rounded-2xl border-dashed border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-primary" />
            Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Once Stripe is connected, you'll see your available balance, next scheduled
            payout, and the last 30 days of deposits here.
          </p>
          <p className="text-xs">
            Default payout schedule: standard 2-day rolling for new US accounts.
          </p>
        </CardContent>
      </Card>

      {saving && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </div>
      )}
      {!saving && settings.id && (
        <div className="text-right text-[11px] text-muted-foreground">
          <Check className="-mt-0.5 mr-1 inline h-3 w-3 text-emerald-600" />
          Saved
        </div>
      )}
    </div>
  );
}
