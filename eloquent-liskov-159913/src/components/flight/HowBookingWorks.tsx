/**
 * How Booking Works Section
 * Trust-building component explaining the ZIVO booking flow
 */

import { Search, MousePointerClick, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HowBookingWorksProps {
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

const steps = [
  {
    icon: Search,
    number: "1",
    title: "Search flights",
    description: "Browse real-time flight options from global airlines.",
  },
  {
    icon: MousePointerClick,
    number: "2",
    title: "Select your flight",
    description: "View final prices, baggage, and fare rules before booking.",
  },
  {
    icon: ShieldCheck,
    number: "3",
    title: "Book on ZIVO",
    description: "Pay securely on ZIVO and receive your e-ticket instantly.",
  },
];

export default function HowBookingWorks({ className, variant = 'horizontal' }: HowBookingWorksProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("py-4", className)}>
        <div className="flex items-center justify-center gap-2 sm:gap-6 text-sm text-muted-foreground">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold">
                  {step.number}
                </div>
                <span className="hidden sm:inline">{step.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="font-semibold text-base mb-4">How booking works</h3>
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center shrink-0 bg-secondary">
              <step.icon className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 pt-1">
              <p className="font-medium text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className={cn("py-8 bg-muted/20 border-y border-border/50", className)}>
      <div className="container mx-auto px-4">
        <h2 className="text-center text-lg font-semibold mb-6">How booking works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Step number */}
              <div className="w-14 h-14 rounded-2xl border border-border flex items-center justify-center mb-4 bg-secondary">
                <step.icon className="w-7 h-7 text-foreground" />
              </div>
              
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-secondary" />
              )}
              
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
