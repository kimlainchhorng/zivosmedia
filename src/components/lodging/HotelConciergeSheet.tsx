/**
 * HotelConciergeSheet — natural-language hotel ranker powered by the
 * `hotel-concierge` edge function (Anthropic Claude). Shown as a bottom sheet
 * with a prompt input, suggested chips, and ranked picks card list.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConciergePick { id: string; score: number; reason: string; }

interface HotelLite {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  banner_url: string | null;
  logo_url: string | null;
  pricePerNightCents?: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidates: HotelLite[];
  onSelect: (hotelId: string) => void;
}

const SUGGESTIONS = [
  "Beachfront resort under $80 with breakfast",
  "Family-friendly stay near Siem Reap with pool",
  "Quiet villa for a 5-night couples trip",
  "Pet-friendly guesthouse in Phnom Penh",
];

const formatPrice = (cents?: number | null) =>
  typeof cents === "number" && cents > 0 ? `$${Math.round(cents / 100)}` : null;

export default function HotelConciergeSheet({ isOpen, onClose, candidates, onSelect }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [narrator, setNarrator] = useState<string>("");
  const [picks, setPicks] = useState<ConciergePick[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPrompt("");
      setNarrator("");
      setPicks([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const run = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      toast.error("Please enter a longer description");
      return;
    }
    setLoading(true);
    setError(null);
    setPicks([]);
    setNarrator("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("hotel-concierge", {
        body: {
          prompt: trimmed,
          candidate_ids: candidates.map((c) => c.id).slice(0, 60),
          max: 5,
        },
      });
      if (fnErr) throw new Error(fnErr.message || "Could not reach concierge");
      if (data?.error) throw new Error(data.error);
      setNarrator(String(data?.narrator || ""));
      setPicks(Array.isArray(data?.picks) ? data.picks : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const candidateById = new Map(candidates.map((c) => [c.id, c] as const));

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
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl max-w-lg mx-auto w-full max-h-[92vh] overflow-y-auto safe-area-bottom"
          >
            <div className="sticky top-0 bg-background border-b border-border/50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold leading-tight">Find with AI</h2>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Describe your perfect stay — Claude ranks the best matches.
                  </p>
                </div>
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

            <div className="p-5 space-y-4">
              {/* Prompt input */}
              <div className="rounded-2xl border border-border bg-card p-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. beachfront with pool under $100, 2 adults, 3 nights"
                  rows={3}
                  className="w-full bg-transparent text-sm focus:outline-none resize-none"
                  maxLength={500}
                />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-[10px] text-muted-foreground">{prompt.length}/500</p>
                  <button
                    type="button"
                    onClick={() => run(prompt)}
                    disabled={loading || prompt.trim().length < 3}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 transition active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Ask AI
                  </button>
                </div>
              </div>

              {/* Suggestion chips */}
              {!loading && picks.length === 0 && !error && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setPrompt(s); run(s); }}
                      className="rounded-full border border-border bg-card hover:border-primary/40 hover:bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-foreground transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Narrator */}
              {narrator && (
                <p className="text-xs text-muted-foreground italic">{narrator}</p>
              )}

              {/* Picks */}
              {picks.length > 0 && (
                <div className="space-y-2.5">
                  {picks.map((p, idx) => {
                    const c = candidateById.get(p.id);
                    if (!c) return null;
                    const priceLabel = formatPrice(c.pricePerNightCents);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className="w-full rounded-2xl border border-border bg-card overflow-hidden text-left hover:border-primary/40 active:scale-[0.99] transition flex"
                      >
                        <div className="w-24 h-24 shrink-0 bg-muted relative">
                          {(c.banner_url || c.logo_url) ? (
                            <img
                              src={c.banner_url || c.logo_url || ""}
	                              alt={c.name}
	                              className="w-full h-full object-cover"
	                              loading="lazy"
	                              decoding="async"
	                            />
                          ) : null}
                          <span className="absolute top-1 left-1 rounded-full bg-foreground text-background text-[9px] font-extrabold px-1.5 py-0.5">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold truncate">{c.name}</p>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              {p.score}
                            </span>
                          </div>
                          {c.address && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{c.address}</p>
                          )}
                          <p className="mt-1 text-[11px] text-foreground/80 line-clamp-2">{p.reason}</p>
                          {priceLabel && (
                            <p className="mt-1 text-[11px] font-bold">
                              from <span className="text-emerald-600">{priceLabel}</span> /night
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
