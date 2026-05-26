/**
 * ZIVO ID — Signup page (rebuilt clean v2026)
 * - Plain native <input> elements so iPhone Safari typing works.
 * - Emerald glassmorphic branding.
 * - Email + password + name. Email confirmation required.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { LegalPreviewLink } from "@/components/legal/LegalPreviewSheet";
import { analyzePassword, checkPasswordBreach } from "@/lib/security/passwordStrength";

const Signup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const { signUp, user, isLoading: authLoading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Date of birth — split into M/D/Y so a single bad keystroke never invalidates
  // the whole field, and so we can use native <select> on mobile (no calendar
  // popover quirks). Combined into ISO YYYY-MM-DD on submit and validated 18+.
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  // Honeypot — invisible to humans, irresistible to naive form-filling bots.
  // If it has a value at submit time, the request is from a bot. Silent reject.
  const [companyWebsite, setCompanyWebsite] = useState("");

  // Compute age from selected DOB. Returns null when DOB is incomplete/invalid.
  const computedAge = (() => {
    if (!dobMonth || !dobDay || !dobYear) return null;
    const y = Number(dobYear), mo = Number(dobMonth), d = Number(dobDay);
    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dob = new Date(Date.UTC(y, mo - 1, d));
    if (Number.isNaN(dob.getTime())) return null;
    // Reject impossible day-of-month (e.g. Feb 30) by round-tripping
    if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== mo - 1 || dob.getUTCDate() !== d) return null;
    const now = new Date();
    let age = now.getUTCFullYear() - y;
    const beforeBirthday = now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d);
    if (beforeBirthday) age -= 1;
    return age;
  })();
  const isUnderage = computedAge !== null && computedAge < 18;
  const dobIsoString = dobMonth && dobDay && dobYear
    ? `${dobYear.padStart(4, "0")}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
    : "";

  useEffect(() => {
    if (!authLoading && user) navigate(redirect, { replace: true });
  }, [authLoading, user, navigate, redirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Honeypot trip → silently abort with a benign-looking success path so the
    // bot can't tell its trip was detected. No real account gets created.
    if (companyWebsite.trim() !== "") {
      toast.success("Account created! Check your email for a 6-digit code.");
      navigate("/login");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    // 18+ gate (also enforced server-side in the public-signup edge function).
    if (!dobIsoString) {
      toast.error("Please enter your date of birth.");
      return;
    }
    if (computedAge === null) {
      toast.error("Please enter a valid date of birth.");
      return;
    }
    if (computedAge < 18) {
      toast.error("You must be 18 or older to create a ZIVO account.");
      return;
    }
    if (computedAge > 120) {
      toast.error("Please enter a valid date of birth.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!agree) {
      toast.error("Please accept the Terms and Privacy Policy.");
      return;
    }

    // Strength gate: refuse weak passwords up-front (local rules, no network).
    const analysis = analyzePassword(password);
    if (analysis.strength === "weak") {
      toast.error(`Password too weak. ${analysis.feedback[0] ?? "Try a longer, more varied password."}`);
      return;
    }

    setSubmitting(true);

    // Breach gate: HIBP k-anonymity. Fails open on network error so signup
    // isn't held hostage by a third-party outage.
    const breach = await checkPasswordBreach(password);
    if (breach.breached) {
      setSubmitting(false);
      toast.error(
        `This password appears in ${breach.count.toLocaleString()} known data breaches. Please choose a different one.`,
      );
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await signUp(email.trim(), password, fullName, dobIsoString);
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not create account. Please try again.");
      return;
    }

    toast.success("Account created! Check your email for a 6-digit code.");
    navigate(`/verify-otp?mode=signup&email=${encodeURIComponent(email.trim())}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`);
    return;
  };

  // Post-signup confirmation screen (legacy, unused now)
  if (sentTo) {
    return (
      <div className="min-h-[100dvh] w-full bg-white dark:bg-black flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-8 py-10 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ig-gradient shadow-lg shadow-rose-500/20 mb-4">
              <MailCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Check your email</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              We sent a confirmation link to <span className="font-semibold text-zinc-900 dark:text-white">{sentTo}</span>.
              Click the link to activate your account, then come back to sign in.
            </p>
            <Link
              to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="block mt-6 w-full h-11 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 transition flex items-center justify-center shadow-md shadow-rose-500/20"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <SEOHead title="Create your ZIVO account" description="Sign up for ZIVO to search flights, hotels and more." />

      {/* Subtle gradient backdrop matching Login page */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Main card */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-8 pt-9 pb-6 shadow-sm">
          {/* Brand wordmark */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <span className="brand-script-mark text-white font-black text-2xl tracking-tight italic">Z</span>
            </div>
            <h1 className="brand-script-wordmark text-3xl font-light tracking-wider text-zinc-900 dark:text-white">
              Zivo
            </h1>
            <p className="text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-3 leading-snug">
              Sign up to see photos and videos<br />from your friends.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-2">
            {/* Honeypot */}
            <div aria-hidden="true" className="honeypot-hidden">
              <label htmlFor="company-website">Company website (leave blank)</label>
              <input
                id="company-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
              />
            </div>

            <input
              id="su-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={submitting}
              className="w-full h-11 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                id="su-first"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                disabled={submitting}
                className="w-full h-11 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
              />
              <input
                id="su-last"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                disabled={submitting}
                className="w-full h-11 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
              />
            </div>

            <div className="relative">
              <input
                id="su-pw"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={submitting}
                className="w-full h-11 px-3 pr-12 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
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

            {/* Date of birth — 18+ gate. Three native selects so it works on
                every mobile keyboard with no calendar quirks. */}
            <div className="pt-2 space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Date of birth — you must be 18+
              </label>
              <div className="grid grid-cols-[1.4fr_1fr_1.1fr] gap-2">
                <select
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  disabled={submitting}
                  aria-label="Month"
                  className={`h-11 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border ${isUnderage ? "border-rose-400 dark:border-rose-500" : "border-zinc-200 dark:border-zinc-700"} focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white transition`}
                >
                  <option value="">Month</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value)}
                  disabled={submitting}
                  aria-label="Day"
                  className={`h-11 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border ${isUnderage ? "border-rose-400 dark:border-rose-500" : "border-zinc-200 dark:border-zinc-700"} focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white transition`}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
                <select
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  disabled={submitting}
                  aria-label="Year"
                  className={`h-11 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border ${isUnderage ? "border-rose-400 dark:border-rose-500" : "border-zinc-200 dark:border-zinc-700"} focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white transition`}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              {isUnderage && (
                <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
                  You must be at least 18 years old to use ZIVO.
                </p>
              )}
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug pt-2">
              By signing up, you agree to our{" "}
              <LegalPreviewLink kind="terms" className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center -my-2 px-1 font-medium text-zinc-700 dark:text-zinc-200 hover:underline">Terms</LegalPreviewLink>
              {", "}
              <LegalPreviewLink kind="privacy" className="inline-flex min-h-[40px] items-center -my-2 px-1 font-medium text-zinc-700 dark:text-zinc-200 hover:underline">Privacy Policy</LegalPreviewLink>
              {" and Cookies Policy. ZIVO is for users aged 18 and over."}
            </p>

            <label className="relative flex min-h-[44px] items-start gap-2 select-none cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="absolute left-0 top-0 h-10 w-10 cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                  agree
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                {agree && <Check className="h-4 w-4" />}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                I confirm I'm 18 or older and agree to the terms above.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agree || isUnderage}
              className="w-full h-11 mt-2 rounded-lg text-sm font-bold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md shadow-rose-500/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
            </button>
          </form>
        </div>

        {/* Footer card */}
        <div className="mt-3 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-5 text-center shadow-sm">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Have an account?{" "}
            <Link
              to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="inline-flex min-h-[40px] items-center font-semibold text-rose-500 hover:text-rose-600"
            >
              Log in
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-6">
          Want to drive?{" "}
          <a
            href="https://apps.apple.com/us/app/zivodrivers/id6759507131"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center font-semibold text-rose-500 hover:text-rose-600"
          >
            Apply as a Driver
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
