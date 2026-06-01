/**
 * Salon payment settings — fetch + server-gated save for the USA flow.
 * Returns sensible defaults until a row exists; the first save writes the row.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

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

function fromRow(row: any): SalonPaymentSettings {
  return {
    id: row.id,
    market: "us",
    stripe_account_id: row.stripe_account_id,
    stripe_status: row.stripe_status,
    accept_card: row.accept_card,
    accept_cash: row.accept_cash,
    tips_enabled: row.tips_enabled,
    tip_presets: row.tip_presets ?? [15, 18, 20],
    tip_applies_pre_tax: row.tip_applies_pre_tax,
    tax_enabled: row.tax_enabled,
    tax_rate: Number(row.tax_rate ?? 0),
    tax_label: row.tax_label ?? "Sales tax",
    deposit_percent: row.deposit_percent,
    no_show_fee_cents: row.no_show_fee_cents,
    cancellation_window_hours: row.cancellation_window_hours,
  };
}

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
    if (data) setSettings(fromRow(data));
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
    const { data, error: err } = await supabase.functions.invoke("store-payment-settings-update", {
      body: { store_id: storeId, settings: payload },
    });
    if (err) {
      console.error("[useSalonPaymentSettings] save failed", err);
      setError("Couldn't save changes — try again.");
      setSaving(false);
      return;
    }
    setSettings(data?.settings ? fromRow(data.settings) : merged);
    setSaving(false);
  }, [storeId, settings]);

  return { settings, loading, saving, error, save, refresh: load };
}
