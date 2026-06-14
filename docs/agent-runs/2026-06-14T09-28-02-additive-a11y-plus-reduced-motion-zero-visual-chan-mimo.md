# MiMo run — 2026-06-14T09:28:02.782Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on SupportChat a driver live-agent support chat WhatsApp-style. File imports framer-motion motion and has NO useTranslation so plain-English labels. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory ONE framer-motion surface the waiting-for-agent banner motion.div initial opacity 0 scale 0.95 animate opacity 1 scale 1 no transition. Scale is a transform so this is SPATIAL GUARD initial to false under reduceMotion. THREE CSS animate-spin Loader2 spinners one inside the Connecting you to an agent pill which has adjacent text one inside the Reopen Button which has text one inside the send Button which is icon-only all three are decorative advise aria-hidden plus append motion-reduce:animate-none NOT role status. Icons aria-hidden decorative. THREE icon-only Buttons the back Button with ArrowLeft add aria-label Back the dropdown-trigger Button with MoreVertical add aria-label More options the send Button add aria-label Send message and aria-hidden each inner icon ArrowLeft MoreVertical Send. The header avatar Headphones icon aria-hidden. The green online status dot span aria-hidden. The Phone icon inside the Call Support dropdown menu item which has text aria-hidden. The Lock icon beside This conversation is text aria-hidden. The RotateCcw icon inside the Reopen Button with text aria-hidden. The message text input has only a placeholder Type a message advise add aria-label Message. HEADING h1 ZIVO Support is the lone heading advise leave AS-IS. Safe-area header already has pt calc env safe-area-inset-top plus 12px the input container already has pb calc env safe-area-inset-bottom plus 12px root is h-screen flex flex-col not fixed inset-0 advise no change. There is a supabase as any cast that is pre-existing leave it. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/SupportChat.tsx

---

## Plan

**Goal:** Additive a11y + reduced-motion guard on `SupportChat.tsx`. Zero visual change at default (non-reduced) motion. No logic changes.

**Edits summary (all className / aria-only, 0 logic):**

1. **Import:** extend `framer-motion` to also import `useReducedMotion`.
2. **Reduce-motion const:** add `const reduceMotion = useReducedMotion()` at component top.
3. **ONE motion.div** (waiting-for-agent banner): guard `scale` out of `initial`/`animate` under `reduceMotion` (spatial guard). Opacity-only fallback.
4. **THREE `animate-spin` Loader2 spinners:** append `motion-reduce:animate-none` + `aria-hidden="true"` to each. All decorative (two have adjacent text, one is inside icon-only button).
5. **Icon-only Buttons (3):** add `aria-label` to each, `aria-hidden="true"` to each inner icon:
   - Back: `aria-label="Back"` + `ArrowLeft` aria-hidden
   - Dropdown trigger: `aria-label="More options"` + `MoreVertical` aria-hidden
   - Send: `aria-label="Send message"` + `Send` aria-hidden
6. **Decorative icons (6):** `aria-hidden="true"` on `Headphones`, green dot `<span>`, `Phone`, `Lock`, `RotateCcw` (already handling the Loader2 spinners above).
7. **Text input:** add `aria-label="Message"` (placeholder is not an accessible name).
8. **Heading `h1`** "ZIVO Support": leave AS-IS.
9. **Safe-area / root layout:** already correct, no change.
10. **`(supabase as any)` cast:** pre-existing, no change.

---

## Proposed diff

**File:** `src/pages/driver/SupportChat.tsx` (from `../zivodriver/src/pages/driver/SupportChat.tsx`)

```diff
--- a/src/pages/driver/SupportChat.tsx
+++ b/src/pages/driver/SupportChat.tsx
@@ -21,7 +21,7 @@
 import { toast } from "sonner";
 import { useQueryClient } from "@tanstack/react-query";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import {
   DropdownMenu,
   DropdownMenuContent,
@@ -44,6 +44,7 @@
   const queryClient = useQueryClient();
   const [messageText, setMessageText] = useState("");
   const [attachments, setAttachments] = useState<File[]>([]);
   const [reopening, setReopening] = useState(false);
   const [showQuickReplies, setShowQuickReplies] = useState(true);
+  const reduceMotion = useReducedMotion();
   const messagesEndRef = useRef<HTMLDivElement>(null);

```

```diff
@@ -90,10 +91,12 @@
         <Button
           variant="ghost"
           size="icon"
           onClick={() => navigate(-1)}
           className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
+          aria-label="Back"
         >
-          <ArrowLeft className="h-5 w-5" />
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
```

```diff
@@ -102,8 +105,8 @@
         <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 relative">
-          <Headphones className="w-5 h-5" />
+          <Headphones className="w-5 h-5" aria-hidden="true" />
           {isAgentConnected && (
-            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-4
