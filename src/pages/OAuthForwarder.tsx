import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

const SUPABASE_FUNCTIONS_ORIGIN = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");

const CALLBACK_FUNCTION_BY_PATH: Record<string, string> = {
  "/auth/meta/callback": "oauth-callback",
  "/auth/google-ads/callback": "google-ads-oauth-callback",
};

const TITLE_BY_PATH: Record<string, string> = {
  "/auth/meta/callback": "Connecting Facebook",
  "/auth/google-ads/callback": "Connecting Google Ads",
};

export default function OAuthForwarder() {
  const pathname = window.location.pathname;
  const functionName = CALLBACK_FUNCTION_BY_PATH[pathname] ?? "oauth-callback";
  const title = TITLE_BY_PATH[pathname] ?? "Connecting";

  const destination = useMemo(() => {
    if (!SUPABASE_FUNCTIONS_ORIGIN) return "";
    return `${SUPABASE_FUNCTIONS_ORIGIN}/functions/v1/${functionName}${window.location.search}${window.location.hash}`;
  }, [functionName]);

  useEffect(() => {
    if (!destination) return;
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <div className="space-y-4">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-900" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
        <p className="max-w-sm text-sm text-zinc-600">
          {destination
            ? "Finishing the secure connection with Zivo."
            : "This connection needs the Supabase callback URL configured before it can continue."}
        </p>
      </div>
    </main>
  );
}
