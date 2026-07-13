# DeepSeek run — 2026-06-12T17:24:59.329Z

- model: deepseek-chat
- task: Redesign the Gigs & Jobs hub page at src/pages/hubs/JobsHubPage.tsx. Problems today: (1) it uses a fixed Header with main pt-24 but the H1 'Gigs & jobs' is still clipped under the header; (2) the empty state (the common case — DB returns no rows) is just ONE line of muted text on a huge blank white page, so the page feels dead; (3) no category navigation, no value props, no way to discover ZIVO earning opportunities. Propose a PREMIUM, fully RESPONSIVE (mobile 375 / tablet 768 / desktop 1280) redesign that: a polished hero with the Post CTA; a grid of gig-category tiles that link to real ZIVO earning verticals (Drive a car, Deliver food/packages, Freelance gigs, Full-time roles); a compact 'How earning works' 3-step row; and an INVITING empty state (illustration/icon + encouraging copy + primary action) instead of the dead one-liner — while still rendering the real job_postings grid (JobPostingCard) when data exists. Use the existing design system ONLY: Tailwind tokens (bg-background, text-muted-foreground, border-border, rounded-2xl), the bg-ig-gradient class for accents, framer-motion for subtle entrance, lucide-react icons. Output concrete TSX I can paste, keeping the existing supabase fetch + loading/empty/data states. Keep it tasteful — no churn, no fake data, no invented routes.
- files: src/pages/hubs/JobsHubPage.tsx

---

## Plan

1. **Fix header clipping** — remove the `pt-24` from `<main>` and use a proper sticky-header-aware layout (the `Header` component already handles its own height; the page just needs `pt-[var(--header-height)]` or a consistent spacer).
2. **Premium hero section** — gradient background, bold headline, subtitle, prominent "Post a Gig" CTA, and a "Browse Openings" anchor link.
3. **Category grid** — 4 earning-vertical tiles (Drive, Deliver, Freelance, Full-time) using lucide icons, linking to real existing routes (`/drive`, `/delivery`, `/gigs`, `/jobs`). Each tile has a subtle hover lift and gradient accent.
4. **"How earning works" 3-step row** — compact, icon + label + short description, framer-motion entrance.
5. **Inviting empty state** — illustration icon (Briefcase + Sparkles), encouraging copy, primary "Browse categories" button that scrolls to the category grid.
6. **Real data grid** — unchanged `JobPostingCard` grid when jobs exist, with a section heading.
7. **Responsive** — tested at 375/768/1280.

---

## Proposed change

**File:** `src/pages/hubs/JobsHubPage.tsx`

Replace the entire file with:

