/**
 * RateAndTipFlow - Post-ride rating with stars, emoji reactions, and tip slider
 * Inspired by Uber/Lyft's post-ride experience
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ThumbsUp, Heart, Sparkles, Shield, Music, Snowflake, MessageSquare, DollarSign, Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RateAndTipFlowProps {
  driverName?: string;
  driverRating?: number;
  tripFare?: number;
  onSubmit?: (data: { rating: number; tip: number; feedback: string; tags: string[] }) => void;
  onSkip?: () => void;
}

const emojiReactions = [
  { emoji: "😄", label: "Great" },
  { emoji: "👍", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😕", label: "Poor" },
];

const feedbackTags = [
  { id: "clean", icon: Sparkles, label: "Clean car" },
  { id: "safe", icon: Shield, label: "Safe driving" },
  { id: "music", icon: Music, label: "Great music" },
  { id: "cool", icon: Snowflake, label: "Good AC" },
  { id: "convo", icon: MessageSquare, label: "Great convo" },
  { id: "nav", icon: ThumbsUp, label: "Good route" },
];

const tipOptions = [
  { amount: 0, label: "No tip" },
  { amount: 1, label: "$1" },
  { amount: 3, label: "$3" },
  { amount: 5, label: "$5" },
  { amount: 0, label: "Custom", custom: true },
];

export default function RateAndTipFlow({
  driverName = "Marcus T.",
  driverRating = 4.92,
  tripFare = 18.50,
  onSubmit,
  onSkip,
}: RateAndTipFlowProps) {
  const [step, setStep] = useState<"rate" | "tip" | "done">("rate");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [tipAmount, setTipAmount] = useState(3);
  const [customTip, setCustomTip] = useState(false);
  const [customTipValue, setCustomTipValue] = useState("");

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      toast.error("Please rate your ride");
      return;
    }
    setStep("tip");
  };

  const handleSubmitTip = () => {
    const finalTip = customTip ? parseFloat(customTipValue) || 0 : tipAmount;
    onSubmit?.({ rating, tip: finalTip, feedback, tags: selectedTags });
    setStep("done");
    toast.success("Thanks for your feedback!");
  };

  if (step === "done") {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl bg-card border border-border/40 p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"
        >
          <Check className="w-8 h-8 text-emerald-500" />
        </motion.div>
        <h3 className="text-lg font-bold text-foreground mb-1">Thank you!</h3>
        <p className="text-sm text-muted-foreground">Your feedback helps improve the experience</p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "rate" && (
          <motion.div key="rate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }}>
            {/* Driver header */}
            <div className="px-4 py-5 text-center bg-gradient-to-b from-primary/5 to-transparent">
              <Avatar className="w-16 h-16 mx-auto border-2 border-primary/20 mb-3">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {driverName.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base font-bold text-foreground">How was your ride with {driverName}?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Trip fare: ${tripFare.toFixed(2)}</p>
            </div>

            {/* Star rating */}
            <div className="flex justify-center gap-3 px-4 pb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(star)}
                  whileTap={{ scale: 1.3 }}
                  className="p-1 touch-manipulation"
                >
                  <Star className={cn(
                    "w-10 h-10 transition-all",
                    star <= (hoveredStar || rating)
                      ? "text-amber-400 fill-amber-400 drop-shadow-lg"
                      : "text-muted/40"
                  )} />
                </motion.button>
              ))}
            </div>

            {/* Emoji reactions */}
            {rating > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-4">
                <div className="flex justify-center gap-3">
                  {emojiReactions.map((er) => (
                    <button type="button"
                      key={er.label}
                      onClick={() => setSelectedEmoji(er.label)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                        selectedEmoji === er.label
                          ? "bg-primary/10 border border-primary/20 scale-105"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-2xl">{er.emoji}</span>
                      <span className="text-[9px] font-medium text-muted-foreground">{er.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feedback tags */}
            {rating >= 4 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-4">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">What stood out?</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedbackTags.map((tag) => {
                    const Icon = tag.icon;
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Optional comment */}
            {rating > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4">
                <Textarea
                  placeholder="Additional comments (optional)..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                />
              </motion.div>
            )}

            {/* Continue */}
            <div className="px-4 pb-4 flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onSkip}>
                Skip
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold"
              >
                Continue to tip
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "tip" && (
          <motion.div key="tip" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div className="px-4 py-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Heart className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-foreground">Add a tip for {driverName}?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">100% goes to your driver</p>
            </div>

            {/* Tip options */}
            <div className="px-4 pb-4">
              <div className="flex gap-2 mb-4">
                {tipOptions.map((opt, i) => (
                  <button type="button"
                    key={i}
                    onClick={() => {
                      if (opt.custom) {
                        setCustomTip(true);
                      } else {
                        setCustomTip(false);
                        setTipAmount(opt.amount);
                      }
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-bold transition-all border",
                      !customTip && tipAmount === opt.amount && !opt.custom
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : customTip && opt.custom
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {customTip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={customTipValue}
                      onChange={(e) => setCustomTipValue(e.target.value)}
                      className="w-full h-11 pl-8 pr-4 rounded-xl bg-muted/30 border border-border/40 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </motion.div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 mb-4">
                <span className="text-xs text-muted-foreground">Total with tip</span>
                <span className="text-lg font-black text-foreground">
                  ${(tripFare + (customTip ? parseFloat(customTipValue) || 0 : tipAmount)).toFixed(2)}
                </span>
              </div>

              <Button
                onClick={handleSubmitTip}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-primary-foreground font-bold"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
