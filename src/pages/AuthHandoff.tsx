import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authSupabase } from "@/integrations/supabase/client";
import { sanitizeNextPath } from "@/lib/crossDomainSSO";

/**
 * Cross-domain SSO receiver. New handoffs arrive as a single-use magic-link
 * token hash (#ott=&next=), then verifyOtp installs the session on this origin.
 * The URL hash is stripped before async work so tokens do not linger in the
 * address bar, history, or referrer. Legacy #at/#rt handoffs are accepted only
 * as a rollout fallback; src/lib/crossDomainSSO.ts no longer creates them.
 */
export default function AuthHandoff() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const params = new URLSearchParams(raw);
      const tokenHash = params.get("ott") || params.get("token_hash");
      const accessToken = params.get("at");
      const refreshToken = params.get("rt");
      const next = sanitizeNextPath(params.get("next"));

      // Wipe tokens from the URL immediately, before any await.
      window.history.replaceState(null, "", window.location.pathname);

      if (tokenHash) {
        const { error } = await authSupabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: tokenHash,
        });
        if (!error) {
          navigate(next, { replace: true });
          return;
        }
        setFailed(true);
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await authSupabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          navigate(next, { replace: true });
          return;
        }
        setFailed(true);
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      // Nothing to adopt: honor an existing session, else send to login.
      const { data } = await authSupabase.auth.getSession();
      navigate(data.session ? next : `/login?next=${encodeURIComponent(next)}`, { replace: true });
    };

    void run();
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        <p className="mt-4 text-sm font-bold text-zinc-300">
          {failed ? "Couldn't sign you in. Redirecting..." : "Signing you in..."}
        </p>
      </div>
    </main>
  );
}
