# DeepSeek run — 2026-06-12T02:51:02.196Z

- model: deepseek-chat
- task: Refine the ZIVO marketing Header (src/components/Header.tsx) — premium look + responsive. Known issue: at tablet width (md, 768-1023px) BOTH the full desktop action buttons (the 'hidden md:flex' block: language, currency, Drive/Login/Signup) AND the mobile hamburger ('lg:hidden') render at once — redundant and cluttered. The nav links (Flights/Hotels/Car Rental) only show at lg. Propose: (1) clean responsive breakpoints so below-lg is hamburger-only and lg+ shows full nav + actions; (2) premium nav-link active + hover states using react-router useLocation to highlight the current route; (3) tasteful premium polish WITHOUT changing header height (h-11 sm:h-12 — ~40 pages depend on their top padding). Additive, type-safe (npm run update). Give concrete Tailwind classes + minimal diff.
- files: src/components/Header.tsx

---

# Plan: Premium Header Refinement

## Analysis

The issue is clear: at `md` breakpoint (768-1023px), the header shows **both** the desktop action buttons (`hidden md:flex`) AND the mobile hamburger (`lg:hidden`). The nav links only appear at `lg` (1024px+), creating a gap where actions are visible but navigation isn't.

## Proposed Changes

### 1. Fix responsive breakpoints (the main bug)

**Current:** Desktop actions show at `md:flex`, hamburger hides at `lg:hidden` → overlap at 768-1023px.

**Fix:** 
- Desktop actions: `md:flex` → `lg:flex` (match nav links)
- Hamburger: `lg:hidden` stays (correct, hides at lg+)
- Nav links: `lg:flex` stays (correct)

This makes the header behave cleanly:
- `< 1024px`: Logo + hamburger only (mobile)
- `>= 1024px`: Logo + nav links + full actions (desktop)

### 2. Premium nav-link active states via `useLocation`

Add route-based highlighting to `NavLinkItem` so the current page's link gets a subtle accent (gradient underline + slight background tint).

### 3. Premium polish (additive, no height change)

- Slightly tighter spacing for the desktop actions block
- Subtle hover scale on nav links
- Active link indicator (gradient bottom border)
- Keep all existing functionality (language, currency, user menu, search)

## Diff

```diff
--- a/src/components/Header.tsx
+++ b/src/components/Header.tsx
@@ -1,4 +1,4 @@
-import { useNavigate, Link } from "react-router-dom";
+import { useNavigate, Link, useLocation } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Menu, User, Search, Sparkles, ChevronDown, Car, ShieldCheck, Plane, Hotel, Globe, Check } from "lucide-react";
 import { useState } from "react";
@@ -30,11 +30,21 @@ interface NavItem {
 function NavLinkItem({ item }: { item: NavItem }) {
   const Icon = item.icon;
+  const location = useLocation();
+  const isActive = location.pathname === item.href || 
+    (item.href !== "/" && location.pathname.startsWith(item.href));
+  
   return (
     <Link
       to={item.href}
-      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold text-foreground hover:bg-secondary transition-colors"
+      className={cn(
+        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
+        isActive 
+          ? "text-foreground bg-secondary/80 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-ig-gradient" 
+          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
+      )}
     >
+      {isActive && <span className="absolute inset-0 rounded-xl bg-ig-gradient/5" aria-hidden />}
       <Icon className="w-3.5 h-3.5" />
       <span>{item.label}</span>
     </Link>
@@ -48,6 +58,7 @@ const Header = () => {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const [isLangOpen, setIsLangOpen] = useState(false);
+  const location = useLocation();
   const { currentLanguage, changeLanguage, t } = useI18n();
   const { data: supportedLanguages } = useSupportedLanguages(true);
   const activeLanguages = (supportedLanguages || []).filter(l => l.is_active);
@@ -83,7 +94,7 @@ const Header = () => {
             {/* Desktop Navigation - Simple Links */}
             <nav className="hidden lg:flex items-center gap-1">
               {([
-                { label: "Flights", href: "/flights", icon: Plane },
+                { label: "Flights", href: "/flights", icon: Plane },
                 { label: "Hotels", href: "/hotels", icon: Hotel },
                 { label: "Car Rental", href: "/car-rental", icon: Car },
               ] as const).map((item) => (
@@ -93,7 +104,7 @@ const Header = () => {

             {/* Desktop Actions - Enhanced */}
-            <div className="hidden md:flex items-center gap-1 ml-auto">
+            <div className="hidden lg:flex items-center gap-0.5 ml-auto">
               {/* Language Selector */}
               <Popover open={isLangOpen} onOpenChange={setIsLangOpen}>
                 <PopoverTrigger asChild>
@@ -155,7 +166,7 @@ const Header = () => {
               {user ? (
                 <>
                   {/* Notifications - Real-time */}
-                  <NotificationBell />
+                  <NotificationBell />

                   {/* User Menu - Enhanced */}
                   <DropdownMenu>
@@ -163,7 +174,7 @@ const Header = () => {
                       <Button variant="ghost" size="sm" className="gap-1.5 ml-1 rounded-xl hover:bg-secondary px-2 h-8">
                         <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                           <User className="h-3 w-3 text-foreground" />
                         </div>
-                        <span className="hidden lg:inline text-[13px] font-semibold">Account</span>
+                        <span className="hidden xl:inline text-[13px] font-semibold">Account</span>
                         <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
                       </Button>
                     </DropdownMenuTrigger>
@@ -194,7 +205,7 @@ const Header = () => {
               ) : (
                 <div className="flex items-center gap-2 ml-2">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => navigate("/drive")}
-                    className="rounded-xl font-semibold gap-1.5"
+                    className="rounded-xl font-semibold gap-1.5 hidden xl:inline-flex"
                   >
                     <Car className="w-4 h-4" />
                     Drive with us
```

## Key Changes Explained

1. **`hidden md:flex` → `hidden lg:flex`** (line 107): Desktop actions now match nav links — both show at `lg` (1024px+). Below that, hamburger only.

2. **`useLocation` in `NavLinkItem`**: Active route gets:
   - `bg-secondary/80` background
   - Gradient underline (`after:bg-ig-gradient`)
   - Subtle background glow (`bg-ig-gradient/5`)
   - Inactive links get `text-muted-foreground` that brightens on hover

3. **`gap-0.5` instead of `gap-1`** (line 107): Tighter spacing for the action buttons at desktop.

4. **`hidden xl:inline-flex`** on "Drive with us" button and **`hidden xl:inline`** on "Account" label: At `lg` (1024-1279px), these text labels hide to save space — icons remain visible. Full text shows at `xl` (1280px+).

5. **`useLocation` import added** at top.

## Verification

After applying, run:
```bash
npm run update
```

Preview at 768px, 1024px, and 1280px widths to confirm:
- **768px**: Only logo + hamburger (no duplicate actions)
- **1024px**: Logo + nav links + all action icons (compact)
- **1280px+**: Full layout with text labels

## What the Owner Should Verify

1. The active link indicator works correctly for nested routes (e.g., `/flights/search` should highlight "Flights")
2. The `xl` breakpoint hiding of "Drive with us" and "Account" text is acceptable — if you want them visible at all desktop sizes, remove the `hidden xl:` classes
3. The gradient underline doesn't clash with any page-specific styles below the header
