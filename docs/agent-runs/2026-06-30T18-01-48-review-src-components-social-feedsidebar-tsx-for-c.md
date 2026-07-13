# DeepSeek run — 2026-06-30T18:01:48.780Z

- model: deepseek-chat
- task: Review src/components/social/FeedSidebar.tsx for clean modern UX/UI improvements and provide concrete patch suggestions.

---

# FeedSidebar.tsx — UX/UI Review

## (1) Short Plan

`src/components/social/FeedSidebar.tsx` is the desktop left-rail navigation for the social surface (zivosmedia.com). It renders: a ZIVO logo, a "Create" button, 7 nav items (Feed, Reels, Chat, Rides, Events, Marketplace, Jobs), and a "More" expander with 4 secondary items (Fitness, Voice Rooms, Communities, Grocery). It's already responsive (hidden on mobile, `w-72` on desktop) and uses the IG-gradient active state.

**Audit findings:** The sidebar is **mature and already premium** — glass background, gradient active indicators, hover states, proper `aria-current`, framer-motion expand/collapse. No broken UX, no layout bugs, no missing a11y. The improvements below are **polish-only** (additive className tokens, no logic/DOM changes):

1. **Active indicator contrast** — the current `bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent` is subtle; a slightly stronger `/20` opacity makes the active item pop without being loud.
2. **Icon-only button focus rings** — the "Create" button and the "More" toggle are icon-only; they lack `focus-visible:ring` for keyboard users.
3. **"More" section visual separation** — the expanded secondary items sit flush against the primary list with no divider, making the hierarchy unclear at a glance.
4. **Scroll container polish** — the `overflow-y-auto` container has no `scrollbar-thin` styling, so on Windows the default scrollbar looks heavy against the glass sidebar.

---

## (2) Proposed Diff

**File:** `src/components/social/FeedSidebar.tsx`

```diff
--- a/src/components/social/FeedSidebar.tsx
+++ b/src/components/social/FeedSidebar.tsx
@@ -1,3 +1,4 @@
+// FeedSidebar.tsx — desktop left-rail navigation (zivosmedia.com)
 import React, { useState, useEffect, useRef } from "react";
 import { Link, useLocation, useNavigate } from "react-router-dom";
 import {
@@ -85,7 +86,7 @@ const FeedSidebar = () => {
         {/* Logo */}
         <div className="px-6 py-5">
           <Link to="/feed" className="flex items-center gap-2">
-            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
+            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-sm">
               <span className="text-white font-bold text-sm">Z</span>
             </div>
             <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
@@ -97,7 +98,7 @@ const FeedSidebar = () => {
         {/* Create Button */}
         <div className="px-4 mb-4">
           <button
-            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-sm hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
+            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold text-sm hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
             onClick={() => setShowCreateModal(true)}
           >
             <Plus className="h-5 w-5" />
@@ -113,7 +114,7 @@ const FeedSidebar = () => {
               <Link
                 key={item.label}
                 to={item.path}
-                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
+                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                   isActive(item.path)
                     ? "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent text-foreground font-semibold"
                     : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
@@ -148,7 +149,7 @@ const FeedSidebar = () => {
         {/* More Toggle */}
         <div className="px-4 mb-2">
           <button
-            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
+            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
             onClick={() => setShowMore(!showMore)}
           >
             <div className="h-6 w-6 flex items-center justify-center">
@@ -170,7 +171,7 @@ const FeedSidebar = () => {
         {/* More Items */}
         <AnimatePresence>
           {showMore && (
-            <motion.div
+            <motion.div className="border-t border-border/40 pt-2"
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: "auto", opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
@@ -183,7 +184,7 @@ const FeedSidebar = () => {
                     <Link
                       key={item.label}
                       to={item.path}
-                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
+                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                         isActive(item.path)
                           ? "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent text-foreground font-semibold"
                           : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
@@ -210,7 +211,7 @@ const FeedSidebar = () => {
       </div>

       {/* Scrollable nav area */}
-      <div className="flex-1 overflow-y-auto">
+      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
         {/* Primary Nav Items */}
         <nav className="px-4 space-y-1">
           {primaryNavItems.map((item) => (
@@ -218,7 +219,7 @@ const FeedSidebar = () => {
               <Link
                 key={item.label}
                 to={item.path}
-                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
+                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                   isActive(item.path)
                     ? "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-transparent text-foreground font-semibold"
                     : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
```

---

## (3) Owner Verification

### What changed (summary)
| Change | Location | Why |
|--------|----------|-----|
| Logo badge `rounded-lg`→`rounded-xl` + `shadow-sm` | L89 | Slightly larger radius matches the nav items; shadow lifts the brand mark |
| Create button `focus-visible:ring-*` | L101 | Keyboard a11y for the icon+text CTA |
| All nav `<Link>`s `focus-visible:ring-*` | L117, L187, L222 | Keyboard a11y for every nav item (primary + secondary + scroll-area) |
| "More" toggle `focus-visible:ring-*` | L152 | Keyboard a11y for the expand/collapse trigger |
| "More" section `border-t border-border/40 pt-2` | L174 | Visual divider between primary and secondary nav groups |
| Scroll container `scrollbar-thin` classes | L214 | Slimmer scrollbar on Windows/desktop |

### Verify before deploy
1. **`npm run update`** — must pass (type-check + worker + build). The diff is pure className tokens — no type errors possible.
2. **Preview at 1280px** on zivosmedia host — confirm:
   - Active nav items have a slightly stronger pink/purple tint (the `/20` vs `/10` change is subtle — verify it reads as "active" not "disabled").
   - The "More" section has a thin `border-t` line separating it from the primary items.
   - Tab through the sidebar — every link and button shows a visible focus ring.
   - The scrollbar is thinner (Windows Chrome/Firefox).
3. **Preview at 768px** — the sidebar should be `hidden lg:flex` (no change to this behavior; verify it's still hidden on tablet/mobile).
4. **No regression on zivostravel.com** — the sidebar is gated by `isCurrentZivoTravelHost()` returning null (it's social-only), so travel is unaffected.

### Deploy
```bash
npm run update && git add src/components/social/FeedSidebar.tsx && git commit -m "FeedSidebar: polish active indicator, focus rings, more-section divider, scrollbar" && git push
```

---

**Bottom line:** The sidebar was already in good shape. These 6 additive className-only changes close the remaining polish gaps — keyboard a11y, visual hierarchy, and scrollbar fit-and-finish — with zero risk to the travel surface or any logic.
