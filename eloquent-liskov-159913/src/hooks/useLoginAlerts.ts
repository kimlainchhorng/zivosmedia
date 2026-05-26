/**
 * useLoginAlerts — Recent security events (login, logout, session revoked, etc.).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LoginAlert = {
  id: string;
  user_id: string;
  event: "login" | "logout" | "session_revoked" | "two_step_changed" | "password_changed" | "suspicious";
  device_name: string | null;
  platform: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useLoginAlerts(limit = 50) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LoginAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("login_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setAlerts((data as LoginAlert[]) ?? []);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { alerts, loading, refresh };
}
