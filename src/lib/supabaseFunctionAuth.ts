import { supabase } from "@/integrations/supabase/client";

type SessionLike = {
  access_token?: string | null;
} | null | undefined;

export async function getSupabaseFunctionAuthHeaders(session?: SessionLike) {
  const activeSession = session ?? (await supabase.auth.getSession()).data.session;
  const accessToken = activeSession?.access_token;

  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : null;
}
