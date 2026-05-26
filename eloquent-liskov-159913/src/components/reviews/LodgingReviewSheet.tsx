import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  reservationId: string;
  guestName?: string | null;
  propertyName?: string;
  onSubmitted?: () => void;
}

const ASPECTS = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "comfort", label: "Comfort" },
  { key: "location_score", label: "Location" },
  { key: "staff", label: "Staff" },
  { key: "value", label: "Value" },
] as const;

type AspectKey = typeof ASPECTS[number]["key"];

function StarRow({ value, onChange, size = 7 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="transition-transform active:scale-90"
        >
          <Star
            className={`w-${size} h-${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function LodgingReviewSheet({
  isOpen,
  onClose,
  storeId,
  reservationId,
  guestName,
  propertyName,
  onSubmitted,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [overall, setOverall] = useState(5);
  const [sub, setSub] = useState<Record<AspectKey, number>>({
    cleanliness: 5,
    comfort: 5,
    location_score: 5,
    staff: 5,
    value: 5,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) {
      toast.error("Please share a few words about your stay");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        store_id: storeId,
        reservation_id: reservationId,
        guest_user_id: user?.id ?? null,
        guest_name: guestName?.trim() || (user?.email?.split("@")[0] ?? "Guest"),
        rating: overall,
        title: title.trim() || null,
        body: body.trim(),
        cleanliness: sub.cleanliness,
        comfort: sub.comfort,
        location_score: sub.location_score,
        staff: sub.staff,
        value: sub.value,
        source: "zivo_app",
        flagged: false,
      };
      const { error } = await (supabase as any).from("lodging_reviews").insert(payload);
      if (error) throw error;
      toast.success("Thanks for your review!");
      qc.invalidateQueries({ queryKey: ["hotel-detail-rpc", storeId] });
      qc.invalidateQueries({ queryKey: ["lodge-review-stats"] });
      setTitle("");
      setBody("");
      setOverall(5);
      setSub({ cleanliness: 5, comfort: 5, location_score: 5, staff: 5, value: 5 });
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Could not post review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl max-w-lg mx-auto w-full max-h-[92vh] overflow-y-auto safe-area-bottom"
          >
            <div className="sticky top-0 bg-background border-b border-border/50 px-5 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold truncate">Write a review</h2>
                {propertyName && (
                  <p className="text-[11px] text-muted-foreground truncate">{propertyName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Overall */}
              <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall rating</p>
                <StarRow value={overall} onChange={setOverall} size={8} />
                <p className="text-[11px] text-muted-foreground">{overall}.0 / 5.0</p>
              </div>

              {/* Sub-scores */}
              <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                {ASPECTS.map((a) => (
                  <div key={a.key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-foreground">{a.label}</span>
                    <StarRow
                      value={sub[a.key]}
                      onChange={(n) => setSub((prev) => ({ ...prev, [a.key]: n }))}
                      size={5}
                    />
                  </div>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Headline (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sum up your stay in a few words"
                  className="w-full rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  maxLength={120}
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Your review <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What did you love? What could be better? Other guests will read this."
                  rows={5}
                  className="w-full rounded-xl bg-muted/40 border border-border/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
                  maxLength={2000}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{body.length}/2000</p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 rounded-2xl font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Post review
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
