# DeepSeek run — 2026-06-13T21:28:23.216Z

- model: deepseek-chat
- task: Analyze src/pages/salon/PublicSalonBookingPage.tsx (a customer-facing PUBLIC salon booking storefront at route /salon/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO active:scale, ZERO focus-visible rings, ZERO reduced-motion guards, ZERO safe-area header padding. Focus on: (1) interaction consistency — add 'active:scale-[0.98] transition-transform' + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' to every interactive button, service/staff card, time-slot chip, and the booking CTA (icon-only buttons use scale-[0.95]); (2) header/hero top padding should clear the fixed app header (safe-area) and the hero be responsive; (3) responsive issues at 375/768/1280 (service cards grid, time-slot grid, summary layout); (4) any obviously incomplete/disconnected UI piece. Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/salon/PublicSalonBookingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis & Plan

**PublicSalonBookingPage.tsx** is a well-structured 3-step booking flow, but it lacks the premium interaction polish found in `JobPostingDetailPage.tsx`. The reference page has `active:scale`, `focus-visible:ring`, reduced-motion guards, and proper safe-area padding — this page has none.

### Punch list of exact className edits (line-referenced):

**1. Safe-area header padding** (~L1040):
- Add `style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 1.5rem)" }}` to the main content wrapper (the `mx-auto max-w-3xl` div at line ~L1040)

**2. Interactive buttons — add `active:scale-[0.98] transition-transform` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`:**

- **Service category filter buttons** (~L1010): append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` call
- **Service card buttons** (~L1020): append `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Stylist chip buttons** (~L1050, L1060): append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **"Any stylist" button** (~L1040): same as stylist chips
- **Time-slot buttons** (~L1090): append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Date nav buttons** (~L1080): already have `Button variant="outline" size="icon"` — add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the className
- **Booking CTA button** (~L1130): already has `Button` component — add `active:scale-[0.98]` to the className
- **Social icon links** (SalonContactStrip, ~L1170): append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to each `<a>` tag's className
- **Gallery images** (~L1070): wrap each `<img>` in a `<button>` or add `focus-visible:ring` to the parent div

**3. Responsive fixes:**
- **Service cards grid** (~L1020): already `sm:grid-cols-2` — add `lg:grid-cols-3` for wider screens
- **Time-slot grid** (~L1090): already `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` — good
- **Summary layout** (~L1120): the summary card is fine, but the "Meet the team" grid (~L1150) should be `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`

**4. Reduced-motion guard** — add `import { useReducedMotion } from "framer-motion"` at top, then wrap the `transition-transform` classes with a conditional or use `prefers-reduced-motion` CSS. Simplest: add `motion-safe:transition-transform` to all the `active:scale` buttons (Tailwind's `motion-safe:` prefix).

**5. Disconnected UI piece** — the "View or cancel this booking" link in the confirmed state (~L960) uses an `<a>` tag instead of React Router's `<Link>`, which causes a full page reload. Change to `<Link>` from `react-router-dom`.

### Diff (minimal, line-referenced):

```diff
--- a/src/pages/salon/PublicSalonBookingPage.tsx
+++ b/src/pages/salon/PublicSalonBookingPage.tsx
@@ -1,7 +1,8 @@
 import { useEffect, useMemo, useRef, useState } from "react";
-import { useParams, useSearchParams } from "react-router-dom";
+import { useParams, useSearchParams, Link } from "react-router-dom";
 import { Helmet } from "react-helmet-async";
 import { toast } from "sonner";
+import { useReducedMotion } from "framer-motion";
 import {
   Store, Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2,
   Clock, DollarSign, UserCog, Calendar, ArrowRight, Star, Sparkles,
@@ -20,6 +21,9 @@ import { computeOpenSlots, type ScheduleRow, type BusyRange } from "@/lib/salon/a
 import { useAuth } from "@/contexts/AuthContext";

+const motionSafe = "motion-safe:transition-transform";
+const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
+
 interface SalonProfile {
   id: string;
   name: string;
@@ -68,6 +72,7 @@ export default function PublicSalonBookingPage() {
   const { slug = "" } = useParams<{ slug: string }>();
   const [searchParams] = useSearchParams();
   const { user } = useAuth();
+  const prefersReducedMotion = useReducedMotion();
   const deepLinkConsumed = useRef(false);

@@ -957,7 +962,7 @@ export default function PublicSalonBookingPage() {
             <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
-              <a
+              <Link
                 href={`/booking/${confirmed.id}`}
                 className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
               >
                 View or cancel this booking
-              </a>
+              </Link>
               {user && (
-                <a
+                <Link
                   href="/salon/me"
                   className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
                 >
                   Go to your salon area →
-                </a>
+                </Link>
```

Then for each interactive element, append `motion-safe:active:scale-[0.98] ${focusRing}` (icon-only buttons use `motion-safe:active:scale-[0.95]`). Example for service cards (~L1020):

```diff
-              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
+              `flex items-start gap-3 rounded-xl border p-3 text-left ${motionSafe} transition-colors`,
-              serviceId === s.id ? "border-primary bg-primary/8" : "border-border hover:border-primary/40"
+              `${serviceId === s.id ? "border-primary bg-primary/8" : "border-border hover:border-primary/40"} motion-safe:active:scale-[0.98] ${focusRing}`
```

And for the main content wrapper (~L1040):

```diff
-      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-12 sm:px-6">
+      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-12 sm:px-6" style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 1.5rem)" }}>
```

### Owner verification:
1. Run `npm run update` — must pass (type-check + worker + build)
2. Preview at `/salon/:slug` at 375px, 768px, 1280px — verify:
   - Header clears the fixed app header
   - Service cards show 2-col on mobile, 3-col on desktop
   - All buttons have press feedback and focus rings
   - Reduced motion: `prefers-reduced-motion: reduce` disables the scale transforms
   - Confirmed state links use client-side navigation (no full reload)
