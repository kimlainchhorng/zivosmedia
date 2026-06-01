/**
 * useTwoStep — Extra password gate for sensitive actions.
 * Hash is computed in the browser; the server only ever sees salted hash.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateSalt, hashSecret, verifySecret } from "@/lib/auth/passwordHash";

export type TwoStepRow = {
  user_id: string;
  password_hash: string;
  password_salt: string;
  hint: string | null;
  recovery_email: string | null;
  enabled: boolean;
};

export function useTwoStep() {
  const { user } = useAuth();
  const [row, setRow] = useState<TwoStepRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRow(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("two_step_auth").select("*").eq("user_id", user.id).maybeSingle();
    setRow((data as TwoStepRow) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const enable = useCallback(async (password: string, hint?: string, recoveryEmail?: string) => {
    if (!user) throw new Error("Not signed in");
    const salt = generateSalt();
    const hash = await hashSecret(password, salt);
    const { error } = await supabase.functions.invoke("account-security-settings", { body: {
      resource: "two_step",
      action: "upsert",
      password_hash: hash,
      password_salt: salt,
      hint: hint ?? null,
      recovery_email: recoveryEmail ?? null,
      enabled: true,
    } });
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const disable = useCallback(async (currentPassword: string) => {
    if (!user || !row) throw new Error("No two-step set");
    const ok = await verifySecret(currentPassword, row.password_salt, row.password_hash);
    if (!ok) throw new Error("Wrong password");
    const { error } = await supabase.functions.invoke("account-security-settings", { body: {
      resource: "two_step",
      action: "delete",
    } });
    if (error) throw error;
    await refresh();
  }, [user, row, refresh]);

  const verify = useCallback(async (password: string) => {
    if (!row) return true; // no two-step => no gate
    return verifySecret(password, row.password_salt, row.password_hash);
  }, [row]);

  return { row, loading, isEnabled: !!row?.enabled, enable, disable, verify, refresh };
}
