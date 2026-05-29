/**
 * ZIVO → ZIVO Chat single sign-on handoff (issuer side).
 *
 * ZIVO Chat sends the user here ("Continue with ZIVO") with:
 *   /connect/chat?return=<zivo-chat callback url>&state=<nonce>
 *
 * If the user has a live ZIVO session we mint a single-use login token and
 * redirect back to the (allow-listed) return target with it:
 *   web:    <https return>#ott=<token_hash>&state=<nonce>          (fragment)
 *   native: zivochat://connect/zivo?ott=<token_hash>&state=<nonce> (custom scheme)
 *
 * If the user is not signed in, we route through ZIVO login and resume here.
 *
 * Security: the return origin must be on the allow-list (prevents sending the
 * session to an attacker's site). The opaque `state` is echoed back and
 * verified by ZIVO Chat, binding the handoff to a flow it started.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Origins permitted to receive a ZIVO session. Set the real ZIVO Chat
// production origin here or via VITE_CHAT_ORIGINS (comma-separated).
const STATIC_ALLOWED_ORIGINS = ["https://chat.hizivo.com"];

function allowedOrigins(): string[] {
  const fromEnv = (import.meta.env.VITE_CHAT_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const dev = import.meta.env.DEV
    ? ["http://localhost:8082", "http://localhost:5173", "http://127.0.0.1:8082"]
    : [];
  return [...STATIC_ALLOWED_ORIGINS, ...fromEnv, ...dev];
}

type ReturnTarget = { kind: "web"; url: URL } | { kind: "deeplink"; base: string };

// Native ZIVO Chat deep links permitted to receive a handoff token.
const ALLOWED_DEEPLINK_RETURNS = ["com.zivo.chat://connect/zivo"];

function validateReturn(returnUrl: string): ReturnTarget | null {
  // Native app custom-scheme deep link, e.g. zivochat://connect/zivo?redirect=…
  for (const base of ALLOWED_DEEPLINK_RETURNS) {
    if (returnUrl === base || returnUrl.startsWith(base + "?")) {
      return { kind: "deeplink", base: returnUrl };
    }
  }
  // Web origin must be on the allow-list.
  try {
    const u = new URL(returnUrl);
    const httpsOk = u.protocol === "https:" || (import.meta.env.DEV && u.protocol === "http:");
    if (!httpsOk) return null;
    return allowedOrigins().includes(u.origin) ? { kind: "web", url: u } : null;
  } catch {
    return null;
  }
}

const ConnectChat = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const returnUrl = params.get("return") || "";
      const state = params.get("state") || "";
      const target = validateReturn(returnUrl);

      if (!target || !state) {
        setError("This sign-in link isn't valid or not allowed.");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        // Not signed in on ZIVO yet — go log in, then resume this exact handoff.
        const resume = `/connect/chat?return=${encodeURIComponent(returnUrl)}&state=${encodeURIComponent(state)}`;
        navigate(`/login?redirect=${encodeURIComponent(resume)}`, { replace: true });
        return;
      }

      // Mint a single-use login token server-side (service role). We never put
      // the long-lived refresh token in a URL — only this short-lived,
      // single-use OTP hash, which ZIVO Chat redeems via verifyOtp().
      const { data: mint, error: mintErr } = await supabase.functions.invoke("mint-chat-handoff");
      const tokenHash = (mint as { token_hash?: string } | null)?.token_hash;
      if (mintErr || !tokenHash) {
        setError("Couldn't start the secure handoff. Please try again.");
        return;
      }

      const qp = new URLSearchParams({ ott: tokenHash, state });
      if (target.kind === "deeplink") {
        // Custom schemes don't reliably carry URL fragments through the OS
        // open, so pass the single-use token as a query param instead.
        const sep = target.base.includes("?") ? "&" : "?";
        const dest = `${target.base}${sep}${qp.toString()}`;
        if (Capacitor.isNativePlatform()) {
          // Inside the native ZIVO app → launch ZIVO Chat directly (app-to-app).
          const { AppLauncher } = await import("@capacitor/app-launcher");
          await AppLauncher.openUrl({ url: dest });
        } else {
          // In-app browser fallback: a top-level navigation to the custom
          // scheme hands control back to the ZIVO Chat app.
          window.location.replace(dest);
        }
      } else {
        // Web: keep the token in the fragment (never sent to a server).
        const u = target.url;
        window.location.replace(`${u.origin}${u.pathname}${u.search}#${qp.toString()}`);
      }
    })();
  }, [navigate, params]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-black px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        {error ? (
          <>
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {error}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              For your security, ZIVO only connects to approved ZIVO apps. Please start again from ZIVO Chat.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Connecting your ZIVO account…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectChat;
