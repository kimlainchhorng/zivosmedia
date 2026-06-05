/**
 * ZIVO ID — Signup page (rebuilt clean v2026)
 * - Plain native <input> elements so iPhone Safari typing works.
 * - Emerald glassmorphic branding.
 * - Email + password + name. Email confirmation required.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, Eye, EyeOff, MailCheck, ShieldCheck, Wrench, CalendarCheck, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { LegalPreviewLink } from "@/components/legal/LegalPreviewSheet";
import { analyzePassword, checkPasswordBreach } from "@/lib/security/passwordStrength";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";
import { getSafeRedirectTarget } from "@/lib/authRedirect";
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
            <linearGradient id="zivoSignupAuthMark" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.5" stopColor="#48e7af" />
              <stop offset="1" stopColor="#35a8ff" />
            </linearGradient>
          </defs>
          <path d="M10 8h26v7.2H22.4L36 15.3 16.1 36H8l20-20.8H10V8Z" fill="url(#zivoSignupAuthMark)" />
          <path d="M13.2 28.8h20.9V36H6.8l6.4-7.2Z" fill="#f8fffc" />
        </svg>
      </div>
      <h1 className="text-center text-xl font-black tracking-[0.22em] text-[#101412]">ZIVO</h1>
      <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.22em] text-[#138f68]">Software</p>
    </div>
  );
}

function ZivoSoftwareMiniScene() {
  return (
    <div className="relative mx-auto my-3 h-[5.8rem] w-full max-w-[18rem] [perspective:900px]" aria-hidden="true">
      <div className="absolute inset-x-8 bottom-0 h-8 rounded-full bg-[#101412]/15 blur-2xl" />
      <img src={serviceCars} alt="" className="absolute right-5 top-5 h-12 w-20 rounded-xl object-cover shadow-[0_16px_30px_rgba(17,20,18,0.22)] [transform:rotateX(42deg)_rotateZ(10deg)]" />
      <img src={serviceShopping} alt="" className="absolute left-5 bottom-1 h-10 w-16 rounded-xl object-cover shadow-[0_16px_28px_rgba(17,20,18,0.16)] [transform:rotateX(42deg)_rotateZ(-12deg)]" />
      <div className="absolute left-12 top-2 h-16 w-28 rounded-2xl bg-[#101412] p-3 text-white shadow-[0_22px_48px_rgba(17,20,18,0.3)] [transform:rotateX(58deg)_rotateZ(-16deg)]">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/50">Launch</span>
          <BadgeCheck className="h-3.5 w-3.5 text-[#48e7af]" />
        </div>
        <div className="mt-3 text-xl font-black">30+</div>
        <div className="text-[9px] font-semibold text-white/55">business types</div>
      </div>
      <div className="absolute right-10 top-0 h-14 w-20 rounded-2xl bg-[#48e7af] p-2 text-[#102018] shadow-[0_18px_34px_rgba(25,183,127,0.32)] [transform:rotateX(54deg)_rotateZ(13deg)]">
        <CalendarCheck className="h-3.5 w-3.5" />
        <div className="mt-2 text-lg font-black">7</div>
        <div className="text-[8px] font-bold">groups</div>
      </div>
      <div className="absolute bottom-1 left-[45%] h-14 w-24 rounded-2xl border border-black/5 bg-white p-2 text-[#101412] shadow-[0_20px_42px_rgba(17,20,18,0.18)] [transform:rotateX(55deg)_rotateZ(4deg)]">
        <Wrench className="h-3.5 w-3.5" />
        <div className="mt-2 text-[10px] font-black">Setup</div>
        <div className="text-[8px] font-bold text-[#64706a]">ready</div>
      </div>
    </div>
  );
}

function ZivoSoftwareAuthGraphic() {
  return (
    <section className="relative hidden min-h-[520px] overflow-hidden rounded-[1.25rem] bg-[#101412] p-7 text-white shadow-[0_30px_74px_rgba(17,20,18,0.2)] lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(72,231,175,0.28),transparent_30%),radial-gradient(circle_at_92%_18%,rgba(53,168,255,0.22),transparent_32%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#48e7af]" />
            Business setup ready
          </div>
          <h2 className="mt-7 max-w-md text-3xl font-black leading-[0.98] tracking-normal">
            Build the software home for your operation.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/62">
            Start with your industry, invite your team, and open a dashboard for bookings, work, payments, and reports.
          </p>
        </div>

        <div className="relative min-h-[260px] [perspective:1100px]">
          <div className="absolute left-4 top-4 w-[78%] rounded-[1.25rem] border border-white/14 bg-white/10 p-4 shadow-[0_30px_70px_rgba(0,0,0,0.24)] backdrop-blur [transform:rotateX(54deg)_rotateZ(-18deg)]">
            <div className="rounded-xl bg-white p-4 text-[#101412]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#64706a]">Launch board</span>
                <BadgeCheck className="h-5 w-5 text-[#19b77f]" />
              </div>
              <div className="mt-7 text-4xl font-black">30+</div>
              <div className="mt-1 text-sm font-semibold text-[#64706a]">business types</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#48e7af] p-4 text-[#102018]">
                <CalendarCheck className="h-5 w-5" />
                <div className="mt-7 text-2xl font-black">7</div>
                <div className="text-xs font-bold">industry groups</div>
              </div>
              <div className="rounded-xl bg-white/90 p-4 text-[#101412]">
                <Wrench className="h-5 w-5" />
                <div className="mt-7 text-2xl font-black">1</div>
                <div className="text-xs font-bold text-[#64706a]">software domain</div>
              </div>
            </div>
          </div>
          <img src={serviceCars} alt="Auto repair software preview" className="absolute bottom-5 right-0 h-32 w-48 rounded-xl object-cover shadow-[0_24px_58px_rgba(0,0,0,0.3)] [transform:rotate(7deg)]" />
          <img src={serviceShopping} alt="Retail software preview" className="absolute bottom-0 left-0 h-24 w-36 rounded-xl object-cover shadow-[0_24px_58px_rgba(0,0,0,0.24)] [transform:rotate(-8deg)]" />
        </div>
      </div>
    </section>
  );
}

function ZivoSoftwareLegalLinks() {
  return (
    <p className="mt-3 text-center text-xs font-medium text-[#66736d]">
      By creating an account, you agree to the{" "}
      <Link to="/legal/terms" className="font-black text-[#101412] underline-offset-4 hover:underline">ZIVO Software Terms</Link>
      {" "}and{" "}
      <Link to="/legal/privacy" className="font-black text-[#101412] underline-offset-4 hover:underline">Privacy Policy</Link>.
    </p>
  );
}

const Signup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = getSafeRedirectTarget(params.get("redirect"));
  const isZivoSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
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
  const isUnderage = !isZivoSoftwareDomain && computedAge !== null && computedAge < 18;
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
    // 18+ gate for the main consumer app. ZIVO Software business signup does
    // not collect date of birth.
    if (!isZivoSoftwareDomain) {
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
    const { error } = await signUp(
      email.trim(),
      password,
      fullName,
      isZivoSoftwareDomain ? undefined : dobIsoString,
      undefined,
      isZivoSoftwareDomain ? "zivo_software" : undefined,
    );
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
    <div className={`relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-4 py-3 ${
      isZivoSoftwareDomain ? "bg-[#f4f8f6] text-[#101412]" : "bg-white dark:bg-black"
    }`}>
      <SEOHead
        title={isZivoSoftwareDomain ? "Create your ZIVO Software account" : "Create your ZIVO account"}
        description={
          isZivoSoftwareDomain
            ? "Create a ZIVO Software account to launch and manage your business workspace."
            : "Sign up for ZIVO to search flights, hotels and more."
        }
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
        {isZivoSoftwareDomain && <ZivoSoftwareAuthGraphic />}
        <div className="mx-auto flex w-full max-w-[23.5rem] flex-col items-stretch">
        {/* Main card */}
        <div className={`relative ${
          isZivoSoftwareDomain
            ? "overflow-hidden rounded-[1.15rem] border border-black/10 bg-white/92 px-4 pt-4 pb-4 shadow-[0_18px_50px_rgba(17,20,18,0.1)] backdrop-blur sm:px-5"
            : "bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-8 pt-9 pb-6 shadow-sm"
        }`}>
          {isZivoSoftwareDomain && (
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(72,231,175,0.08),transparent_38%),radial-gradient(circle_at_88%_12%,rgba(53,168,255,0.1),transparent_28%)]" />
          )}
          {/* Brand wordmark */}
          <div className={`relative flex flex-col items-center ${isZivoSoftwareDomain ? "mb-3" : "mb-6"}`}>
            {isZivoSoftwareDomain ? (
              <ZivoSoftwareAuthLogo />
            ) : (
              <>
                <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
                  <span className="brand-script-mark text-white font-black text-2xl tracking-tight italic">Z</span>
                </div>
                <h1 className="text-center text-3xl font-black tracking-[0.12em] text-zinc-900 dark:text-white">Zivo</h1>
              </>
            )}
            <p className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2 leading-snug">
              {isZivoSoftwareDomain ? (
                <>Create your account to launch<br />a business workspace.</>
              ) : (
                <>Sign up to see photos and videos<br />from your friends.</>
              )}
            </p>
            {isZivoSoftwareDomain && <ZivoSoftwareMiniScene />}
          </div>

          <form onSubmit={onSubmit} className="relative space-y-2">
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
              className="w-full h-10 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
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
                className="w-full h-10 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
              />
              <input
                id="su-last"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                disabled={submitting}
                className="w-full h-10 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
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

            {!isZivoSoftwareDomain && (
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
            )}

            {isZivoSoftwareDomain ? (
              <p className="text-[11px] font-medium leading-snug pt-2 text-[#66736d]">
                By signing up, you agree to the{" "}
                <Link to="/legal/terms" className="font-black text-[#101412] underline-offset-4 hover:underline">
                  ZIVO Software Terms
                </Link>
                {" "}and{" "}
                <Link to="/legal/privacy" className="font-black text-[#101412] underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug pt-2">
                By signing up, you agree to our{" "}
                <LegalPreviewLink kind="terms" className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center -my-2 px-1 font-medium text-zinc-700 dark:text-zinc-200 hover:underline">Terms</LegalPreviewLink>
                {", "}
                <LegalPreviewLink kind="privacy" className="inline-flex min-h-[40px] items-center -my-2 px-1 font-medium text-zinc-700 dark:text-zinc-200 hover:underline">Privacy Policy</LegalPreviewLink>
                {" and Cookies Policy. ZIVO is for users aged 18 and over."}
              </p>
            )}

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
                {isZivoSoftwareDomain
                  ? "I agree to the terms above."
                  : "I confirm I'm 18 or older and agree to the terms above."}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agree || isUnderage}
              className={`w-full h-10 mt-1 rounded-lg text-sm font-bold text-white active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 ${
                isZivoSoftwareDomain
                  ? "bg-[#101412] shadow-[0_14px_30px_rgba(17,20,18,0.18)] hover:bg-black"
                  : "bg-ig-gradient hover:opacity-95 shadow-md shadow-rose-500/20"
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
            </button>
          </form>
        </div>

        {/* Footer card */}
        <div className={`mt-2 ${
          isZivoSoftwareDomain
            ? "rounded-[1rem] border border-black/10 bg-white/82 px-5 py-3 text-center shadow-sm backdrop-blur"
            : "bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-5 text-center shadow-sm"
        }`}>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Have an account?{" "}
            <Link
              to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className={`inline-flex min-h-[40px] items-center font-semibold ${
                isZivoSoftwareDomain ? "text-[#138f68] hover:text-[#0f7154]" : "text-rose-500 hover:text-rose-600"
              }`}
            >
              Log in
            </Link>
          </p>
        </div>

        {!isZivoSoftwareDomain && (
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
        )}
        {isZivoSoftwareDomain && <ZivoSoftwareLegalLinks />}
        </div>
      </div>
    </div>
  );
};

export default Signup;
