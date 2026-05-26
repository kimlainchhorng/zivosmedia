import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Store, Phone, Mail, MapPin, Clock,
  Image as ImageIcon, ShieldCheck, Camera, Loader2, Upload, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* -----------------------------------------------------------
 * Partner Onboarding Wizard
 * Flow:  Shop name → Contact → Address → Hours → Profile → Cover → Verify
 * --------------------------------------------------------- */

const PARTNER_LABELS: Record<string, { title: string; emoji: string; nameLabel: string; namePlaceholder: string }> = {
  driver: { title: "Driver Onboarding", emoji: "🚗", nameLabel: "Full Name", namePlaceholder: "John Smith" },
  restaurant: { title: "Restaurant Partner", emoji: "🍽️", nameLabel: "Restaurant Name", namePlaceholder: "e.g. Sushi House" },
  store: { title: "Shop Partner", emoji: "🛍️", nameLabel: "Shop Name", namePlaceholder: "e.g. Bloom Boutique" },
  "auto-repair": { title: "Auto Repair Partner", emoji: "🔧", nameLabel: "Shop Name", namePlaceholder: "e.g. Quick Fix Garage" },
  "auto-dealership": { title: "Auto Dealership", emoji: "🚙", nameLabel: "Dealership Name", namePlaceholder: "e.g. Premier Motors" },
  hotel: { title: "Hotel Partner", emoji: "🏨", nameLabel: "Property Name", namePlaceholder: "e.g. Grand Hotel" },
  salon: { title: "Salon Partner", emoji: "✂️", nameLabel: "Salon Name", namePlaceholder: "e.g. Glow Studio" },
  "nail-salon": { title: "Nail Salon Partner", emoji: "💅", nameLabel: "Salon Name", namePlaceholder: "e.g. Polished Nails" },
  spa: { title: "Spa Partner", emoji: "🧖", nameLabel: "Spa Name", namePlaceholder: "e.g. Serenity Spa" },
  fitness: { title: "Fitness Partner", emoji: "🏋️", nameLabel: "Gym Name", namePlaceholder: "e.g. Iron Fitness" },
  tutor: { title: "Tutor Partner", emoji: "🎓", nameLabel: "Your / Center Name", namePlaceholder: "e.g. Bright Minds" },
  clinic: { title: "Clinic Partner", emoji: "🩺", nameLabel: "Clinic Name", namePlaceholder: "e.g. City Health Clinic" },
  "pet-care": { title: "Pet Care Partner", emoji: "🐾", nameLabel: "Business Name", namePlaceholder: "e.g. Happy Tails" },
  "service-pro": { title: "Service Pro", emoji: "🧰", nameLabel: "Business Name", namePlaceholder: "e.g. Spotless Cleaning" },
  photographer: { title: "Photographer", emoji: "📸", nameLabel: "Studio / Your Name", namePlaceholder: "e.g. Lens & Light" },
  event: { title: "Event Partner", emoji: "🎤", nameLabel: "Business Name", namePlaceholder: "e.g. Beat Events" },
  employer: { title: "Employer / HR", emoji: "💼", nameLabel: "Company Name", namePlaceholder: "e.g. Bright Futures Inc." },
};

const FALLBACK = { title: "Partner Onboarding", emoji: "🤝", nameLabel: "Business Name", namePlaceholder: "Your business name" };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  hours: Record<Day, { open: string; close: string; closed: boolean }>;
  profileUrl: string;
  coverUrl: string;
  description: string;
}

const defaultHours = (): FormState["hours"] =>
  DAYS.reduce((acc, d) => {
    acc[d] = { open: "09:00", close: "18:00", closed: d === "Sun" };
    return acc;
  }, {} as FormState["hours"]);

const initialForm = (): FormState => ({
  name: "", phone: "", email: "", address: "", city: "",
  hours: defaultHours(), profileUrl: "", coverUrl: "", description: "",
});

const STEPS = [
  { id: "name", title: "Business Name", icon: Store },
  { id: "contact", title: "Contact Info", icon: Phone },
  { id: "address", title: "Address", icon: MapPin },
  { id: "hours", title: "Open Hours", icon: Clock },
  { id: "profile", title: "Profile Photo", icon: Camera },
  { id: "cover", title: "Cover Photo", icon: ImageIcon },
  { id: "verify", title: "Verification", icon: ShieldCheck },
] as const;

const phoneRe = /^[+\d][\d\s\-()]{6,20}$/;
const emailSchema = z.string().trim().email().max(255);

