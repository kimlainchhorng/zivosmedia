import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint, getDeviceName } from "@/lib/security/deviceFingerprint";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, ArrowLeft, Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const CODE_LENGTH = 6;

const VerifyNewDevice = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get state passed from login
  const navEmail = (location.state as any)?.email as string | undefined;
  const navUserId = (location.state as any)?.userId as string | undefined;
  const navRedirectTo = (location.state as any)?.redirectTo as string | undefined;

  const [email] = useState<string | undefined>(() => {
    if (navEmail) {
      sessionStorage.setItem("zivo_device_otp_email", navEmail);
      return navEmail;
    }
    return sessionStorage.getItem("zivo_device_otp_email") || undefined;
  });

  const [userId] = useState<string | undefined>(() => {
    if (navUserId) {
      sessionStorage.setItem("zivo_device_otp_userid", navUserId);
      return navUserId;
    }
    return sessionStorage.getItem("zivo_device_otp_userid") || undefined;
  });

  const [redirectTo] = useState<string>(navRedirectTo || "/");

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Redirect if no email/userId
  useEffect(() => {
    if (!email || !userId) {
      navigate("/login", { replace: true });
    }
  }, [email, userId, navigate]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newCode.every((d) => d !== "") && newCode.join("").length === CODE_LENGTH) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      const newCode = pasted.split("");
      setCode(newCode);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = useCallback(async (otp: string) => {
    if (!email || !userId || isVerifying) return;
    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp-code", {
        body: { email, code: otp },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Invalid verification code. Please try again.");
        setCode(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      // OTP valid — register this device as trusted.
      // Note: this RPC was failing silently for months (it referenced columns
      // that don't exist on trusted_devices), which is why users kept getting
      // re-prompted for OTP every sign-in. We now check the error and warn —
      // sign-in still succeeds, but the user will know trust didn't stick.
      const fingerprint = getDeviceFingerprint();
      const deviceName = getDeviceName();
      const ua = navigator.userAgent;
      const deviceType = /iPad|Tablet/.test(ua)
        ? "tablet"
        : /iPhone|Android.*Mobile|Mobile/.test(ua)
          ? "mobile"
          : "desktop";

      const { error: trustErr } = await supabase.rpc("register_trusted_device", {
        _user_id: userId,
        _device_fingerprint: fingerprint,
        _device_name: deviceName,
        _device_type: deviceType,
      });
      if (trustErr) {
        // Non-fatal: sign-in already succeeded server-side. Just inform the
        // user that the "trust" step didn't persist so they understand why
        // they may see the OTP screen again next time.
        console.error("[VerifyNewDevice] register_trusted_device failed", trustErr);
        toast.warning("Signed in, but couldn't save device trust. You may be asked again next time.");
      }

      // Clean up session storage
      sessionStorage.removeItem("zivo_device_otp_email");
      sessionStorage.removeItem("zivo_device_otp_userid");

      toast.success("Device verified! You're signed in.", { icon: "🔐" });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error("Verification failed. Please try again.");
      setIsVerifying(false);
    }
  }, [email, userId, isVerifying, navigate, redirectTo]);

  const handleResend = async () => {
    if (!email || !userId || countdown > 0) return;
    setIsResending(true);
    try {
      await supabase.functions.invoke("send-otp-email", {
        body: { email, userId },
      });
      toast.success("New verification code sent!");
      setCountdown(60);
    } catch {
      toast.error("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 5)) + c)
    : "";

  if (!email || !userId) return null;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 pt-9 pb-6 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">New device detected</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 text-center">
              We sent a verification code to<br />
              <span className="font-semibold text-zinc-900 dark:text-white">{maskedEmail}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <span key={i} className="contents">
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    aria-label={`Verification code digit ${i + 1}`}
                    title={`Verification code digit ${i + 1}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-11 h-12 text-center text-xl font-bold rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-border dark:focus:border-border outline-none text-zinc-900 dark:text-white transition"
                    disabled={isVerifying}
                  />
                  {i === 2 && <span className="flex items-center text-zinc-400 font-bold">·</span>}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerify(code.join(""))}
              disabled={isVerifying || code.some((d) => !d)}
              className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify device"}
            </button>

            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Didn't receive the code?{" "}
              {countdown > 0 ? (
                <span className="text-zinc-500 dark:text-zinc-400">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50 transition-colors"
                >
                  {isResending ? "Sending…" : "Resend code"}
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-5">
            This extra step keeps your account safe when signing in from a new device.
          </p>
        </div>

        <div className="mt-3 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-4 text-center shadow-sm">
          <button type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyNewDevice;
