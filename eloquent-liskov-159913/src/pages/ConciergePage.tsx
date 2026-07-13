/**
 * ConciergePage — free-form trip orchestrator at /concierge.
 * Type a sentence, get a 3-step action plan that deep-links into the right
 * verticals (reserve / ride / flight / hotel / eats). Plan generation is
 * synchronous heuristics for now (see lib/conciergePlanner) — easy to swap
 * for a real LLM-backed endpoint later.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Send from "lucide-react/dist/esm/icons/send";
import Mic from "lucide-react/dist/esm/icons/mic";
import MicOff from "lucide-react/dist/esm/icons/mic-off";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { planFromQuery } from "@/lib/conciergePlanner";
import type { ConciergeStepKind } from "@/lib/conciergePlanner";
import SEOHead from "@/components/SEOHead";

const ICON_BY_KIND: Record<ConciergeStepKind, { icon: LucideIcon; tone: string }> = {
  reserve: { icon: CalendarClock, tone: "bg-orange-500/15 text-orange-600" },
  ride: { icon: Car, tone: "bg-emerald-500/15 text-emerald-600" },
  flight: { icon: Plane, tone: "bg-sky-500/15 text-sky-600" },
  hotel: { icon: BedDouble, tone: "bg-violet-500/15 text-violet-600" },
  eats: { icon: UtensilsCrossed, tone: "bg-orange-500/15 text-orange-600" },
};

const EXAMPLES = [
  "Dinner at 7pm in SoHo",
  "Weekend getaway in Bali",
  "Get me a ride to JFK at 5pm",
  "Sushi tonight near Brooklyn",
  "Hotel in Tokyo next weekend",
];

export default function ConciergePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [submitted, setSubmitted] = useState(query);
  const autorun = params.get("autorun") === "1";
  const [autorunCountdown, setAutorunCountdown] = useState<number | null>(null);

  const plan = useMemo(() => planFromQuery(submitted), [submitted]);

  // Autorun: when /concierge?q=...&autorun=1 lands, kick off a 3-second
  // countdown then jump into step 1. Lets shareable concierge links land
  // straight in the action without an extra tap. Cancel by tapping anywhere.
  useEffect(() => {
    if (!autorun) return;
    if (!submitted) return;
    if (!plan.steps.length) return;
    setAutorunCountdown(3);
    const interval = setInterval(() => {
      setAutorunCountdown((c) => {
        if (c == null) return null;
        if (c <= 1) {
          clearInterval(interval);
          navigate(plan.steps[0].to);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autorun, submitted, plan.steps, navigate]);

  const cancelAutorun = () => setAutorunCountdown(null);

  // ─── Voice input via the Web Speech API ───
  // Supported on Safari (webkitSpeechRecognition) and Chromium browsers.
  // We don't ship the recognizer on unsupported browsers; the mic button
  // will simply not appear there.
  const speechSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [listening, setListening] = useState(false);
  const recognitionRef = (typeof window !== "undefined"
    ? (window as any).__zivoConciergeRecognition
    : null) as any;

  const toggleVoice = () => {
    if (!speechSupported) return;
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = recognitionRef ?? new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setQuery(text.trim());
      if (event.results[event.results.length - 1]?.isFinal) {
        setSubmitted(text.trim());
      }
    };
    if (listening) {
      rec.stop();
    } else {
      try {
        rec.start();
      } catch {
        /* already started */
      }
    }
    if (typeof window !== "undefined") {
      (window as any).__zivoConciergeRecognition = rec;
    }
  };

  const submit = (override?: string) => {
    const next = (override ?? query).trim();
    if (!next) return;
    setQuery(next);
    setSubmitted(next);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <SEOHead
        title="ZIVO Concierge – Plan Your Day in One Sentence"
        description="AI-powered trip orchestration. Type one sentence and get an action plan that deep-links into rides, flights, hotels, restaurants, and more."
      />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40 pt-safe">
        <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> ZIVO Concierge
            </div>
            <div className="text-lg font-extrabold text-foreground">
              Plan your day in one sentence
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pt-5 space-y-5" onClick={cancelAutorun}>
        {autorunCountdown !== null && plan.steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold tabular-nums">
              {autorunCountdown}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Auto-running plan
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                Jumping to: {plan.steps[0].title}
              </div>
            </div>
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelAutorun();
              }}
              className="text-[11px] font-bold text-emerald-700 px-2 py-1"
            >
              Cancel
            </button>
          </motion.div>
        )}
        {/* Input */}
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tell us what you want
          </label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={listening ? "Listening…" : "e.g. Dinner at 7pm in SoHo"}
              className="h-12 text-base rounded-xl"
            />
            {speechSupported && (
              <Button
                variant={listening ? "default" : "outline"}
                onClick={toggleVoice}
                className={`h-12 w-12 rounded-xl px-0 shrink-0 ${
                  listening ? "bg-rose-500 hover:bg-rose-600 text-white border-0" : ""
                }`}
                aria-label={listening ? "Stop listening" : "Speak your request"}
                aria-pressed={listening}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            <Button
              onClick={() => submit()}
              disabled={!query.trim()}
              className="h-12 rounded-xl px-4"
            >
              <Send className="w-4 h-4 mr-1" /> Plan
            </Button>
          </div>
          {listening && (
            <div className="mt-2 text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-foreground opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
              </span>
              Listening… speak naturally, we'll plan it
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((s) => (
              <button type="button"
                key={s}
                onClick={() => submit(s)}
                className="rounded-full bg-muted hover:bg-muted/70 px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Plan */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="px-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Plan
              </div>
              <div className="text-base font-extrabold text-foreground">
                {plan.intentSummary || "Here's a plan"}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              {plan.steps.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Try something more specific — e.g. "Dinner at 7pm in SoHo".
                  </p>
                </div>
              ) : (
                plan.steps.map((s, i) => {
                  const meta = ICON_BY_KIND[s.kind];
                  const Icon = meta.icon;
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => navigate(s.to)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors touch-manipulation ${
                        i > 0 ? "border-t border-border/40" : ""
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                        {i + 1}
                      </div>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.tone}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {s.detail}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </motion.button>
                  );
                })
              )}
            </div>

            <div className="px-1 text-[11px] text-muted-foreground">
              Heuristic plan — tap any step to jump into the right flow. ZIVO Concierge will get
              smarter over time.
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
