import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExchangeAuthToken } from "@/hooks/useCrossAppAuth";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSafeRedirectTarget, withRedirectParam } from "@/lib/authRedirect";
import { saveAccount } from "@/hooks/useSavedAccounts";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeToken, isExchanging, error } = useExchangeAuthToken();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeRedirectTarget(searchParams.get("redirect"));

  // Parse hash fragment for OAuth errors (Supabase returns errors in hash, not query)
  const getHashParams = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
      error: params.get("error"),
      errorDescription: params.get("error_description"),
    };
  };

  // Helper function to check setup status and navigate accordingly.
  // IMPORTANT: This function must NEVER set status to "error" when the user
  // has a valid session. If anything fails, redirect gracefully.
  const checkSetupAndNavigate = async (user: User) => {
    try {
      const userId = user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("setup_complete, email_verified, full_name, avatar_url, role")
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

      let resolvedProfile = profile;

      // Apple/native OAuth can succeed before a profile row is created.
      // Provision a minimal profile so the user can continue through setup.
      if (!resolvedProfile) {
        console.warn("No profile found after successful auth, creating one now", { userId });

        const { data: createdProfile, error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            user_id: userId,
            email: user.email ?? null,
            full_name:
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : typeof user.user_metadata?.name === "string"
                  ? user.user_metadata.name
                  : null,
          })
          .select("setup_complete, email_verified, full_name, avatar_url, role")
          .single();

        if (createProfileError) {
          console.error("Failed to create profile:", createProfileError);
          // Profile may already exist (created by trigger) — try fetching again
          const { data: retryProfile } = await supabase
            .from("profiles")
            .select("setup_complete, email_verified, full_name, avatar_url, role")
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .maybeSingle();

          if (retryProfile) {
            resolvedProfile = retryProfile;
          } else {
            // Even if profile creation fails, don't block the user.
            // Redirect to setup so they can complete their profile.
            setStatus("success");
            setTimeout(() => navigate(withRedirectParam("/setup", redirectTo), {
              replace: true,
              state: { redirectTo },
            }), 200);
            return;
          }
        } else {
          resolvedProfile = createdProfile;
        }
      }

      // OAuth providers already verify email, and email confirmation links
      // update auth.users.email_confirmed_at even if our profile flag lags behind.
      const provider = user.app_metadata?.provider;
      const isOAuthUser = Boolean(provider && provider !== "email");
      const isEmailConfirmedInAuth = Boolean(user.email_confirmed_at);
      const isEmailVerified = isOAuthUser || isEmailConfirmedInAuth || resolvedProfile.email_verified === true;

      if (isEmailConfirmedInAuth && resolvedProfile.email_verified !== true) {
        const { error: syncProfileError } = await supabase
          .from("profiles")
          .update({ email_verified: true })
          .or(`user_id.eq.${userId},id.eq.${userId}`);

        if (syncProfileError) {
          console.error("Failed to sync profile email verification:", syncProfileError);
        } else {
          resolvedProfile = { ...resolvedProfile, email_verified: true };
        }
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (user.email) {
          saveAccount({
            email: user.email,
            fullName:
              resolvedProfile.full_name ||
              (typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : typeof user.user_metadata?.name === "string"
                  ? user.user_metadata.name
                  : user.email.split("@")[0]),
            avatarUrl:
              resolvedProfile.avatar_url ||
              (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null),
            role: resolvedProfile.role ?? null,
            lastLoginAt: new Date().toISOString(),
            refreshToken: sessionData?.session?.refresh_token ?? null,
            accessToken: sessionData?.session?.access_token ?? null,
            expiresAt: sessionData?.session?.expires_at ?? null,
          });
        }
      } catch {
        // Saved-account refresh is best-effort; authenticated navigation should continue.
      }

      if (!isEmailVerified && user.email) {
        // Send OTP for verification — but don't block if it fails
        try {
          const { data: otpResponse, error: otpError } = await supabase.functions.invoke(
            "send-otp-email",
            { body: { email: user.email, userId: user.id } }
          );

          if (!otpError && otpResponse?.success) {
            setStatus("success");
            setTimeout(() => {
              navigate(withRedirectParam("/verify-otp", redirectTo), {
                state: { email: user.email, userId: user.id, redirectTo },
                replace: true,
              });
            }, 200);
            return;
          }
        } catch (err) {
          console.error("Failed to send OTP:", err);
        }
        
        // OTP failed — still redirect, don't show error
        setStatus("success");
        setTimeout(() => navigate(withRedirectParam("/login", redirectTo), { replace: true }), 200);
        return;
      }

      // If setup is not complete, redirect to setup page
      if (!resolvedProfile.setup_complete) {
        setStatus("success");
        setTimeout(() => navigate(withRedirectParam("/setup", redirectTo), {
          replace: true,
          state: { redirectTo },
        }), 200);
        return;
      }

      // Check if user is admin for auto-redirect to dashboard
      const { data: isAdminUser } = await supabase.rpc("check_user_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setStatus("success");
      setTimeout(() => navigate(isAdminUser ? "/admin/analytics" : redirectTo, { replace: true }), 200);
    } catch (err) {
      console.error("Error checking setup status:", err);
      // User IS authenticated — never show an error. Redirect to home.
      setStatus("success");
      setTimeout(() => navigate(redirectTo, { replace: true }), 200);
    }
  };

  useEffect(() => {
    const token = searchParams.get("token");
    const code = searchParams.get("code");
    const queryError = searchParams.get("error");
    const queryErrorDescription = searchParams.get("error_description");
    
    // Also check hash fragment (Supabase returns OAuth errors in hash)
    const hashParams = getHashParams();
    const errorParam = queryError || hashParams.error;
    const errorDescription = queryErrorDescription || hashParams.errorDescription;

    // Provider error returned in query params or hash
    if (errorParam) {
      console.error("OAuth provider returned error:", { errorParam, errorDescription });
      
      const raw = (errorDescription || "").toLowerCase();
      let friendlyMessage = "Authentication failed. Please try again.";

      if (raw.includes("email not authorized for signup")) {
        friendlyMessage = "This email is not authorized to sign up. Please request an invitation to join ZIVO.";
      } else if (raw.includes("invitation already used")) {
        friendlyMessage = "This invitation has already been used. Please sign in instead.";
      } else if (
        raw.includes("not on allowlist") ||
        raw.includes("saving new user") ||
        raw.includes("database error")
      ) {
        friendlyMessage = "This email is not authorized to sign up. Please request an invitation to join ZIVO.";
      } else if (raw.includes("already registered") || raw.includes("already exists")) {
        friendlyMessage = "An account with this email already exists. Please sign in instead.";
      } else if (errorDescription) {
        friendlyMessage = decodeURIComponent(errorDescription.replace(/\+/g, " "));
      }

      // Even with an OAuth error, check if the user actually has a session
      // (some providers return error params but the session is valid)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // User is authenticated despite the error param — redirect gracefully
          if (import.meta.env.DEV) console.log("User has valid session despite OAuth error param, redirecting...");
          checkSetupAndNavigate(session.user);
        } else {
          setErrorMessage(friendlyMessage);
          setStatus("error");
        }
      });
      return;
    }

    // Cross-app auth flow (?token=...)
    if (token) {
      const handleExchange = async () => {
        const redirectUrl = await exchangeToken(token);

        if (redirectUrl) {
          // Validate the redirect URL is internal to prevent open redirect
          const safeTarget = getSafeRedirectTarget(redirectUrl);
          navigate(safeTarget, { replace: true });
        } else {
          setStatus("error");
        }
      };

      handleExchange();
      return;
    }

    // Supabase OAuth PKCE flow (?code=...)
    if (code) {
      const handleCodeExchange = async () => {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("OAuth code exchange error:", exchangeError);
          
          const msg = (exchangeError.message || "").toLowerCase();

          if (msg.includes("email not authorized for signup") || msg.includes("not on allowlist") || msg.includes("database error")) {
            setErrorMessage("This email is not authorized to sign up. Please request an invitation to join ZIVO.");
          } else if (msg.includes("invitation already used")) {
            setErrorMessage("This invitation has already been used. Please sign in instead.");
          } else if (msg.includes("already registered") || msg.includes("already exists")) {
            setErrorMessage("An account with this email already exists. Please sign in instead.");
          }
          
          // Check if user actually has a session despite the exchange error
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (import.meta.env.DEV) console.log("User has valid session despite code exchange error, redirecting...");
            await checkSetupAndNavigate(session.user);
            return;
          }
          
          setStatus("error");
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          await checkSetupAndNavigate(user);
        } else {
          setStatus("success");
          setTimeout(() => navigate("/", { replace: true }), 200);
        }
      };

      handleCodeExchange();
      return;
    }

    // Fallback: if the session already exists, check setup status. Otherwise, wait briefly.
    const handleOAuthFallback = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("OAuth callback session error:", sessionError);
        // Don't immediately error — listen for auth state changes
      }

      if (session?.user) {
        const user = session.user;
        await checkSetupAndNavigate(user);
        return;
      }

      // Wait for auth state change with a generous timeout for native flows
      const timeout = setTimeout(async () => {
        // One final check before showing error
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession?.user) {
          await checkSetupAndNavigate(finalSession.user);
        } else {
          setStatus("error");
        }
      }, 10000);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.user) {
          clearTimeout(timeout);
          const user = nextSession.user;
          await checkSetupAndNavigate(user);
          subscription.unsubscribe();
        }
      });

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    };

    void handleOAuthFallback();
  }, [searchParams, navigate, exchangeToken]);

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
        <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Welcome!</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Redirecting you now...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error" || error) {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
          <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
        </div>
        <div className="relative w-full max-w-sm">
          <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 py-9 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 bg-secondary">
              <XCircle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Authentication failed</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {errorMessage || error || "This email is not authorized, or the link is invalid. Please request an invitation or contact support."}
            </p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => navigate("/")}
                className="flex-1 h-9 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99] transition"
              >
                Go home
              </button>
              <button type="button"
                onClick={() => navigate(withRedirectParam("/login", redirectTo))}
                className="flex-1 h-9 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] transition shadow-md"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 py-9 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-ig-gradient flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Signing you in…</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Please wait while we authenticate your session.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
