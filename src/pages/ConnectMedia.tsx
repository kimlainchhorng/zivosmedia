/**
 * ZIVO Software receiver for ZIVO Media customer handoff.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { ZIVO_SOFTWARE_AUTH_REDIRECT_PATH } from "@/config/autoRepairDomain";
import { supabase } from "@/integrations/supabase/client";
import { getSafeRedirectTarget, isExternalRedirectTarget } from "@/lib/authRedirect";
import {
  clearRememberedSoftwareMediaConnect,
  getRememberedSoftwareMediaConnect,
} from "@/lib/softwareMediaConnect";

const ConnectMedia = () => {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const tokenHash = fragment.get("ott") || "";
      const state = fragment.get("state") || "";
      const redirect = getSafeRedirectTarget(fragment.get("redirect") || ZIVO_SOFTWARE_AUTH_REDIRECT_PATH);
      const remembered = getRememberedSoftwareMediaConnect();

      if (!tokenHash || !state) {
        setError("This ZIVO Media connection link is missing its login token.");
        return;
      }

      if (remembered.state && remembered.state !== state) {
        setError("This ZIVO Media connection link does not match this browser session.");
        return;
      }

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: tokenHash,
        });
        if (verifyError) throw verifyError;
        clearRememberedSoftwareMediaConnect();
        const destination = redirect || remembered.redirect || ZIVO_SOFTWARE_AUTH_REDIRECT_PATH;
        if (isExternalRedirectTarget(destination)) {
          window.location.assign(destination);
          return;
        }
        navigate(destination, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not finish connecting ZIVO Media.");
      }
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white px-6 text-center">
      <div className="flex max-w-xs flex-col items-center gap-4">
        {error ? (
          <>
            <ShieldAlert className="h-7 w-7 text-amber-500" />
            <p className="text-sm font-semibold text-zinc-900">{error}</p>
            <p className="text-xs text-zinc-500">
              Go back to ZIVO Software and start the ZIVO Media connection again.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <p className="text-sm text-zinc-600">Opening your ZIVO Software workspace...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectMedia;