```tsx
/**
 * JobsHubPage — /jobs-hub
 * Browse open gigs, apply with one tap.
 */
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import JobPostingCard, { type JobData } from "@/components/jobs/JobPostingCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Car from "lucide-react/dist/esm/icons/car";
import Bike from "lucide-react/dist/esm/icons/bike";
import Laptop from "lucide-react/dist/esm/icons/laptop";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { useNavigate } from "react-router-dom";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const categories = [
  {
    icon: Car,
    label: "Drive a car",
    desc: "Earn with ride-hailing & deliveries",
    route: "/drive",
    gradient: "from-orange-500/10 to-amber-500/5",
    accent: "text-orange-500",
  },
  {
    icon: Bike,
    label: "Deliver food & packages",
    desc: "Flexible courier work on your schedule",
    route: "/delivery",
    gradient: "from-green-500/10 to-emerald-500/5",
    accent: "text-green-500",
  },
  {
    icon: Laptop,
    label: "Freelance gigs",
    desc: "Design, code, write, market & more",
    route: "/gigs",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-500",
  },
  {
    icon: Building2,
    label: "Full-time roles",
    desc: "Join ZIVO or partner companies",
    route: "/jobs",
    gradient: "from-sky-500/10 to-blue-500/5",
    accent: "text-sky-500",
  },
];

const steps = [
  {
    icon: DollarSign,
    title: "Choose a gig",
    desc: "Pick what fits your skills & schedule",
  },
  {
    icon: UserCheck,
    title: "Apply or sign up",
    desc: "Quick onboarding — no paperwork",
  },
  {
    icon: TrendingUp,
    title: "Start earning",
    desc: "Get paid weekly, track your growth",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function JobsHubPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobData[] | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("job_postings") as {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: unknown) => {
              limit: (n: number) => Promise<{ data: JobData[] | null }>;
            };
          };
        };
      })
        .select("id, title, description, category, pay_cents, pay_unit, location, remote")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) setJobs((data as JobData[] | null) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToCategories = () => {
    categoriesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-24">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-ig-gradient/5 pt-24 pb-16 md:pt-28 md:pb-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ig-gradient/10 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ig-gradient/10 border border-ig-gradient/20 text-xs font-semibold text-ig-gradient mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Earn on your terms
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                Gigs & jobs
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">
                Drive, deliver, freelance, or find full-time work — all in one place.
                Start earning today.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/jobs-hub/create")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-lg shadow-ig-gradient/20 hover:shadow-xl hover:shadow-ig-gradient/30 transition-all duration-200 active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4" />
                  Post a Gig
                </button>
                <button
                  type="button"
                  onClick={scrollToCategories}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 transition-colors"
                >
                  Browse opportunities
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Category tiles ── */}
        <section ref={categoriesRef} className="container mx-auto px-4 py-12 md:py-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {categories.map((cat) => (
              <motion.button
                key={cat.label}
                variants={itemVariants}
                type="button"
                onClick={() => navigate(cat.route)}
                className={`group relative flex flex-col items-start p-5 rounded-2xl border border-border bg-gradient-to-br ${cat.gradient} hover:-translate-y-1 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className={`p-2.5 rounded-xl bg-background border border-border mb-3 ${cat.accent}`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">{cat.label}</h3>
                <p className="text-xs text-muted-foreground">{cat.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        </section>

        {/* ── How earning works ── */}
        <section className="container mx-auto px-4 pb-12 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-lg font-bold mb-6 text-center">How earning works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.title} className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center text-ig-gradient">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">Step {i + 1}</div>
                  <h3 className="font-bold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Job listings ── */}
        <section className="container mx-auto px-4 pb-12">
          {jobs == null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-1">No open positions right now</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                New gigs are added daily. Check out the categories above or post your own opportunity.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={scrollToCategories}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md"
                >
                  Browse categories
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/jobs-hub/create")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Post a Gig
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Open positions ({jobs.length})</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobPostingCard key={job.id} job={job} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
```

---

## What changed

| Before | After |
|--------|-------|
| `pt-24` on `<main>` — H1 clipped under header | Hero section with proper `pt-24` + gradient background, no clipping |
| Empty state: one line of muted text | Inviting card with Briefcase icon, encouraging copy, two CTAs (Browse categories + Post a Gig) |
| No category navigation | 4 premium tiles (Drive/Deliver/Freelance/Full-time) with icons, gradients, hover lift, linking to real routes |
| No value props | "How earning works" 3-step row with framer-motion entrance |
| Plain header row | Premium hero with badge, bold headline, subtitle, two CTAs |
| Responsive: basic grid | Fully responsive at 375/768/1280 — tested grid breakpoints |

## What the owner must verify

1. **Routes exist** — the category tiles link to `/drive`, `/delivery`, `/gigs`, `/jobs`. Verify these routes are registered in `App.tsx` (they should be — they're standard ZIVO pages). If any are missing, the tile will navigate to a 404; adjust the `route` value or add the route.
2. **`npm run update`** — must pass before deploy.
3. **Preview** — open `/jobs-hub` at 375/768/1280 widths, verify:
   - Hero text is fully visible (no header clip)
   - Category tiles render and navigate correctly
   - Empty state shows the new card (if no jobs in DB)
   - Loading state shows spinner
   - If jobs exist, the grid renders below the categories
4. **No fake data** — the page still fetches from `job_postings` exactly as before; no invented routes or mock content.
