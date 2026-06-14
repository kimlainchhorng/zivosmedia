# MiMo run — 2026-06-14T09:19:26.107Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change on ServiceJobsPage a driver active-job and offers screen. File has NO framer-motion and NO useTranslation so plain-English labels. Motion inventory ZERO framer-motion. ONE CSS animation a Loader2 with className animate-spin shown while loading offers it is a standalone loading spinner with NO adjacent text advise role status plus aria-label Loading plus append motion-reduce:animate-none to its className. Icons aria-hidden decorative. The Chat Button has VISIBLE text Chat beside a MessageSquare icon so do NOT add aria-label to the Button only add aria-hidden to the MessageSquare. The empty-state Inbox icon sits above a descriptive paragraph aria-hidden. HEADINGS h1 Jobs then h2 New offers or Waiting for offers contiguous no skip advise leave AS-IS. There is an unread-count badge span showing a number inside the Chat button advise whether it needs any aria treatment or leave since the number is exposed as text after the word Chat. Safe-area root is normal-flow container mx-auto p-4 pb-24 not fixed inset-0 advise no change. Confirm or correct exact edits only no logic changes. No useReducedMotion needed since there is no framer-motion.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/ServiceJobsPage.tsx

---

## Plan

Three additive-only edits, zero logic/visual changes:

| # | What | Why |
|---|------|-----|
| 1 | **Loader2 spinner** — append `motion-reduce:animate-none` + `role="status"` + `aria-label="Loading"` | Only CSS animation in the file; a standalone loading spinner with no adjacent text |
| 2 | **MessageSquare icon** — add `aria-hidden="true"` | Decorative; the Chat button has visible text "Chat" beside it |
| 3 | **Inbox icon** — add `aria-hidden="true"` | Decorative; sits above a descriptive `<p>` |

**No changes to:** headings (h1→h2 contiguous ✓), Chat button aria-label (visible "Chat" text ✓), unread-count badge (number exposed as text after "Chat" — screen reader reads "Chat 3" naturally ✓), safe-area root (normal-flow `container mx-auto p-4 pb-24`, not `fixed inset-0` ✓), no `useReducedMotion` (no framer-motion ✓).

---

## Diff

**File:** `src/pages/driver/ServiceJobsPage.tsx`

```diff
--- a/src/pages/driver/ServiceJobsPage.tsx
+++ b/src/pages/driver/ServiceJobsPage.tsx
@@ -70,7 +70,7 @@
           <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="relative">
-            <MessageSquare className="h-4 w-4 mr-1.5" /> Chat
+            <MessageSquare className="h-4 w-4 mr-1.5" aria-hidden="true" /> Chat
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center px-1">
@@ -106,7 +106,7 @@
         {isLoading && (
           <div className="flex justify-center py-6">
-            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
+            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" role="status" aria-label="Loading" />
           </div>
         )}
 
@@ -115,7 +115,7 @@
           <Card>
             <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
-              <Inbox className="mx-auto mb-2 h-8 w-8" />
+              <Inbox className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
               <p>You're online. We'll notify you when a request comes in.</p>
             </CardContent>
           </Card>
```

**Before/after for each edit:**

**Edit 1 — MessageSquare (L72)**
```tsx
// BEFORE:
<MessageSquare className="h-4 w-4 mr-1.5" />

// AFTER:
<MessageSquare className="h-4 w-4 mr-1.5" aria-hidden="true" />
```

**Edit 2 — Loader2 (L108)**
```tsx
// BEFORE:
<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />

// AFTER:
<Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" role="status" aria-label="Loading" />
```

**Edit 3 — Inbox (L118)**
```tsx
// BEFORE:
<Inbox className="mx-auto mb-2 h-8 w-8" />

// AFTER:
<Inbox className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
```

---

## Verification / owner notes

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build, 0 errors).
2. `role="status"` on the Loader2 wrapper makes screen readers announce "Loading" when it mounts (polite live region implicit). The `motion-reduce:animate-none` stops the spin under `prefers-reduced-motion: reduce` — the icon still renders as a static indicator.
3. Unread badge `<span>{unreadCount}</span>` — left as-is; the DOM reads as "Chat 3" which is sufficient. No `aria-label` or `aria-live` needed (the count is fetched, not dynamically pushed to the DOM in a way that needs announcement).
4. No logic, routing, or layout changes. Purely additive a11y attributes + one Tailwind `motion-reduce:` utility class.
