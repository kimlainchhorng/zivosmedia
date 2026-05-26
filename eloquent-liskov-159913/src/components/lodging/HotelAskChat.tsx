/**
 * HotelAskChat — On-page Q&A for a hotel detail page. Floating CTA + slide-up
 * chat panel that answers questions grounded in the property's live data via
 * the `hotel-ask` edge function.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  storeId: string;
  storeName?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What's the cheapest room?",
  "Is breakfast included?",
  "What's the cancellation policy?",
  "Are pets allowed?",
  "Check-in and check-out times?",
];

export default function HotelAskChat({ storeId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, open]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (trimmed.length < 2 || loading) return;
    setError(null);
    setInput("");
    setLoading(true);
    const nextHistory: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextHistory);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("hotel-ask", {
        body: {
          store_id: storeId,
          question: trimmed,
          history: messages.slice(-8),
        },
      });
      if (fnErr) throw new Error(fnErr.message || "Could not reach assistant");
      if (data?.error) throw new Error(data.error);
      const answer = String(data?.answer || "").trim();
      if (!answer) throw new Error("Empty response");
      setMessages([...nextHistory, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inline trigger — placed by the parent page near the bottom of the
          content. Replaces the previous floating button, which obscured the
          sticky booking CTA on mobile. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask AI about this hotel"
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 hover:from-violet-500/15 hover:via-fuchsia-500/15 hover:to-violet-500/15 text-foreground text-sm font-bold px-4 py-3 active:scale-[0.99] transition"
      >
        <Sparkles className="w-4 h-4 text-fuchsia-500" />
        Ask AI about this property
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl max-w-lg mx-auto w-full max-h-[88vh] flex flex-col safe-area-bottom"
            >
              <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold leading-tight truncate">Ask about this stay</h2>
                    {storeName && (
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">{storeName}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                    <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-bold mb-1">Ask anything about this property</p>
                    <p className="text-[11px] text-muted-foreground">
                      Answers are grounded in the live listing data — rooms, amenities, policies, and reviews.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-full border border-border bg-card hover:border-primary/40 hover:bg-muted/40 px-2.5 py-1 text-[11px] font-medium transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap " +
                      (m.role === "user"
                        ? "ml-auto bg-foreground text-background"
                        : "bg-muted/60 text-foreground")
                    }
                  >
                    {m.content}
                  </div>
                ))}

                {loading && (
                  <div className="bg-muted/60 rounded-2xl px-3 py-2 text-sm inline-flex items-center gap-2 max-w-[85%]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Thinking…
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300">
                    {error}
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 p-3 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                  placeholder="Ask a question…"
                  className="flex-1 rounded-xl bg-muted/40 border border-border/30 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  maxLength={400}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => ask(input)}
                  disabled={loading || input.trim().length < 2}
                  aria-label="Send"
                  className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 text-white px-3 transition active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
