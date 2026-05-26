/**
 * useSalonReminderTemplates — per-store overrides for the three salon
 * reminder templates. Each row in salon_notification_template_overrides has
 * (store_id, template_key) PK; null fields fall through to the platform
 * default in send-transactional-email.
 *
 * The hook loads all overrides for the store and exposes save(template_key,
 * patch) + resetToDefault(template_key). RLS keeps writes owner-scoped.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonTemplateKey =
  | "salon-booking-reminder-24h"
  | "salon-birthday-offer"
  | "salon-winback-offer";

export interface SalonTemplateOverride {
  template_key: SalonTemplateKey;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sms_body: string | null;
}

const EMPTY = (key: SalonTemplateKey): SalonTemplateOverride => ({
  template_key: key,
  subject: null,
  body_html: null,
  body_text: null,
  sms_body: null,
});

interface UseResult {
  overrides: Record<SalonTemplateKey, SalonTemplateOverride>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (key: SalonTemplateKey, patch: Partial<Omit<SalonTemplateOverride, "template_key">>) => Promise<boolean>;
  resetToDefault: (key: SalonTemplateKey) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSalonReminderTemplates(storeId: string | undefined): UseResult {
  const [overrides, setOverrides] = useState<Record<SalonTemplateKey, SalonTemplateOverride>>({
    "salon-booking-reminder-24h": EMPTY("salon-booking-reminder-24h"),
    "salon-birthday-offer": EMPTY("salon-birthday-offer"),
    "salon-winback-offer": EMPTY("salon-winback-offer"),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_notification_template_overrides")
      .select("template_key, subject, body_html, body_text, sms_body")
      .eq("store_id", storeId);
    if (err) {
      console.error("[useSalonReminderTemplates] load failed", err);
      setError("Couldn't load templates.");
      setLoading(false);
      return;
    }
    const next: Record<SalonTemplateKey, SalonTemplateOverride> = {
      "salon-booking-reminder-24h": EMPTY("salon-booking-reminder-24h"),
      "salon-birthday-offer": EMPTY("salon-birthday-offer"),
      "salon-winback-offer": EMPTY("salon-winback-offer"),
    };
    for (const row of (data ?? []) as any[]) {
      const key = row.template_key as SalonTemplateKey;
      if (key in next) {
        next[key] = {
          template_key: key,
          subject: row.subject ?? null,
          body_html: row.body_html ?? null,
          body_text: row.body_text ?? null,
          sms_body: row.sms_body ?? null,
        };
      }
    }
    setOverrides(next);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (key: SalonTemplateKey, patch: Partial<Omit<SalonTemplateOverride, "template_key">>): Promise<boolean> => {
    if (!storeId) return false;
    setSaving(true); setError(null);
    const merged = { ...overrides[key], ...patch };
    const payload = {
      store_id: storeId,
      template_key: key,
      subject: merged.subject?.trim() || null,
      body_html: merged.body_html?.trim() || null,
      body_text: merged.body_text?.trim() || null,
      sms_body: merged.sms_body?.trim() || null,
    };
    const { error: err } = await supabase
      .from("salon_notification_template_overrides")
      .upsert(payload as never, { onConflict: "store_id,template_key" });
    if (err) {
      console.error("[useSalonReminderTemplates] save failed", err);
      setError("Couldn't save template.");
      setSaving(false);
      return false;
    }
    setOverrides((prev) => ({ ...prev, [key]: { ...merged, template_key: key } }));
    setSaving(false);
    return true;
  }, [storeId, overrides]);

  const resetToDefault = useCallback(async (key: SalonTemplateKey): Promise<boolean> => {
    if (!storeId) return false;
    setSaving(true); setError(null);
    const { error: err } = await supabase
      .from("salon_notification_template_overrides")
      .delete()
      .eq("store_id", storeId)
      .eq("template_key", key);
    if (err) {
      console.error("[useSalonReminderTemplates] reset failed", err);
      setError("Couldn't reset template.");
      setSaving(false);
      return false;
    }
    setOverrides((prev) => ({ ...prev, [key]: EMPTY(key) }));
    setSaving(false);
    return true;
  }, [storeId]);

  return { overrides, loading, saving, error, save, resetToDefault, refresh: load };
}
