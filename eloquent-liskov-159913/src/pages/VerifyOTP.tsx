/**
 * VerifyOTP — passwordless email confirmation page.
 * Login flow uses a Supabase magic link. Signup can still use a 6-digit code.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Mail, ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { saveAccount } from "@/hooks/useSavedAccounts";

const RESEND_COOLDOWN = 30;

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const redirect = params.get("redirect") || "/";
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const isSignup = mode === "signup";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Login emails are magic-link first. Signup emails use the custom 6-digit
  // verification code, so show code entry immediately for signup only.
  const [showCodeEntry, setShowCodeEntry] = useState(isSignup);

  const getEmailRedirectTo = () => {
    const redirectParams = new URLSearchParams();
    redirectParams.set("redirect", redirect);
    return `${window.location.origin}/auth-callback?${redirectParams.toString()}`;
  };

  const persistVerifiedAccount = useCallback(async () => {
    if (!email) return;
    try {
      const [{ data: profile }, { data: sessionData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("email", email)
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);
      saveAccount({
        email,
        fullName: profile?.full_name || email.split("@")[0],
        avatarUrl: profile?.avatar_url ?? null,
        lastLoginAt: new Date().toISOString(),
        role: profile?.role ?? null,
        refreshToken: sessionData?.session?.refresh_token ?? null,
        accessToken: sessionData?.session?.access_token ?? null,
        expiresAt: sessionData?.session?.expires_at ?? null,
      });
    } catch {
      // Saving the quick-login card is nice-to-have; auth itself succeeded.
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      toast.error("Missing email. Please start again.");
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // No auto-focus on mount — code entry is hidden by default; we focus the
  // first box explicitly when the user taps "I have a 6-digit code".

  // Listen for auth session changes — when the user clicks the magic link in
  // their email (which opens /auth/callback in another tab and sets the
  // session), this listener fires here too via Supabase's broadcast and we
  // redirect home. Same effect even if they click the link in this tab.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        void persistVerifiedAccount().finally(() => {
          toast.success("Signed in!");
          navigate(redirect, { replace: true });
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, persistVerifiedAccount, redirect]);

  const submit = async (fullCode: string) => {
    if (submitting) return;
    setSubmitting(true);

    if (mode === "signup") {
      const { data, error } = await supabase.functions.invoke("verify-otp-code", {
        body: { email, code: fullCode },
      });

      if (error || !data?.success) {
        setSubmitting(false);
        toast.error(data?.error || error?.message || "Invalid or expired code.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Try to auto-sign-in via the magic link returned by the function
      const actionLink: string | undefined = data?.actionLink;
      if (actionLink) {
        try {
          const url = new URL(actionLink);
          const tokenHash = url.searchParams.get("token") || url.searchParams.get("token_hash");
          if (tokenHash) {
            const { error: vErr } = await supabase.auth.verifyOtp({
              type: "magiclink",
              token_hash: tokenHash,
            });
            if (!vErr) {
              setSubmitting(false);
              toast.success("Email verified! Welcome to ZIVO.");
              navigate(redirect && redirect !== "/" ? redirect : "/account", { replace: true });
              return;
            }
            console.warn("Auto sign-in failed:", vErr);
          }
        } catch (e) {
          console.warn("Magic link parse failed:", e);
        }
      }

      setSubmitting(false);
      toast.success("Email verified. Please sign in.");
      navigate(`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`, { replace: true });
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: fullCode,
      type: "email",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Invalid or expired code.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }
    await persistVerifiedAccount();
    toast.success("Signed in!");
    navigate(redirect, { replace: true });
  };

  const handleChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((c) => c) && next.join("").length === 6) submit(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.padEnd(6, "").split("").slice(0, 6);
    setCode(next as string[]);
    if (pasted.length === 6) submit(pasted);
    else inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);

    if (mode === "signup") {
      const { error } = await supabase.functions.invoke("send-otp-email", {
        body: { email },
      });
      setResending(false);
      if (error) {
        toast.error(error.message || "Could not resend code.");
        return;
      }
      toast.success("New code sent!");
      setCooldown(RESEND_COOLDOWN);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getEmailRedirectTo() },
    });
    setResending(false);
    if (error) {
      toast.error(error.message || "Could not resend sign-in link.");
      return;
    }
    toast.success("New sign-in link sent!");
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <SEOHead
        title={isSignup ? "Verify your code" : "Check your email"}
        description={isSignup ? "Enter the 6-digit code we emailed you." : "Tap the secure sign-in link we emailed you."}
      />

      {/* Subtle ZIVO gradient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Main card — link-first layout. The 6-digit code entry is collapsed
            by default because Supabase email templates often only contain the
            magic link (no token), so showing 6 empty boxes upfront is
            confusing. Users with a code can tap "Use code instead" to expand. */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 pt-9 pb-6 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {isSignup ? "Enter your code" : "Check your email"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 text-center">
              {isSignup ? "We sent a 6-digit code to" : "We sent a secure sign-in link to"}<br />
              <span className="font-semibold text-zinc-900 dark:text-white">{email}</span>
            </p>
          </div>

          <div className="space-y-4">
            {!isSignup && (
              <>
                {/* Primary CTA — open the user's webmail directly */}
                {(() => {
                  const domain = email.split("@")[1]?.toLowerCase() || "";
                  const provider =
                    domain === "gmail.com" || domain === "googlemail.com" ? { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" } :
                    domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live.com") ? { name: "Outlook", url: "https://outlook.live.com/mail/" } :
                    domain === "yahoo.com" || domain === "ymail.com" ? { name: "Yahoo Mail", url: "https://mail.yahoo.com/" } :
                    domain === "icloud.com" || domain === "me.com" || domain === "mac.com" ? { name: "iCloud Mail", url: "https://www.icloud.com/mail" } :
                    domain === "proton.me" || domain === "protonmail.com" ? { name: "Proton Mail", url: "https://mail.proton.me/" } :
                    null;
                  return provider ? (
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-10 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" /> Open {provider.name}
                    </a>
                  ) : (
                    <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-2 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60">
                      Open your email app and tap the sign-in link.
                    </div>
                  );
                })()}

                <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-center text-xs font-medium text-zinc-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-zinc-300">
                  In your email, tap <span className="font-semibold text-zinc-900 dark:text-white">Log in now</span>. ZIVO will finish sign-in here.
                </div>

                {/* Waiting indicator — auto-redirects via the onAuthStateChange
                    listener once the user clicks the link. */}
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for you to tap the link…</span>
                </div>
              </>
            )}

            {/* Resend */}
            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Didn't get it?{" "}
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0 || resending}
                className="font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : isSignup ? "Resend code" : "Resend link"}
              </button>
            </div>

            {/* OR divider */}
            {!isSignup && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>
            )}

            {/* Secondary: collapsible code entry (for emails that include
                a 6-digit token). Hidden by default to keep the page clean. */}
            {!showCodeEntry ? (
              <button
                type="button"
                onClick={() => { setShowCodeEntry(true); setTimeout(() => inputRefs.current[0]?.focus(), 50); }}
                className="w-full h-11 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99] transition"
              >
                I have a 6-digit code
              </button>
            ) : (
              <>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  Enter the 6-digit code from your email
                </p>
                <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      aria-label={`Verification code digit ${idx + 1}`}
                      title={`Verification code digit ${idx + 1}`}
                      autoComplete={idx === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      disabled={submitting}
                      className="h-12 min-w-0 w-full text-center text-xl font-bold rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-border dark:focus:border-border outline-none text-zinc-900 dark:text-white transition"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => submit(code.join(""))}
                  disabled={submitting || code.some((c) => !c)}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "signup" ? "Confirm email" : "Verify")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer card */}
        <div className="mt-3 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-4 text-center shadow-sm">
          <Link to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="flex items-center justify-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
