/**
 * Live pairing helpers — used by:
 *  - Desktop: creates pairing session, watches for confirmation
 *  - Phone: resolves a token, confirms/cancels, then stores a "paired identity"
 *    in localStorage so /go-live can act as the store without a real sign-in.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PairSession {
  session_id: string;
  store_id: string;
  store_name: string | null;
  store_avatar_url: string | null;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  expires_at: string;
}

const PAIRED_KEY = "zivo:live_pair_identity";
const PAIR_TOKEN_KEY = "zivo:live_pair_token";

export interface PairedIdentity {
  store_id: string;
  store_name: string | null;
  store_avatar_url: string | null;
  paired_at: string;
}

export async function createPairSession(storeId: string) {
  const { data, error } = await (supabase as any).rpc("create_live_pair_session", {
    p_store_id: storeId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { session_id: string; token: string; expires_at: string };
}

export async function getPairSession(token: string): Promise<PairSession | null> {
  const { data, error } = await (supabase as any).rpc("get_live_pair_session", { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PairSession) ?? null;
}

export async function confirmPairSession(token: string) {
  const { data, error } = await (supabase as any).rpc("confirm_live_pair_session", {
    p_token: token,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function cancelPairSession(token: string) {
  const { error } = await (supabase as any).rpc("cancel_live_pair_session", { p_token: token });
  if (error) throw error;
}

export async function getPairedSessionByToken(token: string) {
  const { data, error } = await (supabase as any).rpc("get_paired_session_by_token", {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as {
    session_id: string;
    store_id: string;
    store_owner_id: string | null;
    store_name: string | null;
    store_avatar_url: string | null;
    status: string;
    device_expires_at: string | null;
  } | null;
}

export async function revokePairSession(token: string) {
  const { error } = await (supabase as any).rpc("revoke_live_pair_session", { p_token: token });
  if (error) throw error;
}

export function savePairedIdentity(p: Omit<PairedIdentity, "paired_at">) {
  const payload: PairedIdentity = { ...p, paired_at: new Date().toISOString() };
  try { localStorage.setItem(PAIRED_KEY, JSON.stringify(payload)); } catch {}
}

export function getPairedIdentity(): PairedIdentity | null {
  try {
    const raw = localStorage.getItem(PAIRED_KEY);
    return raw ? (JSON.parse(raw) as PairedIdentity) : null;
  } catch { return null; }
}

export function clearPairedIdentity() {
  try {
    localStorage.removeItem(PAIRED_KEY);
    localStorage.removeItem(PAIR_TOKEN_KEY);
  } catch {}
}

export function savePairToken(token: string) {
  try { localStorage.setItem(PAIR_TOKEN_KEY, token); } catch {}
}

export function getPairToken(): string | null {
  try { return localStorage.getItem(PAIR_TOKEN_KEY); } catch { return null; }
}
