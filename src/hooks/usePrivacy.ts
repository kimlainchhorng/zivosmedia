/**
 * usePrivacy — Telegram-style privacy matrix.
 * Reads + upserts the user's privacy preferences from `user_privacy_settings`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PrivacyChoice = "everyone" | "contacts" | "nobody";

export type PrivacySettings = {
  user_id: string;
  last_seen: PrivacyChoice;
  profile_photo: PrivacyChoice;
  bio_visibility: PrivacyChoice;
  phone_visibility: PrivacyChoice;
  forwards: PrivacyChoice;
  calls: PrivacyChoice;
  messages: PrivacyChoice;
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
  messages: "everyone",
  group_invites: "contacts",
  read_receipts: true,
};

export function usePrivacy() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  // Latest committed snapshot, read synchronously so two quick toggles of
  // different fields compute from each other instead of a stale closure.
  const settingsRef = useRef<PrivacySettings | null>(null);
  // Serialise writes so out-of-order network completions can't clobber.
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());

  const apply = (next: PrivacySettings | null) => {
    settingsRef.current = next;
    setSettings(next);
  };

  const refresh = useCallback(async () => {
    if (!user) { apply(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) apply({ ...DEFAULTS, ...(data as Partial<PrivacySettings>), user_id: user.id });
    else apply({ user_id: user.id, ...DEFAULTS });
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = useCallback(async (patch: Partial<Omit<PrivacySettings, "user_id">>) => {
    if (!user) return;
    const base = settingsRef.current ?? { user_id: user.id, ...DEFAULTS };
    const next: PrivacySettings = { ...base, ...patch, user_id: user.id };
    apply(next); // optimistic + synchronous, so the next call sees this value
    writeChain.current = writeChain.current.then(async () => {
      const { error } = await supabase
        .from("user_privacy_settings")
        .upsert(next, { onConflict: "user_id" });
      if (error) {
        toast.error("Couldn't save privacy setting — reverted");
        await refresh();
      }
    });
    await writeChain.current;
  }, [user, refresh]);

  return { settings, loading, update, refresh };
}
