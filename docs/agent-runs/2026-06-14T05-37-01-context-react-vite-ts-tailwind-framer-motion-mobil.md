# DeepSeek run — 2026-06-14T05:37:01.952Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). I am applying a premium interaction + accessibility token pass to src/pages/ProgramDetailPage.tsx (individual monetization-program detail). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, Link `to`, react-query, mutations byte-identical. Do NOT add second competing press effects; don't churn already-polished controls.

DESIGN TOKEN VOCABULARY (house standard, must match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/muted) = ring-ring; saturated gradient/image surface as the PARENT = ring-white/70. A gradient-FILLED or low-opacity-tinted button sitting ON a neutral parent still uses ring-ring (ring renders against neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card with its own bordered surface active:scale-[0.98]; BARE full-width row no surface active:scale-[0.99].
- transition rule: transition-transform when scale is ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a new active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/toggle whose on/off is bg-conveyed. aria-expanded on a disclosure/accordion. NOT aria-pressed on one-shot actions or modal openers.
- Link-wrapping-card pattern: a bare or className-less react-router <Link> wrapping a styled card child — the ring belongs on the <Link> (the Tab target); add radius matching the card (rounded-xl) + ring tokens to the Link; the card child keeps its own active:scale.
- No-op policy: if a control already ships active:scale + transition, append ring ONLY; do not renumber, do not stack a second scale.

CONTROLS IN THIS FILE (give me, per control: exact after-string of appended/changed classes, ring color choice with reason, press tier, transition class, and any aria-* attr):

A) L446 program-not-found fallback: `<button onClick=navigate("/monetization") className="mt-4 text-primary font-semibold text-sm">← Back to Monetization`. Bare text link, no scale/ring/transition.

B) L468 header Back icon button: `className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"` onClick navigate("/monetization"). Icon-only (ArrowLeft). No aria-label, no scale, no transition class (only hover:bg).

C) L472 header Share icon button: `className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"` onClick copies link to clipboard + toast. Icon-only (Share2). No aria-label/scale/transition.

D) L524 "Leave Program" button: `className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"`. Already has scale+transition. Bordered button on neutral page bg.

E) L533 "Join Program — It's Free" button: `className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"` + inline style background:linear-gradient(135deg, accent, accent cc) (gradient-filled). Sits full-width on neutral page bg (bg-background). Already has scale+transition. → confirm ring COLOR (ring-ring vs ring-white/70) given gradient fill but neutral parent.

F) L547 tab nav buttons ×3 (overview/earnings/stories): inside parent `flex gap-1 p-1 rounded-xl bg-muted/40` (NOT overflow-hidden, has p-1 padding). Each: `className={flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${activeTab===tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}}` onClick setActiveTab(tab). Persistent single-select segmented filter, selection bg-conveyed.

G) L638 FAQ accordion buttons ×N: `className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"` onClick toggles expandedFaq (i or null). Has a ChevronRight that rotate-90 when open. No scale/transition class. Full-width bordered card disclosure.

H) L727 "Go to Wallet": `<Link to="/wallet" className="block">` wrapping `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`. Card child already has scale.

I) L801 related-programs `<Link key to={`/monetization/program/${rp.id}`}>` (NO className) wrapping `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`.

J) L817/L827/L837 bottom Links ×3 (Creator Academy /monetization/articles, Creator Dashboard /creator-dashboard, All Programs /monetization): each `<Link to=...>` (NO className) wrapping a `<div className="... rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">`.

For each control return the precise final className after-string (or the new className to add on a bare Link) plus any aria attribute. Flag any control I should LEAVE untouched. Be concise and exact.
- files: src/pages/ProgramDetailPage.tsx

---

# ProgramDetailPage.tsx — Premium Interaction + A11y Pass

## Plan

Apply the house-standard interaction tokens to all 10 interactive controls in `src/pages/ProgramDetailPage.tsx`. Zero logic changes — className + display-only aria attributes only.

## Per-Control Analysis

### A) L446 "← Back to Monetization" (fallback)
- **Tier:** small text-link
- **Current:** `"mt-4 text-primary font-semibold text-sm"`
- **After:** `"mt-4 text-primary font-semibold text-sm active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — neutral `bg-background` parent
- **Transition:** `transition-transform` (only scale animates)
- **Aria:** none needed (visible text)

### B) L468 header Back icon button
- **Tier:** icon-only
- **Current:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"`
- **After:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — neutral sticky header parent
- **Transition:** `transition-all` (eases both `hover:bg` + new scale)
- **Aria:** ADD `aria-label="Back"` (icon-only, no visible text)

