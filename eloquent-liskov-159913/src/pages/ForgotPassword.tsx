import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit, formatLockout } from "@/lib/security/rateLimiter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [params] = useSearchParams();
  const initialEmail = params.get("email") || "";
  const redirect = params.get("redirect") || "/";
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const loginHref = `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: initialEmail,
    },
  });
  const provider = useMemo(() => {
    const domain = (emailSent ? sentEmail : initialEmail).split("@")[1]?.toLowerCase() || "";
    if (domain === "gmail.com" || domain === "googlemail.com") return { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" };
    if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live.com")) return { name: "Outlook", url: "https://outlook.live.com/mail/" };
    if (domain === "yahoo.com" || domain === "ymail.com") return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
    if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return { name: "iCloud Mail", url: "https://www.icloud.com/mail" };
    if (domain === "proton.me" || domain === "protonmail.com") return { name: "Proton Mail", url: "https://mail.proton.me/" };
    return null;
  }, [emailSent, initialEmail, sentEmail]);

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);

    // Rate limit: prevent enumeration attacks
    const { allowed, retryAfter } = await checkRateLimit("auth:forgot_password");
    if (!allowed) {
      setIsLoading(false);
      toast.error(`Too many requests. Try again in ${formatLockout(retryAfter)}.`);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
      });

      if (error) throw error;

      setSentEmail(data.email);
      setEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background safe-area-top safe-area-bottom">
        <SEOHead title="Check Your Email – ZIVO" description="Password reset link sent." noIndex={true} />
        {/* Background gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent rounded-full blur-3xl opacity-40" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full blur-3xl opacity-30" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="glass-card border-white/10 shadow-2xl">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-success to-success/70 bg-clip-text text-transparent">
                  Check your email
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2 text-sm sm:text-base">
                  We've sent a password reset link to your email address. Click the link to set a new password.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <p className="text-sm text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-3">
                {provider && (
                  <Button
                    asChild
                    className="w-full h-12 rounded-xl touch-manipulation active:scale-[0.98]"
                  >
                    <a href={provider.url} target="_blank" rel="noopener noreferrer">
                      Open {provider.name}
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setEmailSent(false)}
                  className="w-full h-12 bg-background/50 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all rounded-xl touch-manipulation active:scale-[0.98]"
                >
                  Try another email
                </Button>
                <Button 
                  variant="ghost" 
                  asChild
                  className="w-full h-12 hover:bg-white/5 transition-all rounded-xl"
                >
                  <Link to={loginHref} className="flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5 py-8 bg-white dark:bg-black">
      <SEOHead title="Forgot Password – ZIVO" description="Reset your ZIVO account password." noIndex={true} />

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
        {/* Main card */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-7 pt-9 pb-6 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-14 h-14 rounded-2xl bg-ig-gradient flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Forgot password?</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 text-center">
              Enter your email and we'll send you<br />a link to reset your password.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        enterKeyHint="go"
                        placeholder="Email"
                        className="w-full h-11 px-3 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500 outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 transition"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-ig-gradient hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md shadow-rose-500/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
              </button>

              {/* OR divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              </div>

              <Link
                to={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                className="block text-center text-sm font-semibold text-rose-500 hover:text-rose-600"
              >
                Create new account
              </Link>
            </form>
          </Form>
        </div>

        {/* Footer card */}
        <div className="mt-3 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 rounded-xl px-6 py-4 text-center shadow-sm">
          <Link
            to={loginHref}
            className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-rose-500 dark:hover:text-rose-400"
          >
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
