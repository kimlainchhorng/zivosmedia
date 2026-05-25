/**
 * cafe_settings — one row per store with customer-facing checkout toggles.
 * If no row exists yet, returns defaults (all features enabled). Save
 * upserts so the row materializes on first edit.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeSettings {
  allow_tips: boolean;
  allow_promos: boolean;
  allow_gift_cards: boolean;
  allow_scheduled_orders: boolean;
  // Sales-tax rate in basis points (10000 = 100%, so 825 = 8.25%).
  tax_rate_bp: number;
  manager_pin_hash: string | null;
  require_pin_for_refund: boolean;
  daily_message: string | null;
  daily_message_until: string | null;
}

const DEFAULTS: CafeSettings = {
  allow_tips: true,
  allow_promos: true,
  allow_gift_cards: true,
  allow_scheduled_orders: true,
  tax_rate_bp: 0,
  manager_pin_hash: null,
  require_pin_for_refund: false,
  daily_message: null,
  daily_message_until: null,
};

// Hex SHA-256 of (storeId + pin). Not a security boundary — see migration.
async function hashPin(storeId: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${storeId}::${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useCafeSettings(storeId: string | undefined) {
  const [settings, setSettings] = useState<CafeSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_settings" as never)
      .select("allow_tips, allow_promos, allow_gift_cards, allow_scheduled_orders, tax_rate_bp, manager_pin_hash, require_pin_for_refund, daily_message, daily_message_until")
      .eq("store_id", storeId)
      .maybeSingle();
    if (err) {
      console.error("[useCafeSettings] load", err);
      setError("Couldn't load cafe settings.");
      setLoading(false);
      return;
    }
    setSettings(data ? (data as unknown as CafeSettings) : DEFAULTS);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (patch: Partial<CafeSettings>) => {
    if (!storeId) return false;
    setSaving(true);
    const next = { ...settings, ...patch };
    const { error: err } = await supabase
      .from("cafe_settings" as never)
      .upsert({ store_id: storeId, ...next } as never, { onConflict: "store_id" });
    setSaving(false);
    if (err) {
      console.error("[useCafeSettings] save", err);
      setError("Couldn't save changes.");
      return false;
    }
    setSettings(next);
    return true;
  }, [storeId, settings]);

  const setManagerPin = useCallback(async (rawPin: string): Promise<boolean> => {
    if (!storeId) return false;
    if (!/^\d{4,8}$/.test(rawPin)) {
      setError("PIN must be 4–8 digits.");
      return false;
    }
    const hash = await hashPin(storeId, rawPin);
    return save({ manager_pin_hash: hash });
  }, [storeId, save]);

  const clearManagerPin = useCallback(async (): Promise<boolean> => {
    return save({ manager_pin_hash: null, require_pin_for_refund: false });
  }, [save]);

  const validateManagerPin = useCallback(async (rawPin: string): Promise<boolean> => {
    if (!storeId || !settings.manager_pin_hash) return false;
    const hash = await hashPin(storeId, rawPin);
    return hash === settings.manager_pin_hash;
  }, [storeId, settings.manager_pin_hash]);

  return {
    settings, loading, saving, error, save, refresh: load,
    setManagerPin, clearManagerPin, validateManagerPin,
  };
}
