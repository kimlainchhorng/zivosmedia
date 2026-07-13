/**
 * ArQuickSettingsPanel — a focused, self-contained editor for the Auto Repair
 * settings that matter while building a repair order (rates, tax, parts markup,
 * invoice header, terms). Reads/writes store_profiles.ar_settings directly so it
 * can open as a popup over Build R.O. without loading the full settings page
 * (which is heavy and currently crashes on a cold load).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";

interface Props {
  storeId: string;
  onClose: () => void;
}

export default function ArQuickSettingsPanel({ storeId, onClose }: Props) {
  // The full ar_settings object is kept so we never clobber keys we don't edit.
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const invoiceHeaderHelpText = isAutoRepairSoftwareDomain
    ? "Printed on estimates & invoices alongside your business name, address, phone & logo."
    : "Printed on estimates & invoices alongside your shop name, address, phone & logo.";
  const invoiceEmailPlaceholder = isAutoRepairSoftwareDomain ? "service@example.com" : "shop@example.com";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("ar_settings")
        .eq("id", storeId)
        .maybeSingle();
      if (!cancelled) {
        setSettings(((data as any)?.ar_settings as Record<string, any>) || {});
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const set = (key: string, value: any) => setSettings((p) => ({ ...p, [key]: value }));
  const num = (key: string) => (settings[key] ?? "") === "" ? "" : String(settings[key]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("store_profiles")
      .update({ ar_settings: settings } as any)
      .eq("id", storeId);
    setSaving(false);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    toast.success("Settings saved");
    onClose();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rates &amp; tax</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Labor rate ($/hr)</Label>
            <Input type="number" min={0} step={0.01} placeholder="e.g. 120"
              value={num("labor_rate")}
              onChange={(e) => set("labor_rate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parts markup (%)</Label>
            <Input type="number" min={0} step={0.1} placeholder="e.g. 35"
              value={num("parts_markup_pct")}
              onChange={(e) => set("parts_markup_pct", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tax rate (%)</Label>
            <Input type="number" min={0} max={100} step={0.001} placeholder="e.g. 8.5"
              value={num("tax_rate")}
              onChange={(e) => set("tax_rate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice header</h3>
        <p className="text-[11px] text-muted-foreground -mt-1">{invoiceHeaderHelpText}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice email</Label>
            <Input type="email" placeholder={invoiceEmailPlaceholder}
              value={settings.invoice_email ?? ""}
              onChange={(e) => set("invoice_email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Second phone (L2)</Label>
            <Input type="tel" placeholder="(555) 222-3333"
              value={settings.phone_l2 ?? ""}
              onChange={(e) => set("phone_l2", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">State registration no.</Label>
            <Input placeholder="e.g. 55454545"
              value={settings.state_reg_no ?? ""}
              onChange={(e) => set("state_reg_no", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms policy</h3>
        <Textarea rows={4} placeholder="Customer approval is required before additional work. Payment is due at pickup unless otherwise agreed."
          value={settings.terms_policy ?? ""}
          onChange={(e) => set("terms_policy", e.target.value)} />
      </section>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings
        </Button>
      </div>
    </div>
  );
}
