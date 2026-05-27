import { useState } from "react";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Phone, Mail, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const faqs = [
  { q: "How do I cancel a ride?", a: "Open the active ride screen, tap the three-dot menu, then select 'Cancel Ride'. Cancellations within 2 minutes of booking are free." },
  { q: "Why was I charged a cancellation fee?", a: "A $2–5 fee applies if you cancel after the driver has already started heading your way. You'll see the exact fee before confirming cancellation." },
  { q: "How do I report a lost item?", a: "Go to Ride History, tap the relevant ride, then tap 'Lost & Found'. We'll contact the driver on your behalf within 1 hour." },
  { q: "How do I update my payment method?", a: "Go to Profile → Wallet → Payment Methods. You can add, remove, or set a default payment method at any time." },
  { q: "Why is surge pricing active?", a: "Surge pricing activates during high demand periods (rush hours, events, bad weather) to encourage more drivers to be available in your area." },
  { q: "How do I become a driver?", a: "Tap the menu icon → 'Drive with ZIVO'. You'll need a valid driver's license, proof of insurance, and to pass a background check." },
  { q: "How do referral credits work?", a: "Share your unique code with friends. When they take their first ride, you both receive $10 in ride credit applied automatically." },
];

export default function PersonalHelpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await (supabase as any).from("feedback_submissions").insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        category: "support_ticket",
        message: `Subject: ${subject}\n\n${message}`,
      });
      toast.success("Support ticket submitted! We'll reply within 24 hours.");
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Help & Support" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px]">Help & Support</h1>
        </div>

        {/* Quick contact */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: MessageSquare, label: "Live Chat", color: "text-primary bg-primary/10", action: () => navigate("/chat") },
            { icon: Phone, label: "Call Us", color: "text-emerald-600 bg-emerald-500/10", action: () => { window.location.href = "tel:+18005551234"; } },
            { icon: Mail, label: "Email", color: "text-amber-600 bg-amber-500/10", action: () => { window.location.href = "mailto:support@zivo.app"; } },
          ].map(c => {
            const Icon = c.icon;
            return (
              <button type="button" key={c.label} onClick={c.action}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-foreground">{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-foreground" />
            <span className="text-[12px] font-bold text-foreground">Frequently Asked Questions</span>
          </div>
          {faqs.map((faq, i) => (
            <div key={i} className={i > 0 ? "border-t border-border/20" : ""}>
              <button type="button" className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="text-[13px] font-semibold text-foreground pr-3">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-3">
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Submit ticket */}
        <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <p className="text-[13px] font-bold text-foreground">Still need help?</p>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
            className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue..."
            className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" rows={4} />
          <Button className="w-full h-11 rounded-xl font-bold text-sm" disabled={!subject.trim() || !message.trim() || submitting} onClick={submitTicket}>
            {submitting ? "Submitting…" : "Submit Ticket"}
          </Button>
        </div>

        {/* External docs */}
        <button type="button" onClick={() => navigate("/support")}
          className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors">
          <span className="text-[13px] font-semibold text-foreground">Browse Help Center</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </AppLayout>
  );
}
