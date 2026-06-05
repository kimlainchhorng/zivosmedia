import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeNextPath } from "@/lib/crossDomainSSO";

/**
 * Cross-domain SSO receiver. Adopts a session handed over from the other Zivos
 * domain via the URL hash (#at=&rt=&next=), then forwards to `next`. Tokens are
 * stripped from the URL before any async work so they never linger in the
 * address bar, history, or referrer. See src/lib/crossDomainSSO.ts.
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
      const accessToken = params.get("at");
      const refreshToken = params.get("rt");
      const next = sanitizeNextPath(params.get("next"));

      // Wipe the tokens from the URL immediately, before any await.
      window.history.replaceState(null, "", window.location.pathname);

      if (!accessToken || !refreshToken) {
        // Nothing to adopt — honour an existing session, else send to login.
        const { data } = await supabase.auth.getSession();
        navigate(data.session ? next : `/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setFailed(true);
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      navigate(next, { replace: true });
    };

    void run();
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        <p className="mt-4 text-sm font-bold text-zinc-300">
          {failed ? "Couldn't sign you in — redirecting…" : "Signing you in…"}
        </p>
      </div>
    </main>
  );
}
