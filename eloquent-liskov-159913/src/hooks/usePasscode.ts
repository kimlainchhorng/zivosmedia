/**
 * usePasscode — App lock PIN with auto-lock + biometric flag.
 * The PIN never leaves the device in plain form; only the salted hash is stored.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateSalt, hashSecret, verifySecret } from "@/lib/auth/passwordHash";

export type PasscodeRow = {
  user_id: string;
  passcode_hash: string;
  passcode_salt: string;
  biometric_enabled: boolean;
  auto_lock_minutes: number;
  enabled: boolean;
};

export function usePasscode() {
  const { user } = useAuth();
  const [row, setRow] = useState<PasscodeRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRow(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_passcode").select("*").eq("user_id", user.id).maybeSingle();
    setRow((data as PasscodeRow) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setPasscode = useCallback(async (pin: string, autoLockMinutes = 5, biometric = false) => {
    if (!user) throw new Error("Not signed in");
    if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN must be 4–6 digits");
    const salt = generateSalt();
    const hash = await hashSecret(pin, salt);
    const { error } = await supabase.from("user_passcode").upsert({
      user_id: user.id,
      passcode_hash: hash,
      passcode_salt: salt,
      auto_lock_minutes: autoLockMinutes,
      biometric_enabled: biometric,
      enabled: true,
    }, { onConflict: "user_id" });
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const updateOptions = useCallback(async (patch: Partial<Pick<PasscodeRow, "auto_lock_minutes" | "biometric_enabled" | "enabled">>) => {
    if (!user || !row) return;
    const next = { ...row, ...patch };
    setRow(next);
    const { error } = await supabase.from("user_passcode").update(patch).eq("user_id", user.id);
    if (error) await refresh();
  }, [user, row, refresh]);

  const disable = useCallback(async (currentPin: string) => {
    if (!user || !row) throw new Error("No passcode");
    const ok = await verifySecret(currentPin, row.passcode_salt, row.passcode_hash);
    if (!ok) throw new Error("Wrong PIN");
    const { error } = await supabase.from("user_passcode").delete().eq("user_id", user.id);
    if (error) throw error;
    await refresh();
  }, [user, row, refresh]);

  const verify = useCallback(async (pin: string) => {
    if (!row) return true;
    return verifySecret(pin, row.passcode_salt, row.passcode_hash);
  }, [row]);

  return { row, loading, isEnabled: !!row?.enabled, setPasscode, updateOptions, disable, verify, refresh };
}
