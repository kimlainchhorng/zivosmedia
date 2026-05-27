/**
 * useUsername — Telegram-style @username identity (no phone needed)
 * - Read current user's username
 * - Check availability
 * - Claim / change username
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,32}$/;

export function validateUsername(value: string): string | null {
  if (!value) return "Username is required";
  if (!USERNAME_REGEX.test(value)) {
    return "4–32 chars, letters, numbers and _ only";
  }
  return null;
}

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setUsername(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("usernames")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();
    setUsername((data?.username as string) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const checkAvailability = useCallback(async (candidate: string) => {
    const err = validateUsername(candidate);
    if (err) return { available: false, error: err };
    const { data, error } = await supabase
      .from("usernames")
      .select("username,user_id,reserved")
      .ilike("username", candidate)
      .maybeSingle();
    if (error) return { available: false, error: error.message };
    if (!data) return { available: true, error: null };
    if (data.user_id === user?.id) return { available: true, error: null, mine: true };
    return { available: false, error: data.reserved ? "This name is reserved" : "Already taken" };
  }, [user?.id]);

  const claim = useCallback(async (candidate: string) => {
    if (!user) return { ok: false, error: "Not signed in" };
    const err = validateUsername(candidate);
    if (err) return { ok: false, error: err };

    // Remove any old claim, then insert
    const { error: delErr } = await supabase
      .from("usernames")
      .delete()
      .eq("user_id", user.id);
    if (delErr) return { ok: false, error: delErr.message };

    const { error } = await supabase
      .from("usernames")
      .insert({ username: candidate, user_id: user.id, reserved: false });
    if (error) return { ok: false, error: error.message };

    setUsername(candidate);
    return { ok: true };
  }, [user]);

  return { username, loading, refresh, checkAvailability, claim };
}
