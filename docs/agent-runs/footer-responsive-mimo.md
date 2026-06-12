# MiMo run — 2026-06-12T02:41:28.757Z

- model: mimo-v2.5-pro
- task: Make the ZIVO marketing Footer (src/components/Footer.tsx) fully responsive for mobile + tablet + desktop. It is currently 'hidden lg:block' (desktop only). Propose a clean PREMIUM mobile/tablet layout: stacked brand centered, App Store/Google Play badges, social row, link columns 2-cols on mobile / 4 on desktop, legal + OTA disclosure visible at all sizes, tighter mobile padding, safe-area bottom padding. Keep desktop design intact. Additive + type-safe. Give concrete Tailwind classes + minimal diff. Be concise.
- files: src/components/Footer.tsx

---

## Plan

The footer is completely hidden below `lg` (1024px) due to `hidden lg:block`. The fix is straightforward — remove that visibility gate and add mobile-centered layout classes to the brand column, tighten vertical spacing on small screens, and add safe-area bottom padding for notched devices. The link columns already use `grid-cols-2 sm:grid-cols-4` so they're fine. Legal/OTA disclosure sections already exist in markup — they just need the outer wrapper to stop hiding them.

---

## Proposed diff — `src/components/Footer.tsx`

**6 surgical changes**, all additive Tailwind classes:

### 1. Outer `<footer>` — remove `hidden lg:block`, add safe-area padding

```diff
-    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden hidden lg:block", className)}>
+    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden pb-[env(safe-area-inset-bottom,0px)]", className)}>
```

### 2. Main grid wrapper — tighter mobile vertical padding + gap

```diff
-        <div className="py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
+        <div className="py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
```

### 3. Brand column — center on mobile, left-align on desktop

```diff
-          <motion.div {...rise(0)} className="lg:col-span-4 space-y-6">
+          <motion.div {...rise(0)} className="lg:col-span-4 space-y-6 flex flex-col items-center text-center lg:items-start lg:text-left">
```

### 4. App Store badges row — center on mobile

```diff
-            <div className="flex flex-wrap gap-3">
+            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
```

### 5. Social icons row — center on mobile

```diff
-            <div className="flex items-center gap-2">
+            <div className="flex items-center gap-2 justify-center lg:justify-start">
```

### 6. Link columns grid — reduce mobile gap

```diff
-          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-10">
+          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 lg:gap-x-8 lg:gap-y-10">
```

---

**That's it — 6 one-line edits, zero new imports, zero logic changes.**

### What stays untouched
- Desktop layout (`lg:` and up) is identical — all changes are `mobile-default → lg-override`.
- All motion/reduced-motion logic, travel host detection, native platform guard, legal links, OTA disclosure — unchanged.
- Link column nav items remain left-aligned at all sizes (readability over symmetry for links).
- Bottom bar (`flex-col md:flex-row items-center` centering) already works on mobile.

### Owner verification
1. `npm run update` — must pass (type-check + worker type-check + production build).
2. Visual check: resize browser from 375px → 1440px; confirm stacked centered brand on mobile, 2-col links, 4-col on desktop, legal + OTA visible at every width.
3. Test on a notched iPhone (or simulator) to confirm `env(safe-area-inset-bottom)` adds the chin padding.
4. On a native Capacitor build the footer returns `null` — no change there (guard is above).
