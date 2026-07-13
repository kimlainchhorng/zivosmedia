# MiMo run — 2026-06-14T12:03:40.198Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or logic change. Customer ResolutionCenter list page, English only, not bilingual. There is NO framer-motion so no useReducedMotion. The Skeleton components are shadcn primitives so do not touch them. Changes: One: the header back button is a shadcn Button variant ghost size icon, icon only with an ArrowLeft and no visible text, add aria-label Back to the Button and aria-hidden true to the ArrowLeft icon. Two: the Report Issue button already has visible Report Issue text next to a decorative Plus icon, add aria-hidden true to the Plus icon only, do not add aria-label. Three: the STATUS_CONFIG object defines six small status icons AlertTriangle Clock Clock CheckCircle2 XCircle CheckCircle2 that each render next to a visible status label inside the CaseCard badge, add aria-hidden true to each of those six icons. Four: the empty-state has a decorative Inbox icon next to the No cases yet heading, add aria-hidden true to the Inbox. Five: heading hierarchy, the persistent header has the h1 Resolution Center and the empty-state renders an h3 No cases yet which skips h2 under the h1, promote that h3 to h2 keeping the exact same className for zero visual change. The Tabs triggers All Active Resolved have visible text so leave them alone. Do not touch shadcn Button Tabs Skeleton internals beyond adding aria props, and do not touch the useResolutionCases hook or CaseCard logic.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/ResolutionCenter.tsx

---

## 1. Plan

Five targeted, additive accessibility edits to `ResolutionCenter.tsx` — all `aria-hidden` on decorative icons or `aria-label` on icon-only controls, plus one heading-level promotion (`h3`→`h2`) for document outline correctness. Zero logic, zero visual, zero dependency changes.

## 2. Proposed diff

**File:** `src/pages/customer/ResolutionCenter.tsx`

```diff
--- a/src/pages/customer/ResolutionCenter.tsx
+++ b/src/pages/customer/ResolutionCenter.tsx
@@ -1) Header back button — add aria-label to Button, aria-hidden to icon
-        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10" aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>

@@ -2) Report Issue button — aria-hidden on decorative Plus icon
-          <Plus className="w-4 h-4 mr-1" /> Report Issue
+          <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Report Issue

@@ -3) STATUS_CONFIG — aria-hidden on all six status icons
   open: { label: "Open", icon: <AlertTriangle className="w-3 h-3" />, className: "bg-accent/10 text-accent border-accent/30" },
+  open: { label: "Open", icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />, className: "bg-accent/10 text-accent border-accent/30" },

   reviewing: { label: "Reviewing", icon: <Clock className="w-3 h-3" />, className: "bg-warning/10 text-warning border-warning/30" },
+  reviewing: { label: "Reviewing", icon: <Clock className="w-3 h-3" aria-hidden="true" />, className: "bg-warning/10 text-warning border-warning/30" },

   awaiting_response: { label: "Awaiting Response", icon: <Clock className="w-3 h-3" />, className: "bg-secondary/10 text-secondary border-secondary/30" },
+  awaiting_response: { label: "Awaiting Response", icon: <Clock className="w-3 h-3" aria-hidden="true" />, className: "bg-secondary/10 text-secondary border-secondary/30" },

   resolved: { label: "Resolved", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-success/10 text-success border-success/30" },
+  resolved: { label: "Resolved", icon: <CheckCircle2 className="w-3 h-3" aria-hidden="true" />, className: "bg-success/10 text-success border-success/30" },

   rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" />, className: "bg-destructive/10 text-destructive border-destructive/30" },
+  rejected: { label: "Rejected", icon: <XCircle className="w-3 h-3" aria-hidden="true" />, className: "bg-destructive/10 text-destructive border-destructive/30" },

   closed: { label: "Closed", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-muted text-muted-foreground border-border" },
+  closed: { label: "Closed", icon: <CheckCircle2 className="w-3 h-3" aria-hidden="true" />, className: "bg-muted text-muted-foreground border-border" },

@@ -4) Empty-state Inbox icon — aria-hidden
-              <Inbox className="w-8 h-8 text-muted-foreground" />
+              <Inbox className="w-8 h-8 text-muted-foreground" aria-hidden="true" />

@@ -5) Empty-state heading — promote h3 → h2, same className
-            <h3 className="font-semibold text-lg mb-1">No cases yet</h3>
+            <h2 className="font-semibold text-lg mb-1">No cases yet</h2>
```

## 3. Owner verification

- **`npm run update`** — must pass (type-check + worker type-check + production build). The only "new" prop on lucide SVGs is `aria-hidden="true"` which is a valid HTML attribute (lucide forwards unknown props to the `<svg>` element); no type errors expected.
- **Visual spot-check** at 375/768 px — the `h2` has the exact same `className` as the old `h3`, so Tailwind output is identical (same font-size, weight, margin). No layout shift.
- **Screen reader quick test** — the back button should announce "Back, button"; the Report Issue button should announce "Report Issue, button" without reading the Plus icon; status badges should read only the label text (e.g. "Open") without the icon name; the Inbox icon in the empty state should be silent; the document outline should go h1 → h2 (no skipped level).
- No logic, hook, routing, or styling changes — purely additive ARIA attributes and one semantic tag swap.
