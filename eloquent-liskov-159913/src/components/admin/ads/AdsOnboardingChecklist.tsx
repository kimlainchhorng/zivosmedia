/**
 * AdsOnboardingChecklist — collapsible 4-step "Get your first ad live" guide.
 * Auto-checks state from useStoreAdsOverview and auto-hides when complete (restorable).
 */
import { useState } from "react";
import { Check, ChevronDown, Lock, CircleDot, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ChecklistState } from "@/hooks/useStoreAdsOverview";

interface Props {
  state: ChecklistState;
  onConnectPlatform: () => void;
  onAddBilling: () => void;
  onCreateCampaign: () => void;
  onSubmitForReview: () => void;
}

interface StepDef {
  key: keyof Omit<ChecklistState, "completedCount" | "total" | "done">;
  title: string;
  body: string;
  cta: string;
  action: keyof Pick<
    Props,
    "onConnectPlatform" | "onAddBilling" | "onCreateCampaign" | "onSubmitForReview"
  >;
}

const STEPS: StepDef[] = [
  {
    key: "hasPlatform",
    title: "Connect an ad platform",
    body: "Meta, Google, TikTok or X — at least one is required.",
    cta: "Connect",
    action: "onConnectPlatform",
  },
  {
    key: "hasBilling",
    title: "Add wallet balance",
    body: "Top up your ads wallet so campaigns can actually spend.",
    cta: "Add funds",
    action: "onAddBilling",
  },
  {
    key: "hasDraft",
    title: "Create your first campaign",
    body: "Define goal, audience, creative and budget — saved as a draft.",
    cta: "New campaign",
    action: "onCreateCampaign",
  },
  {
    key: "hasSubmitted",
    title: "Submit for review",
    body: "Queue the draft so it goes live as soon as APIs are approved.",
    cta: "Submit",
    action: "onSubmitForReview",
  },
];

export default function AdsOnboardingChecklist(props: Props) {
  const { state } = props;
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (state.done && dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Show setup guide
      </button>
    );
  }

  if (state.done) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-3 flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">You're all set!</p>
            <p className="text-[11px] text-muted-foreground">
              All onboarding steps complete.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label="Dismiss setup guide"
            onClick={() => setDismissed(true)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Find current (first incomplete) step
  const currentIdx = STEPS.findIndex((s) => !state[s.key]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 p-3 text-left"
            aria-expanded={open}
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">
                Get your first ad live
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {state.completedCount} of {state.total} steps complete
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="bg-primary transition-all"
                  style={{
                    width: `${(state.completedCount / state.total) * 100}%`,
                  }}
                />
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
            {STEPS.map((step, i) => {
              const done = state[step.key];
              const isCurrent = i === currentIdx;
              const isLocked = i > currentIdx && !done;
              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-lg border transition",
                    done
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-muted/20"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5",
                      done
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <Check className="w-3 h-3" />
                    ) : isLocked ? (
                      <Lock className="w-2.5 h-2.5" />
                    ) : (
                      <CircleDot className="w-3 h-3" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium leading-tight",
                        done && "text-muted-foreground line-through"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      {step.body}
                    </p>
                  </div>
                  {!done && isCurrent && (
                    <Button
                      size="sm"
                      className="h-7 text-[11px] px-2.5 shrink-0"
                      onClick={props[step.action]}
                    >
                      {step.cta}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
