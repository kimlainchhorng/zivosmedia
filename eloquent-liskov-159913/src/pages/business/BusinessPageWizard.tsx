/**
 * Business Page Wizard — friendly 5-step flow for already-signed-in Zivo users
 * to create a Business Page and land in the right partner dashboard.
 *
 * Steps:
 *   1) Business basics (name, phone, email)
 *   2) Business type   (drives which dashboard they end up in)
 *   3) Contact person  (first/last name, phone, email — prefilled)
 *   4) Profile photo   (optional, Skip allowed)
 *   5) Cover photo     (optional, Skip allowed)
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Briefcase, Building2, User, Image as ImageIcon,
  Camera, CheckCircle2, Loader2, Upload, X, Check, Save, Sparkles,
  CreditCard, MapPin, Banknote, Smartphone, QrCode, Facebook,
  Instagram, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { STORE_CATEGORY_OPTIONS, type StoreCategory } from "@/config/groceryStores";
import {
  resolveBusinessDashboardRoute,
  RESTAURANT_CATEGORIES,
} from "@/lib/business/dashboardRoute";
import {
  persistWizardPartial,
  type WizardSnapshot,
} from "./wizardPersistence";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STEP_COUNT = 6;

const STEP_LABELS = ["Basics", "Type", "Contact", "Profile", "Cover", "Polish"] as const;
const NEXT_STEP_LABELS: Record<number, string> = {
  1: "Business type",
  2: "Contact",
  3: "Profile photo",
  4: "Cover photo",
  5: "Polish",
};

const PAYMENT_OPTIONS: { value: string; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "qr", label: "QR / KHQR", icon: QrCode },
  { value: "wallet", label: "E-wallet", icon: Smartphone },
];

const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const SENTINEL_KEY = "biz-wizard-guard";

export default function BusinessPageWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceNew = searchParams.get("new") === "1";
  const { user } = useAuth();
  const { data: profile } = useUserProfile();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [checking, setChecking] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  const [storeId, setStoreId] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  /** Records HOW the leave dialog was opened so Confirm Leave knows whether to call history.go. */
  const leaveSourceRef = useRef<"header" | "popstate">("header");
  /** Latches once the user has confirmed Leave / completed setup so guard short-circuits. */
  const isLeavingRef = useRef(false);
  const completedRef = useRef(false);
  /** Snapshot of fields that we treat as "saved" — used as baseline for dirty detection. */
  const baselineRef = useRef<string>("");
  const [baselineReady, setBaselineReady] = useState(false);

  // Step 1
  const [bizName, setBizName] = useState("");
  const [bizDescription, setBizDescription] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Step 2
  const [category, setCategory] = useState<StoreCategory | "">("");

  // Step 3
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Step 4 / 5
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  // Step 6 — optional polish
  const [address, setAddress] = useState("");
  const [paymentTypes, setPaymentTypes] = useState<string[]>(["cash", "card"]);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");

  // Build the current snapshot used for both DB writes and dirty detection.
  const snapshot: WizardSnapshot = useMemo(
    () => ({
      bizName, bizDescription, bizPhone, bizEmail, category,
      firstName, lastName, contactPhone, contactEmail,
      logoUrl, bannerUrl,
      address, paymentTypes,
      facebookUrl, instagramUrl, tiktokUrl, telegramUrl,
    }),
    [
      bizName, bizDescription, bizPhone, bizEmail, category,
      firstName, lastName, contactPhone, contactEmail,
      logoUrl, bannerUrl,
      address, paymentTypes,
      facebookUrl, instagramUrl, tiktokUrl, telegramUrl,
    ]
  );
  const fieldsSnapshot = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  const isDirty =
    baselineReady &&
    !completedRef.current &&
    !isLeavingRef.current &&
    fieldsSnapshot !== baselineRef.current;

  // Auth gate + redirect already-completed owners; resume partial setups.
  useEffect(() => {
    if (!user) return;
    // When opened with ?new=1, always start a fresh business — don't resume
    // an existing draft or redirect to an already-completed dashboard.
    if (forceNew) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, slug, category, phone, logo_url, banner_url, setup_complete")
        .eq("owner_id", user.id)
        .maybeSingle();

      if ((data as any)?.setup_complete) {
        completedRef.current = true;
        const { path } = resolveBusinessDashboardRoute((data as any).category, (data as any).id);
        navigate(path, { replace: true });
        return;
      }

      // Resume partial setup
      if (data) {
        const d = data as any;
        setStoreId(d.id);
        if (d.name) setBizName(d.name);
        if (d.phone) setBizPhone(formatPhone(d.phone));
        if (d.category) {
          setCategory(d.category as StoreCategory);
          setCompletedSteps((prev) => new Set(prev).add(1).add(2));
          setStep(3);
        } else if (d.name) {
          setCompletedSteps((prev) => new Set(prev).add(1));
          setStep(2);
        }
        if (d.logo_url) setLogoUrl(d.logo_url);
        if (d.banner_url) setBannerUrl(d.banner_url);
      }
      setChecking(false);
    })();
  }, [user, navigate, forceNew]);

  // Prefill from profile (runs once profile loads).
  useEffect(() => {
    if (!user) return;
    const full = profile?.full_name || (user.user_metadata?.full_name as string) || "";
    const [f, ...rest] = full.trim().split(/\s+/);
    if (!firstName && f) setFirstName(f);
    if (!lastName && rest.length) setLastName(rest.join(" "));
    if (!contactEmail) setContactEmail(profile?.email || user.email || "");
    if (!contactPhone && profile?.phone) setContactPhone(formatPhone(profile.phone));
    if (!bizEmail) setBizEmail(profile?.email || user.email || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  // Set the dirty-detection baseline once initial loading + prefill have settled.
  // Runs synchronously (no timer) so React Testing Library doesn't see updates outside act().
  useEffect(() => {
    if (checking || baselineReady) return;
    baselineRef.current = fieldsSnapshot;
    setBaselineReady(true);
  }, [checking, baselineReady, fieldsSnapshot]);

  // Warn on tab close / reload while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept browser/system back. Push a sentinel; if user pops it, prompt instead.
  useEffect(() => {
    if (!isDirty) return;

    // Push sentinel only if it isn't already on top.
    if (!(window.history.state && (window.history.state as any)[SENTINEL_KEY])) {
      window.history.pushState({ [SENTINEL_KEY]: true }, "");
    }

    let armed = true;
    const onPop = (_e: PopStateEvent) => {
      if (!armed) return;
      if (completedRef.current || isLeavingRef.current) return;
      // Re-push the sentinel so we stay on this page, then prompt.
      window.history.pushState({ [SENTINEL_KEY]: true }, "");
      leaveSourceRef.current = "popstate";
      setLeaveOpen(true);
    };

    window.addEventListener("popstate", onPop);
    return () => {
      armed = false;
      window.removeEventListener("popstate", onPop);
    };
  }, [isDirty]);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof STORE_CATEGORY_OPTIONS> = {};
    for (const opt of STORE_CATEGORY_OPTIONS) {
      const g = opt.group || "Other";
      (groups[g] ||= []).push(opt);
    }
    return groups;
  }, []);

  const uploadAsset = async (file: File, kind: "logo" | "banner") => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `setup/${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      if (kind === "logo") setLogoUrl(data.publicUrl);
      else setBannerUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return (
          bizName.trim().length >= 2 &&
          bizPhone.replace(/\D/g, "").length >= 7 &&
          /\S+@\S+\.\S+/.test(bizEmail) &&
          !nameError
        );
      case 2:
        return !!category;
      case 3:
        return (
          firstName.trim().length >= 1 &&
          lastName.trim().length >= 1 &&
          /\S+@\S+\.\S+/.test(contactEmail) &&
          contactPhone.replace(/\D/g, "").length >= 7
        );
      default:
        return true;
    }
  };

  /** Persist current snapshot. Updates baseline on success so wizard becomes "clean". */
  const persist = useCallback(
    async (opts?: { persistProfile?: boolean }) => {
      if (!user) return { id: null as string | null };
      const snap: WizardSnapshot = {
        bizName, bizDescription, bizPhone, bizEmail, category,
        firstName, lastName, contactPhone, contactEmail,
        logoUrl, bannerUrl,
        address, paymentTypes,
        facebookUrl, instagramUrl, tiktokUrl, telegramUrl,
      };
      const res = await persistWizardPartial({
        userId: user.id,
        storeId,
        snapshot: snap,
        persistProfile: opts?.persistProfile,
      });
      if (res.id) {
        setStoreId(res.id);
        baselineRef.current = JSON.stringify(snap);
      }
      return res;
    },
    [
      user, storeId, bizName, bizPhone, bizEmail, category,
      firstName, lastName, contactPhone, contactEmail, logoUrl, bannerUrl,
    ]
  );

  const goNext = async () => {
    if (!canContinue()) return;

    // Auto-save after every step except 5 (handled by handleComplete).
    if (step >= 1 && step <= 4) {
      const res = await persist({ persistProfile: step >= 3 });
      if (res.error) {
        setNameError(res.error);
        toast.error(res.error);
        if (step !== 1) setStep(1);
        return;
      }
      setNameError(null);
    }

    setCompletedSteps((prev) => new Set(prev).add(step));
    const nextLabel = NEXT_STEP_LABELS[step];
    if (nextLabel) toast.success("Step saved", { description: `Next: ${nextLabel}` });

    if (step < STEP_COUNT) setStep((s) => (s + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const onHeaderBack = () => {
    if (step > 1) {
      goBack();
      return;
    }
    if (!isDirty) {
      navigate(-1);
      return;
    }
    leaveSourceRef.current = "header";
    setLeaveOpen(true);
  };

  /** User confirmed Leave. Discard unsaved edits on this step and navigate away. */
  const confirmLeave = () => {
    isLeavingRef.current = true;
    setLeaveOpen(false);
    if (leaveSourceRef.current === "popstate") {
      // The sentinel is currently on top — popping it lands on the original prior page.
      window.history.go(-1);
    } else {
      navigate(-1);
    }
  };

  /** User chose Save & exit. Persist progress, then navigate to /account. */
  const saveAndExit = async () => {
    if (savingExit) return;
    setSavingExit(true);
    try {
      const res = await persist({ persistProfile: step >= 3 });
      if (res.error || !res.id) {
        toast.error(res.error || "Could not save");
        return;
      }
      toast.success("Setup saved", { description: "Pick up here later." });
      isLeavingRef.current = true;
      setLeaveOpen(false);
      if (leaveSourceRef.current === "popstate") {
        window.history.go(-1);
      } else {
        navigate("/account");
      }
    } finally {
      setSavingExit(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !category) return;
    // Disarm guard immediately so popstate during the save is silent.
    completedRef.current = true;
    setSubmitting(true);
    try {
      const partial = await persist({ persistProfile: true });
      if (partial.error || !partial.id) {
        completedRef.current = false; // re-arm — completion didn't happen
        setNameError(partial.error || "Could not save");
        toast.error(partial.error || "Could not save");
        setStep(1);
        return;
      }
      const finalStoreId = partial.id;

      const { error: completeErr } = await supabase
        .from("store_profiles")
        .update({ setup_complete: true })
        .eq("id", finalStoreId);
      if (completeErr) throw completeErr;

      // Restaurant branch — also seed restaurants row if none exists.
      if (RESTAURANT_CATEGORIES.has(category)) {
        const { data: existingRest } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!existingRest) {
          await supabase.from("restaurants").insert({
            owner_id: user.id,
            name: bizName.trim(),
            phone: bizPhone.replace(/\D/g, "") || null,
            email: bizEmail.trim() || null,
            logo_url: logoUrl,
            cover_image_url: bannerUrl,
          } as any);
        }
      }

      const { path, fallback } = resolveBusinessDashboardRoute(category, finalStoreId);
      if (fallback) {
        toast.success("Business page created", {
          description: "Opened your generic dashboard — pick a category later to unlock more tools.",
        });
      } else {
        toast.success("Business page created");
      }
      navigate(path, { replace: true });
    } catch (e: any) {
      completedRef.current = false;
      toast.error(e.message || "Could not save your business page");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-background pb-32">
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)" }}
      >
        <button type="button"
          onClick={onHeaderBack}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Step {step} of {STEP_COUNT}
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-ig-gradient">Business Page</h1>
            {isDirty && (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="flex gap-1.5 px-4 pt-3">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step summary chips */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const done = completedSteps.has(stepNum);
          const active = step === stepNum;
          return (
            <button type="button"
              key={label}
              onClick={() => done && setStep(stepNum)}
              disabled={!done && !active}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                done
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                  : active
                  ? "border-foreground/30 bg-muted text-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {done && <Check className="h-3 w-3" />}
              {label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {step === 1 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Business basics</h2>
                    <p className="text-sm text-muted-foreground">Tell us about your business.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bizName">Full business name</Label>
                    <Input
                      id="bizName"
                      placeholder="e.g. Sunrise Coffee Co."
                      value={bizName}
                      onChange={(e) => {
                        setBizName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      autoFocus
                      aria-invalid={!!nameError}
                    />
                    {nameError && (
                      <p className="text-xs font-medium text-destructive">{nameError}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bizPhone">Business phone number</Label>
                    <Input
                      id="bizPhone"
                      inputMode="tel"
                      placeholder="(555) 123-4567"
                      value={bizPhone}
                      onChange={(e) => setBizPhone(formatPhone(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bizEmail">Business email</Label>
                    <Input
                      id="bizEmail"
                      type="email"
                      placeholder="hello@yourbusiness.com"
                      value={bizEmail}
                      onChange={(e) => setBizEmail(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Set type of business</h2>
                    <p className="text-sm text-muted-foreground">
                      We'll route you to the right dashboard.
                    </p>
                  </div>
                </div>
                <div className="space-y-5">
                  {Object.entries(groupedCategories).map(([group, opts]) => (
                    <div key={group}>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {group}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((opt) => {
                          const active = category === opt.value;
                          return (
                            <button type="button"
                              key={opt.value}
                              onClick={() => setCategory(opt.value)}
                              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-card text-foreground hover:border-primary/40"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Contact person</h2>
                    <p className="text-sm text-muted-foreground">Who should we reach out to?</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      inputMode="tel"
                      placeholder="(555) 123-4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Profile photo</h2>
                    <p className="text-sm text-muted-foreground">Add a logo. You can skip and add it later.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : uploadingLogo ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    {logoUrl && (
                      <button type="button"
                        onClick={() => setLogoUrl(null)}
                        className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInput.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAsset(f, "logo");
                    }}
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Cover photo</h2>
                    <p className="text-sm text-muted-foreground">Add a banner. You can skip and add it later.</p>
                  </div>
                </div>
                <div className="space-y-4 py-2">
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {uploadingBanner ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    {bannerUrl && (
                      <button type="button"
                        onClick={() => setBannerUrl(null)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => bannerInput.current?.click()}
                      disabled={uploadingBanner}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {bannerUrl ? "Change cover" : "Upload cover"}
                    </Button>
                  </div>
                  <input
                    ref={bannerInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAsset(f, "banner");
                    }}
                  />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 12px)" }}
      >
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          {step > 1 && (
            <Button variant="outline" className="h-12 flex-1" onClick={goBack} disabled={submitting}>
              Back
            </Button>
          )}
          {(step === 4 || step === 5) && (
            <Button
              variant="ghost"
              className="h-12 flex-1"
              onClick={step === 5 ? handleComplete : goNext}
              disabled={submitting}
            >
              Skip
            </Button>
          )}
          {step < STEP_COUNT ? (
            <Button
              className="h-12 flex-1"
              onClick={goNext}
              disabled={!canContinue() || submitting}
            >
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-12 flex-1"
              onClick={handleComplete}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Go to dashboard
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Leave confirm */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave business setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved edits on this step will be lost. Saved steps will still be here when you come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={savingExit}>Stay</AlertDialogCancel>
            <Button
              type="button"
              variant="secondary"
              onClick={saveAndExit}
              disabled={savingExit || (step === 1 && !canContinue())}
              className="gap-1.5"
            >
              {savingExit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save &amp; exit
            </Button>
            <AlertDialogAction
              onClick={confirmLeave}
              disabled={savingExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
