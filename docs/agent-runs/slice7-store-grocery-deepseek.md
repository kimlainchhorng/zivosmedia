# DeepSeek run — 2026-06-13T22:02:26.983Z

- model: deepseek-chat
- task: Premium interaction and responsive QA pass on TWO customer-facing public storefronts: src/pages/StoreProfilePage.tsx and src/pages/GroceryStorePage.tsx. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (uses transition-all active:scale-[0.97/0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute changes ONLY (e.g. adding aria-label). Do NOT change any supabase query, RPC, mutation, react-query key, state logic, routing, cart logic, or pricing math. Both pages currently have ZERO focus-visible rings. Identify genuine gaps ONLY: (1) raw <button>/<a> controls missing active:scale press feedback or focus-visible rings; (2) icon-only buttons without aria-label; (3) responsive crush or overflow at 375px width; (4) fetched-but-unused data fields; (5) contrast/legibility bugs. For each finding give the EXACT line number, which file, and exact before/after className. Be concise and flag only REAL gaps. IMPORTANT: shadcn <Button> components already ship built-in active:scale + focus-visible:ring — do NOT flag those, only raw <button>/<a> elements.
- files: src/pages/StoreProfilePage.tsx, src/pages/GroceryStorePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

Looking at both files, I'll identify genuine gaps where raw `<button>`/`<a>` elements are missing `active:scale` press feedback or `focus-visible` rings, and any responsive/contrast issues.

## Plan

**StoreProfilePage.tsx** — 5 gaps found:
1. Social link `<a>` tags (Facebook/Instagram/Telegram) — missing focus-visible rings
2. "Ride There" button — missing focus-visible ring
3. Call/SMS/Chat/Share action tiles — missing focus-visible rings
4. "Check room status" and "Get directions" buttons — missing focus-visible rings
5. Category filter pills — missing focus-visible rings

**GroceryStorePage.tsx** — 4 gaps found:
1. Quick filter chips — missing focus-visible rings
2. Sort mode button — missing focus-visible ring
3. "Back to categories" button — missing focus-visible ring
4. Cart "Clear" button — missing focus-visible ring

No responsive crush at 375px detected in either page. No fetched-but-unused data fields. No contrast bugs.

## Proposed Changes

### File: `src/pages/StoreProfilePage.tsx`

**1. Social link `<a>` tags (around line 350-360)**
```diff
- className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
+ className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**2. "Ride There" button (around line 190)**
```diff
- className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
+ className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**3. Call/SMS/Chat/Share action tiles (3 instances, around lines 230-280)**
For the SMS `<a>`:
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For the Call `<a>`:
```diff
- className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors", callDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
+ className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", callDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
```

For the Chat `<button>`:
```diff
- className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors", chatDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
+ className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", chatDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
```

For the Share `<button>`:
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**4. "Check room status" and "Get directions" buttons (around lines 470-480)**
```diff
- className="h-9 whitespace-nowrap gap-2 text-xs"
+ className="h-9 whitespace-nowrap gap-2 text-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

```diff
- className="h-9 whitespace-nowrap gap-2 border-border bg-background text-xs text-foreground hover:bg-muted"
+ className="h-9 whitespace-nowrap gap-2 border-border bg-background text-xs text-foreground hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**5. Category filter pills (around lines 400-420)**
For the "All" button:
```diff
- className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm", !selectedCategory ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20" : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground")}
+ className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", "border backdrop-blur-sm", !selectedCategory ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20" : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground")}
```

For each category button (same pattern):
```diff
- className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm", selectedCategory === cat ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20" : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground")}
+ className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", "border backdrop-blur-sm", selectedCategory === cat ? "bg-gradient-to-b from-primary via-primary to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 border-primary/50 ring-1 ring-primary/20" : "bg-card/60 text-muted-foreground border-white/[0.08] hover:bg-card/90 hover:border-white/[0.15] hover:text-foreground")}
```

### File: `src/pages/GroceryStorePage.tsx`

**1. Quick filter chips (around line 280)**
```diff
- className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${activeFilter === f.label ? "bg-ig-gradient text-white shadow-sm shadow-primary/25" : "bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border/20"}`}
+ className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeFilter === f.label ? "bg-ig-gradient text-white shadow-sm shadow-primary/25" : "bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border/20"}`}
```

**2. Sort mode button (around line 320)**
```diff
- className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
+ className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**3. "Back to categories" button (around line 290)**
```diff
- className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
+ className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**4. Cart "Clear" button (around line 250)**
```diff
- className="text-[11px] text-destructive hover:underline font-medium"
+ className="text-[11px] text-destructive hover:underline font-medium active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Verification

After applying these changes, run:
```bash
npm run update
```

This must pass (type-check + worker type-check + production build) before the task is considered done. No supabase queries, RPCs, mutations, react-query keys, state logic, routing, cart logic, or pricing math were changed — only className additions for press feedback and keyboard accessibility.
