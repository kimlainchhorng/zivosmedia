# DeepSeek run — 2026-06-14T05:03:26.990Z

- model: deepseek-chat
- task: SLICE 56 — src/pages/DatingPage.tsx (single page, 236 lines, swipe-to-match dating discovery page; card stack + 3 action buttons). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label/aria-pressed/aria-expanded only). NO logic, NO handlers, NO state, NO routing changes, NO framer prop changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards/standalone-CTA [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for pure press-scale with no hover color (OR when the only hover is a TRANSFORM like hover:scale). When a control already has transition-colors AND we add a new active:scale, FLIP transition-colors→transition-all. A hover:scale (transform) + existing transition-transform needs NO flip.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. aria-pressed ONLY for segmented single/multi-select controls. Do NOT add aria-expanded to dialog openers.

SKIP (already tokenized / native focus / not mine): shadcn components (Avatar, etc.); presentational divs/motion.div without onClick (the swipe card itself uses drag, NOT onClick — it is a drag surface, leave it); child components (SafeCaption, VerifiedBadge, ZivoMobileNav, SEOHead).

The 5 RAW <button> controls under review:
1. L107 Back ArrowLeft — icon-only, NO aria-label, onClick navigate(-1), className "p-2 -ml-2 rounded-full hover:bg-muted/50" (sticky header, neutral bg). HAS hover:bg, NO transition/scale/ring.
2. L124 Refresh — VISIBLE TEXT "Refresh", onClick reset index + invalidateQueries, className "mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium". Auto-width gradient CTA. NO hover color, NO transition, NO scale, NO ring. (Empty-state CTA.)
3. L200 Pass/X — icon-only X, NO aria-label, onClick handleSwipe("left"), className "h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". HAS hover:scale-110 (TRANSFORM) + transition-transform, NO active-press, NO ring.
4. L207 Message — icon-only MessageCircle, NO aria-label, onClick navigate("/chat", {state:{recipientId}}), className "h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". Same pattern as #3.
5. L218 Heart/Like — icon-only Heart, NO aria-label, onClick handleSwipe("right"), className "h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform". Same pattern as #3.

Confirm per control: exact className change, transition-all vs transition-transform vs flip vs keep, scale tier, ring (outward vs inset), and any aria add/keep. KEY QUESTIONS: (Q1) For #3/#4/#5 which ALREADY have hover:scale-110 + transition-transform — do we APPEND active:scale-95 (icon tier) + ring and KEEP transition-transform with NO flip (since the only hover is a transform, not a color)? Confirm the active:scale-95 composing UNDER hover:scale-110 is correct/intended (press snaps from 110%→95%). (Q2) For #2 Refresh gradient CTA with no hover at all — transition-transform (pure press, no color hover) + active:scale-[0.98] (standalone auto-width CTA tier) + outward ring? Or [0.97]? (Q3) aria-labels: Back="Back", Pass/X="Pass", Message="Message", Heart="Like" — confirm wording. Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per control.
- files: src/pages/DatingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 56 — DatingPage.tsx Interaction-Token Polish

## Plan

Apply the project's standing interaction-token rules to 5 RAW `<button>` controls on `src/pages/DatingPage.tsx`. All changes are className-only + aria-label additions. No logic, handlers, state, or framer props touched.

## Proposed Changes

### Control-by-control breakdown

| # | Control | Change | Scale tier | Transition | Ring | aria-label |
|---|---------|--------|------------|------------|------|------------|
| 1 | Back ArrowLeft (L107) | APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | icon `scale-95` | FRESH `transition-all` (has `hover:bg-muted/50` color) | OUTWARD `ring-ring` | ADD `aria-label="Back"` |
| 2 | Refresh CTA (L124) | APPEND `transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | auto-width CTA `[0.98]` | FRESH `transition-transform` (no hover color) | OUTWARD `ring-ring` | none (visible text "Refresh") |
| 3 | Pass/X (L200) | APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | icon `scale-95` | KEEP `transition-transform` (hover is `hover:scale-110` — a transform, not color) | OUTWARD `ring-ring` | ADD `aria-label="Pass"` |
| 4 | Message (L207) | APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | icon `scale-95` | KEEP `transition-transform` (hover is `hover:scale-110` — a transform, not color) | OUTWARD `ring-ring` | ADD `aria-label="Message"` |
| 5 | Heart/Like (L218) | APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | icon `scale-95` | KEEP `transition-transform` (hover is `hover:scale-110` — a transform, not color) | OUTWARD `ring-ring` | ADD `aria-label="Like"` |

### Key decisions

**Q1 (controls #3/#4/#5):** Yes — APPEND `active:scale-95` + ring, KEEP `transition-transform` with NO flip. The existing `hover:scale-110` is a transform, not a color fade, so `transition-transform` already covers both the hover scale-up and the new press scale-down. The `active:scale-95` composes under `hover:scale-110` correctly — pressing snaps from 110%→95%, releasing returns to 110% (or 100% if unhovered). This is the intended behavior.

**Q2 (control #2 Refresh):** `transition-transform` (pure press, no hover color) + `active:scale-[0.98]` (standalone auto-width CTA tier — matches the `JobPostingDetailPage` Apply button pattern at `[0.98]`). Not `[0.97]` (that's for pill/chip tier).

**Q3 (aria-labels):** Back="Back", Pass/X="Pass", Message="Message", Heart="Like". Matches the `JobPostingDetailPage.tsx` convention of concise, lowercase-friendly labels on icon-only buttons.

## Diff

```diff
--- a/src/pages/DatingPage.tsx
+++ b/src/pages/DatingPage.tsx
@@ -104,7 +104,8 @@ export default function DatingPage() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+          <button type="button" onClick={() => navigate(-1)}
+            aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-lg font-bold flex-1 flex items-center gap-2">
@@ -122,7 +123,7 @@ export default function DatingPage() {
             <button type="button"
               onClick={() => { setCurrentIndex(0); queryClient.invalidateQueries({ queryKey: ["dating-profiles"] }); }}
-              className="mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium"
+              className="mt-4 px-6 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               Refresh
             </button>
@@ -197,7 +198,8 @@ export default function DatingPage() {
             <div className="flex items-center gap-5 mt-8">
               <button type="button"
                 onClick={() => handleSwipe("left")}
-                className="h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Pass"
+                className="h-14 w-14 rounded-full bg-card border-2 border-destructive/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <X className="h-7 w-7 text-destructive" />
               </button>
@@ -205,7 +207,8 @@ export default function DatingPage() {
               <button type="button"
                 onClick={() => {
                   if (currentProfile) {
                     navigate(`/chat`, { state: { recipientId: currentProfile.id } });
                   }
                 }}
-                className="h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Message"
+                className="h-11 w-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <MessageCircle className="h-5 w-5 text-primary" />
               </button>
@@ -213,7 +216,8 @@ export default function DatingPage() {
               <button type="button"
                 onClick={() => handleSwipe("right")}
-                className="h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
+                aria-label="Like"
+                className="h-14 w-14 rounded-full bg-card border-2 border-emerald-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <Heart className="h-7 w-7 text-emerald-500" />
               </button>
```

## Verification

Run `npm run update` before marking done. The diff touches only:
- 5 className strings (append-only, no removals)
- 4 `aria-label` additions (icon-only buttons that had none)

Zero logic, zero handlers, zero state, zero framer props changed.