export default function PartnerOnboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const type = params.get("type") || "store";
  const meta = PARTNER_LABELS[type] || FALLBACK;
  const storageKey = `partner_onboarding_${type}`;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setForm({ ...initialForm(), ...JSON.parse(raw) });
    } catch {}
  }, [storageKey]);

  // persist draft
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(form)); } catch {}
  }, [form, storageKey]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validateStep = (): string | null => {
    const s = STEPS[step].id;
    if (s === "name" && form.name.trim().length < 2) return "Please enter a valid name (min 2 chars).";
    if (s === "contact") {
      if (!phoneRe.test(form.phone.trim())) return "Enter a valid phone number.";
      const eRes = emailSchema.safeParse(form.email);
      if (!eRes.success) return "Enter a valid email.";
    }
    if (s === "address" && (form.address.trim().length < 4 || form.city.trim().length < 2))
      return "Enter a valid address and city.";
    if (s === "profile" && !form.profileUrl) return "Add a profile photo to continue.";
    if (s === "cover" && !form.coverUrl) return "Add a cover photo to continue.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const back = () => (step === 0 ? navigate(-1) : setStep(step - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const documents = {
        address: form.address,
        city: form.city,
        hours: form.hours,
        profileUrl: form.profileUrl,
        coverUrl: form.coverUrl,
      };

      if (user) {
        // Try to update the pending application created during signup
        const { data: existing } = await (supabase as any)
          .from("partner_applications")
          .select("id")
          .eq("user_id", user.id)
          .eq("partner_kind", type)
          .eq("status", "pending")
          .maybeSingle();

        if (existing?.id) {
          const { error } = await (supabase as any)
            .from("partner_applications")
            .update({
              business_name: form.name || undefined,
              contact_phone: form.phone || null,
              contact_email: form.email || null,
              description: form.description || null,
              documents,
              status: "submitted",
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("partner_applications")
            .insert({
              user_id: user.id,
              business_name: form.name,
              partner_kind: type,
              contact_email: form.email,
              contact_phone: form.phone || null,
              description: form.description || null,
              documents,
              status: "submitted",
            });
          if (error) throw error;
        }
      }

      try { localStorage.removeItem(storageKey); } catch {}
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  /* ---------- Success ---------- */
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6"
        >
          <Check className="w-12 h-12 text-primary-foreground" strokeWidth={3} />
        </motion.div>
        <h1 className="font-display text-2xl font-extrabold text-center mb-2">
          Application Submitted!
        </h1>
        <p className="text-muted-foreground text-center max-w-sm mb-8 text-sm leading-relaxed">
          Thanks <span className="font-semibold text-foreground">{form.name}</span>! Our team will verify your{" "}
          {meta.title.toLowerCase()} application within <span className="font-semibold text-foreground">24–48 hours</span>.
          You'll receive a confirmation at <span className="font-semibold text-foreground">{form.email}</span>.
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/more")}>
            Done
          </Button>
          <Button className="flex-1 rounded-xl" onClick={() => { setSubmitted(false); setStep(0); setForm(initialForm()); }}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Add Another
          </Button>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 pt-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={back} className="rounded-xl" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-base truncate">
              {meta.emoji} {meta.title}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Step {step + 1} of {STEPS.length} • {STEPS[step].title}
            </p>
          </div>
        </div>
        {/* progress */}
        <div className="max-w-2xl mx-auto mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[step].id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center mb-3 shadow-lg shadow-primary/10">
                <StepIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-extrabold">{STEPS[step].title}</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {stepHint(STEPS[step].id)}
              </p>
            </div>

            {/* Step body */}
            <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              {STEPS[step].id === "name" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{meta.nameLabel} *</Label>
                  <Input
                    autoFocus maxLength={100}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={meta.namePlaceholder}
                    className="h-12 rounded-xl text-base"
                  />
                  <Label className="text-xs font-semibold pt-3 block">Short Description (optional)</Label>
                  <Textarea
                    maxLength={300}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Tell customers what makes you special..."
                    className="rounded-xl resize-none min-h-[80px]"
                  />
                </div>
              )}

              {STEPS[step].id === "contact" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel" inputMode="tel" maxLength={25}
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+1 (555) 123 4567"
                        className="h-12 pl-10 rounded-xl text-base"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email" maxLength={255}
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="business@example.com"
                        className="h-12 pl-10 rounded-xl text-base"
                      />
                    </div>
                  </div>
                </div>
              )}

              {STEPS[step].id === "address" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Street Address *</Label>
                    <Input
                      maxLength={200}
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="123 Main Street"
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">City *</Label>
                    <Input
                      maxLength={100}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="New York"
                      className="h-12 rounded-xl text-base"
                    />
                  </div>
                </div>
              )}

              {STEPS[step].id === "hours" && (
                <div className="space-y-2 w-full overflow-hidden">
                  {DAYS.map((d) => (
                    <div key={d} className="flex items-center gap-1.5 py-1.5 w-full">
                      <span className="w-9 shrink-0 text-xs font-bold">{d}</span>
                      {form.hours[d].closed ? (
                        <span className="flex-1 min-w-0 text-xs text-muted-foreground italic">Closed</span>
                      ) : (
                        <>
                          <Input
                            type="time"
                            value={form.hours[d].open}
                            onChange={(e) =>
                              update("hours", { ...form.hours, [d]: { ...form.hours[d], open: e.target.value } })
                            }
                            className="h-9 rounded-lg flex-1 min-w-0 w-0 text-xs px-2"
                          />
                          <span className="text-muted-foreground text-xs shrink-0">–</span>
                          <Input
                            type="time"
                            value={form.hours[d].close}
                            onChange={(e) =>
                              update("hours", { ...form.hours, [d]: { ...form.hours[d], close: e.target.value } })
                            }
                            className="h-9 rounded-lg flex-1 min-w-0 w-0 text-xs px-2"
                          />
                        </>
                      )}
                      <Button
                        type="button" variant="ghost" size="sm"
                        className="text-[10px] h-8 px-1.5 shrink-0"
                        onClick={() =>
                          update("hours", { ...form.hours, [d]: { ...form.hours[d], closed: !form.hours[d].closed } })
                        }
                      >
                        {form.hours[d].closed ? "Open" : "Close"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {STEPS[step].id === "profile" && (
                <ImagePicker
                  label="Profile Photo" hint="Square logo or photo. Min 400×400."
                  value={form.profileUrl}
                  onChange={(url) => update("profileUrl", url)}
                  shape="circle"
                />
              )}

              {STEPS[step].id === "cover" && (
                <ImagePicker
                  label="Cover Photo" hint="Wide banner shown on your profile. Min 1200×400."
                  value={form.coverUrl}
                  onChange={(url) => update("coverUrl", url)}
                  shape="banner"
                />
              )}

              {STEPS[step].id === "verify" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please review your details. Once submitted, our team will verify your application
                    within 24–48 hours.
                  </p>
                  <ReviewRow label={meta.nameLabel} value={form.name} />
                  <ReviewRow label="Phone" value={form.phone} />
                  <ReviewRow label="Email" value={form.email} />
                  <ReviewRow label="Address" value={`${form.address}, ${form.city}`} />
                  <ReviewRow
                    label="Open Hours"
                    value={DAYS.filter((d) => !form.hours[d].closed)
                      .map((d) => `${d} ${form.hours[d].open}-${form.hours[d].close}`)
                      .join(", ") || "Closed all week"}
                  />
                  <div className="flex items-center gap-3 pt-2">
                    {form.profileUrl && (
                      <img src={form.profileUrl} alt="Profile preview" className="w-14 h-14 rounded-full object-cover border border-border" />
                    )}
                    {form.coverUrl && (
                      <img src={form.coverUrl} alt="Cover preview" className="flex-1 h-14 rounded-lg object-cover border border-border" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer actions */}
      <footer className="sticky bottom-0 bg-card/90 backdrop-blur-xl border-t border-border/50 px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={back}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="flex-[2] h-12 rounded-xl" onClick={next}>
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button className="flex-[2] h-12 rounded-xl" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
              {submitting ? "Submitting..." : "Submit for Verification"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ---------- helpers ---------- */
function stepHint(id: string) {
  switch (id) {
    case "name": return "What's your business called?";
    case "contact": return "How can customers reach you?";
    case "address": return "Where are you located?";
    case "hours": return "When are you open?";
    case "profile": return "A clear profile photo builds trust.";
    case "cover": return "A great cover makes a strong first impression.";
    case "verify": return "Final review before submission.";
    default: return "";
  }
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm border-b border-border/40 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value || "—"}</span>
    </div>
  );
}

function ImagePicker({
  label, hint, value, onChange, shape,
}: {
  label: string; hint: string; value: string;
  onChange: (url: string) => void; shape: "circle" | "banner";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const previewClass = shape === "circle"
    ? "w-32 h-32 rounded-full"
    : "w-full aspect-[3/1] rounded-2xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef} type="file" accept="image/*" hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className={`${previewClass} bg-muted/50 border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-primary/50 transition-colors`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow"
              aria-label="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Upload className="w-7 h-7 mb-1" />
            <span className="text-xs font-medium">Tap to upload</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{hint}</p>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} className="text-xs">
          <Camera className="w-3.5 h-3.5 mr-1" /> Change Photo
        </Button>
      )}
    </div>
  );
}
