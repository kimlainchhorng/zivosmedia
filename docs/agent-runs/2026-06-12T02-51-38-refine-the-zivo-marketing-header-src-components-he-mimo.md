# MiMo run — 2026-06-12T02:51:38.761Z

- model: mimo-v2.5-pro
- task: Refine the ZIVO marketing Header (src/components/Header.tsx) — premium + responsive. Issue: at tablet (md 768-1023px) both the desktop actions ('hidden md:flex') and the mobile hamburger ('lg:hidden') show at once (cluttered). Nav links only show at lg. Propose: (1) clean breakpoints (hamburger-only below lg, full nav+actions at lg+); (2) premium nav active+hover states via react-router useLocation; (3) tasteful polish WITHOUT changing header height (h-11 sm:h-12). Additive + type-safe. Concrete Tailwind + minimal diff. Be concise.
- files: src/components/Header.tsx

---

## Plan

**Root cause:** Desktop actions div uses `hidden md:flex` (appears at 768px) while nav links + hamburger boundary is `lg` (1024px). Tablet 768–1023px shows actions AND hamburger simultaneously.

**Fix (3 changes, all in `src/components/Header.tsx`):**

1. **Breakpoint fix** — desktop actions: `hidden md:flex` → `hidden lg:flex`. Now below `lg`: hamburger only. At `lg+`: nav + actions.
2. **Active/hover states** — `NavLinkItem` gets `useLocation` awareness: active route gets `bg-secondary text-foreground shadow-sm`, inactive gets `text-muted-foreground hover:text-foreground`.
3. **Import fix** — add `useLocation` to the react-router-dom import.

No height changes. Additive. Type-safe.

---

## Proposed Diff — `src/components/Header.tsx`

```diff
--- a/src/components/Header.tsx
+++ b/src/components/Header.tsx
@@ -1,4 +1,4 @@
-import { useNavigate, Link } from "react-router-dom";
+import { useNavigate, Link, useLocation } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Menu, User, Search, Sparkles, ChevronDown, Car, ShieldCheck, Plane, Hotel, Globe, Check } from "lucide-react";
 import { useState } from "react";
@@ -27,12 +27,18 @@ interface NavItem {
 
 function NavLinkItem({ item }: { item: NavItem }) {
   const Icon = item.icon;
+  const { pathname } = useLocation();
+  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
   return (
     <Link
       to={item.href}
-      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold text-foreground hover:bg-secondary transition-colors"
+      className={cn(
+        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors",
+        isActive
+          ? "text-foreground bg-secondary shadow-sm"
+          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
+      )}
     >
       <Icon className="w-3.5 h-3.5" />
       <span>{item.label}</span>
@@ -92,7 +98,7 @@ const Header = () => {
 
             {/* Desktop Actions - Enhanced */}
-            <div className="hidden md:flex items-center gap-1 ml-auto">
+            <div className="hidden lg:flex items-center gap-1 ml-auto">
               {/* Language Selector */}
```

**That's the entire change.** Three hunks, one file.

---

## Breakpoint behavior after fix

| Width | Nav links | Desktop actions | Hamburger |
|-------|-----------|-----------------|-----------|
| < 768 | hidden | hidden | **visible** |
| 768–1023 (tablet) | hidden | hidden | **visible** |
| ≥ 1024 (lg+) | **visible** | **visible** | hidden |

Clean split — no overlap at any width.

---

## Verification

After applying, the owner must run:

```bash
npm run update
```

This verifies `type-check` (0 errors) + `type-check:worker` + production build. Preview at any viewport width — specifically confirm tablet 768–1023px shows only the hamburger (no language/currency/account actions leaking).
