/**
 * ZIVO ID — Login page
 * - Drive-style saved accounts: tap an avatar, restore session or ask password
 * - Full email+password form for new/other accounts
 * - Remember me saves avatar/name to localStorage for quick re-login
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff, UserPlus, X, ChevronLeft, AlertTriangle, MoreHorizontal, ExternalLink, ShieldCheck, Wrench, CalendarCheck, BadgeCheck, CheckCircle2 } from "lucide-react";
import { supabase, setRememberMePreference } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import {
  ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
  isAutoRepairSoftwareHost,
  isZivoSoftwareRedirectTarget,
} from "@/config/autoRepairDomain";
import { ZIVO_CHAT_HOME_PATH, isZivoChatHost } from "@/config/zivoChatDomain";
import { useSavedAccounts, saveAccount, type SavedAccount } from "@/hooks/useSavedAccounts";
import { getSafeRedirectTarget, isExternalRedirectTarget, withProductContext } from "@/lib/authRedirect";
import {
  buildSoftwareMediaConnectHref,
  createSoftwareMediaConnectState,
  rememberSoftwareMediaConnect,
} from "@/lib/softwareMediaConnect";
import serviceCars from "@/assets/service-cars.jpg";
import serviceShopping from "@/assets/service-shopping.png";

function ZivoSoftwareAuthLogo() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-2 flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[#101412] shadow-[0_16px_34px_rgba(17,20,18,0.18)]">
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-md bg-[#48e7af] shadow-[0_10px_20px_rgba(72,231,175,0.38)]" />
        <span className="absolute bottom-2 left-2 h-2 w-2 rounded-sm bg-[#35a8ff]/85" />
        <svg viewBox="0 0 44 44" aria-hidden="true" className="relative h-7 w-7">
          <defs>
            <linearGradient id="zivoAuthMark" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.5" stopColor="#48e7af" />
              <stop offset="1" stopColor="#35a8ff" />
            </linearGradient>
          </defs>
          <path d="M10 8h26v7.2H22.4L36 15.3 16.1 36H8l20-20.8H10V8Z" fill="url(#zivoAuthMark)" />
          <path d="M13.2 28.8h20.9V36H6.8l6.4-7.2Z" fill="#f8fffc" />
        </svg>
      </div>
      <h1 className="text-center text-xl font-black tracking-[0.22em] text-[#101412]">ZIVO</h1>
      <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.22em] text-[#138f68]">Software</p>
    </div>
  );
}

function ZivoSoftwareMiniScene({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="relative mx-auto my-3 h-[5.8rem] w-full max-w-[18rem] [perspective:900px]" aria-hidden="true">
      <div className="absolute inset-x-8 bottom-0 h-8 rounded-full bg-[#101412]/15 blur-2xl" />
      <img src={serviceCars} alt="" className="absolute right-5 top-5 h-12 w-20 rounded-xl object-cover shadow-[0_16px_30px_rgba(17,20,18,0.22)] [transform:rotateX(42deg)_rotateZ(10deg)]" />
      <img src={serviceShopping} alt="" className="absolute left-5 bottom-1 h-10 w-16 rounded-xl object-cover shadow-[0_16px_28px_rgba(17,20,18,0.16)] [transform:rotateX(42deg)_rotateZ(-12deg)]" />
      <div className="absolute left-12 top-2 h-16 w-28 rounded-2xl bg-[#101412] p-3 text-white shadow-[0_22px_48px_rgba(17,20,18,0.3)] [transform:rotateX(58deg)_rotateZ(-16deg)]">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/50">Board</span>
          <BadgeCheck className="h-3.5 w-3.5 text-[#48e7af]" />
        </div>
        <div className="mt-3 text-xl font-black">{mode === "login" ? "$18.4k" : "1"}</div>
        <div className="text-[9px] font-semibold text-white/55">{mode === "login" ? "weekly revenue" : "business page"}</div>
      </div>
      <div className="absolute right-10 top-0 h-14 w-20 rounded-2xl bg-[#48e7af] p-2 text-[#102018] shadow-[0_18px_34px_rgba(25,183,127,0.32)] [transform:rotateX(54deg)_rotateZ(13deg)]">
        <CalendarCheck className="h-3.5 w-3.5" />
        <div className="mt-2 text-lg font-black">{mode === "login" ? "42" : "1"}</div>
        <div className="text-[8px] font-bold">{mode === "login" ? "bookings" : "setup"}</div>
      </div>
      <div className="absolute bottom-1 left-[45%] h-14 w-24 rounded-2xl border border-black/5 bg-white p-2 text-[#101412] shadow-[0_20px_42px_rgba(17,20,18,0.18)] [transform:rotateX(55deg)_rotateZ(4deg)]">
        <Wrench className="h-3.5 w-3.5" />
        <div className="mt-2 text-[10px] font-black">{mode === "login" ? "Work orders" : "Setup"}</div>
        <div className="text-[8px] font-bold text-[#64706a]">ready</div>
      </div>
    </div>
  );
}

function ZivoSoftwareAuthGraphic({ mode }: { mode: "login" | "signup" }) {
  return (
    <section className="relative hidden min-h-[520px] overflow-hidden rounded-[1.25rem] bg-[#101412] p-7 text-white shadow-[0_30px_74px_rgba(17,20,18,0.2)] lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(72,231,175,0.28),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(53,168,255,0.22),transparent_32%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#48e7af]" />
            Secure business access
          </div>
          <h2 className="mt-7 max-w-md text-3xl font-black leading-[0.98] tracking-normal">
            {mode === "login" ? "Open the workspace that runs the day." : "Create the workspace your team comes back to."}
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/62">
            ZIVO Software keeps bookings, work orders, payments, customers, and reports connected for local operators.
          </p>
        </div>

        <div className="relative min-h-[260px] [perspective:1100px]">
          <div className="absolute left-4 top-4 w-[78%] rounded-[1.25rem] border border-white/14 bg-white/10 p-4 shadow-[0_30px_70px_rgba(0,0,0,0.24)] backdrop-blur [transform:rotateX(54deg)_rotateZ(-18deg)]">
            <div className="rounded-xl bg-white p-4 text-[#101412]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#64706a]">Dashboard</span>
                <BadgeCheck className="h-5 w-5 text-[#19b77f]" />
              </div>
              <div className="mt-7 text-4xl font-black">$18.4k</div>
              <div className="mt-1 text-sm font-semibold text-[#64706a]">weekly revenue</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#48e7af] p-4 text-[#102018]">
                <CalendarCheck className="h-5 w-5" />
                <div className="mt-7 text-2xl font-black">42</div>
                <div className="text-xs font-bold">bookings</div>
              </div>
              <div className="rounded-xl bg-white/90 p-4 text-[#101412]">
                <Wrench className="h-5 w-5" />
                <div className="mt-7 text-2xl font-black">16</div>
                <div className="text-xs font-bold text-[#64706a]">open jobs</div>
              </div>
            </div>
          </div>
          <img src={serviceCars} alt="Auto repair dashboard preview" className="absolute bottom-5 right-0 h-32 w-48 rounded-xl object-cover shadow-[0_24px_58px_rgba(0,0,0,0.3)] [transform:rotate(7deg)]" />
          <img src={serviceShopping} alt="Business software checkout preview" className="absolute bottom-0 left-0 h-24 w-36 rounded-xl object-cover shadow-[0_24px_58px_rgba(0,0,0,0.24)] [transform:rotate(-8deg)]" />
        </div>
      </div>
    </section>
  );
}

function ZivoSoftwareLegalLinks({
  connectHref,
  mediaConnected = false,
  onConnectClick,
}: {
  connectHref?: string;
  mediaConnected?: boolean;
  onConnectClick?: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {mediaConnected && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#48e7af]/45 bg-[#48e7af]/12 px-4 py-3 text-left text-xs font-semibold text-[#101412]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#138f68]" />
          <span>ZIVO Media is connected. Sign in here to open your ZIVO Software workspace.</span>
        </div>
      )}
      {connectHref && (
        <a
          href={connectHref}
          onClick={onConnectClick}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#101412]/15 bg-white/90 text-sm font-black text-[#101412] shadow-sm transition hover:border-[#138f68] hover:text-[#138f68]"
        >
          <ExternalLink className="h-4 w-4" />
          {mediaConnected ? "Continue with ZIVO Media" : "Connect with ZIVO Media"}
        </a>
      )}
      <p className="text-center text-xs font-medium text-[#66736d]">
        By continuing, you agree to the{" "}
        <Link to="/legal/terms" className="font-black text-[#101412] underline-offset-4 hover:underline">ZIVO Software Terms</Link>
        {" "}and{" "}
        <Link to="/legal/privacy" className="font-black text-[#101412] underline-offset-4 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}

// ── Saved account avatar card ────────────────────────────────────────────────
// In `editing` mode the X delete button is shown on each avatar. In normal
// mode the avatar is a clean tap-to-switch target with no UI chrome — that's
// the Facebook/Instagram pattern (clean by default, edit on demand via "...").
function AccountCard({
  account,
  onSelect,
  onRemove,
  editing = false,
  softwareStyle = false,
}: {
  account: SavedAccount;
  onSelect: (account: SavedAccount) => void;
  onRemove: (email: string) => void;
  editing?: boolean;
  softwareStyle?: boolean;
}) {
  const initials = account.fullName
    ? account.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : account.email[0].toUpperCase();

  const handleClick = () => {
    if (editing) return; // In edit mode, only the X is interactive
    onSelect(account);
  };

  return (
    <div
      className="relative"
    >
      {/* Remove button — only shown in edit mode, after the user taps "..." */}
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const name = account.fullName || account.email;
            toast(`Remove ${name}?`, {
              description: "You'll need to enter your email next time.",
              action: { label: "Remove", onClick: () => onRemove(account.email) },
              cancel: { label: "Cancel", onClick: () => {} },
            });
          }}
          className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center transition active:scale-90 shadow-md ring-2 ring-white dark:ring-zinc-900"
          aria-label={`Remove ${account.fullName || account.email}`}
          title="Remove this account"
        >
          <X className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      )}

      <button
        type="button"
        onClick={handleClick}
        tabIndex={editing ? -1 : 0}
        aria-disabled={editing}
        aria-label={`Continue as ${account.fullName || account.email}`}
        className={`group flex flex-col items-center gap-2 ${editing ? "cursor-default" : "cursor-pointer"}`}
      >
        {/* Avatar — Instagram-style circular ring with brand gradient. The
            gentle wiggle in edit mode hints "tap the X to remove" without
            requiring any extra label. */}
        <div className={`w-16 h-16 rounded-full p-[2px] shadow-md transition ${
          softwareStyle ? "bg-gradient-to-br from-[#48e7af] via-[#101412] to-[#35a8ff]" : "bg-ig-gradient"
        } ${editing ? "animate-pulse opacity-90" : "group-hover:scale-105 group-active:scale-95"}`}>
          <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.fullName || account.email}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={`font-bold text-lg ${
                softwareStyle ? "text-[#101412]" : "bg-ig-gradient bg-clip-text text-transparent"
              }`}>{initials}</span>
            )}
          </div>
        </div>

        <span className={`text-xs font-medium text-center max-w-[72px] truncate ${
          softwareStyle ? "text-[#3f4742]" : "text-zinc-700 dark:text-zinc-300"
        }`}>
          {account.fullName || account.email.split("@")[0]}
        </span>
      </button>
    </div>
  );
}

