/**
 * Partner Login Page — Sign-in for ZIVO Partners (shop owners, merchants, etc.)
 * After login, redirects to partner dashboard based on user role.
 */
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Mail, Lock, ArrowRight, Home, Store, Briefcase, Globe, CheckCircle, Hash } from "lucide-react";
import { toast } from "sonner";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { isLodgingStoreCategory } from "@/hooks/useOwnerStoreProfile";

const partnerLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  store_id: z.string().optional(),
});

type PartnerLoginData = z.infer<typeof partnerLoginSchema>;

export default function PartnerLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, t } = useI18n();

  const LANGS = [
    { code: "en", label: "English", flag: "/flags/us.svg" },
    { code: "km", label: "ខ្មែរ", flag: "/flags/kh.svg" },
    { code: "ko", label: "한국어", flag: "/flags/kr.svg" },
    { code: "zh", label: "中文", flag: "/flags/cn.svg" },
    { code: "ja", label: "日本語", flag: "/flags/jp.svg" },
    { code: "vi", label: "Tiếng Việt", flag: "/flags/vn.svg" },
    { code: "th", label: "ไทย", flag: "/flags/th.svg" },
    { code: "ms", label: "Bahasa Melayu", flag: "/flags/my.svg" },
    { code: "hi", label: "हिन्दी", flag: "/flags/in.svg" },
    { code: "fr", label: "Français", flag: "/flags/fr.svg" },
    { code: "es", label: "Español", flag: "/flags/es.svg" },
    { code: "ar", label: "العربية", flag: "/flags/sa.svg" },
  ];
  const currentLangItem = LANGS.find(l => l.code === currentLanguage);

  const form = useForm<PartnerLoginData>({
    resolver: zodResolver(partnerLoginSchema),
    defaultValues: { email: "", password: "", store_id: "" },
  });

  const onSubmit = async (data: PartnerLoginData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);

    if (error) {
      setIsLoading(false);
      if (error.message === "DRIVER_ACCOUNT") {
        toast.error("This is a ZIVO Driver account and cannot access the partner portal. Please use the ZIVO Driver app.");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      toast.error("Authentication failed");
      return;
    }

    // If store ID provided, validate and redirect to that store
    const storeIdInput = data.store_id?.replace(/^CBD/i, "").trim();
    if (storeIdInput && storeIdInput.length >= 8) {
      // Find store by matching first 8 chars of UUID (without dashes)
      const { data: stores } = await supabase.from("store_profiles").select("id, name, category, setup_complete, owner_id").eq("owner_id", user.id);
      const matchedStore = stores?.find((s: any) => s.id.replace(/-/g, "").toUpperCase().startsWith(storeIdInput.toUpperCase()));

      if (matchedStore) {
        setIsLoading(false);
        toast.success(`Welcome back! Opening ${matchedStore.name}`);
        if (!matchedStore.setup_complete) {
          navigate("/store/setup", { replace: true });
        } else {
          navigate(`/admin/stores/${matchedStore.id}${isLodgingStoreCategory(matchedStore.category) ? "?tab=lodge-overview" : ""}`, { replace: true });
        }
        return;
      } else {
        setIsLoading(false);
        toast.error("Store ID not found or not linked to your account");
        return;
      }
    }

    // Check partner roles: restaurant owner, hotel owner, car rental owner, store merchant
    const [restaurant, hotel, carRentals, adminRole, storeProfile] = await Promise.all([
      supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("hotels").select("id").eq("owner_id", user.id).maybeSingle(),
      supabase.from("rental_cars").select("id").eq("owner_id", user.id).limit(1),
      supabase.rpc("check_user_role", { _user_id: user.id, _role: "admin" }),
      supabase.from("store_profiles").select("id, category, setup_complete").eq("owner_id", user.id).maybeSingle(),
    ]);

    setIsLoading(false);

    // Route based on partner type
    if (adminRole.data) {
      toast.success("Welcome back, Admin!");
      navigate("/admin/analytics", { replace: true });
    } else if (storeProfile.data) {
      toast.success("Welcome back, Partner!");
      if (!storeProfile.data.setup_complete) {
        navigate("/store/setup", { replace: true });
      } else {
        navigate(`/admin/stores/${storeProfile.data.id}${isLodgingStoreCategory(storeProfile.data.category) ? "?tab=lodge-overview" : ""}`, { replace: true });
      }
    } else if (restaurant.data) {
      toast.success("Welcome back, Partner!");
      navigate("/restaurant/dashboard", { replace: true });
    } else if (hotel.data) {
      toast.success("Welcome back, Partner!");
      navigate("/hotel/dashboard", { replace: true });
    } else if ((carRentals.data?.length ?? 0) > 0) {
      toast.success("Welcome back, Partner!");
      navigate("/car-rental/dashboard", { replace: true });
    } else {
      // No partner role found — send to store setup
      toast.info("No partner account found. Please set up your business first.");
      navigate("/store/setup", { replace: true });
    }
  };

  // 3D tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const input3D = "w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)]";

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden">
      <SEOHead title="Partner Sign In – ZIVO" description="Sign in to your ZIVO Partner account to manage your business." noIndex />

      {/* Background */}
      <div className="absolute inset-0">
        <img src="/images/auth-bg-3d.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            animate={{ y: [0, -200, 0], x: [0, Math.sin(i) * 50, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 4 + i * 0.8, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
            style={{ left: `${15 + i * 14}%`, bottom: "10%" }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10 px-4" style={{ perspective: "1200px" }}>
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            rotateX, rotateY,
            transformStyle: "preserve-3d" as const,
            boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5), 0 10px 25px -10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative bg-white/[0.08] backdrop-blur-2xl border border-white/[0.15] rounded-3xl p-5 sm:p-6 flex flex-col"
        >
          {/* Glass shimmer */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-white/[0.04] rounded-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-5 relative z-20" style={{ transform: "translateZ(30px)" }}>
            <div className="absolute -left-1 -top-1">
              <button type="button" onClick={() => navigate("/")} className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 touch-manipulation" aria-label={t("auth.go_home")}>
                <Home className="w-5 h-5 text-white/70" />
              </button>
            </div>
            <div className="absolute -right-2 -top-2">
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }} className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 touch-manipulation relative z-30" aria-label="Change language">
                <Globe className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Partner icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mb-3 shadow-[0_8px_24px_-6px_rgba(34,197,94,0.3)]">
              <Store className="w-7 h-7 text-primary" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-lg">{t("auth.partner_sign_in")}</h1>
            <p className="text-white/50 mt-1 text-xs">{t("auth.access_dashboard")}</p>
          </div>

          {/* Form */}
          <div className="relative z-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-white/70 text-xs font-medium">{t("auth.business_email")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input type="email" placeholder="partner@business.com" autoComplete="email" className={input3D} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white/70 text-xs font-medium">{t("auth.password")}</FormLabel>
                      <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">{t("auth.forgot")}</Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input type="password" placeholder="••••••••" autoComplete="current-password" className={input3D} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                {/* Store Account ID */}
                <FormField control={form.control} name="store_id" render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-white/70 text-xs font-medium">Store Account ID</FormLabel>
                      <button
                        type="button"
                        onClick={async () => {
                          const email = form.getValues("email").trim();
                          if (!email) {
                            toast.error("Please enter your business email first");
                            return;
                          }
                          const loadingToast = toast.loading("Looking up your Store Account ID...");
                          try {
                            const { data, error } = await supabase.functions.invoke("lookup-store-id", {
                              body: { email },
                            });

                            if (error || data?.error) {
                              toast.dismiss(loadingToast);
                              toast.error(data?.error || "Could not find a store for this email");
                              return;
                            }

                            if (data?.stores?.length > 0) {
                              const stores = data.stores.map((store: { name: string; full_id: string }) => ({
                                name: store.name,
                                accountId: `CBD${store.full_id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
                              }));

                              form.setValue("store_id", stores[0].accountId, { shouldDirty: true });

                              toast.dismiss(loadingToast);
                              toast.success(`Found: ${stores[0].name} — Store ID: ${stores[0].accountId} (auto-filled below)`, { duration: 6000 });
                              return;
                            }

                            toast.dismiss(loadingToast);
                            toast.error("Could not find a store for this email");
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error("Failed to send Store ID. Please try again.");
                          }
                        }}
                        className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot ID?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input type="text" placeholder="CBD12345678" autoComplete="off" className={cn(input3D, "uppercase font-mono tracking-wider")} {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </div>
                    </FormControl>
                    <p className="text-white/30 text-[10px]">Enter your store ID (e.g. CBD12345678) — optional for non-store partners</p>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )} />

                <motion.div whileTap={{ scale: 0.97, y: 2 }} whileHover={{ scale: 1.01 }}>
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-bold rounded-xl touch-manipulation transition-all relative overflow-hidden shadow-[0_6px_20px_-4px_rgba(34,197,94,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    disabled={isLoading}
                    style={{ background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent h-1/2 pointer-events-none rounded-t-xl" />
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">
                        {t("auth.sign_in_dashboard")}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[10px] text-white/40 bg-transparent">{t("auth.new_partner")}</span>
              </div>
            </div>

            {/* Register CTA */}
            <motion.button
              type="button"
              onClick={() => navigate("/partner-with-zivo")}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96, rotateX: 6 }}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-sm text-white/80 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/[0.1] transition-all touch-manipulation shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]"
              style={{ transformStyle: "preserve-3d" as const }}
            >
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              {t("auth.become_partner")}
            </motion.button>

            {/* Customer login link */}
            <p className="text-center text-white/40 text-[11px] mt-3">
              {t("auth.customer_login")}{" "}
              <button type="button" onClick={() => navigate("/login")} className="text-primary hover:text-primary/80 font-medium transition-colors">
                {t("auth.sign_in_here")}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Language menu portal */}
      {showLangMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setShowLangMenu(false)} />
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-6 pointer-events-none">
            <div className="pointer-events-auto w-[260px] max-h-[60vh] bg-black/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 h-fit ml-auto">
              <div className="relative px-3 py-2 border-b border-white/10 overflow-hidden">
                {currentLangItem?.flag && (
                  <img src={currentLangItem.flag} alt="" className="absolute -right-3 -top-3 w-24 h-24 opacity-[0.07] pointer-events-none blur-[1px]" style={{ transform: "rotate(-12deg) scale(1.3)" }} />
                )}
                <p className="text-xs font-medium text-white/60 relative z-10">{t("lang.select")}</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {LANGS.map(l => (
                  <button type="button"
                    key={l.code}
                    onClick={() => { changeLanguage(l.code); setShowLangMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-200 relative overflow-hidden group",
                      currentLanguage === l.code ? "bg-primary/20 text-primary font-semibold" : "text-white/80 hover:bg-white/10"
                    )}
                  >
                    <img src={l.flag} alt="" className="absolute right-0 top-1/2 w-14 h-14 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none blur-[0.5px]" style={{ transform: "translateY(-50%) rotate(-8deg)" }} />
                    <img src={l.flag} alt={l.label} className="w-6 h-[17px] rounded-[3px] object-cover shadow-sm border border-white/20 shrink-0 relative z-10" />
                    <span className="relative z-10 flex-1 text-left">{l.label}</span>
                    <span className="text-[10px] font-mono text-white/40 uppercase relative z-10">{l.code}</span>
                    {currentLanguage === l.code && <CheckCircle className="w-3.5 h-3.5 text-primary relative z-10" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
