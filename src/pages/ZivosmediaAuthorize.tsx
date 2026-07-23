import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authSupabase } from "@/integrations/supabase/client";

/**
 * "Continue with Zivosmedia" authorize endpoint (for Path-B / separate-project apps).
 *
 * A product app sends the signed-in user here with:
 *   ?app_key=&redirect_uri=&state=&code_challenge=&code_challenge_method=S256&scopes=
 * We require a Zivosmedia (main-project) session, mint a one-time authorization code
 * via the `zivosmedia-auth-issue-code` Edge Function, then redirect back to the app's
 * registered redirect_uri with `?code=&state=`. The product app then exchanges the code
 * server-side (client_secret + PKCE code_verifier) via `zivosmedia-auth-validate-code`.
 *
 * Security: issue-code validates app_key + redirect_uri against the app_integrations
 * registry and enforces PKCE, so we only ever redirect to the server-RETURNED (validated)
 * redirect_uri — never the raw query value. issue-code is invoked via authSupabase so it
 * hits the main project regardless of the active data domain.
 */
type IssueCodeResponse = {
  code?: string;
  redirect_uri?: string;
  state?: string | null;
  error?: string;
};

async function readFunctionError(error: unknown): Promise<string | null> {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : null;
  if (context instanceof Response) {
    const text = await context.clone().text().catch(() => "");
    if (!text) return null;
    try {
      const body = JSON.parse(text) as { error?: unknown; message?: unknown };
      if (typeof body.error === "string") return body.error;
      if (typeof body.message === "string") return body.message;
    } catch {
      return text.slice(0, 240);
    }
  }
  return error instanceof Error ? error.message : null;
}

export default function ZivosmediaAuthorize() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const appKey = params.get("app_key")?.trim() ?? "";
      const redirectUri = params.get("redirect_uri")?.trim() ?? "";
      const state = params.get("state");
      const codeChallenge = params.get("code_challenge")?.trim() || undefined;
      const codeChallengeMethod =
        params.get("code_challenge_method")?.trim() || (codeChallenge ? "S256" : undefined);
      const scopesRaw = params.get("scopes")?.trim();
      const scopes = scopesRaw ? scopesRaw.split(/[\s,]+/).filter(Boolean) : undefined;

      if (!appKey || !redirectUri) {
        setError("Missing app_key or redirect_uri.");
        return;
      }

      // Require a Zivosmedia (main-project) session; bounce through login and return here.
      const { data: sessionData } = await authSupabase.auth.getSession();
      if (!sessionData.session) {
        const next = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      const { data, error: fnError } = await authSupabase.functions.invoke<IssueCodeResponse>(
        "zivosmedia-auth-issue-code",
        {
          body: {
            app_key: appKey,
            redirect_uri: redirectUri,
            state: state ?? undefined,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallenge ? codeChallengeMethod : undefined,
            scopes,
          },
        },
      );

      if (fnError || !data?.code || !data?.redirect_uri) {
        const detail = data?.error || await readFunctionError(fnError);
        setError(detail || "Authorization was declined.");
        return;
      }

      // Redirect ONLY to the server-validated redirect_uri, over https
      // (allow http only for localhost dev). Blocks javascript:/data: schemes.
      try {
        const target = new URL(data.redirect_uri);
        const isHttps = target.protocol === "https:";
        const isLocalhost =
          target.protocol === "http:" &&
          (target.hostname === "localhost" || target.hostname === "127.0.0.1");
        if (!isHttps && !isLocalhost) {
          setError("Invalid redirect target.");
          return;
        }
        target.searchParams.set("code", data.code);
        if (data.state) target.searchParams.set("state", data.state);
        window.location.assign(target.toString());
      } catch {
        setError("Invalid redirect target.");
      }
    };

    void run();
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm font-bold text-red-400">Couldn't continue with Zivosmedia</p>
            <p className="mt-2 text-xs text-zinc-400">{error}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Go home
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
            <p className="mt-4 text-sm font-bold text-zinc-300">Continuing with Zivosmedia…</p>
          </>
        )}
      </div>
    </main>
  );
}
