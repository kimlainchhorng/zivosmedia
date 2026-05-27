/**
 * Store Setup Wizard — Multi-step onboarding for store owners.
 * Steps: 1) Owner Profile  2) Store Details  3) Payment Setup  4) Review
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Store, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Loader2, Upload, X, MapPin, Phone, Clock, Image, Building2, Globe } from "lucide-react";
import { STORE_CATEGORY_OPTIONS } from "@/config/groceryStores";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, label: "Owner", icon: User },
  { id: 2, label: "Store", icon: Store },
  { id: 3, label: "Payment", icon: CreditCard },
  { id: 4, label: "Review", icon: CheckCircle },
];

const DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { open: "8:00 AM", close: "5:00 PM", closed: false },
  tue: { open: "8:00 AM", close: "5:00 PM", closed: false },
  wed: { open: "8:00 AM", close: "5:00 PM", closed: false },
  thu: { open: "8:00 AM", close: "5:00 PM", closed: false },
  fri: { open: "8:00 AM", close: "5:00 PM", closed: false },
  sat: { open: "9:00 AM", close: "3:00 PM", closed: false },
  sun: { open: "9:00 AM", close: "3:00 PM", closed: true },
};

const TIME_OPTIONS = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM",
  "11:00 PM", "11:30 PM", "12:00 AM",
];

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "auto-repair": "Describe your auto repair services, specialties, and certifications...",
  "grocery": "Describe what products you carry, brands, organic options...",
  "restaurant": "Describe your cuisine, specialties, dining experience...",
  "cafe": "Describe your coffee, drinks, pastries, and atmosphere...",
  "pharmacy": "Describe your pharmacy services, prescriptions, health products...",
  "electronics": "Describe the electronics, brands, and services you offer...",
  "clothing": "Describe your fashion style, brands, and collections...",
  "bakery": "Describe your baked goods, specialties, and custom orders...",
};

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function parseSchedule(hours: string): WeekSchedule {
  if (!hours) return { ...DEFAULT_SCHEDULE };
  try {
    const parsed = typeof hours === "string" ? JSON.parse(hours) : hours;
    const schedule: WeekSchedule = {};
    for (const day of DAYS) {
      const d = parsed[day.key];
      schedule[day.key] = d
        ? { open: d.open || "8:00 AM", close: d.close || "5:00 PM", closed: d.closed ?? false }
        : { ...DEFAULT_SCHEDULE[day.key] };
    }
    return schedule;
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

function formatScheduleDisplay(schedule: WeekSchedule): string {
  const groups: { days: string[]; time: string }[] = [];
  for (const day of DAYS) {
    const d = schedule[day.key];
    const time = d.closed ? "Closed" : `${d.open} – ${d.close}`;
    const last = groups[groups.length - 1];
    if (last && last.time === time) {
      last.days.push(day.short);
    } else {
      groups.push({ days: [day.short], time });
    }
  }
  return groups.map(g =>
    `${g.days.length > 1 ? `${g.days[0]}–${g.days[g.days.length - 1]}` : g.days[0]}: ${g.time}`
  ).join(" · ");
}

export default function StoreSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Owner profile fields
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Store detail fields
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [storeCategory, setStoreCategory] = useState("grocery");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [schedule, setSchedule] = useState<WeekSchedule>({ ...DEFAULT_SCHEDULE });
  const [showSchedule, setShowSchedule] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [storeMarket, setStoreMarket] = useState("US");

  // Payment fields
  const [abaAccount, setAbaAccount] = useState("");
  const [abaHolder, setAbaHolder] = useState("");
  const [wingAccount, setWingAccount] = useState("");
  const [wingHolder, setWingHolder] = useState("");
  const [acledaAccount, setAcledaAccount] = useState("");
  const [acledaHolder, setAcledaHolder] = useState("");

  // Fetch the user's store
  const { data: myStore, isLoading: loadingStore } = useQuery({
    queryKey: ["my-store", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill from existing data
  useEffect(() => {
    if (user) {
      setOwnerEmail(user.email || "");
      setOwnerName(user.user_metadata?.full_name || "");
    }
  }, [user]);

  useEffect(() => {
    if (myStore) {
      if (myStore.setup_complete) {
        navigate(`/admin/stores/${myStore.id}`, { replace: true });
        return;
      }
      setStoreName(myStore.name || "");
      setStoreSlug(myStore.slug || "");
      setStoreDesc(myStore.description || "");
      setStoreCategory(myStore.category || "grocery");
      setStoreAddress(myStore.address || "");
      setStorePhone(myStore.phone ? formatPhone(myStore.phone) : "");
      setSchedule(parseSchedule(myStore.hours || ""));
      setLogoUrl(myStore.logo_url || "");
      setBannerUrl(myStore.banner_url || "");
      setStoreMarket(myStore.market || "US");
    }
  }, [myStore, navigate]);

  // Auto-generate slug from name
  useEffect(() => {
    if (storeName && !myStore?.slug) {
      setStoreSlug(storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }, [storeName, myStore?.slug]);

  const descPlaceholder = useMemo(() =>
    CATEGORY_PLACEHOLDERS[storeCategory] || "Describe your business and what you offer...",
    [storeCategory]
  );

  const uploadImage = async (file: File, type: "logo" | "banner") => {
    const isLogo = type === "logo";
    isLogo ? setUploadingLogo(true) : setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `setup/${user!.id}/${type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
      isLogo ? setLogoUrl(urlData.publicUrl) : setBannerUrl(urlData.publicUrl);
      toast.success(`${isLogo ? "Logo" : "Banner"} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      isLogo ? setUploadingLogo(false) : setUploadingBanner(false);
    }
  };

  const updateDay = (dayKey: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const handlePhoneChange = (value: string, setter: (v: string) => void) => {
    setter(formatPhone(value));
  };

  // Save draft to DB (setup_complete stays false)
  const saveDraft = async (silent = true) => {
    if (!user) return;
    setSavingDraft(true);
    try {
      // Save owner profile
      await supabase.from("profiles").update({
        full_name: ownerName || undefined,
        phone: ownerPhone.replace(/\D/g, "") || null,
        email: ownerEmail.trim() || user.email || null,
      }).eq("user_id", user.id);

      const hoursJson = JSON.stringify(schedule);
      const storeData: Record<string, any> = {
        name: storeName || "Untitled Store",
        slug: storeSlug || `store-${Date.now()}`,
        description: storeDesc || null,
        category: storeCategory,
        address: storeAddress || null,
        phone: storePhone.replace(/\D/g, "") || null,
        hours: hoursJson,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        owner_id: user.id,
        setup_complete: false,
        is_active: false,
        market: storeMarket,
      };

      if (myStore?.id) {
        await supabase.from("store_profiles").update(storeData as any).eq("id", myStore.id);
      } else {
        const { data } = await supabase.from("store_profiles").insert(storeData as any).select("id").single();
      }

      setLastSaved(new Date());
      if (!silent) toast.success("Draft saved! You can come back anytime.");
    } catch (err: any) {
      if (!silent) toast.error("Could not save draft");
      console.error("Draft save error:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  // Auto-save when moving to next step
  const goToStep = async (nextStep: number) => {
    if (nextStep > step) {
      await saveDraft(true);
    }
    setStep(nextStep);
  };

  const handleSaveAndExit = async () => {
    await saveDraft(false);
    navigate("/shop-dashboard", { replace: true });
  };

  const canProceed = () => {
    if (step === 1) return ownerName.trim().length > 0 && ownerEmail.trim().length > 0;
    if (step === 2) return storeName.trim().length > 0 && storeSlug.trim().length > 0;
    return true;
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        full_name: ownerName,
        phone: ownerPhone.replace(/\D/g, "") || null,
        email: ownerEmail.trim() || user.email || null,
      }).eq("user_id", user.id);

      const hoursJson = JSON.stringify(schedule);
      const storeData = {
        name: storeName,
        slug: storeSlug,
        description: storeDesc || null,
        category: storeCategory,
        address: storeAddress || null,
        phone: storePhone.replace(/\D/g, "") || null,
        hours: hoursJson,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        owner_id: user.id,
        setup_complete: true,
        is_active: true,
        market: storeMarket,
      };

      let storeId = myStore?.id;

      if (storeId) {
        const { error } = await supabase.from("store_profiles").update(storeData).eq("id", storeId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("store_profiles").insert(storeData).select("id").single();
        if (error) throw error;
        storeId = data.id;
      }

      if (abaAccount || wingAccount || acledaAccount) {
        const payments = [];
        if (abaAccount) payments.push({ store_id: storeId!, provider: "aba", account_number: abaAccount, account_holder_name: abaHolder, is_enabled: true, qr_code_url: "" });
        if (wingAccount) payments.push({ store_id: storeId!, provider: "wing", account_number: wingAccount, account_holder_name: wingHolder, is_enabled: true, qr_code_url: "" });
        if (acledaAccount) payments.push({ store_id: storeId!, provider: "acleda", account_number: acledaAccount, account_holder_name: acledaHolder, is_enabled: true, qr_code_url: "" });
        for (const pm of payments) {
          await supabase.from("store_payment_methods").upsert(pm, { onConflict: "store_id,provider" });
        }
      }

      toast.success("Store setup complete! 🎉");
      navigate(`/admin/stores/${storeId}`, { replace: true });
    } catch (err: any) {
      console.error("Store setup error:", err);
      toast.error(err?.message || "Failed to complete setup");
    } finally {
      setSaving(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-[#0a1628] to-[#0d2137]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const storeId = myStore?.id || "new";
  const displayId = `CBD${(storeId === "new" ? "00000000" : storeId.replace(/-/g, "").slice(0, 8)).toUpperCase()}`;

  const isUS = storeMarket === "US";
  const phonePlaceholder = isUS ? "(225) 280-9604" : "+855 12 345 678";
  const categoryLabel = STORE_CATEGORY_OPTIONS.find(o => o.value === storeCategory)?.label || storeCategory;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a1628] to-[#0d2137] px-4 py-6 sm:py-8 safe-area-top">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 mb-3">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Store Setup</h1>
          <p className="text-white/50 text-sm mt-1">Get your store up and running in minutes</p>
          <p className="text-white/25 text-[11px] font-mono mt-1">ID: {displayId}</p>
        </div>

        {/* Step Indicator — Compact pill style */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <button type="button"
                  onClick={() => { if (isDone) goToStep(s.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                      : isDone
                        ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                        : "bg-white/[0.06] text-white/30"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.id}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 sm:w-6 h-0.5 rounded-full transition-colors duration-300 ${isDone ? "bg-primary/60" : "bg-white/[0.08]"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="bg-white/[0.06] backdrop-blur-2xl border-white/[0.1] shadow-2xl shadow-black/20 overflow-hidden">
          <CardContent className="p-5 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1: Owner Profile */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-0.5">Owner Profile</h2>
                      <p className="text-white/40 text-[13px]">Tell us about yourself</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px]">Full Name *</Label>
                        <Input
                          value={ownerName}
                          onChange={e => setOwnerName(e.target.value)}
                          placeholder="Your full name"
                          className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px]">Email</Label>
                        <Input
                          value={ownerEmail}
                          onChange={e => setOwnerEmail(e.target.value)}
                          type="email"
                          autoComplete="email"
                          autoCapitalize="off"
                          autoCorrect="off"
                          inputMode="email"
                          placeholder="owner@yourstore.com"
                          className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px]">Phone Number</Label>
                        <Input
                          value={ownerPhone}
                          onChange={e => handlePhoneChange(e.target.value, setOwnerPhone)}
                          placeholder={phonePlaceholder}
                          className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Store Details */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-0.5">Store Details</h2>
                      <p className="text-white/40 text-[13px]">Set up your store information</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px]">Store Name *</Label>
                          <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="My Store" className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px]">URL Slug *</Label>
                          <Input value={storeSlug} onChange={e => setStoreSlug(e.target.value)} placeholder="my-store" className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50 font-mono text-[13px]" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px]">Description</Label>
                        <Textarea value={storeDesc} onChange={e => setStoreDesc(e.target.value)} placeholder={descPlaceholder} rows={2} className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 rounded-xl focus:border-primary/50 text-[13px]" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px]">Category</Label>
                          <select value={storeCategory} onChange={e => setStoreCategory(e.target.value)} className="flex h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 py-2 text-[13px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                            {Array.from(new Set(STORE_CATEGORY_OPTIONS.map(o => o.group || "Other"))).map(group => (
                              <optgroup key={group} label={group} className="bg-[#0d2137] text-white">
                                {STORE_CATEGORY_OPTIONS.filter(o => (o.group || "Other") === group).map(opt => (
                                  <option key={opt.value} value={opt.value} className="bg-[#0d2137] text-white">{opt.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px] flex items-center gap-1"><Globe className="w-3 h-3" /> Market</Label>
                          <select value={storeMarket} onChange={e => setStoreMarket(e.target.value)} className="flex h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 py-2 text-[13px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                            <option value="US" className="bg-[#0d2137] text-white">🇺🇸 United States</option>
                            <option value="KH" className="bg-[#0d2137] text-white">🇰🇭 Cambodia</option>
                          </select>
                        </div>
                      </div>

                      {/* Logo & Banner uploads */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px] flex items-center gap-1"><Image className="w-3 h-3" /> Logo</Label>
                          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, "logo"); e.target.value = ""; }} />
                          {logoUrl ? (
                            <div className="relative w-24 h-24 rounded-2xl border border-white/[0.12] overflow-hidden group bg-white/[0.04]">
                              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button type="button" onClick={() => logoRef.current?.click()} className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center"><Upload className="h-3.5 w-3.5 text-zinc-800" /></button>
                                <button type="button" onClick={() => setLogoUrl("")} className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo} className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/[0.15] hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 text-white/30 hover:text-primary transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]">
                              {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px] font-medium">Upload</span></>}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-[13px] flex items-center gap-1"><Image className="w-3 h-3" /> Banner</Label>
                          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, "banner"); e.target.value = ""; }} />
                          {bannerUrl ? (
                            <div className="relative w-full h-24 rounded-2xl border border-white/[0.12] overflow-hidden group bg-white/[0.04]">
                              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button type="button" onClick={() => bannerRef.current?.click()} className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center"><Upload className="h-3.5 w-3.5 text-zinc-800" /></button>
                                <button type="button" onClick={() => setBannerUrl("")} className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploadingBanner} className="w-full h-24 rounded-2xl border-2 border-dashed border-white/[0.15] hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 text-white/30 hover:text-primary transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]">
                              {uploadingBanner ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="text-[10px] font-medium">Upload</span></>}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
                        <Input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="123 Main Street, City, State ZIP" className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-[13px] flex items-center gap-1"><Phone className="w-3 h-3" /> Store Phone</Label>
                        <Input value={storePhone} onChange={e => handlePhoneChange(e.target.value, setStorePhone)} placeholder={phonePlaceholder} className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 h-11 rounded-xl focus:border-primary/50" />
                      </div>

                      {/* Operating Hours — Expandable Schedule */}
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setShowSchedule(!showSchedule)}
                          className="w-full flex items-center justify-between py-2"
                        >
                          <Label className="text-white/60 text-[13px] flex items-center gap-1 cursor-pointer"><Clock className="w-3 h-3" /> Operating Hours</Label>
                          <span className="text-[11px] text-primary font-medium">{showSchedule ? "Collapse" : "Set Hours"}</span>
                        </button>

                        {!showSchedule && (
                          <p className="text-white/30 text-[11px] leading-relaxed">
                            {formatScheduleDisplay(schedule)}
                          </p>
                        )}

                        <AnimatePresence>
                          {showSchedule && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 space-y-2">
                                {DAYS.map(day => {
                                  const d = schedule[day.key];
                                  return (
                                    <div key={day.key} className="flex items-center gap-2">
                                      <span className="text-white/50 text-[12px] w-10 shrink-0 font-medium">{day.short}</span>
                                      <Switch
                                        checked={!d.closed}
                                        onCheckedChange={(v) => updateDay(day.key, "closed", !v)}
                                        className="scale-75 shrink-0"
                                      />
                                      {d.closed ? (
                                        <span className="text-white/25 text-[12px] italic">Closed</span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 flex-1">
                                          <select value={d.open} onChange={e => updateDay(day.key, "open", e.target.value)} className="flex-1 h-7 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-primary/30">
                                            {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#0d2137]">{t}</option>)}
                                          </select>
                                          <span className="text-white/25 text-[11px]">–</span>
                                          <select value={d.close} onChange={e => updateDay(day.key, "close", e.target.value)} className="flex-1 h-7 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-primary/30">
                                            {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[#0d2137]">{t}</option>)}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Payment Setup */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-0.5">Payment Setup</h2>
                      <p className="text-white/40 text-[13px]">Add payment accounts <span className="text-white/25">(optional — configure later)</span></p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: "ABA PayWay", acc: abaAccount, setAcc: setAbaAccount, holder: abaHolder, setHolder: setAbaHolder },
                        { name: "Wing Bank", acc: wingAccount, setAcc: setWingAccount, holder: wingHolder, setHolder: setWingHolder },
                        { name: "ACLEDA Bank", acc: acledaAccount, setAcc: setAcledaAccount, holder: acledaHolder, setHolder: setAcledaHolder },
                      ].map(pm => (
                        <div key={pm.name} className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
                          <h3 className="text-white font-medium text-[13px]">{pm.name}</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-white/50 text-[11px]">Account Number</Label>
                              <Input value={pm.acc} onChange={e => pm.setAcc(e.target.value)} placeholder="000 123 456" className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 text-[13px] h-10 rounded-xl" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-white/50 text-[11px]">Account Holder</Label>
                              <Input value={pm.holder} onChange={e => pm.setHolder(e.target.value)} placeholder="Name on account" className="bg-white/[0.07] border-white/[0.12] text-white placeholder:text-white/30 text-[13px] h-10 rounded-xl" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-0.5">Review & Confirm</h2>
                      <p className="text-white/40 text-[13px]">Make sure everything looks good</p>
                    </div>
                    <div className="space-y-3">
                      {/* Owner */}
                      <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
                        <h3 className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-2">Owner</h3>
                        <p className="text-white font-medium text-[14px]">{ownerName}</p>
                        <p className="text-white/40 text-[13px]">{ownerEmail}</p>
                        {ownerPhone && <p className="text-white/40 text-[13px]">{ownerPhone}</p>}
                      </div>
                      {/* Store */}
                      <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
                        <h3 className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-2">Store</h3>
                        <div className="flex items-center gap-3 mb-2">
                          {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/[0.1]" />}
                          <div>
                            <p className="text-white font-semibold text-[14px]">{storeName}</p>
                            <p className="text-white/40 text-[12px]">/{storeSlug} · {categoryLabel} · {storeMarket === "US" ? "🇺🇸" : "🇰🇭"}</p>
                          </div>
                        </div>
                        {storeDesc && <p className="text-white/30 text-[13px] mt-1">{storeDesc}</p>}
                        {storeAddress && <p className="text-white/40 text-[12px] mt-2 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {storeAddress}</p>}
                        {storePhone && <p className="text-white/40 text-[12px] flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {storePhone}</p>}
                        <p className="text-white/30 text-[11px] mt-2 flex items-start gap-1"><Clock className="w-3 h-3 shrink-0 mt-0.5" /> {formatScheduleDisplay(schedule)}</p>
                      </div>
                      {/* Payment */}
                      <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4">
                        <h3 className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-2">Payment</h3>
                        {abaAccount || wingAccount || acledaAccount ? (
                          <div className="space-y-1">
                            {abaAccount && <p className="text-white/60 text-[13px]">ABA: {abaHolder} — {abaAccount}</p>}
                            {wingAccount && <p className="text-white/60 text-[13px]">Wing: {wingHolder} — {wingAccount}</p>}
                            {acledaAccount && <p className="text-white/60 text-[13px]">ACLEDA: {acledaHolder} — {acledaAccount}</p>}
                          </div>
                        ) : (
                          <p className="text-white/30 text-[13px]">No payment methods — configure later in dashboard</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Auto-save indicator */}
            {lastSaved && (
              <p className="text-white/20 text-[10px] text-center mt-4">
                Draft saved {lastSaved.toLocaleTimeString()}
              </p>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-white/50 hover:text-white hover:bg-white/[0.08] rounded-xl h-10 px-4 text-[13px]">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={handleSaveAndExit}
                  disabled={savingDraft}
                  className="text-white/40 hover:text-white hover:bg-white/[0.08] rounded-xl h-10 px-4 text-[13px]"
                >
                  {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Save & Exit
                </Button>
              </div>

              {step < 4 ? (
                <Button onClick={() => goToStep(step + 1)} disabled={!canProceed()} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-6 text-[13px] font-semibold shadow-lg shadow-primary/20">
                  Next <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 min-w-[160px] text-[13px] font-semibold shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Complete Setup <CheckCircle className="w-4 h-4 ml-1.5" /></>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
