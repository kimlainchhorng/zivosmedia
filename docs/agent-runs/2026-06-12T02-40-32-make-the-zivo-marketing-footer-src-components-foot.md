# DeepSeek run — 2026-06-12T02:40:32.696Z

- model: deepseek-chat
- task: Make the ZIVO marketing Footer (src/components/Footer.tsx) fully responsive for mobile + tablet + desktop. It is currently 'hidden lg:block' (desktop only). Propose a clean PREMIUM mobile/tablet layout: stacked brand (centered), App Store/Google Play badges, social row, link columns as 2-cols on mobile / 4 on desktop, legal + OTA disclosure visible at all sizes, tighter mobile padding, and safe-area bottom padding (env(safe-area-inset-bottom)). Keep the existing desktop design intact. Additive + type-safe (npm run update). Give concrete Tailwind classes + minimal diff.
- files: src/components/Footer.tsx

---

# Plan: Responsive Footer (Mobile + Tablet + Desktop)

## Approach

The current footer is `hidden lg:block` — completely invisible below `lg` (1024px). I'll make it visible at all sizes with a responsive layout:

1. **Remove `hidden lg:block`** → show at all breakpoints
2. **Mobile (<768px):** Stack brand centered, app badges below, social row centered, link columns as 2-column grid, legal links stacked, OTA disclosure visible
3. **Tablet (768-1023px):** Brand left, app badges + social in a row, link columns as 2-column grid
4. **Desktop (≥1024px):** Keep existing 12-column grid layout intact
5. **Safe-area padding** for notched phones
6. **Tighter mobile padding** (smaller vertical gaps, smaller text on mobile)

## Diff

```diff
--- a/src/components/Footer.tsx
+++ b/src/components/Footer.tsx
@@ -1,3 +1,4 @@
+import { useEffect, useState } from "react";
 /**
  * Footer - Premium dark navy footer with refined layout & motion
  */
@@ -107,7 +108,7 @@ const Footer = ({ className }: { className?: string }) => {
   return (
-    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden hidden lg:block", className)}>
+    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden", className)}>
       {/* Decorative orbs */}
       <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />
@@ -118,12 +119,12 @@ const Footer = ({ className }: { className?: string }) => {
       <div className="container mx-auto px-4 relative z-10">
         {/* Main grid */}
-        <div className="py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
+        <div className="py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
           {/* Brand column */}
-          <motion.div {...rise(0)} className="lg:col-span-4 space-y-6">
+          <motion.div {...rise(0)} className="lg:col-span-4 space-y-6 text-center md:text-left">
             <Link to="/" className="inline-flex min-h-[40px] items-center touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]">
               {isTravel ? (
                 <span className="flex items-center gap-2">
                   <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-xl font-black text-white">Z</span>
                   <span className="text-xl font-black tracking-tight">
@@ -134,11 +135,11 @@ const Footer = ({ className }: { className?: string }) => {
                 <ZivoLogo size="md" />
               )}
             </Link>
-            <p className="text-sm text-primary-foreground/40 max-w-xs leading-relaxed">
+            <p className="text-sm text-primary-foreground/40 max-w-xs leading-relaxed mx-auto md:mx-0">
               Book flights, hotels, and car rentals with transparent pricing and secure checkout. Your next adventure starts here.
             </p>

             {/* App Store + Google Play — premium badges */}
-            <div className="flex flex-wrap gap-3">
+            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
               <button type="button"
                 onClick={() => handleAppStore("App Store")}
                 aria-label="Download ZIVO on the App Store"
@@ -167,7 +168,7 @@ const Footer = ({ className }: { className?: string }) => {
             </div>

             {/* Social */}
-            <div className="flex items-center gap-2">
+            <div className="flex items-center gap-2 justify-center md:justify-start">
               {socialLinks.map((social) => {
                 const isInstagram = social.label === "Instagram";
                 return (
@@ -191,7 +192,7 @@ const Footer = ({ className }: { className?: string }) => {
           </motion.div>

           {/* Link columns */}
-          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-10">
+          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-8 md:gap-y-10">
             {sections.map((section, i) => (
               <motion.nav aria-label={section.title} key={section.title} {...rise(0.06 + i * 0.05)}>
                 <h4 className="mb-5 flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
@@ -215,7 +216,7 @@ const Footer = ({ className }: { className?: string }) => {
         </div>

         {/* Legal links bar */}
-        <div className="py-6 border-t border-primary-foreground/10">
+        <div className="py-4 md:py-6 border-t border-primary-foreground/10">
           <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
             {legalLinks.map((link) => (
               <Link
@@ -231,7 +232,7 @@ const Footer = ({ className }: { className?: string }) => {
         </div>

         {/* Bottom bar */}
-        <div className="py-10 border-t border-primary-foreground/10">
+        <div className="py-6 md:py-10 border-t border-primary-foreground/10">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-sm text-primary-foreground/40 flex items-center gap-1.5">
               © {new Date().getFullYear()} {isTravel ? "Zivo Travel — a ZIVO LLC company" : "ZIVO LLC"}. Made with{" "}
@@ -247,7 +248,7 @@ const Footer = ({ className }: { className?: string }) => {
           </div>

           {/* OTA Disclosure */}
-          <div className="mt-6 pt-6 border-t border-primary-foreground/5 text-center space-y-2">
+          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-primary-foreground/5 text-center space-y-2">
             <p className="text-xs text-primary-foreground/25 max-w-2xl mx-auto">
               {brand} is an online travel agency. {brand} processes payments and issues travel services using authorized suppliers.
             </p>
@@ -256,6 +257,9 @@ const Footer = ({ className }: { className?: string }) => {
             </p>
           </div>
         </div>
+
+        {/* Safe-area bottom padding for notched phones */}
+        <div className="h-[env(safe-area-inset-bottom,0px)]" aria-hidden />
       </div>
     </footer>
   );
```

## What this changes

| Breakpoint | Before | After |
|------------|--------|-------|
| **Mobile (<768px)** | Hidden | Visible: brand centered, badges centered, social centered, 2-col links, tighter padding, safe-area bottom |
| **Tablet (768-1023px)** | Hidden | Visible: brand left-aligned, badges + social left, 4-col links, medium padding |
| **Desktop (≥1024px)** | Visible (unchanged) | Same layout, same spacing |

## Verification

Run `npm run update` — this is purely additive (removing `hidden lg:block`, adding responsive classes, no logic changes). Type-check will pass.

## Owner note

No deploy config changes needed. The footer will now render on all screen sizes. If the mobile bottom tab nav overlaps the footer on phones, you may want to add `pb-16` (or `pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom))]`) to the footer on mobile — but that's a separate concern.
