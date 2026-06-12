/**
 * HubScaffold — shared premium shell for the discovery/listing hub pages
 * (jobs, marketplace, events, voice-rooms, fitness…).
 *
 * Owns the page chrome so each hub stays thin and visually consistent:
 *   <Header/> → hero (badge + gradient title + subtitle + CTAs) →
 *   "how it works" steps → a ref'd listings section (the caller fills it
 *   with their own filter row + loading/empty/grid via `children`) → <Footer/>.
 *
 * The hero's secondary button smooth-scrolls to the listings section.
 */
import { useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

export interface HubStep {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface HubScaffoldProps {
  /** Pill text above the title. */
  badge: string;
  /** Optional badge icon (defaults to Sparkles). */
  badgeIcon?: LucideIcon;
  /** Rendered in the IG gradient. */
  title: string;
  subtitle: string;
  /** Optional primary action (e.g. "Create event"). */
  primaryCta?: { label: string; onClick: () => void; icon?: LucideIcon };
  /** Secondary button label; it scrolls to the listings section. Default "Browse". */
  browseLabel?: string;
  stepsHeading?: string;
  steps: HubStep[];
  /** Heading for the listings section (e.g. "Open gigs (3)"). */
  listingsHeading: ReactNode;
  /** Optional filter chips row, shown above the children. */
  filterRow?: ReactNode;
  /** The listings body: caller renders loading / empty / grid here. */
  children: ReactNode;
}

export default function HubScaffold({
  badge,
  badgeIcon: BadgeIcon = Sparkles,
  title,
  subtitle,
  primaryCta,
  browseLabel = "Browse",
  stepsHeading = "How it works",
  steps,
  listingsHeading,
  filterRow,
  children,
}: HubScaffoldProps) {
  const listingsRef = useRef<HTMLDivElement>(null);
  const scrollToListings = () =>
    listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const PrimaryIcon = primaryCta?.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-safe-header pb-24">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-background to-orange-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl py-8 sm:py-10"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-border text-xs font-semibold mb-4">
                <BadgeIcon className="w-3.5 h-3.5 text-fuchsia-500" />
                {badge}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                <span className="text-ig-gradient">{title}</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">{subtitle}</p>
              <div className="flex flex-wrap gap-3">
                {primaryCta && (
                  <button
                    type="button"
                    onClick={primaryCta.onClick}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-lg shadow-black/10 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {PrimaryIcon && <PrimaryIcon className="w-4 h-4" />} {primaryCta.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={scrollToListings}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {browseLabel} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="container mx-auto px-4 pt-2 pb-10 sm:pb-14">
          <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
            <h2 className="text-base font-bold mb-6 text-center">{stepsHeading}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {steps.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex flex-col items-center text-center gap-2"
                  >
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center text-fuchsia-500">
                      <StepIcon className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ig-gradient text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    </div>
                    <h3 className="font-bold text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground max-w-[14rem]">{step.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Listings ── */}
        <section ref={listingsRef} className="container mx-auto px-4 scroll-mt-28">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">{listingsHeading}</h2>
          </div>
          {filterRow}
          {children}
        </section>
      </main>
      <Footer />
    </div>
  );
}
