# MiMo run — 2026-06-14T08:27:45.921Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion. File imports framer-motion motion and AnimatePresence and NO useTranslation so plain-English labels. Motion inventory four motion.div. ONE per-message in the messages map initial opacity 0 y 8 animate opacity 1 y 0 transition duration 0.2 guard initial reduceMotion ? false keep animate and transition. ONE escalate-prompt initial opacity 0 y 8 animate opacity 1 y 0 guard initial reduceMotion ? false. ONE quick-chips inside AnimatePresence initial opacity 0 height 0 animate opacity 1 height auto exit opacity 0 height 0 guard ONLY initial reduceMotion ? false keep animate and exit intact. ONE typing-indicator initial opacity 0 animate opacity 1 this is PURE OPACITY so LEAVE UNGUARDED do not touch. Plan extend import add useReducedMotion add const reduceMotion useReducedMotion in body. CSS the three typing-dot spans use animate-bounce APPEND motion-reduce animate-none to each and add aria-hidden true. Icons aria-hidden true on decorative the header Bot beside ZIVO AI Support h1 the typing-indicator Bot the AiBubble Bot avatar the escalate Headphones beside Talk to Live Agent the quick-chip Headphones beside Live Agent. Icon-only buttons get aria-label the back ghost Button gets aria-label Back its ArrowLeft aria-hidden the MoreVertical DropdownMenuTrigger Button gets aria-label More options its MoreVertical aria-hidden the Paperclip button gets aria-label Attach file its Paperclip aria-hidden the submit send button gets aria-label Send message its Send aria-hidden. The message input has only a placeholder add aria-label Message. The typing-indicator bubble conveys assistant is typing consider role status aria-label Assistant is typing on its container confirm if appropriate. HEADING single h1 ZIVO AI Support no other headings NO heading change. Confirm or correct list exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverAIHelp.tsx

---

## Plan

Pure a11y + reduced-motion pass on `src/pages/driver/DriverAIHelp.tsx`. **Zero visual change at default motion.** No logic touched — className + aria-only.

### Exact edits (18 changes)

| # | What | Edit |
|---|------|------|
| 1 | **Import** | Add `useReducedMotion` to the `framer-motion` import |
| 2 | **Hook** | Add `const reduceMotion = useReducedMotion();` at top of `DriverAIHelp` body |
| 3 | Per-message `motion.div` | Guard `initial`: `initial={reduceMotion ? false : { opacity: 0, y: 8 }}` |
| 4 | Escalate-prompt `motion.div` | Guard `initial`: `initial={reduceMotion ? false : { opacity: 0, y: 8 }}` |
| 5 | Quick-chips `motion.div` | Guard `initial` only: `initial={reduceMotion ? false : { opacity: 0, height: 0 }}` — `animate` and `exit` untouched |
| 6 | Typing-indicator `motion.div` | **NO TOUCH** (pure opacity, per task) |
| 7–9 | Three typing-dot `<span>`s | Append ` motion-reduce:animate-none` to each className; add `aria-hidden="true"` |
| 10 | Header `<Bot>` icon | Add `aria-hidden="true"` |
| 11 | Typing-indicator `<Bot>` icon | Add `aria-hidden="true"` |
| 12 | AiBubble `<Bot>` avatar icon | Add `aria-hidden="true"` |
| 13 | Escalate `<Headphones>` icon | Add `aria-hidden="true"` |
| 14 | Quick-chip Live Agent `<Headphones>` icon | Add `aria-hidden="true"` |
| 15 | Back ghost `Button` | Add `aria-label="Back"`; `<ArrowLeft>` → `aria-hidden="true"` |
| 16 | MoreVertical `DropdownMenuTrigger` `Button` | Add `aria-label="More options"`; `<MoreVertical>` → `aria-hidden="true"` |
| 17 | Paperclip `<button>` | Add `aria-label="Attach file"`; `<Paperclip>` → `aria-hidden="true"` |
| 18 | Submit send `<button>` | Add `aria-label="Send message"`; `<Send>` → `aria-hidden="true"` |
| 19 | Message `<input>` | Add `aria-label="Message"` |
| 20 | Typing-indicator container div | Add `role="status"` + `aria-label="Assistant is typing"` |

---

### Diff

```diff
--- a/src/pages/driver/DriverAIHelp.tsx
+++ b/src/pages/driver/DriverAIHelp.tsx
@@ -13,7 +13,7 @@ import { format } from "date-fns";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

@@ // inside DriverAIHelp() body, after existing state/ref declarations
+  const reduceMotion = useReducedMotion();

@@ // Per-message motion.div (inside AnimatePresence, messages.map)
           <motion.div
             key={i}
-            initial={{ opacity: 0, y: 8 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.2 }}

@@ // Header back Button
         <Button
           variant="ghost"
           size="icon"
           onClick={() => navigate(returnTo)}
+          aria-label="Back"
           className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
         >
-          <ArrowLeft className="h-5 w-5" />
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />

@@ // Header Bot icon (inside avatar circle)
-          <Bot className="w-5 h-5" />
+          <Bot className="w-5 h-5" aria-hidden="true" />

@@ // MoreVertical DropdownMenuTrigger Button
             <Button
               variant="ghost"
               size="icon"
+              aria-label="More options"
               className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
             >
-              <MoreVertical className="h-5 w-5" />
+              <MoreVertical className="h-5 w-5" aria-hidden="true" />

@@ // Typing indicator — three dot spans
               <div className="flex items-center gap-1.5">
-                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
-                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
-                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
+                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:0ms]" aria-hidden="true" />
+                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:150ms]" aria-hidden="true" />
+                <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce motion-reduce:animate-none [animation-delay:300ms]" aria-hidden="true" />

@@ // Typing indicator Bot icon (inside avatar circle)
-                <Bot className="w-4 h-4 text-primary" />
+                <Bot className="w-4 h-4 text-primary" aria-hidden="true" />

@@ // Typing indicator — container div wrapping the flex gap-2
-            <div className="flex gap-2 mb-3">
+            <div className="flex gap-2 mb-3" role="status" aria-label="Assistant is typing">

@@ // Escalate-prompt motion.div
           <motion.div
-            initial={{ opacity: 0, y: 8 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center mb-3"

@@ // Escalate button Headphones icon
-              <Headphones className="w-3.5 h-3.5" />
+              <Headphones className="w-3.5 h-3.5" aria-hidden="true" />

@@ // Quick-chips motion.div
           <motion.div
-            initial={{ opacity: 0, height: 0 }}
+            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}

@@ // Quick-chip Live Agent button Headphones icon
-                <Headphones className="w-3.5 h-3.5" />
+                <Headphones className="w-3.5 h-3.5" aria-hidden="true" />

@@ // Paperclip button
           <button
             type="button"
+            aria-label="Attach file"
             className="h
