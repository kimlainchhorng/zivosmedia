/**
 * CreatorWelcomePage — first stop for someone who just decided to become a creator.
 *
 * 1. Opens the CreatorTypePicker (can't skip — must pick).
 * 2. After picking, shows a personalized first-steps checklist that routes
 *    into CreatorSetupPage, /monetization, /ppv/create, etc.
 *
 * Linked to from: signup success screen, "Become a creator" CTAs.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowRight, UserCircle2, Crown, Heart, Lock, Flame,
  Video, Store, Gift, ShieldCheck, Rocket,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import CreatorTypePicker from "@/components/creator/CreatorTypePicker";
import { useCreatorType } from "@/hooks/useCreatorType";
import { cn } from "@/lib/utils";

type Step = {
  label: string;
  desc: string;
  icon: typeof UserCircle2;
  href: string;
  accent: string;
};

const CONTENT_STEPS: Step[] = [
  { label: "Complete your creator profile", desc: "Bio, avatar, social links", icon: UserCircle2, href: "/creator/setup?step=profile", accent: "text-violet-500 bg-violet-500/15" },
  { label: "Verify your identity", desc: "Required for payouts", icon: ShieldCheck, href: "/creator/setup?step=verify", accent: "text-emerald-500 bg-emerald-500/15" },
  { label: "Set up subscriptions", desc: "Monthly tiers for your fans", icon: Crown, href: "/monetization", accent: "text-amber-500 bg-amber-500/15" },
  { label: "Open your shop", desc: "Sell merch & digital products", icon: Store, href: "/shop-dashboard", accent: "text-emerald-500 bg-emerald-500/15" },
  { label: "Activate affiliate links", desc: "Earn from product referrals", icon: Gift, href: "/affiliate-hub", accent: "text-teal-500 bg-teal-500/15" },
];

const OF_STEPS: Step[] = [
  { label: "Complete your profile", desc: "Bio, avatar, social links", icon: UserCircle2, href: "/account/profile-edit", accent: "text-violet-500 bg-violet-500/15" },
  { label: "Verify your age & identity", desc: "Required for 18+ payouts", icon: ShieldCheck, href: "/account/verification", accent: "text-rose-500 bg-rose-500/15" },
  { label: "Create your first PPV post", desc: "Lock content behind a one-time price", icon: Lock, href: "/ppv/create", accent: "text-rose-500 bg-rose-500/15" },
  { label: "Set up subscriber tiers", desc: "Recurring monthly revenue", icon: Crown, href: "/monetization", accent: "text-amber-500 bg-amber-500/15" },
  { label: "Enable tips", desc: "One-tap fan support", icon: Heart, href: "/monetization#tips", accent: "text-pink-500 bg-pink-500/15" },
];

export default function CreatorWelcomePage() {
  const navigate = useNavigate();
  const { creatorType, isLoading } = useCreatorType();
  const [showPicker, setShowPicker] = useState(false);

  // Force the picker open if the user lands here without a type
  useEffect(() => {
    if (!isLoading && !creatorType) setShowPicker(true);
  }, [isLoading, creatorType]);

  const steps = creatorType === "of" ? OF_STEPS : CONTENT_STEPS;
  const isOF = creatorType === "of";

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Welcome — ZIVO Creator" description="Your creator journey starts here." noIndex />

      <CreatorTypePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        canSkip={!!creatorType}
      />

      {/* Hero */}
      <div className="px-5 pt-12 pb-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4",
            isOF ? "bg-rose-500/15" : "bg-primary/10"
          )}
        >
          {isOF ? (
            <Flame className="h-8 w-8 text-rose-500" />
          ) : (
            <Sparkles className="h-8 w-8 text-primary" />
          )}
        </motion.div>
        <h1 className="text-[26px] font-extrabold tracking-tight">
          {isOF ? "Welcome, OF Creator" : creatorType ? "Welcome, Creator" : "Become a Creator"}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1 max-w-sm mx-auto">
          {creatorType
            ? "Five steps to set up your full earning workflow. Tap any to start."
            : "Pick the workflow that fits how you create. You can switch anytime."}
        </p>
        {!creatorType && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98]"
          >
            Choose your creator type
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Steps */}
      {creatorType && (
        <div className="px-4 space-y-2">
          {steps.map((step, i) => (
            <motion.button
              key={step.label}
              type="button"
              onClick={() => navigate(step.href)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left"
            >
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", step.accent)}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[14px]">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">{step.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </motion.button>
          ))}

          {/* Skip to dashboard */}
          <button
            type="button"
            onClick={() => navigate("/creator-dashboard")}
            className="w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2"
          >
            <Rocket className="h-4 w-4" />
            Skip — go to dashboard
          </button>
        </div>
      )}
    </div>
  );
}
