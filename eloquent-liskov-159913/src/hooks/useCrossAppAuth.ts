/**
 * Cross-app auth — exchanges a SSO token from another Zivo app for a
 * redirect destination URL.
 *
 * The `exchange-auth-token` edge fn isn't deployed (cross-app SSO is a
 * future capability). To stop AuthCallback from silently flipping to
 * "error" on every magic link, we treat any 404 as "no exchange wired —
 * just send the user home". A real failure (network, malformed token)
 * still surfaces via `error`.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NOT_DEPLOYED_PATTERN = /not.*found|404|FunctionsHttpError|FunctionsRelayError/i;

export function useExchangeAuthToken() {
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangeToken = async (token: string): Promise<string | null> => {
    setIsExchanging(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("exchange-auth-token", {
        body: { token },
      });
      if (fnError) throw fnError;
      return data?.session_token || "/home";
    } catch (err: any) {
      const msg: string = err?.message || String(err) || "";
      // Treat "fn not deployed" as a soft fallback so users still land somewhere.
      if (NOT_DEPLOYED_PATTERN.test(msg)) {
        return "/home";
      }
      setError(msg || "Token exchange failed");
      return null;
    } finally {
      setIsExchanging(false);
    }
  };

  return { exchangeToken, isExchanging, error };
}
