/**
 * ZIVO Media -> ZIVO Software handoff issuer page.
 *
 * This page runs on zivosmedia.com with the Media Supabase client. If the user
 * is signed in there, it asks the Software Supabase project to mint a
 * single-use Software magic-link token for the same verified Media email.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ZIVO_SOFTWARE_AUTH_REDIRECT_PATH, ZIVO_SOFTWARE_SUPABASE_URL } from "@/config/autoRepairDomain";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED_SOFTWARE_RETURNS = new Set([
  "https://zivosoftware.com/connect/media",
  "https://www.zivosoftware.com/connect/media",
]);

function validateReturn(returnUrl: string) {
  try {
    const url = new URL(returnUrl);
    return ALLOWED_SOFTWARE_RETURNS.has(`${url.origin}${url.pathname}`) ? url : null;
  } catch {
    return null;
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

const ConnectSoftware = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const returnUrl = params.get("return") || "https://zivosoftware.com/connect/media";
      const redirect = params.get("redirect") || ZIVO_SOFTWARE_AUTH_REDIRECT_PATH;
      const state = params.get("state") || "";
      const target = validateReturn(returnUrl);

      if (!target || !state) {
        setError("This Software connection link is not valid.");
        return;
      }

      let session: Session | null;
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 7000);
        session = data.session;
      } catch {
        setError("Couldn't read your ZIVO Media session. Please try again.");
        return;
      }

      if (!session) {
        const resume =
          `/connect/software?return=${encodeURIComponent(returnUrl)}` +
          `&redirect=${encodeURIComponent(redirect)}` +
          `&state=${encodeURIComponent(state)}`;
        navigate(`/login?redirect=${encodeURIComponent(resume)}`, { replace: true });
        return;
      }

      let tokenHash: string | undefined;
      try {
        const response = await withTimeout(
          fetch(`${ZIVO_SOFTWARE_SUPABASE_URL}/functions/v1/software-media-handoff`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }),
          12000,
        );
        const body = (await response.json().catch(() => null)) as { token_hash?: string; error?: string } | null;
        if (!response.ok || !body?.token_hash) {
          throw new Error(body?.error || "Could not connect ZIVO Media to ZIVO Software.");
        }
        tokenHash = body.token_hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not connect ZIVO Media to ZIVO Software.");
        return;
      }

      const fragment = new URLSearchParams({ ott: tokenHash, state, redirect });
      target.hash = fragment.toString();
      window.location.replace(target.toString());
    })();
  }, [navigate, params]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white px-6 text-center">
      <div className="flex max-w-xs flex-col items-center gap-4">
        {error ? (
          <>
            <ShieldAlert className="h-7 w-7 text-amber-500" />
            <p className="text-sm font-semibold text-zinc-900">{error}</p>
            <p className="text-xs text-zinc-500">
              Start again from ZIVO Software so we can verify both accounts safely.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <p className="text-sm text-zinc-600">Connecting your ZIVO Media account to ZIVO Software...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectSoftware;
