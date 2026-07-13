# MiMo run — 2026-06-14T11:50:15.515Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility only, no visual or logic change. Customer ReportIssue page, English only, not bilingual. There is NO framer-motion so no useReducedMotion. Changes: One: the header back button is a shadcn Button variant ghost size icon, icon only with an ArrowLeft and no visible text, add aria-label Back to the Button and aria-hidden true to the ArrowLeft icon. Two: there are four bare label elements not associated with their controls, Issue Type then Subject then Order ID optional then Description, add htmlFor with a new id on each label and a matching id prop on its control, Issue Type label points to the SelectTrigger which forwards id, Subject and Order ID point to the two Input components, Description points to the Textarea, use ids like issue-type and issue-subject and issue-order-id and issue-description. Three: the submit button shows a raw CSS animate-spin Loader2 while pending next to visible Submit Report text, append motion-reduce colon animate-none to its className and add aria-hidden true. Four: the Send icon shown when not pending is decorative next to visible Submit Report text, add aria-hidden true. The only raw heading is the h1 Report an Issue so leave headings alone, the CardTitle is shadcn so do not touch it. Do not touch shadcn Button Input Textarea Select Card internals beyond adding id passthrough props, and do not touch the useCreateCase hook.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/ReportIssue.tsx

---

## Plan

Four additive a11y-only edits to `src/pages/customer/ReportIssue.tsx` (Zivo Driver). Zero logic, zero visual change. All are className / attribute additions.

| # | What | Change |
|---|------|--------|
| 1 | Header back `<Button>` (icon-only ArrowLeft) | Add `aria-label="Back"` on the Button; `aria-hidden="true"` on ArrowLeft |
| 2 | Four `<label>` elements (Issue Type / Subject / Order ID / Description) | Add `htmlFor` + `id` pairs: `issue-type` (label→SelectTrigger), `issue-subject` / `issue-order-id` (label→Input), `issue-description` (label→Textarea) |
| 3 | Pending `Loader2` spinner (CSS `animate-spin`) | Append `motion-reduce:animate-none` to className; add `aria-hidden="true"` |
| 4 | Decorative `Send` icon (next to "Submit Report" text) | Add `aria-hidden="true"` |

No `framer-motion` in this file, no `useReducedMotion`, no heading changes (only `<h1>` and shadcn `CardTitle` — left alone). shadcn `Button`/`Input`/`Textarea`/`Select` internals untouched (only pass-through `id` props added). `useCreateCase` hook untouched.

---

## Diff

**File:** `src/pages/customer/ReportIssue.tsx`

```diff
--- a/src/pages/customer/ReportIssue.tsx
+++ b/src/pages/customer/ReportIssue.tsx
@@ -40,8 +40,8 @@
       <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
-        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10" aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
         <h1 className="text-lg font-semibold">Report an Issue</h1>
@@ -53,13 +53,13 @@
           <CardContent className="space-y-4">
             <div>
-              <label className="text-sm font-medium mb-1.5 block">Issue Type</label>
+              <label htmlFor="issue-type" className="text-sm font-medium mb-1.5 block">Issue Type</label>
               <Select value={issueType} onValueChange={setIssueType}>
-                <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
+                <SelectTrigger id="issue-type"><SelectValue placeholder="Select issue type" /></SelectTrigger>
                 <SelectContent>
                   {ISSUE_TYPES.map((t) => (
                     <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
@@ -69,8 +69,8 @@

             <div>
-              <label className="text-sm font-medium mb-1.5 block">Subject</label>
+              <label htmlFor="issue-subject" className="text-sm font-medium mb-1.5 block">Subject</label>
               <Input
+                id="issue-subject"
                 placeholder="Brief description of the issue"
                 value={subject}
@@ -80,8 +80,8 @@

             <div>
-              <label className="text-sm font-medium mb-1.5 block">Order ID (optional)</label>
+              <label htmlFor="issue-order-id" className="text-sm font-medium mb-1.5 block">Order ID (optional)</label>
               <Input
+                id="issue-order-id"
                 placeholder="Enter order ID if applicable"
                 value={orderId}
@@ -91,8 +91,8 @@

             <div>
-              <label className="text-sm font-medium mb-1.5 block">Description</label>
+              <label htmlFor="issue-description" className="text-sm font-medium mb-1.5 block">Description</label>
               <Textarea
+                id="issue-description"
                 placeholder="Describe what happened in detail..."
                 value={description}
@@ -106,9 +106,9 @@
             >
               {createCase.isPending ? (
-                <Loader2 className="w-4 h-4 animate-spin mr-2" />
+                <Loader2 className="w-4 h-4 animate-spin mr-2 motion-reduce:animate-none" aria-hidden="true" />
               ) : (
-                <Send className="w-4 h-4 mr-2" />
+                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
               )}
               Submit Report
             </Button>
```

---

## Owner verification

1. **`SelectTrigger` id forwarding** — confirm the project's `SelectTrigger` component passes an `id` prop through to the underlying `<button>` (Radix `Select.Trigger` does accept `id`; if this is a custom wrapper that doesn't spread rest props, the id won't land). Quick check: open the page, inspect the select trigger in DevTools — it should have `id="issue-type"`.
2. **`Input` / `Textarea` id forwarding** — shadcn `Input` and `Textarea` already spread rest props to the native `<input>`/`<textarea>`, so `id` lands. Same verification if paranoid.
3. **Build gate** — `npm run update` (type-check + worker type-check + production build) in the driver project must pass. No TypeScript changes, so it should be clean.
4. **Screen reader spot-check** — with a screen reader, tab through the form: labels should announce their associated controls; the back button should announce "Back"; the spinner icon should be silent; "Submit Report" text should read without the icon name.
