/**
 * usePrivacy — Telegram-style privacy matrix.
 * Reads + upserts the user's privacy preferences from `user_privacy_settings`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PrivacyChoice = "everyone" | "contacts" | "nobody";

export type PrivacySettings = {
  user_id: string;
  last_seen: PrivacyChoice;
  profile_photo: PrivacyChoice;
  bio_visibility: PrivacyChoice;
  phone_visibility: PrivacyChoice;
  forwards: PrivacyChoice;
  calls: PrivacyChoice;
  group_invites: PrivacyChoice;
  read_receipts: boolean;
};

const DEFAULTS: Omit<PrivacySettings, "user_id"> = {
  last_seen: "contacts",
  profile_photo: "everyone",
  bio_visibility: "everyone",
  phone_visibility: "nobody",
  forwards: "everyone",
  calls: "contacts",
  group_invites: "contacts",
  read_receipts: true,
};

export function usePrivacy() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSettings(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...(data as Partial<PrivacySettings>), user_id: user.id });
    else setSettings({ user_id: user.id, ...DEFAULTS });
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = useCallback(async (patch: Partial<Omit<PrivacySettings, "user_id">>) => {
    if (!user || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase
      .from("user_privacy_settings")
      .upsert({ ...next, user_id: user.id }, { onConflict: "user_id" });
    if (error) await refresh();
  }, [user, settings, refresh]);

  return { settings, loading, update, refresh };
}
