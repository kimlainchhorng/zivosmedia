/** AcceptInvitePage — claims a store employee invite after sign-in. */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const token = params.get("token") || "";
  const [state, setState] = useState<"idle" | "claiming" | "ok" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setState("error");
      setErrorMsg("Missing invite token.");
      return;
    }
    if (!user) {
      // Send to /auth, preserve intent
      navigate(`/auth?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`, { replace: true });
      return;
    }
    (async () => {
      setState("claiming");
      const { data, error } = await (supabase as any).rpc("claim_employee_invite", { _token: token });
      if (error) {
        setState("error");
        setErrorMsg(error.message);
        return;
      }
      if (data?.ok) {
        setState(data.already ? "already" : "ok");
      } else {
        setState("error");
        setErrorMsg(data?.error || "Invite could not be claimed.");
      }
    })();
  }, [authLoading, user, token, navigate]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 py-9 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-ig-gradient flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          {state === "idle" || state === "claiming" ? (
            <>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Setting up your account…</h1>
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-foreground" />
            </>
          ) : state === "ok" || state === "already" ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-foreground mx-auto" />
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                {state === "already" ? "You're already on the team" : "Welcome to the team!"}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You can now clock in and view your schedule.
              </p>
              <button type="button"
                onClick={() => navigate("/personal-dashboard")}
                className="w-full h-9 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center shadow-md"
              >
                Open Workplace
              </button>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Invite issue</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{errorMsg || "This invite is no longer valid."}</p>
              <button type="button"
                onClick={() => navigate("/")}
                className="w-full h-9 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99] transition flex items-center justify-center"
              >
                Go home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
