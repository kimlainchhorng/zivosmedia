/**
 * useSalonReminderSettings — per-store config for the automated reminders
 * system. Modeled after useSalonPaymentSettings: load + upsert with sane
 * defaults so the first time the section opens the owner sees the defaults
 * already populated. The first save creates the row.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonReminderSettings {
  store_id: string | null;
  booking_reminder_enabled: boolean;
  /** Sorted array of hours-before-appointment to send reminders at. Up to 5
   *  intervals, each in 1..168. Default [24]. */
  booking_reminder_lead_hours: number[];
  birthday_enabled: boolean;
  birthday_discount_percent: number;
  winback_enabled: boolean;
  winback_days_threshold: number;
  sender_name: string | null;
}

export const DEFAULT_SALON_REMINDER_SETTINGS: SalonReminderSettings = {
  store_id: null,
  booking_reminder_enabled: true,
  booking_reminder_lead_hours: [24],
  birthday_enabled: false,
  birthday_discount_percent: 0,
  winback_enabled: false,
  winback_days_threshold: 60,
  sender_name: null,
};

interface UseResult {
  settings: SalonReminderSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (next: Partial<SalonReminderSettings>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSalonReminderSettings(storeId: string | undefined): UseResult {
  const [settings, setSettings] = useState<SalonReminderSettings>(DEFAULT_SALON_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_reminder_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (err) {
      console.error("[useSalonReminderSettings] load failed", err);
      setError("Couldn't load reminder settings.");
      setLoading(false);
      return;
    }
    if (data) {
      const d = data as any;
      setSettings({
        store_id: d.store_id,
        booking_reminder_enabled: d.booking_reminder_enabled,
        booking_reminder_lead_hours: Array.isArray(d.booking_reminder_lead_hours) && d.booking_reminder_lead_hours.length > 0
          ? [...d.booking_reminder_lead_hours].sort((a, b) => b - a)
          : [24],
        birthday_enabled: d.birthday_enabled,
        birthday_discount_percent: d.birthday_discount_percent,
        winback_enabled: d.winback_enabled,
        winback_days_threshold: d.winback_days_threshold,
        sender_name: d.sender_name ?? null,
      });
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (next: Partial<SalonReminderSettings>): Promise<boolean> => {
    if (!storeId) return false;
    setSaving(true); setError(null);
    const merged = { ...settings, ...next, store_id: storeId };
    // Dedupe + clamp + cap at 5 entries. Trigger CHECK constraint enforces
    // the same shape on the server side; doing it here gives instant feedback.
    const cleanLeadHours = Array.from(new Set(
      (merged.booking_reminder_lead_hours ?? [24]).map((n) => Math.max(1, Math.min(168, Math.round(n))))
    )).sort((a, b) => b - a).slice(0, 5);
    const payload = {
      store_id: storeId,
      booking_reminder_enabled: merged.booking_reminder_enabled,
      booking_reminder_lead_hours: cleanLeadHours.length > 0 ? cleanLeadHours : [24],
      birthday_enabled: merged.birthday_enabled,
      birthday_discount_percent: merged.birthday_discount_percent,
      winback_enabled: merged.winback_enabled,
      winback_days_threshold: merged.winback_days_threshold,
      sender_name: merged.sender_name,
    };
    const { error: err } = await supabase
      .from("salon_reminder_settings")
      .upsert(payload as never, { onConflict: "store_id" });
    if (err) {
      console.error("[useSalonReminderSettings] save failed", err);
      setError("Couldn't save reminder settings.");
      setSaving(false);
      return false;
    }
    setSettings(merged);
    setSaving(false);
    return true;
  }, [storeId, settings]);

  return { settings, loading, saving, error, save, refresh: load };
}
