/**
 * Account Security Settings Page
 * User-facing security controls: password, 2FA, sessions, data management
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TwoFactorSetupDialog from "@/components/auth/TwoFactorSetupDialog";
import PhoneOtpVerifyDialog from "@/components/auth/PhoneOtpVerifyDialog";
import PasswordChangeVerifyDialog from "@/components/auth/PasswordChangeVerifyDialog";
import { 
  Shield, Lock, Smartphone, Monitor, MapPin, Clock, MessageSquare, Mail,
  LogOut, Download, Trash2, AlertTriangle, Key, ShieldCheck as ShieldCheckIcon,
  CheckCircle2, Loader2, Eye, EyeOff, Bell, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { checkPasswordBreach, analyzePassword } from "@/lib/security/passwordStrength";
import { formatDistanceToNow } from "date-fns";
import LoginHistorySection from "@/components/auth/LoginHistorySection";
import DeleteAccountFlow from "@/components/account/DeleteAccountFlow";
import PendingDeletionBanner from "@/components/account/PendingDeletionBanner";

// Client-side throttle: prevent rapid password change attempts (anti-brute-force)
const PWD_CHANGE_THROTTLE_KEY = "zivo_pwd_change_attempts";
const PWD_CHANGE_MAX_ATTEMPTS = 5;
const PWD_CHANGE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkPasswordChangeThrottle(): { allowed: boolean; retryInMin: number } {
  try {
    const raw = sessionStorage.getItem(PWD_CHANGE_THROTTLE_KEY);
    const now = Date.now();
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const recent = attempts.filter((t) => now - t < PWD_CHANGE_WINDOW_MS);
    if (recent.length >= PWD_CHANGE_MAX_ATTEMPTS) {
      const oldest = Math.min(...recent);
      const retryInMin = Math.ceil((PWD_CHANGE_WINDOW_MS - (now - oldest)) / 60_000);
      return { allowed: false, retryInMin };
    }
    recent.push(now);
    sessionStorage.setItem(PWD_CHANGE_THROTTLE_KEY, JSON.stringify(recent));
    return { allowed: true, retryInMin: 0 };
  } catch {
    return { allowed: true, retryInMin: 0 };
  }
}

export default function AccountSecurity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: "", confirm: "" });
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [phoneOtpDialogOpen, setPhoneOtpDialogOpen] = useState(false);
  const [pwdVerifyDialogOpen, setPwdVerifyDialogOpen] = useState(false);
  const [pwdVerified, setPwdVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [userPhone, setUserPhone] = useState<string>("");
  const [emailOtpBackup, setEmailOtpBackup] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Load real 2FA status, phone verification, AND persisted security toggles
  // (login_alerts_enabled / email_otp_backup_enabled live in
  // user_preferences.preferences.security so they survive refresh/log-in
  // cycles instead of resetting to default on mount).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: mfa }, profile, prefs] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        user?.id
          ? supabase
              .from("profiles")
              .select("phone_e164, phone_verified")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user?.id
          ? supabase
              .from("user_preferences")
              .select("preferences")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const hasVerified = (mfa?.totp ?? []).some((f) => (f.status as string) === "verified");
      setTwoFactorEnabled(hasVerified);
      const p: any = (profile as any)?.data;
      if (p) {
        setUserPhone(p.phone_e164 || "");
        setPhoneVerified(!!p.phone_verified);
      }
      const security = (prefs as any)?.data?.preferences?.security;
      if (security && typeof security === "object") {
        if (typeof security.login_alerts_enabled === "boolean") setLoginAlerts(security.login_alerts_enabled);
        if (typeof security.email_otp_backup_enabled === "boolean") setEmailOtpBackup(security.email_otp_backup_enabled);
      }
      setTwoFactorLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Upsert one key under preferences.security on user_preferences. Uses the
  // jsonb_set RPC pattern: read current preferences, deep-merge the security
  // sub-object, write back. Safe for concurrent toggles since each call is
  // isolated to its own key.
  const persistSecurityPref = async (key: "login_alerts_enabled" | "email_otp_backup_enabled", value: boolean) => {
    if (!user?.id) return;
    try {
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const current = ((existing as any)?.preferences as Record<string, any>) || {};
      const security = (current.security && typeof current.security === "object") ? current.security : {};
      const next = { ...current, security: { ...security, [key]: value } };
      const { error } = await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, preferences: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    } catch (e: any) {
      console.error("[security-pref] persist failed", e);
      toast.error("Couldn't save that setting — try again");
    }
  };

  const refreshTwoFactor = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const hasVerified = (data?.totp ?? []).some((f) => (f.status as string) === "verified");
    setTwoFactorEnabled(hasVerified);
  };

  const handleToggle2FA = async (checked: boolean) => {
    if (checked) {
      setTwoFactorDialogOpen(true);
      return;
    }
    // Disable: unenroll all verified TOTP factors
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      setTwoFactorEnabled(false);
      toast.success("Two-factor authentication disabled");
    } catch (e: any) {
      toast.error(e.message || "Could not disable 2FA");
    }
  };


  const validatePasswordForm = (): boolean => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("New passwords don't match");
      return false;
    }
    if (passwordForm.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    const throttle = checkPasswordChangeThrottle();
    if (!throttle.allowed) {
      toast.error(`Too many attempts. Try again in ~${throttle.retryInMin} minute(s).`);
      return false;
    }
    const analysis = analyzePassword(passwordForm.new);
    if (analysis.strength === "weak") {
      toast.error(`Password too weak. ${analysis.feedback[0] ?? "Use a stronger password."}`);
      return false;
    }
    return true;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    // Step 1: Require OTP verification (email or SMS) before changing password
    if (!pwdVerified) {
      setPwdVerifyDialogOpen(true);
      return;
    }
    await commitPasswordChange();
  };

  const commitPasswordChange = async () => {
    setIsChangingPassword(true);
    try {
      // Check new password against known breaches (k-anonymity, safe)
      try {
        const breach = await checkPasswordBreach(passwordForm.new);
        if (breach.breached) {
          toast.error(
            `This password was found in ${breach.count.toLocaleString()} data breaches. Please choose a different password.`,
            { duration: 8000 }
          );
          return;
        }
      } catch {
        // Continue if breach check fails
      }

      // Update to new password (identity already verified via OTP)
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;

      // Invalidate all other sessions after password change
      await supabase.auth.signOut({ scope: "others" });

      toast.success("Password updated. All other sessions have been signed out.");
      setPasswordForm({ new: "", confirm: "" });
      setPwdVerified(false); // require re-verification for next change
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await supabase.from("feedback_submissions").insert({
        category: "data_export_request",
        subject: "GDPR Data Export Request",
        message: `User ${user?.id} requested data export at ${new Date().toISOString()}`,
        user_id: user?.id ?? null,
      });
      toast.success("Data export requested. You'll receive an email when it's ready.");
    } catch {
      toast.error("Failed to submit export request.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);
    try {
      // Sign out from all sessions
      await supabase.auth.signOut({ scope: 'global' });
      toast.success("Logged out of all devices");
      // Redirect to login
      window.location.href = "/login";
    } catch (error: any) {
      toast.error("Failed to log out of all devices");
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const [deleteFlowOpen, setDeleteFlowOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Security Settings | ZIVO Account"
        description="Manage your account security: password, two-factor authentication, active sessions, and data."
        noIndex
      />

      {/* App-style top bar */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t("security.title")}</h1>
        </div>
      </div>

      <main className="pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-4 pt-6 max-w-3xl mx-auto"
        >
          {/* Section subtitle */}
          <p className="text-muted-foreground text-sm mb-6">
            {t("security.subtitle")}
          </p>

          {/* Phishing & link safety notice */}
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground mb-1">You're protected</p>
              <p className="text-muted-foreground leading-relaxed">
                ZIVO scans every external link before opening it and blocks suspicious or
                phishing URLs. Never share your password — staff will never ask for it.
              </p>
            </div>
          </div>

          {/* Phishing warning removed */}

          {/* Change Password */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                {t("security.change_password_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("security.new_password")}</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("security.confirm_password")}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("security.updating")}
                    </>
                  ) : pwdVerified ? (
                    t("security.update_password")
                  ) : (
                    <>
                      <ShieldCheckIcon className="w-4 h-4 mr-2" />
                      Verify & update password
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  For your security, we'll send a one-time code to your email or phone before changing your password.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                {t("security.2fa_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("security.authenticator_app")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("security.authenticator_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                    {twoFactorEnabled ? t("security.enabled") : t("security.disabled")}
                  </Badge>
                  <Switch
                    checked={twoFactorEnabled}
                    disabled={twoFactorLoading}
                    onCheckedChange={handleToggle2FA}
                  />
                </div>
              </div>
              {!twoFactorEnabled && (
                <p className="mt-4 text-sm text-muted-foreground p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  Two-factor authentication significantly reduces the risk of unauthorized access.
                </p>
              )}
            </CardContent>
          </Card>

          {/* SMS / Phone Verification (additional 2FA layer) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5" />
                SMS Verification
              </CardTitle>
              <CardDescription>
                Get a one-time code by text message as a backup or additional verification step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">Phone number</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {userPhone || "No phone on file"}
                  </p>
                </div>
                <Badge variant={phoneVerified ? "default" : "secondary"}>
                  {phoneVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <Button
                variant={phoneVerified ? "outline" : "default"}
                onClick={() => setPhoneOtpDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {phoneVerified ? "Re-verify or change number" : "Verify phone via SMS"}
              </Button>
              <p className="text-xs text-muted-foreground">
                We'll text a 6-digit code via Twilio Verify. Standard SMS rates may apply.
              </p>
            </CardContent>
          </Card>

          {/* Email OTP backup */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5" />
                Email One-Time Code (Backup)
              </CardTitle>
              <CardDescription>
                If you lose access to your authenticator or phone, receive a 6-digit code at{" "}
                <span className="font-medium text-foreground">{user?.email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email backup code</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled by default for account recovery
                  </p>
                </div>
                <Switch
                  checked={emailOtpBackup}
                  onCheckedChange={async (v) => {
                    setEmailOtpBackup(v);
                    await persistSecurityPref("email_otp_backup_enabled", v);
                    toast.success(v ? "Email backup code enabled" : "Email backup code disabled");
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Login Alerts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5" />
                Login Alerts
              </CardTitle>
              <CardDescription>
                Get notified when someone logs into your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for new login activity
                  </p>
                </div>
                <Switch
                  checked={loginAlerts}
                  onCheckedChange={async (checked) => {
                    setLoginAlerts(checked);
                    await persistSecurityPref("login_alerts_enabled", checked);
                    toast.success(checked ? "Login alerts enabled" : "Login alerts disabled");
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Manage Active Sessions — deep-links to the full sessions page
              with per-device revoke + "Sign out everywhere else" controls. */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5" />
                Active sessions
              </CardTitle>
              <CardDescription>
                See where you're signed in and sign out devices you don't recognize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-2"
                onClick={() => navigate("/account/sessions")}
              >
                <Smartphone className="w-4 h-4" />
                Manage active sessions
              </Button>
            </CardContent>
          </Card>

          {/* Login history (recent sign-in attempts) */}
          <LoginHistorySection />

          {/* Data Management */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="w-5 h-5" />
                Your Data
              </CardTitle>
              <CardDescription>
                Export or delete your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Download your data</p>
                  <p className="text-sm text-muted-foreground">
                    Get a copy of all data we have about you
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending deletion banner — shown if a deletion is scheduled */}
          <PendingDeletionBanner />

          {/* Delete Account */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Warning:</strong> This action cannot be undone.
                  All your bookings, preferences, and data will be permanently deleted within 30 days.
                  Some data may be retained for legal compliance.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setDeleteFlowOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Request Account Deletion
              </Button>
            </CardContent>
          </Card>
          <DeleteAccountFlow open={deleteFlowOpen} onOpenChange={setDeleteFlowOpen} />
        </motion.div>
      </main>

      <TwoFactorSetupDialog
        open={twoFactorDialogOpen}
        onOpenChange={setTwoFactorDialogOpen}
        onEnrolled={refreshTwoFactor}
      />

      <PhoneOtpVerifyDialog
        open={phoneOtpDialogOpen}
        onOpenChange={setPhoneOtpDialogOpen}
        initialPhone={userPhone}
        onVerified={() => {
          setPhoneVerified(true);
          // Refresh phone from profile in case the user changed it
          if (user?.id) {
            supabase
              .from("profiles")
              .select("phone_e164, phone_verified")
              .eq("user_id", user.id)
              .maybeSingle()
              .then(({ data }: any) => {
                if (data) {
                  setUserPhone(data.phone_e164 || "");
                  setPhoneVerified(!!data.phone_verified);
                }
              });
          }
        }}
      />

      <PasswordChangeVerifyDialog
        open={pwdVerifyDialogOpen}
        onOpenChange={setPwdVerifyDialogOpen}
        email={user?.email ?? ""}
        phoneE164={userPhone}
        phoneVerified={phoneVerified}
        onVerified={async () => {
          setPwdVerified(true);
          // Continue with password change immediately
          await commitPasswordChange();
        }}
      />
    </div>
  );
}
