# MiMo run — 2026-06-12T02:14:35.084Z

- model: mimo-v2.5-pro
- task: Audit and propose a refined build for the ZIVO marketing Footer (src/components/Footer.tsx). It already renders dark navy #0f1629 with an IG-gradient accent, social links, an App Store CTA, 4 link columns, legal links, and an OTA disclosure. Propose: (1) a tasteful premium UX/UI refinement (keep it on-brand, additive, type-safe), (2) any completeness gaps, (3) a concrete minimal diff with exact paths and what the owner must verify. The app must pass 'npm run update'.
- files: src/components/Footer.tsx

---

## 1 · Audit & Plan

### What's already solid
- Dark navy `#0f1629`, IG-gradient accent, decorative blur orbs — on-brand.
- Travel host gating: drops non-travel sub-brands, rebrands labels, uses `ZivoTravel` logo.
- Capacitor native guard (returns `null` on iOS/Android — correct; native has its own bottom tab bar).
- OTA disclosure + Seller-of-travel placeholder — good compliance posture.
- Link columns are well-structured with `grid-cols-2 sm:grid-cols-4` responsive classes already baked in.

### Completeness gaps found

| # | Gap | Severity |
|---|-----|----------|
| 1 | **`hidden lg:block` hides the entire footer on mobile web** — no legal links, no OTA disclosure, no sitemap for any viewport < 1024 px. Compliance risk. | 🔴 High |
| 2 | **No Google Play CTA** — only the App Store button exists. | 🟡 Medium |
| 3 | **Three unused imports**: `motion` (framer-motion), `ExternalLink`, `Bus` — dead code. | 🟢 Low |
| 4 | **Link columns lack `<nav aria-label>` landmarks** — screen readers see an unlabeled list. | 🟢 Low |

### Refined plan (additive, type-safe, no domain breaks)

1. **Make the footer responsive** — remove `hidden lg:block`; center-align the brand column on mobile; slightly reduce vertical padding on small screens.
2. **Add Google Play CTA** alongside App Store (same "coming soon" toast pattern).
3. **Clean unused imports** (`motion`, `ExternalLink`, `Bus`).
4. **Wrap link columns in `<nav aria-label>`** for screen-reader navigation.

No new dependencies, no route changes, no backend wiring. All changes are additive CSS/class swaps and one extra button.

---

## 2 · Concrete diff

**File:** `src/components/Footer.tsx`

```diff
--- a/src/components/Footer.tsx
+++ b/src/components/Footer.tsx
@@ -3,13 +3,10 @@
  */
 import { Link } from "react-router-dom";
-import { motion } from "framer-motion";
 import {
-  ExternalLink,
   Heart,
   ChevronUp,
   CheckCircle2,
   Plane,
   Building2,
   Car,
-  Bus,
   MapPin,
 } from "lucide-react";
@@ -102,7 +99,7 @@ const Footer = ({ className }: { className?: string }) => {
 
   return (
-    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden hidden lg:block", className)}>
+    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden", className)}>
       {/* Decorative orbs */}
       <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />
@@ -111,10 +108,10 @@ const Footer = ({ className }: { className?: string }) => {
 
       <div className="container mx-auto px-4 relative z-10">
         {/* Main grid */}
-        <div className="py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
+        <div className="py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
           {/* Brand column */}
-          <div className="lg:col-span-4 space-y-5">
+          <div className="lg:col-span-4 space-y-5 text-center lg:text-left">
             <Link to="/" className="inline-flex min-h-[40px] items-center touch-manipulation">
               {isTravel ? (
                 <span className="flex items-center gap-2">
@@ -135,7 +132,7 @@ const Footer = ({ className }: { className?: string }) => {
               Book flights, hotels, and car rentals with transparent pricing and secure checkout. Your next adventure starts here.
             </p>
 
-            {/* App Store */}
-            <div className="flex flex-wrap gap-2">
+            {/* App Store + Google Play */}
+            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
               <button type="button"
                 onClick={() => handleAppStore("App Store")}
                 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/15 active:scale-[0.97] transition-all text-xs font-medium text-primary-foreground/80 touch-manipulation min-h-[44px]"
@@ -143,6 +140,15 @@ const Footer = ({ className }: { className?: string }) => {
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                 App Store
               </button>
+              <button type="button"
+                onClick={() => handleAppStore("Google Play")}
+                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/15 active:scale-[0.97] transition-all text-xs font-medium text-primary-foreground/80 touch-manipulation min-h-[44px]"
+              >
+                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
+                Google Play
+              </button>
             </div>
 
             {/* Social */}
-            <div className="flex items-center gap-2">
+            <div className="flex items-center gap-2 justify-center lg:justify-start">
               {socialLinks.map((social) => {
@@ -174,8 +180,8 @@ const Footer = ({ className }: { className?: string }) => {
           {/* Link columns */}
           <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
             {sections.map((section) => (
-              <div key={section.title}>
-                <h4 className="font-semibold text-sm mb-4 text-primary-foreground/80 flex items-center gap-2">
+              <nav aria-label={section.title} key={section.title}>
+                <h4 className="font-semibold text-sm mb-4 text-primary-foreground/80 flex items-center justify-center lg:justify-start gap-2">
                   <section.icon className="w-3.5 h-3.5 text-primary/70" />
                   {section.title}
                 </h4>
@@ -191,7 +197,7 @@ const Footer = ({ className }: { className?: string }) => {
                     </li>
                   ))}
                 </ul>
-              </div>
+              </nav>
             ))}
           </div>
         </div>
```

### Summary of every change

| Line(s) | What | Why |
|---------|------|-----|
| L5–L6 | Remove `motion`, `ExternalLink`, `Bus` imports | Unused dead-code cleanup |
| L102 | `hidden lg:block` → (removed) | **Makes footer visible on mobile web** — legal/OTA links accessible at all widths |
| L111 | `py-14` → `py-10 lg:py-14` | Tighter mobile vertical rhythm |
| L114 | Add `text-center lg:text-left` | Centers brand block on mobile |
| L132 | Add `justify-center lg:justify-start` on App Store row | Centers store buttons on mobile |
| L140–L147 | **New** Google Play button | Android CTA parity (same toast pattern) |
| L149 | Add `justify-center lg:justify-start` on social row | Centers social icons on mobile |
| L180 | `<div>` → `<nav aria-label={section.title}>` | Screen-reader landmark for each link column |
| L181 | Add `justify-center lg:justify-start` on column heading | Centers column headings on mobile |

**Zero new dependencies. Zero type changes. Purely additive.**

---

## 3 · Owner verification checklist

| Step | Command / Action | Must pass |
|------|-----------------|-----------|
| Type-check + build gate | `npm run update` | 0 errors, production build OK |
| Visual — desktop | Dev server → `localhost:5173` (any non-travel host) | Footer looks identical to before |
| Visual — mobile | Chrome DevTools → iPhone SE / Pixel 7 viewport | Footer visible, brand centered, 2-col link grid, both store buttons |
| Visual — travel host | Dev server with travel hostname header | Travel branding, filtered sections, "Zivo Travel" copyright |
| Screen reader | VoiceOver/NVDA → Tab to footer | Four `<nav>` landmarks announced ("Flights navigation", "Hotels navigation", etc.) |
| Lint | `npm run
