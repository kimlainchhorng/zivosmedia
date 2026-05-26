/**
 * Newsletter Section - Bold split-layout CTA with premium glassmorphism
 */
import { useState } from "react";
import { motion } from "framer-motion";
import Mail from "lucide-react/dist/esm/icons/mail";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import Bell from "lucide-react/dist/esm/icons/bell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const perks = [
  { icon: TrendingDown, text: "Weekly fare drops & secret deals" },
  { icon: Bell, text: "Price alerts for your saved routes" },
  { icon: Sparkles, text: "Early access to new features" },
];

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    toast.success("You're in!", { description: "Check your inbox for a welcome email with exclusive deals." });
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <section className="py-16 sm:py-24" aria-label="Newsletter signup">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(var(--flights))/0.08] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative border border-border/40 rounded-3xl bg-card/80 backdrop-blur-xl p-8 sm:p-12 lg:p-14">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                {/* Left - Copy */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">50,000+ subscribers</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                    Never miss a deal
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base mb-6">
                    Get insider travel deals, fare drops, and tips delivered weekly.
                  </p>

                  <ul className="space-y-3">
                    {perks.map((perk) => (
                      <li key={perk.text} className="flex items-center gap-3 text-sm text-foreground/80">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <perk.icon className="w-4 h-4 text-primary" />
                        </div>
                        {perk.text}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right - Form */}
                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-13 rounded-xl text-base border-border/50 bg-background/50 focus:border-primary/50 transition-all"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      aria-live="polite"
                      className={cn(
                        "w-full h-13 rounded-xl font-semibold gap-2 transition-all duration-200 active:scale-[0.97] touch-manipulation min-h-[48px] text-base",
                        subscribed ? "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]" : ""
                      )}
                    >
                      {subscribed ? (
                        <><CheckCircle2 className="w-5 h-5" /> You're subscribed!</>
                      ) : (
                        <>Get travel deals <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground/60 mt-4 text-center">
                    No spam, unsubscribe anytime. Read our{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}