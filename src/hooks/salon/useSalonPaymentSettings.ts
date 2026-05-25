/**
 * Salon payment settings — fetch + upsert for the USA flow.
 * Returns sensible defaults until a row exists; the first save writes the row.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonStripeStatus = "not_connected" | "pending" | "active" | "restricted";

export interface SalonPaymentSettings {
  id: string | null;
  market: "us";
  stripe_account_id: string | null;
  stripe_status: SalonStripeStatus;
  accept_card: boolean;
  accept_cash: boolean;
  tips_enabled: boolean;
  tip_presets: number[];
  tip_applies_pre_tax: boolean;
  tax_enabled: boolean;
  tax_rate: number;
  tax_label: string;
  deposit_percent: number;
  no_show_fee_cents: number;
  cancellation_window_hours: number;
}

export const DEFAULT_SALON_PAYMENT_SETTINGS: SalonPaymentSettings = {
  id: null,
  market: "us",
  stripe_account_id: null,
  stripe_status: "not_connected",
  accept_card: true,
  accept_cash: true,
  tips_enabled: true,
  tip_presets: [15, 18, 20],
  tip_applies_pre_tax: true,
  tax_enabled: false,
  tax_rate: 0,
  tax_label: "Sales tax",
  deposit_percent: 0,
  no_show_fee_cents: 0,
  cancellation_window_hours: 24,
};

interface UseSalonPaymentSettingsResult {
  settings: SalonPaymentSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (next: Partial<SalonPaymentSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSalonPaymentSettings(storeId: string | undefined): UseSalonPaymentSettingsResult {
  const [settings, setSettings] = useState<SalonPaymentSettings>(DEFAULT_SALON_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("store_payment_settings")
      .select("*")
      .eq("store_id", storeId)
      .eq("market", "us")
      .maybeSingle();
    if (err) {
      console.error("[useSalonPaymentSettings] load failed", err);
      setError("Couldn't load payment settings.");
      setLoading(false);
      return;
    }
    if (data) {
      setSettings({
        id: (data as any).id,
        market: "us",
        stripe_account_id: (data as any).stripe_account_id,
        stripe_status: (data as any).stripe_status,
        accept_card: (data as any).accept_card,
        accept_cash: (data as any).accept_cash,
        tips_enabled: (data as any).tips_enabled,
        tip_presets: (data as any).tip_presets ?? [15, 18, 20],
        tip_applies_pre_tax: (data as any).tip_applies_pre_tax,
        tax_enabled: (data as any).tax_enabled,
        tax_rate: Number((data as any).tax_rate ?? 0),
        tax_label: (data as any).tax_label ?? "Sales tax",
        deposit_percent: (data as any).deposit_percent,
        no_show_fee_cents: (data as any).no_show_fee_cents,
        cancellation_window_hours: (data as any).cancellation_window_hours,
      });
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (next: Partial<SalonPaymentSettings>) => {
    if (!storeId) return;
    setSaving(true);
    setError(null);
    const merged = { ...settings, ...next };
    const payload: Record<string, unknown> = {
      store_id: storeId,
      market: "us",
      stripe_account_id: merged.stripe_account_id,
      stripe_status: merged.stripe_status,
      accept_card: merged.accept_card,
      accept_cash: merged.accept_cash,
      tips_enabled: merged.tips_enabled,
      tip_presets: merged.tip_presets,
      tip_applies_pre_tax: merged.tip_applies_pre_tax,
      tax_enabled: merged.tax_enabled,
      tax_rate: merged.tax_rate,
      tax_label: merged.tax_label,
      deposit_percent: merged.deposit_percent,
      no_show_fee_cents: merged.no_show_fee_cents,
      cancellation_window_hours: merged.cancellation_window_hours,
    };
    const { data, error: err } = await supabase
      .from("store_payment_settings")
      .upsert(payload as never, { onConflict: "store_id,market" })
      .select("id")
      .single();
    if (err) {
      console.error("[useSalonPaymentSettings] save failed", err);
      setError("Couldn't save changes — try again.");
      setSaving(false);
      return;
    }
    setSettings({ ...merged, id: (data as any).id });
    setSaving(false);
  }, [storeId, settings]);

  return { settings, loading, saving, error, save, refresh: load };
}
