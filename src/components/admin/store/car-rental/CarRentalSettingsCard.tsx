/**
 * Inline editable settings card on the dashboard:
 *  - Tax rate + label
 *  - Currency
 *  - No-show grace hours
 *  - Late-return grace hours
 *  - Auto-confirm app bookings toggle
 *  - Cancellation policy (free-text, shown on public booking)
 */
import { useEffect, useState } from "react";
import { Settings, Loader2, CheckCircle2, AlertTriangle, Plus, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCarRentalSettings, type CarRentalSettingsDraft } from "@/hooks/car-rental/useCarRentalSettings";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const DEFAULT_DRAFT: CarRentalSettingsDraft = {
  tax_rate_bps: 0,
  tax_label: "Tax",
  currency_code: "USD",
  no_show_grace_hours: 4,
  auto_confirm_app_bookings: false,
  late_grace_hours: 12,
  cancellation_policy: null,
  refund_tiers: [
    { days_before: 7, percent: 100 },
    { days_before: 1, percent: 50 },
    { days_before: 0, percent: 0 },
  ],
};

export default function CarRentalSettingsCard({ storeId }: Props) {
  const { settings, loading, saving, error, save } = useCarRentalSettings(storeId);
  const [draft, setDraft] = useState<CarRentalSettingsDraft>(DEFAULT_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft({
        tax_rate_bps: settings.tax_rate_bps,
        tax_label: settings.tax_label,
        currency_code: settings.currency_code,
        no_show_grace_hours: settings.no_show_grace_hours,
        auto_confirm_app_bookings: settings.auto_confirm_app_bookings,
        late_grace_hours: settings.late_grace_hours,
        cancellation_policy: settings.cancellation_policy,
        refund_tiers: settings.refund_tiers ?? DEFAULT_DRAFT.refund_tiers,
      });
      setDirty(false);
    }
  }, [settings]);

  const update = <K extends keyof CarRentalSettingsDraft>(key: K, value: CarRentalSettingsDraft[K]) => {
    setDraft((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const submit = async () => {
    await save(draft);
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  if (loading) return null;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-5 w-5 text-primary" /> Rental settings
        </CardTitle>
        {dirty && (
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Save changes
          </Button>
        )}
        {!dirty && savedFlash && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tax label">
            <Input value={draft.tax_label} onChange={(e) => update("tax_label", e.target.value)} placeholder="Sales tax" />
          </Field>
          <Field label="Tax rate (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={(draft.tax_rate_bps / 100).toFixed(2)}
              onChange={(e) => update("tax_rate_bps", Math.max(0, Math.min(10000, Math.round(Number(e.target.value || 0) * 100))))}
            />
          </Field>
          <Field label="Currency">
            <Input value={draft.currency_code} onChange={(e) => update("currency_code", e.target.value.toUpperCase().slice(0, 3))} maxLength={3} className="uppercase" />
          </Field>
          <Field label="No-show grace (hours)">
            <Input type="number" min={0} max={72} value={draft.no_show_grace_hours} onChange={(e) => update("no_show_grace_hours", Math.max(0, Math.min(72, Number(e.target.value || 0))))} />
          </Field>
          <Field label="Late-return grace (hours)">
            <Input type="number" min={0} max={48} value={draft.late_grace_hours} onChange={(e) => update("late_grace_hours", Math.max(0, Math.min(48, Number(e.target.value || 0))))} />
          </Field>
          <div className="flex items-center justify-between rounded-md border border-border p-2.5">
            <Label className="text-sm">Auto-confirm online bookings</Label>
            <Switch checked={draft.auto_confirm_app_bookings} onCheckedChange={(c) => update("auto_confirm_app_bookings", c)} />
          </div>
        </div>

        <Field label="Cancellation policy (shown to customers)">
          <Textarea
            rows={3}
            value={draft.cancellation_policy ?? ""}
            onChange={(e) => update("cancellation_policy", e.target.value || null)}
            placeholder="Free cancellation up to 24 hours before pickup. After that, 50% of the daily rate is non-refundable."
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                const sorted = [...draft.refund_tiers].sort((a, b) => b.days_before - a.days_before);
                const lines = sorted.map((t, i) => {
                  const lower = sorted[i + 1];
                  const lowerCutoff = lower ? lower.days_before : -1;
                  if (t.percent === 100) {
                    return `• Full refund (100%) when cancelling at least ${t.days_before} day${t.days_before === 1 ? "" : "s"} before pickup.`;
                  }
                  if (t.percent === 0 && lowerCutoff < 0) {
                    return `• No refund for cancellations within ${t.days_before} day${t.days_before === 1 ? "" : "s"} of pickup or after.`;
                  }
                  const range = lowerCutoff >= 0
                    ? `between ${lowerCutoff + 1} and ${t.days_before} day${t.days_before === 1 ? "" : "s"}`
                    : `at least ${t.days_before} day${t.days_before === 1 ? "" : "s"}`;
                  return `• ${t.percent}% refund when cancelling ${range} before pickup.`;
                });
                update("cancellation_policy", lines.join("\n"));
              }}
            >
              <Sparkles className="mr-1 h-3 w-3" /> Generate from refund tiers
            </Button>
            <p className="text-[10px] text-muted-foreground">{(draft.cancellation_policy ?? "").length} / 1000</p>
          </div>
        </Field>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">Refund tiers</Label>
          <p className="text-[11px] text-muted-foreground">
            When a booking is cancelled, the suggested refund follows these tiers (most generous first).
          </p>
          <div className="space-y-1.5">
            {draft.refund_tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                <span className="text-[11px] text-muted-foreground">Cancel ≥</span>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={t.days_before}
                  onChange={(e) => {
                    const next = [...draft.refund_tiers];
                    next[i] = { ...next[i], days_before: Math.max(0, Number(e.target.value || 0)) };
                    update("refund_tiers", next);
                  }}
                  className="h-8 w-16"
                />
                <span className="text-[11px] text-muted-foreground">days before pickup → refund</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={t.percent}
                  onChange={(e) => {
                    const next = [...draft.refund_tiers];
                    next[i] = { ...next[i], percent: Math.max(0, Math.min(100, Number(e.target.value || 0))) };
                    update("refund_tiers", next);
                  }}
                  className="h-8 w-16"
                />
                <span className="text-[11px] text-muted-foreground">%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 ml-auto text-destructive"
                  disabled={draft.refund_tiers.length <= 1}
                  onClick={() => update("refund_tiers", draft.refund_tiers.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const sorted = [...draft.refund_tiers].sort((a, b) => b.days_before - a.days_before);
                const lowest = sorted[sorted.length - 1];
                update("refund_tiers", [...draft.refund_tiers, { days_before: Math.max(0, (lowest?.days_before ?? 1) - 1), percent: 0 }]);
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add tier
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5")}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
