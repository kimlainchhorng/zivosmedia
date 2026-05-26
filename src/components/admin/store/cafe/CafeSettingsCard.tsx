/**
 * CafeSettingsCard — toggles that control which checkout sections appear
 * on the public order page (tips, promos, gift cards, scheduled pickup).
 */
import { useEffect, useState } from "react";
import { Loader2, Settings2, KeyRound, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeSettings, type CafeSettings } from "@/hooks/cafe/useCafeSettings";
import { SUPPORTED_CURRENCY_CODES, formatCafeMoney } from "@/lib/cafe-currency";

interface Props { storeId: string }

const ROWS: Array<{ key: keyof CafeSettings; title: string; hint: string }> = [
  { key: "allow_tips", title: "Accept tips", hint: "Show tip presets at checkout." },
  { key: "allow_promos", title: "Promo codes", hint: "Let customers apply promo codes." },
  { key: "allow_gift_cards", title: "Gift cards", hint: "Let customers redeem gift cards." },
  { key: "allow_scheduled_orders", title: "Scheduled pickup", hint: "Let customers pick a future pickup time." },
];

export default function CafeSettingsCard({ storeId }: Props) {
  const { settings, loading, saving, save, setManagerPin, clearManagerPin } = useCafeSettings(storeId);
  // Tax input is held as a percent string for nicer UX (e.g. "8.25"), persisted
  // to the bp integer on blur. Sync from server whenever settings reload.
  const [taxInput, setTaxInput] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [pinWorking, setPinWorking] = useState(false);
  useEffect(() => {
    setTaxInput(settings.tax_rate_bp ? (settings.tax_rate_bp / 100).toString() : "");
  }, [settings.tax_rate_bp]);

  const handleSetPin = async () => {
    if (!/^\d{4,8}$/.test(pinInput)) {
      toast.error("PIN must be 4–8 digits.");
      return;
    }
    setPinWorking(true);
    const ok = await setManagerPin(pinInput);
    setPinWorking(false);
    if (ok) { toast.success("Manager PIN saved."); setPinInput(""); }
  };

  const handleClearPin = async () => {
    if (!confirm("Remove the manager PIN? Refunds will no longer require it.")) return;
    setPinWorking(true);
    const ok = await clearManagerPin();
    setPinWorking(false);
    if (ok) toast.success("Manager PIN cleared.");
  };

  const commitTax = () => {
    const pct = parseFloat(taxInput);
    if (Number.isNaN(pct) || pct < 0) { setTaxInput((settings.tax_rate_bp / 100).toString()); return; }
    const bp = Math.min(5000, Math.max(0, Math.round(pct * 100)));
    if (bp !== settings.tax_rate_bp) void save({ tax_rate_bp: bp });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Checkout options
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {ROWS.map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-3 py-1">
                <div className="min-w-0">
                  <Label htmlFor={`cs-${row.key}`} className="text-sm font-medium cursor-pointer">
                    {row.title}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{row.hint}</p>
                </div>
                <Switch
                  id={`cs-${row.key}`}
                  checked={settings[row.key] as boolean}
                  disabled={saving}
                  onCheckedChange={(v) => void save({ [row.key]: v } as Partial<CafeSettings>)}
                />
              </div>
            ))}

            {settings.allow_tips && (
              <TipPresetsRow
                value={[settings.tip_preset_1, settings.tip_preset_2, settings.tip_preset_3]}
                disabled={saving}
                onCommit={(p1, p2, p3) =>
                  void save({ tip_preset_1: p1, tip_preset_2: p2, tip_preset_3: p3 })}
              />
            )}
            <div className="flex items-start justify-between gap-3 py-1 border-t border-border/60 pt-3">
              <div className="min-w-0">
                <Label htmlFor="cs-currency" className="text-sm font-medium cursor-pointer">
                  Currency
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Used by customer-facing pages. Example: {formatCafeMoney(450, settings.currency_code)}.
                </p>
              </div>
              <div className="shrink-0">
                <Select
                  value={settings.currency_code}
                  disabled={saving}
                  onValueChange={(v) => void save({ currency_code: v })}
                >
                  <SelectTrigger className="h-8 w-28 text-sm" id="cs-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCY_CODES.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 py-1 border-t border-border/60 pt-3">
              <div className="min-w-0">
                <Label htmlFor="cs-tax_rate" className="text-sm font-medium cursor-pointer">
                  Sales tax rate
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Applied to every order. Set to 0 to disable.
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  id="cs-tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  onBlur={commitTax}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  disabled={saving}
                  className="h-8 w-20 text-right text-sm tabular-nums"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">Manager PIN</span>
                {settings.manager_pin_hash && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-muted-foreground">
                4–8 digit PIN. Used to gate sensitive actions like refunds.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="cs-manager-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={settings.manager_pin_hash ? "Enter a new PIN to replace" : "Set a PIN"}
                  className="h-8 text-sm font-mono"
                  disabled={pinWorking || saving}
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleSetPin} disabled={pinWorking || saving || !pinInput}>
                  {pinWorking && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save
                </Button>
                {settings.manager_pin_hash && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={handleClearPin} disabled={pinWorking || saving}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="min-w-0">
                  <Label htmlFor="cs-require_pin_for_refund" className="text-sm font-medium cursor-pointer">
                    Require PIN for refunds
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Baristas will be prompted before they can issue a refund.
                  </p>
                </div>
                <Switch
                  id="cs-require_pin_for_refund"
                  checked={settings.require_pin_for_refund}
                  disabled={saving || !settings.manager_pin_hash}
                  onCheckedChange={(v) => void save({ require_pin_for_refund: v })}
                />
              </div>
            </div>

            <DailyMessageEditor
              message={settings.daily_message}
              until={settings.daily_message_until}
              disabled={saving}
              onSave={(message, until) => void save({ daily_message: message, daily_message_until: until })}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Three small percent inputs for the public-checkout tip presets. Locally
 * staged + committed on blur so the owner can type "10" without it firing
 * a save mid-keystroke. Clamps to 1–100 (DB also CHECKs this).
 */
function TipPresetsRow({
  value, disabled, onCommit,
}: {
  value: [number, number, number];
  disabled: boolean;
  onCommit: (p1: number, p2: number, p3: number) => void;
}) {
  const [draft, setDraft] = useState<[string, string, string]>(() => [
    String(value[0]), String(value[1]), String(value[2]),
  ]);
  useEffect(() => {
    setDraft([String(value[0]), String(value[1]), String(value[2])]);
  }, [value]);

  const commit = () => {
    const clean = (raw: string, fallback: number) => {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return fallback;
      return Math.max(1, Math.min(100, n));
    };
    const p1 = clean(draft[0], value[0]);
    const p2 = clean(draft[1], value[1]);
    const p3 = clean(draft[2], value[2]);
    if (p1 === value[0] && p2 === value[1] && p3 === value[2]) {
      setDraft([String(value[0]), String(value[1]), String(value[2])]);
      return;
    }
    onCommit(p1, p2, p3);
  };

  return (
    <div className="border-t border-border/60 pt-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tip presets</Label>
        <span className="text-[11px] text-muted-foreground">Shown as 3 percent buttons at checkout</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([0, 1, 2] as const).map((idx) => (
          <div key={idx} className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max="100"
              value={draft[idx]}
              onChange={(e) => {
                const next = [...draft] as [string, string, string];
                next[idx] = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                setDraft(next);
              }}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              disabled={disabled}
              className="h-8 text-center text-sm tabular-nums"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Local editor for the daily message + auto-expiry. Holds local state until
 * Save so the owner can compose without each keystroke hitting the DB.
 */
function DailyMessageEditor({
  message, until, disabled, onSave,
}: {
  message: string | null;
  until: string | null;
  disabled: boolean;
  onSave: (message: string | null, until: string | null) => void;
}) {
  const [draftMsg, setDraftMsg] = useState(message ?? "");
  const [draftUntil, setDraftUntil] = useState<string>(() => {
    if (!until) return "";
    // datetime-local needs YYYY-MM-DDTHH:MM in local tz.
    const d = new Date(until);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  useEffect(() => { setDraftMsg(message ?? ""); }, [message]);

  const isExpired = until ? new Date(until) < new Date() : false;
  const dirty = (draftMsg !== (message ?? ""))
    || (draftUntil ? new Date(draftUntil).toISOString() !== until : !!until);

  const commit = () => {
    const trimmed = draftMsg.trim();
    onSave(trimmed || null, draftUntil ? new Date(draftUntil).toISOString() : null);
  };
  const clear = () => { setDraftMsg(""); setDraftUntil(""); onSave(null, null); };

  return (
    <div className="border-t border-border/60 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Daily message</span>
        {message && (isExpired
          ? <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Expired</span>
          : <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Live</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Banner shown to customers on the public ordering page. Set an expiry to auto-hide.
      </p>
      <Input
        value={draftMsg}
        onChange={(e) => setDraftMsg(e.target.value.slice(0, 200))}
        placeholder="e.g. Free croissant with any large latte today!"
        disabled={disabled}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Input
          type="datetime-local"
          value={draftUntil}
          onChange={(e) => setDraftUntil(e.target.value)}
          disabled={disabled || !draftMsg.trim()}
          className="h-8 text-sm flex-1"
        />
        <Button size="sm" onClick={commit} disabled={disabled || !dirty} className="h-8 text-xs">
          Save
        </Button>
        {message && (
          <Button size="sm" variant="ghost" onClick={clear} disabled={disabled} className="h-8 text-xs text-destructive">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