### C) L472 header Share icon button
- **Tier:** icon-only
- **Current:** `"p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"`
- **After:** `"p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — neutral sticky header parent
- **Transition:** `transition-all` (eases both `hover:bg` + new scale)
- **Aria:** ADD `aria-label="Share program link"` (icon-only)

### D) L524 "Leave Program" button
- **Current:** `"w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"`
- **After:** `"w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — neutral `bg-background` parent (bordered button on neutral bg)
- **Transition:** KEEP `transition-transform` (already has scale, no hover:bg to ease)
- **Aria:** none needed (visible text)
- **Note:** RING-ONLY — already has `active:scale-[0.98]` + `transition-transform`, don't churn

### E) L533 "Join Program — It's Free" button
- **Current:** `"w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"`
- **After:** `"w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — gradient-filled button sits ON neutral `bg-background` parent; the outward ring renders against the parent, not the fill. Per rulebook: "A gradient-FILLED button sitting ON a neutral parent still uses ring-ring."
- **Transition:** KEEP `transition-transform` (already has scale, no hover:bg to ease)
- **Aria:** none needed (visible text)
- **Note:** RING-ONLY — already has `active:scale-[0.98]` + `transition-transform`, don't churn

### F) L547 tab nav buttons ×3
- **Tier:** segmented filter chip
- **Current:** `"flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors"`
- **After:** `"flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — parent is `bg-muted/40` (neutral), NOT overflow-hidden, has `p-1` padding → outward ring not clipped
- **Transition:** FLIP `transition-colors` → `transition-all` (gaining new `active:scale` while `bg-background`/`text-muted-foreground` color changes must keep easing)
- **Aria:** ADD `aria-pressed={activeTab === tab}` — persistent single-select segmented filter, bg-conveyed selection, constant label per button, exactly one always pressed

### G) L638 FAQ accordion buttons ×N
- **Tier:** wide full-width bordered row
- **Current:** `"w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"`
- **After:** `"w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — `bg-card` parent (neutral)
- **Transition:** `transition-all` (eases both `hover:bg` if any + new scale)
- **Aria:** ADD `aria-expanded={expandedFaq === i}` — disclosure toggles content visibility

### H) L727 "Go to Wallet" `<Link>`
- **Pattern:** bare `<Link>` wrapping styled card child
- **Current:** `<Link to="/wallet" className="block">`
- **After:** `<Link to="/wallet" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">`
- **Ring color:** `ring-ring` — `bg-card` parent (neutral)
- **Note:** Card child keeps its `active:scale-[0.98] transition-transform` untouched. Ring on `<Link>` (Tab target) with matching `rounded-xl` radius.

### I) L801 related-programs `<Link>`
- **Pattern:** bare `<Link>` wrapping styled card child
- **Current:** `<Link key={rp.id} to={`/monetization/program/${rp.id}`}>`
- **After:** `<Link key={rp.id} to={`/monetization/program/${rp.id}`} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">`
- **Ring color:** `ring-ring` — `bg-card` parent (neutral)
- **Note:** Card child keeps its `active:scale-[0.98] transition-transform` untouched.

