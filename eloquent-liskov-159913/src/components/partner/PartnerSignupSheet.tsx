/**
 * PartnerSignupSheet — quick onboarding for drivers, restaurants, hotels, etc.
 *
 * Captures business name + contact + description and inserts a row into
 * partner_applications for the ops team to review.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import X from "lucide-react/dist/esm/icons/x";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Building from "lucide-react/dist/esm/icons/building";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import type { ComponentType, SVGProps } from "react";

export const PARTNER_SIGNUP_EVENT = "zivo:partner-signup-open";

export type PartnerKind = "driver" | "restaurant" | "hotel" | "rental" | "creator";

const KINDS: { kind: PartnerKind; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; gradient: string }[] = [
  { kind: "driver",     label: "Driver",       icon: Car,             gradient: "from-violet-500 to-fuchsia-500" },
  { kind: "restaurant", label: "Restaurant",   icon: UtensilsCrossed, gradient: "from-orange-500 to-rose-500" },
  { kind: "hotel",      label: "Hotel/Stay",   icon: Hotel,           gradient: "from-emerald-500 to-teal-500" },
  { kind: "rental",     label: "Car rental",   icon: Building,        gradient: "from-blue-500 to-cyan-500" },
  { kind: "creator",    label: "Creator",      icon: Sparkles,        gradient: "from-amber-500 to-pink-500" },
];

export function openPartnerSignup(kind?: PartnerKind) {
  window.dispatchEvent(new CustomEvent<PartnerKind | undefined>(PARTNER_SIGNUP_EVENT, { detail: kind }));
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function PartnerSignupSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PartnerKind | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PartnerKind | undefined>).detail;
      setKind(detail || null);
      setOpen(true);
    };
    window.addEventListener(PARTNER_SIGNUP_EVENT, handler as EventListener);
    return () => window.removeEventListener(PARTNER_SIGNUP_EVENT, handler as EventListener);
  }, []);

  const close = () => {
    setOpen(false);
    setKind(null);
    setName(""); setEmail(""); setPhone(""); setDesc("");
  };

  const submit = async () => {
    if (!user?.id || !kind || !name) { toast.error("Fill in business name"); return; }
    setSubmitting(true);
    try {
      const { error } = await (dbFrom("partner_applications") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
        user_id: user.id,
        partner_kind: kind,
        business_name: name,
        contact_email: email || user.email,
        contact_phone: phone,
        description: desc,
      });
      if (error) throw error;
      toast.success("Application submitted! We'll review within 48h.");
      close();
    } catch {
      toast.error("Couldn't submit application");
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] max-h-[88dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold">Partner with ZIVO</h3>
                <p className="text-[11px] text-muted-foreground">Reach customers on the super-app.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {!kind ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">I am a…</p>
                  <div className="grid grid-cols-2 gap-2">
                    {KINDS.map((k) => {
                      const Icon = k.icon;
                      return (
                        <button type="button"
                          key={k.kind}
                          onClick={() => setKind(k.kind)}
                          className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/40 bg-card hover:bg-muted/40 active:scale-[0.97] transition"
                        >
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${k.gradient} flex items-center justify-center shadow-sm`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-sm font-semibold">{k.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Contact email" type="email" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" type="tel" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Tell us a bit about your business…" rows={4} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setKind(null)} className="flex-1 py-2.5 rounded-xl bg-muted text-foreground font-semibold text-sm">Back</button>
                    <button type="button" onClick={() => void submit()} disabled={submitting || !name} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:opacity-80 disabled:opacity-50">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
