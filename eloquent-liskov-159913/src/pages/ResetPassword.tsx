import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { checkPasswordBreach } from "@/lib/security/passwordStrength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const hasRecoveryParams = useMemo(() => {
    if (typeof window === "undefined") return false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const readParam = (key: string) => hashParams.get(key) ?? queryParams.get(key);

    return Boolean(
      queryParams.get("code") ||
      readParam("type") === "recovery" ||
      (readParam("access_token") && readParam("refresh_token"))
    );
  }, []);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    const applyRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const readParam = (key: string) => hashParams.get(key) ?? queryParams.get(key);

      const recoveryType = readParam("type");
      const code = queryParams.get("code");
      const accessToken = readParam("access_token");
      const refreshToken = readParam("refresh_token");
      const authError = readParam("error") ?? readParam("error_description");

      if (authError) {
        if (isMounted) setIsValidSession(false);
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && (recoveryType === "recovery" || data.session)) {
          window.history.replaceState({}, document.title, window.location.pathname);
          if (isMounted) setIsValidSession(true);
          return;
        }
      }

      if (recoveryType === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          window.history.replaceState({}, document.title, window.location.pathname);
          if (isMounted) setIsValidSession(true);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setIsValidSession(hasRecoveryParams ? !!session || recoveryType === "recovery" : !!session);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || !!session) {
        setIsValidSession(true);
      }
    });

    void applyRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hasRecoveryParams]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true);

    // Check password against known breaches before resetting
    try {
      const breach = await checkPasswordBreach(data.password);
      if (breach.breached) {
        setIsLoading(false);
        toast.error(
          `This password was found in ${breach.count.toLocaleString()} data breaches. Please choose a different password.`,
          { duration: 8000 }
        );
        return;
      }
    } catch {
      // Continue if check fails
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      // Sign out all other sessions to invalidate any stolen sessions
      await supabase.auth.signOut({ scope: 'others' });

      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate(`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted safe-area-top safe-area-bottom">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verifying...</span>
        </div>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted safe-area-top safe-area-bottom">
        <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">Invalid or expired link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-12 rounded-xl touch-manipulation active:scale-[0.98]" onClick={() => navigate("/forgot-password")}>
              Request new link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted safe-area-top safe-area-bottom">
        <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Password updated!</CardTitle>
            <CardDescription>
              Your password has been successfully updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <SEOHead title="Set New Password – ZIVO" description="Create a new password for your ZIVO account." noIndex={true} />

      {/* Subtle ZIVO gradient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-fuchsia-300/30 via-orange-200/30 to-rose-200/30 blur-3xl dark:from-fuchsia-600/20 dark:via-orange-600/20 dark:to-rose-600/20" />
        <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-amber-200/30 via-pink-200/30 to-purple-200/30 blur-3xl dark:from-amber-600/15 dark:via-pink-600/15 dark:to-purple-600/15" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 pt-9 pb-6 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Set new password</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 text-center">
              Choose a strong password<br />you'll remember.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          enterKeyHint="go"
                          placeholder="New password"
                          className="w-full h-11 px-3 pr-10 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
                          {...field}
                        />
                        <button
                          type="button"
                          aria-label="Toggle password visibility"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Password must:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Be at least 8 characters long</li>
                  <li>Contain uppercase &amp; lowercase letters</li>
                  <li>Contain at least one number</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md shadow-rose-500/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
