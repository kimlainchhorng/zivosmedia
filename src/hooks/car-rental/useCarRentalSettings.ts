/**
 * Per-store car-rental settings (tax rate, currency, policies).
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RefundTier {
  days_before: number;
  percent: number;
}

export interface CarRentalSettings {
  store_id: string;
  tax_rate_bps: number;
  tax_label: string;
  currency_code: string;
  no_show_grace_hours: number;
  auto_confirm_app_bookings: boolean;
  late_grace_hours: number;
  cancellation_policy: string | null;
  refund_tiers: RefundTier[];
  created_at: string;
  updated_at: string;
}

export type CarRentalSettingsDraft = Omit<CarRentalSettings, "store_id" | "created_at" | "updated_at">;

const DEFAULTS: CarRentalSettingsDraft = {
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

export function useCarRentalSettings(storeId: string | undefined) {
  const [settings, setSettings] = useState<CarRentalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_store_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (err) {
      console.error("[useCarRentalSettings] load failed", err);
      setError("Couldn't load settings.");
      setLoading(false);
      return;
    }
    setSettings(data as unknown as CarRentalSettings | null);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (patch: Partial<CarRentalSettingsDraft>) => {
    if (!storeId) return;
    setSaving(true);
    setError(null);
    const payload = { ...DEFAULTS, ...(settings ?? {}), ...patch, store_id: storeId };
    const { data, error: err } = await supabase
      .from("car_rental_store_settings")
      .upsert(payload as never, { onConflict: "store_id" })
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalSettings] save failed", err);
      setError("Couldn't save settings.");
      setSaving(false);
      return;
    }
    setSettings(data as unknown as CarRentalSettings);
    setSaving(false);
  }, [storeId, settings]);

  return { settings, loading, saving, error, save, refresh: load };
}
