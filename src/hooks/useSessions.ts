/**
 * useSessions — Telegram-style "Active Sessions".
 * Lists devices, sends a 60s heartbeat, and supports revoke / revoke-all-others.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActiveSession = {
  id: string;
  user_id: string;
  device_info: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  ip_address: string | null;
  location: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
};

const CURRENT_KEY = "zivo_current_session_id";

function detectDevice() {
  const ua = navigator.userAgent;
  const isMobile = /iPhone|Android|iPad|iPod/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const os = isIOS ? "iOS"
    : isAndroid ? "Android"
    : /Mac/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : "Unknown";
  return {
    device_type: isMobile ? "mobile" : "desktop",
    os,
    browser,
    device_info: `${browser} on ${os}`,
  };
}

export function useSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(CURRENT_KEY));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSessions([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_active_at", { ascending: false });
    setSessions((data as ActiveSession[]) ?? []);
    setLoading(false);
  }, [user]);

  const heartbeat = useCallback(async () => {
    if (!user) return;
    const existingId = localStorage.getItem(CURRENT_KEY);
    const dev = detectDevice();
    const { data } = await supabase.functions.invoke("user-session-presence", { body: {
      action: "heartbeat",
      session_id: existingId,
      user_agent: navigator.userAgent,
      ...dev,
    } });
    const nextId = (data as any)?.session_id;
    if (nextId) {
      localStorage.setItem(CURRENT_KEY, nextId);
      setCurrentId(nextId);
    }
  }, [user]);

  useEffect(() => {
    void heartbeat().then(refresh);
    const t = setInterval(() => { void heartbeat(); }, 60_000);
    return () => clearInterval(t);
  }, [heartbeat, refresh]);

  const revoke = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.functions.invoke("user-session-presence", { body: {
      action: "revoke",
      session_id: id,
    } });
    await refresh();
  }, [user, refresh]);

  const revokeAllOthers = useCallback(async () => {
    if (!user) return;
    await supabase.functions.invoke("user-session-presence", { body: {
      action: "revoke_all_others",
      current_session_id: currentId,
    } });
    await refresh();
  }, [user, currentId, refresh]);

  return { sessions, currentId, loading, refresh, revoke, revokeAllOthers };
}
