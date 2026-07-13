/**
 * JobsHubPage — /jobs-hub
 * Browse open gigs, apply with one tap, or jump into a ZIVO earning vertical.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import JobPostingCard, { type JobData } from "@/components/jobs/JobPostingCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Car from "lucide-react/dist/esm/icons/car";
import Bike from "lucide-react/dist/esm/icons/bike";
import Laptop from "lucide-react/dist/esm/icons/laptop";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Compass from "lucide-react/dist/esm/icons/compass";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

type Category = {
  icon: typeof Car;
  label: string;
  desc: string;
  /** A real ZIVO route, or "listings" to scroll to the open-gigs grid below. */
  to: string | "listings";
  tile: string;
  accent: string;
};

const CATEGORIES: Category[] = [
  {
    icon: Car,
    label: "Drive a car",
    desc: "Ferry riders, earn per trip",
    to: "/driver",
    tile: "from-orange-500/10 to-amber-500/5",
    accent: "text-orange-500",
  },
  {
    icon: Bike,
    label: "Deliver",
    desc: "Food & packages, your schedule",
    to: "/delivery",
    tile: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-500",
  },
  {
    icon: Laptop,
    label: "Freelance gigs",
    desc: "One-off tasks & projects",
    to: "listings",
    tile: "from-violet-500/10 to-fuchsia-500/5",
    accent: "text-violet-500",
  },
  {
    icon: Building2,
    label: "Full-time roles",
    desc: "Join the ZIVO team",
    to: "/jobs",
    tile: "from-sky-500/10 to-blue-500/5",
    accent: "text-sky-500",
  },
];

const STEPS = [
  { icon: Compass, title: "Pick a way to earn", desc: "Choose what fits your skills & schedule" },
  { icon: UserCheck, title: "Apply or sign up", desc: "Fast onboarding — no paperwork" },
  { icon: TrendingUp, title: "Start earning", desc: "Get paid and track your growth" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function JobsHubPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobData[] | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("job_postings") as { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: JobData[] | null }> } } } })
        .select("id, title, description, category, pay_cents, pay_unit, location, remote")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) setJobs((data as JobData[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const scrollTo = (ref: RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const onCategory = (cat: Category) =>
    cat.to === "listings" ? scrollTo(listingsRef) : navigate(cat.to);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Clears the fixed Header (≈ safe-area inset + 48px row) on every device. */}
      <main className="pb-24" style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem)" }}>
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
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
                Earn on your terms
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                Gigs &amp; <span className="text-ig-gradient">jobs</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">
                Drive, deliver, freelance, or find full-time work — all in one place. Start earning today.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/jobs-hub/create")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-lg shadow-black/10 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="w-4 h-4" /> Post a gig
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(categoriesRef)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse ways to earn <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Ways to earn (category tiles) ── */}
        <section ref={categoriesRef} className="container mx-auto px-4 pt-4 pb-10 sm:pb-14 scroll-mt-28">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">Ways to earn</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.label}
                variants={itemVariants}
                type="button"
                onClick={() => onCategory(cat)}
                aria-label={cat.label}
                className={`group relative flex flex-col items-start text-left p-4 sm:p-5 rounded-2xl border border-border bg-gradient-to-br ${cat.tile} transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className={`p-2.5 rounded-xl bg-background border border-border mb-3 ${cat.accent}`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-0.5">{cat.label}</h3>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
                <ArrowRight className="w-4 h-4 text-muted-foreground absolute top-4 right-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </motion.button>
            ))}
          </motion.div>
        </section>

        {/* ── How earning works ── */}
        <section className="container mx-auto px-4 pb-10 sm:pb-14">
          <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
            <h2 className="text-base font-bold mb-6 text-center">How earning works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center text-fuchsia-500">
                    <step.icon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ig-gradient text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-[14rem]">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Open gigs ── */}
        <section ref={listingsRef} className="container mx-auto px-4 scroll-mt-28">
          <h2 className="text-base font-bold mb-4">
            Open gigs{jobs && jobs.length > 0 ? ` (${jobs.length})` : ""}
          </h2>
          {jobs == null ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center mb-4 text-fuchsia-500">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-1">No open gigs right now</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                New gigs are posted often. Explore a way to earn above, or post your own opportunity.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => scrollTo(categoriesRef)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Browse ways to earn
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/jobs-hub/create")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="w-4 h-4" /> Post a gig
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => <JobPostingCard key={job.id} job={job} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