type LoginAuthError = Error & {
  code?: string;
  status?: number;
  name?: string;
  _emailExists?: boolean;
};

const getLoginErrorFacts = (error: Error) => {
  const authError = error as LoginAuthError;
  const message = authError.message || "";
  const msg = message.toLowerCase();
  const code = (authError.code || "").toLowerCase();

  return {
    emailExists: typeof authError._emailExists === "boolean" ? authError._emailExists : null,
    isBadCredentials:
      code === "invalid_credentials" ||
      msg.includes("invalid login") ||
      msg.includes("invalid credentials") ||
      msg.includes("invalid login credentials") ||
      msg.includes("user not found"),
    isEmailNotConfirmed: code === "email_not_confirmed" || msg.includes("email not confirmed"),
    isRateLimited:
      authError.status === 429 ||
      code.includes("rate_limit") ||
      code.includes("too_many") ||
      msg.includes("too many") ||
      msg.includes("rate limit"),
    isNetwork:
      authError.name === "AuthRetryableFetchError" ||
      msg.includes("failed to fetch") ||
      msg.includes("load failed") ||
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("transport failure"),
    message,
  };
};

// ── Main login page ──────────────────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mediaConnected = params.get("connected") === "zivosmedia";
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isZivoSoftwareHost = isAutoRepairSoftwareHost(currentHostname);
  const isZivoChatDomain = isZivoChatHost(currentHostname);
  const rawRedirect = params.get("redirect");
  const handoffSource = params.get("source");
  const handoffProduct = params.get("product");
  const handoffIntent = params.get("intent");
  const isConnectedHandoff = handoffSource === "zivosmedia" || handoffSource === "zivo-admin";
  const redirect = withProductContext(
    getSafeRedirectTarget(
      rawRedirect ||
        (isZivoSoftwareHost || mediaConnected
          ? ZIVO_SOFTWARE_AUTH_REDIRECT_PATH
          : isZivoChatDomain
            ? ZIVO_CHAT_HOME_PATH
            : undefined),
    ),
    params.get("product"),
    params.get("intent"),
    params.get("handoff_id") || params.get("handoff"),
  );
  const isZivoSoftwareDomain =
    isZivoSoftwareHost ||
    isZivoSoftwareRedirectTarget(redirect);
  const zivoMediaConnectState = useMemo(() => createSoftwareMediaConnectState(), []);
  const zivoMediaConnectHref = useMemo(() => {
    return buildSoftwareMediaConnectHref({ redirect, state: zivoMediaConnectState });
  }, [redirect, zivoMediaConnectState]);
  const handleZivoMediaConnectClick = useCallback(() => {
    rememberSoftwareMediaConnect(zivoMediaConnectState, redirect);
  }, [redirect, zivoMediaConnectState]);
  const finishAuthRedirect = useCallback((target: string) => {
    if (isExternalRedirectTarget(target)) {
      window.location.assign(target);
      return;
    }
    navigate(target, { replace: true });
  }, [navigate]);
  const { signIn, user, isLoading: authLoading } = useAuth();
  const { accounts, remove, refresh } = useSavedAccounts();

  // "picker" = show saved accounts, "password" = selected an account (email locked),
  // "full" = show email+password form for a new account
  type Mode = "picker" | "password" | "full";
  const [mode, setMode] = useState<Mode>(() => (accounts.length > 0 ? "picker" : "full"));
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [quickSignInLabel, setQuickSignInLabel] = useState("Signing in...");
  // Edit mode — toggled by the "..." button in picker, surfaces the X delete
  // buttons on each avatar. Default off so the picker feels clean (FB/IG).
  const [editingAccounts, setEditingAccounts] = useState(false);
  const activeEmail = (mode === "password" ? selectedAccount?.email ?? "" : email).trim().toLowerCase();
  const forgotPasswordHref = useMemo(() => {
    const forgotParams = new URLSearchParams();
    if (activeEmail) forgotParams.set("email", activeEmail);
    if (redirect) forgotParams.set("redirect", redirect);
    const query = forgotParams.toString();
    return `/forgot-password${query ? `?${query}` : ""}`;
  }, [activeEmail, redirect]);
  const canSubmit =
    !submitting &&
    password.length > 0 &&
    (mode === "password" ? !!selectedAccount : email.trim().length > 0);

  const passwordKeyHandlers = {
    onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) =>
      setCapsLockOn(e.getModifierState("CapsLock")),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
      setCapsLockOn(e.getModifierState("CapsLock")),
    onBlur: () => setCapsLockOn(false),
  };

  const capsLockNotice = capsLockOn ? (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-amber-400 mt-1">
      <AlertTriangle className="w-3.5 h-3.5" />
      Caps Lock is on
    </p>
  ) : null;

  useEffect(() => {
    if (!authLoading && user) finishAuthRedirect(redirect);
  }, [authLoading, user, finishAuthRedirect, redirect]);

  useEffect(() => {
    if (isZivoSoftwareDomain && params.get("connected") === "zivosmedia") {
      toast.success("ZIVO Media connection checked. Sign in to ZIVO Software to continue.");
    }
  }, [isZivoSoftwareDomain, params]);

  // When accounts change (e.g. all removed), fall back to full form and exit
  // edit mode so users don't get stuck staring at "Tap × to remove" with no
  // accounts left.
  useEffect(() => {
    if (accounts.length === 0) {
      setEditingAccounts(false);
      if (mode === "picker") setMode("full");
    }
  }, [accounts.length, mode]);

  const handleSelectAccount = async (account: SavedAccount) => {
    if (submitting) return;
    // Tap-to-sign-in flow:
    //   1) If the live session already matches this account, continue.
    //   2) Otherwise restore via stored refresh_token.
    //   3) If the trusted token is absent/expired, ask for password.
    //
    // Do not auto-send an email link from an account tap. Saved accounts should
    // feel like a trusted-device picker; email link stays an explicit fallback.
    setSelectedAccount(account);
    setEmail(account.email);
    setPassword("");
    setShowPassword(false);
    setMode("picker");
    setSubmitting(true);
    setQuickSignInLabel("Checking saved login...");

    // ── Step 1: reuse a still-live session ────────────────────────────────
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user?.email?.toLowerCase() === account.email.toLowerCase()) {
        saveAccount({
          ...account,
          lastLoginAt: new Date().toISOString(),
          refreshToken: session.refresh_token ?? account.refreshToken,
          accessToken: session.access_token ?? account.accessToken,
          expiresAt: session.expires_at ?? account.expiresAt ?? null,
        });
        refresh();
        setSubmitting(false);
        toast.success(`Welcome back, ${account.fullName?.split(" ")[0] || ""}!`);
        finishAuthRedirect(redirect);
        return;
      }
    } catch {
      // Continue to the trusted-token check.
    }

    // ── Step 2: try one-tap session restore ──────────────────────────────
    // We use refreshSession() (not setSession()) because the stored access
    // token expires after 1 hour while the refresh token lives much longer
    // (~30 days). setSession({access_token, refresh_token}) installs the
    // expired access token locally and then any subsequent auth call returns
    // "Auth session missing!" — defeating the one-tap UX.
    //
    // refreshSession({refresh_token}) calls Supabase's token exchange
    // endpoint: server validates the refresh_token, returns a fresh pair, and
    // installs the live session client-side. This is exactly the FB / IG
    // "trusted device" flow.
    if (account.refreshToken) {
      try {
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: account.refreshToken,
        });
        if (!error && data?.session) {
          saveAccount({
            ...account,
            lastLoginAt: new Date().toISOString(),
            refreshToken: data.session.refresh_token ?? account.refreshToken,
            accessToken: data.session.access_token ?? account.accessToken,
            expiresAt: data.session.expires_at ?? null,
          });
          refresh();
          setSubmitting(false);
          toast.success(`Welcome back, ${account.fullName?.split(" ")[0] || ""}!`);
          finishAuthRedirect(redirect);
          return;
        }
      } catch {
        // Fall through to password mode.
      }
    }

    // ── Step 3: password fallback ─────────────────────────────────────────
    // If the saved token is missing or expired, the user can still continue
    // with the password manager. The email sign-in link remains available from
    // the password screen, but only when the user asks for it.
    setSubmitting(false);
    setQuickSignInLabel("Signing in...");
    setMode("password");
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setEmail("");
    setPassword("");
    setQuickSignInLabel("Signing in...");
    setMode("full");
  };

  const handleBack = () => {
    setPassword("");
    setQuickSignInLabel("Signing in...");
    setMode(accounts.length > 0 ? "picker" : "full");
  };

  // Webmail provider detection — used to label the secondary email-code option.
  const detectMailProvider = (addr: string): { name: string; url: string } | null => {
    const domain = addr.split("@")[1]?.toLowerCase() || "";
    if (!domain) return null;
    if (domain === "gmail.com" || domain === "googlemail.com") return { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" };
    if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live.com")) return { name: "Outlook", url: "https://outlook.live.com/mail/" };
    if (domain === "yahoo.com" || domain === "ymail.com") return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
    if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return { name: "iCloud Mail", url: "https://www.icloud.com/mail" };
    if (domain === "proton.me" || domain === "protonmail.com") return { name: "Proton Mail", url: "https://mail.proton.me/" };
    return null;
  };

  const getEmailRedirectTo = () => {
    const redirectParams = new URLSearchParams();
    redirectParams.set("redirect", redirect);
    return `${window.location.origin}/auth-callback?${redirectParams.toString()}`;
  };

  const getVerifyOtpPath = (targetEmail: string) =>
    `/verify-otp?email=${encodeURIComponent(targetEmail)}&mode=login&entry=link${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;

  // Google / Apple SSO. signInWithOAuth redirects to the provider; on return,
  // /auth-callback exchanges the code and AuthContext restores the session.
  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getEmailRedirectTo(),
        queryParams: { prompt: "select_account" },
      },
    });
    // Only reached on error; on success the browser navigates to the provider.
    if (error) {
      setSubmitting(false);
      toast.error(error.message || "Could not start sign-in. Please try again.");
    }
  };

  const requestSignInCode = async (targetEmail: string): Promise<
    { ok: true; email: string } | { ok: false; message: string }
  > => {
    const trimmed = targetEmail.trim().toLowerCase();
    if (!trimmed) {
      return { ok: false, message: "Please enter your email first." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: getEmailRedirectTo() },
    });
    if (error) {
      return { ok: false, message: error.message || "Could not send sign-in link. Try again." };
    }
    return { ok: true, email: trimmed };
  };

  // Passwordless sign-in — sends the Supabase magic-link email
  // and routes to /verify-otp. Used as a fallback when the user can't remember
  // their password and doesn't want a full reset cycle.
  const sendEmailCode = async (targetEmail: string) => {
    if (submitting) return false;
    setSubmitting(true);
    const result = await requestSignInCode(targetEmail);
    setSubmitting(false);
    if (result.ok === false) {
      toast.error(result.message);
      return false;
    }
    toast.success("We sent a secure sign-in link to your email.");
    navigate(getVerifyOtpPath(result.email));
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmedEmail = (mode === "password" ? selectedAccount!.email : email).trim();
    if (!trimmedEmail || !password) {
      setFieldError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);

    setRememberMePreference(true);
    const { error } = await signIn(trimmedEmail, password);

    if (error) {
      setSubmitting(false);
      if (error.message === "DRIVER_ACCOUNT") {
        toast.error("This is a ZIVO Driver account. Please use the ZIVO Driver app to sign in.", {
          duration: 6000,
          description: "Driver accounts cannot access the passenger app.",
          action: {
            label: "Driver App",
            onClick: () => window.open("https://apps.apple.com/us/app/zivodrivers/id6759507131", "_blank", "noopener"),
          },
        });
        return;
      }
      const facts = getLoginErrorFacts(error);

      if (facts.emailExists === false) {
        setFieldError("No account found for this email.");
      } else if (facts.isEmailNotConfirmed) {
        setFieldError("Please verify your email before logging in. Check your inbox.");
      } else if (facts.isBadCredentials) {
        setFieldError(facts.emailExists === true ? "Wrong password — please try again." : "Email or password is incorrect.");
      } else if (facts.isRateLimited) {
        setFieldError("Too many attempts. Please wait a moment and try again.");
      } else if (facts.isNetwork) {
        setFieldError("Connection issue — check your internet and try again.");
      } else {
        setFieldError(facts.message || "Sign in failed. Please try again.");
      }
      return;
    }

    // Save account + session tokens for one-tap login next time.
    // We capture the live session so the next visit can call setSession()
    // and resume without a password — that's the FB/IG "tap to log in" feel.
    try {
      const [{ data: profile }, { data: sessionData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("email", trimmedEmail)
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);

      saveAccount({
        email: trimmedEmail,
        fullName: profile?.full_name || trimmedEmail.split("@")[0],
        avatarUrl: profile?.avatar_url ?? null,
        lastLoginAt: new Date().toISOString(),
        role: profile?.role ?? null,
        refreshToken: sessionData?.session?.refresh_token ?? null,
        accessToken: sessionData?.session?.access_token ?? null,
        expiresAt: sessionData?.session?.expires_at ?? null,
      });
      refresh();
    } catch {}

    setSubmitting(false);
    toast.success("Welcome back!");
    finishAuthRedirect(redirect);
  };

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-4 py-3 ${
      isZivoSoftwareDomain ? "bg-[#f4f8f6] text-[#101412]" : "bg-white dark:bg-black"
    }`}>
      <SEOHead
        title={isZivoSoftwareDomain ? "Sign in to ZIVO Software" : isZivoChatDomain ? "Sign in to ZIVO Chat" : "Sign in to ZIVO"}
        description={isZivoSoftwareDomain ? "Sign in to your ZIVO Software business workspace." : isZivoChatDomain ? "Sign in with your ZIVO Media account for chat." : "Sign in to your ZIVO account"}
      />

      {isZivoSoftwareDomain ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(72,231,175,0.22),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(53,168,255,0.2),transparent_30%),linear-gradient(180deg,#f4f8f6_0%,#ffffff_100%)]" />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
          <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
        </div>
      )}

      <div className={`relative grid w-full items-center gap-6 ${
        isZivoSoftwareDomain ? "max-w-[23.5rem] lg:max-w-5xl lg:grid-cols-[1.05fr_0.82fr]" : "max-w-sm"
      }`}>
        {isZivoSoftwareDomain && <ZivoSoftwareAuthGraphic mode="login" />}
        <div className="mx-auto flex w-full max-w-[23.5rem] flex-col items-stretch">
        {/* IG-style stack: card → "OR" → footer card */}

        {/* Main card */}
        <div className={`relative ${
          isZivoSoftwareDomain
            ? "overflow-hidden rounded-[1.15rem] border border-black/10 bg-white/92 px-4 pt-4 pb-4 shadow-[0_18px_50px_rgba(17,20,18,0.1)] backdrop-blur sm:px-5"
            : "bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-8 pt-10 pb-6 shadow-sm"
        }`}>
          {isZivoSoftwareDomain && (
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(72,231,175,0.08),transparent_38%),radial-gradient(circle_at_88%_12%,rgba(53,168,255,0.1),transparent_28%)]" />
          )}
          {/* "..." More menu in picker mode — toggles edit mode for removing
              saved accounts. Hidden when there are no saved accounts. */}
          {mode === "picker" && accounts.length > 0 && (
            <button
              type="button"
              onClick={() => setEditingAccounts((v) => !v)}
              aria-label={editingAccounts ? "Done editing" : "More options"}
              title={editingAccounts ? "Done" : "Edit saved accounts"}
              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {editingAccounts ? (
                <span className={`text-xs font-semibold ${isZivoSoftwareDomain ? "text-[#138f68]" : "text-rose-500"}`}>Done</span>
              ) : (
                <MoreHorizontal className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Brand wordmark — IG-style script logo */}
          <div className={`relative flex flex-col items-center ${isZivoSoftwareDomain ? "mb-3" : "mb-8"}`}>
            {isZivoSoftwareDomain ? (
              <ZivoSoftwareAuthLogo />
            ) : (
              <>
                <div className="relative w-16 h-16 rounded-2xl bg-ig-gradient flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20">
                  <span className="brand-script-mark text-white font-black text-3xl tracking-tight italic">Z</span>
                </div>
                <h1 className="text-center text-3xl font-black tracking-[0.12em] text-zinc-900 dark:text-white">
                  {isZivoChatDomain ? "ZIVO Chat" : "Zivo"}
                </h1>
              </>
            )}
            {isZivoSoftwareDomain && (
              <p className="mt-2 max-w-[14rem] text-center text-xs font-semibold leading-5 text-zinc-500 dark:text-zinc-400">
                Sign in to manage your business workspace.
              </p>
            )}
            {isZivoChatDomain && (
              <p className="mt-2 max-w-[14rem] text-center text-xs font-semibold leading-5 text-zinc-500 dark:text-zinc-400">
                Use your ZIVO Media account.
              </p>
            )}
            {isZivoSoftwareDomain && <ZivoSoftwareMiniScene mode="login" />}
          </div>

          {isConnectedHandoff && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-center text-xs font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
              Connected workflow{handoffProduct ? ` · ${handoffProduct}` : ""}{handoffIntent ? ` · ${handoffIntent}` : ""}. Sign in to continue.
            </div>
          )}

          {/* ── MODE: saved account picker ── */}
          {mode === "picker" && (
            <div className="space-y-4 relative">
              {/* Inline spinner overlay shown when a tap-to-sign-in is in
                  flight (setSession or signInWithOtp). Avatars stay visible
                  but unclickable so the user gets visual feedback. */}
              {submitting && !editingAccounts && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-sm pointer-events-auto dark:bg-zinc-900/70">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className={`w-6 h-6 animate-spin ${isZivoSoftwareDomain ? "text-[#138f68]" : "text-rose-500"}`} />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{quickSignInLabel}</span>
                  </div>
                </div>
              )}
              <p className={`text-center text-sm ${
                isZivoSoftwareDomain ? "font-semibold text-[#66736d]" : "text-zinc-500 dark:text-zinc-400"
              }`}>
                {editingAccounts ? "Tap × to remove an account" : "Log in as"}
              </p>

              <div className="flex justify-center gap-5 flex-wrap">
                {accounts.slice(0, 4).map((acc) => (
                  <AccountCard
                    key={acc.email}
                    editing={editingAccounts}
                    account={acc}
                    softwareStyle={isZivoSoftwareDomain}
                    onSelect={handleSelectAccount}
                    onRemove={(email) => { remove(email); }}
                  />
                ))}

                <button
                  type="button"
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={handleAddAccount}
                >
                  <div className={`w-16 h-16 rounded-full border-2 border-dashed bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-center transition ${
                    isZivoSoftwareDomain
                      ? "border-[#101412]/20 group-hover:border-[#48e7af] group-hover:bg-[#eefdf7]"
                      : "border-zinc-300 dark:border-zinc-700 group-hover:border-rose-400 group-hover:bg-rose-50/50 dark:group-hover:border-rose-500 dark:group-hover:bg-rose-950/30"
                  }`}>
                    <UserPlus className={`w-6 h-6 transition ${
                      isZivoSoftwareDomain ? "text-[#66736d] group-hover:text-[#138f68]" : "text-zinc-400 group-hover:text-rose-500"
                    }`} />
                  </div>
                  <span className={`text-xs font-medium ${
                    isZivoSoftwareDomain ? "text-[#66736d] group-hover:text-[#138f68]" : "text-zinc-500 dark:text-zinc-400"
                  }`}>Add account</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddAccount}
                className={`w-full text-center text-sm font-semibold pt-2 ${
                  isZivoSoftwareDomain ? "text-[#138f68] hover:text-[#0f7154]" : "text-rose-500 hover:text-rose-600"
                }`}
              >
                Log into another account
              </button>

            </div>
          )}

          {/* ── MODE: selected account — password only ──
              Facebook-style "trusted" feel: avatar + name + tiny email, the
              browser fills the password from saved credentials, the user just
              taps "Log in". Hidden username field hints autofill which account
              to fill for. */}
          {mode === "password" && selectedAccount && (
            <form onSubmit={onSubmit} className="relative space-y-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition mb-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="flex flex-col items-center gap-1 pb-1">
                <div className={`h-12 w-12 rounded-full p-[2px] shadow-md ${
                  isZivoSoftwareDomain ? "bg-gradient-to-br from-[#48e7af] via-[#101412] to-[#35a8ff]" : "bg-ig-gradient"
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center">
                    {selectedAccount.avatarUrl ? (
                      <img
                        src={selectedAccount.avatarUrl}
                        alt={selectedAccount.fullName || selectedAccount.email}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className={`font-bold text-xl ${
                        isZivoSoftwareDomain ? "text-[#101412]" : "bg-ig-gradient bg-clip-text text-transparent"
                      }`}>
                        {selectedAccount.fullName ? selectedAccount.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : selectedAccount.email[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-full">{selectedAccount.fullName || selectedAccount.email.split("@")[0]}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-full">{selectedAccount.email}</p>
              </div>

              {/* Hidden email — tells the browser's password manager which
                  account this password belongs to, so autofill picks the right
                  saved credential without asking. */}
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={selectedAccount.email}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="visually-hidden-auth"
              />

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  {...passwordKeyHandlers}
                  placeholder="Password"
                  disabled={submitting}
                  className="w-full h-10 px-3 pr-12 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {capsLockNotice}

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full h-10 rounded-lg text-sm font-bold text-white active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 ${
                  isZivoSoftwareDomain
                    ? "bg-[#101412] shadow-[0_14px_30px_rgba(17,20,18,0.18)] hover:bg-black"
                    : "bg-ig-gradient hover:opacity-95 shadow-md shadow-rose-500/20"
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log in"}
              </button>

              {/* OR divider — separates the two clear sign-in options */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              {/* Option 2: passwordless via email link/code */}
              {(() => {
                const provider = detectMailProvider(selectedAccount.email);
                return (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await sendEmailCode(selectedAccount.email);
                      }}
                      disabled={submitting}
                      className="w-full h-10 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99] disabled:opacity-40 transition flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {provider ? `Email me a sign-in link for ${provider.name}` : "Email me a sign-in link"}
                    </button>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between text-xs pt-1">
                <Link to={forgotPasswordHref} className="inline-flex min-h-[40px] items-center font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const name = selectedAccount.fullName || selectedAccount.email;
                    toast(`Remove ${name}?`, {
                      description: "You'll need to enter your email next time.",
                      action: {
                        label: "Remove",
                        onClick: () => {
                          remove(selectedAccount.email);
                          setSelectedAccount(null);
                          setPassword("");
                          setMode(accounts.length > 1 ? "picker" : "full");
                        },
                      },
                      cancel: { label: "Cancel", onClick: () => {} },
                    });
                  }}
                  className={`font-medium ${isZivoSoftwareDomain ? "text-[#138f68] hover:text-[#0f7154]" : "text-rose-500 hover:text-rose-600"}`}
                >
                  Remove this account
                </button>
              </div>
            </form>
          )}

          {/* ── MODE: full email + password form ── */}
          {mode === "full" && (
            <form onSubmit={onSubmit} className="space-y-2.5">
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition mb-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Saved accounts
                </button>
              )}

              <input
                id="login-email"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldError(null); }}
                placeholder="Phone number, username, or email"
                disabled={submitting}
                className="w-full h-11 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
              />

              <div className="relative">
                <input
                  id="login-password-full"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldError(null); }}
                  {...passwordKeyHandlers}
                  placeholder="Password"
                  disabled={submitting}
                  className={`w-full h-11 px-3 pr-12 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition focus:border-zinc-400 dark:focus:border-zinc-500 ${fieldError ? "border-red-400 dark:border-red-500" : "border-zinc-200 dark:border-zinc-700"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldError && (
                <p className="text-xs text-red-500 dark:text-red-400 -mt-1 px-0.5">{fieldError}</p>
              )}
              {capsLockNotice}

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full h-11 mt-2 rounded-lg text-sm font-bold text-white active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 ${
                  isZivoSoftwareDomain
                    ? "bg-[#101412] shadow-[0_14px_30px_rgba(17,20,18,0.18)] hover:bg-black"
                    : "bg-ig-gradient hover:opacity-95 shadow-md shadow-rose-500/20"
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log in"}
              </button>

              {/* OR divider — Instagram signature */}
              <div className="flex items-center gap-4 py-3">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              {/* Option 2: passwordless via email link/code */}
              {(() => {
                const provider = detectMailProvider(email);
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      await sendEmailCode(email);
                    }}
                    disabled={submitting || !email.trim()}
                    className="w-full h-11 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.99] disabled:opacity-40 transition flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {provider ? `Email me a sign-in link for ${provider.name}` : "Email me a sign-in link"}
                  </button>
                );
              })()}

              <div className="text-center pt-2">
                <Link to={forgotPasswordHref} className="inline-flex min-h-[40px] items-center px-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer card — IG-style "Don't have an account?" */}
        <div className={`mt-2 ${
          isZivoSoftwareDomain
            ? "rounded-[1rem] border border-black/10 bg-white/82 px-5 py-3 text-center shadow-sm backdrop-blur"
            : "bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-5 text-center shadow-sm"
        }`}>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Don't have an account?{" "}
            <Link
              to={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className={`inline-flex min-h-[40px] items-center font-semibold ${
                isZivoSoftwareDomain ? "text-[#138f68] hover:text-[#0f7154]" : "text-rose-500 hover:text-rose-600"
              }`}
            >
              Sign up
            </Link>
          </p>
        </div>

        {(isZivoSoftwareDomain || mediaConnected) && (
          <ZivoSoftwareLegalLinks
            connectHref={zivoMediaConnectHref}
            mediaConnected={mediaConnected}
            onConnectClick={handleZivoMediaConnectClick}
          />
        )}

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-3">
          Protected by enterprise-grade security
        </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