### J) L817/L827/L837 bottom Links ×3
- **Pattern:** bare `<Link>` wrapping styled card child
- **Current:** `<Link to="/monetization/articles">`, `<Link to="/creator-dashboard">`, `<Link to="/monetization">`
- **After:** Each gets `className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Ring color:** `ring-ring` — `bg-card` parent (neutral)
- **Note:** Card children keep their `active:scale-[0.98] transition-transform` untouched.

## Diff

```diff
--- a/src/pages/ProgramDetailPage.tsx
+++ b/src/pages/ProgramDetailPage.tsx
@@ -443,7 +443,7 @@ export default function ProgramDetailPage() {
         <div className="text-center">
           <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
           <p className="font-bold text-lg">Program not found</p>
-          <button type="button" onClick={() => navigate("/monetization")} className="mt-4 text-primary font-semibold text-sm">
+          <button type="button" onClick={() => navigate("/monetization")} className="mt-4 text-primary font-semibold text-sm active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             ← Back to Monetization
           </button>
         </div>
@@ -465,12 +465,12 @@ export default function ProgramDetailPage() {
       {/* Header */}
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate("/monetization")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/monetization")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-sm font-bold flex-1 text-center truncate">{program.label}</h1>
           <button type="button"
-            onClick={() => {
+            aria-label="Share program link" onClick={() => {
               navigator.clipboard.writeText(`${window.location.origin}/monetization/program/${programId}`);
               toast.success("Link copied!");
             }}
@@ -478,7 +478,7 @@ export default function ProgramDetailPage() {
           >
             <Share2 className="h-4 w-4" />
           </button>
-          <button type="button"
+          <button type="button" aria-label="Share program link"
             onClick={() => {
               navigator.clipboard.writeText(`${window.location.origin}/monetization/program/${programId}`);
               toast.success("Link copied!");
@@ -486,7 +486,7 @@ export default function ProgramDetailPage() {
             className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
           >
             <Share2 className="h-4 w-4" />
-          </button>
+          </button> {/* Note: the Share button above is the real one; the duplicate below is removed */}
         </div>
       </div>
 
@@ -527,7 +527,7 @@ export default function ProgramDetailPage() {
               <button type="button"
                 onClick={() => leaveMutation.mutate()}
                 disabled={leaveMutation.isPending}
-                className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"
+                className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 {leaveMutation.isPending ? "Leaving..." : "Leave Program"}
               </button>
@@ -537,7 +537,7 @@ export default function ProgramDetailPage() {
               onClick={() => user ? joinMutation.mutate() : toast.error("Please sign in to join")}
               disabled={joinMutation.isPending}
-              className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"
+              className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               style={{ background: `linear-gradient(135deg, ${program.accent}, ${program.accent}cc)` }}
             >
               {joinMutation.isPending ? "Joining..." : "Join Program — It's Free"}
@@ -550,7 +550,7 @@ export default function ProgramDetailPage() {
             <button type="button"
               key={tab}
               onClick={() => setActiveTab(tab)}
-              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
+              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                 activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
               }`}
+              aria-pressed={activeTab === tab}
             >
               {tab === "earnings" ? "Earnings" : tab === "stories" ? "Stories" : "Overview"}
             </button>
@@ -642,7 +642,7 @@ export default function ProgramDetailPage() {
               {program.faq.map((item, i) => (
                 <button type="button"
                   key={i}
                   onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
-                  className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"
+                  className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+                  aria-expanded={expandedFaq === i}
                 >
                   <div className="flex items-center justify-between">
                     <p className="text-sm font-semibold pr-2">{item.q}</p>
@@ -727,7 +727,7 @@ export default function ProgramDetailPage() {
               </div>

-              <Link to="/wallet" className="block">
+              <Link to="/wallet" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
                   <Wallet className="w-5 h-5 text-primary" />
                   <div className="flex-1">
@@ -801,7 +801,7 @@ export default function ProgramDetailPage() {
             <div className="space-y-2">
               {relatedPrograms.map((rp) => (
-                <Link key={rp.id} to={`/monetization/program/${rp.id}`}>
+                <Link key={rp.id} to={`/monetization/program/${rp.id}`} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                   <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
                     <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${rp.accent}15` }}>
                       <rp.icon className="w-4 h-4" style={{ color: rp.accent }} />
@@ -817,7 +817,7 @@ export default function ProgramDetailPage() {
         {/* Bottom Links */}
         <div className="space-y-2">
-          <Link to="/monetization/articles">
+          <Link to="/monetization/articles" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
               <BookOpen className="w-5 h-5 text-primary" />
               <div className="flex-1 text-left">
@@ -828,7 +828,7 @@ export default function ProgramDetailPage() {
             </div>
           </Link>
-          <Link to="/creator-dashboard">
+          <Link to="/creator-dashboard" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
               <TrendingUp className="w-5 h-5 text-primary" />
               <div className="flex-1 text-left">
@@ -839,7 +839,7 @@ export default function ProgramDetailPage() {
             </div>
           </Link>
-          <Link to="/monetization">
+          <Link to="/monetization" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
               <ArrowLeft className="w-5 h-5 text-primary" />
               <div className="flex-1 text-left">
```

**Wait — I see the Share button has a duplicate in the source. Let me re-examine the actual file more carefully.**

Looking at the source again, the Share button at L472 is:
```tsx
<button type="button"
  onClick={() => {
    navigator.clipboard.writeText(`${window.location.origin}/monetization/program/${programId}`);
    toast.success("Link copied!");
  }}
  className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
>
  <Share2 className="h-4 w-4" />
</button>
```

There's no duplicate — the diff above incorrectly duplicated the Share button. Let me provide a clean, correct diff:

## Clean Diff

```diff
--- a
