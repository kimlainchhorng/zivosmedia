# MiMo run — 2026-06-14T08:23:00.109Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion. File imports framer-motion motion only no AnimatePresence and NO useTranslation so plain-English labels. Inventory two motion.div the empty-state initial opacity 0 y 10 animate opacity 1 y 0 and the per-message initial opacity 0 y 5 animate opacity 1 y 0 both have y movement so guard initial reduceMotion ? false keep animate intact. Plan extend import add useReducedMotion add const reduceMotion useReducedMotion in body. Two icon-only shadcn ghost Buttons in header the back Button onClick navigate minus 1 gets aria-label Back its ArrowLeft aria-hidden true and the call Button onClick handleCallAdmin gets aria-label Call admin its Phone aria-hidden true. Two animate-spin Loader2 the full-screen loading one with NO adjacent text gets role status plus aria-label Loading plus motion-reduce animate-none and stays NOT aria-hidden and the in-button send Loader2 gets motion-reduce animate-none plus aria-hidden true. The send button is icon-only gets aria-label Send message and its Send icon aria-hidden true. Decorative Headphones beside ZIVO Admin h1 in header and the empty-state Headphones get aria-hidden true. The message text input has only a placeholder add aria-label Message. HEADING single h1 ZIVO Admin the Welcome to Live Chat is a p not a heading so NO heading change. Confirm or correct list exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/AdminChat.tsx

---

## (1) Short plan

The file has **two** `motion.div` elements that animate `y` (empty-state and per-message). Per task instructions, we guard those only — `initial: false` when `reduceMotion` is true, `animate` untouched so opacity still fades in. All other edits are pure a11y attribute additions (aria-labels, aria-hidden on decorative icons, role/status on the bare loader) plus two `motion-reduce:animate-none` classes on the spinners. Zero logic changes.

---

## (2) Proposed diff

**File:** `src/pages/driver/AdminChat.tsx` (adjust path to repo root as needed — this is the `zivodriver` surface)

```diff
--- a/src/pages/driver/AdminChat.tsx
+++ b/src/pages/driver/AdminChat.tsx
@@ -1,13 +1,13 @@
 import { useEffect, useRef, useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { ArrowLeft, Send, Loader2, Headphones, Phone } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/contexts/AuthContext";
 import { useCall } from "@/contexts/CallContext";
 import { format } from "date-fns";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 
 // ... (interface Message unchanged)

 export default function DriverAdminChat() {
   const navigate = useNavigate();
   const { driver, user } = useAuth();
   const { startCall } = useCall();
+  const reduceMotion = useReducedMotion();
   const [messages, setMessages] = useState<Message[]>([]);
   // ... rest of state/hooks unchanged
@@ (header — Back button)
       <Button
         variant="ghost"
         size="icon"
         onClick={() => navigate(-1)}
+        aria-label="Back"
         className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
       >
-        <ArrowLeft className="h-5 w-5" />
+        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
       </Button>

@@ (header — decorative Headphones)
       <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 relative">
-        <Headphones className="w-5 h-5" />
+        <Headphones className="w-5 h-5" aria-hidden="true" />
         <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-primary" />
       </div>

@@ (header — Call button)
       <Button
         variant="ghost"
         size="icon"
         onClick={handleCallAdmin}
+        aria-label="Call admin"
         className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
       >
-        <Phone className="h-5 w-5" />
+        <Phone className="h-5 w-5" aria-hidden="true" />
       </Button>

@@ (loading spinner — standalone, no adjacent text)
-            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
+            <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none text-muted-foreground" role="status" aria-label="Loading" />

@@ (empty-state motion.div)
           <motion.div
-            initial={{ opacity: 0, y: 10 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center py-12"
           >
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
-              <Headphones className="w-8 h-8 text-primary" />
+              <Headphones className="w-8 h-8 text-primary" aria-hidden="true" />
             </div>

@@ (per-message motion.div)
             <motion.div
               key={msg.id}
-              initial={{ opacity: 0, y: 5 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}

@@ (message input)
           <input
             value={newMessage}
             onChange={(e) => setNewMessage(e.target.value)}
             onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
             placeholder="Type a message..."
+            aria-label="Message"
             disabled={sending}

@@ (send button)
           <button
             onClick={sendMessage}
             disabled={!newMessage.trim() || sending}
+            aria-label="Send message"
             className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
           >
             {sending ? (
-              <Loader2 className="w-4 h-4 animate-spin" />
+              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
             ) : (
-              <Send className="w-4 h-4" />
+              <Send className="w-4 h-4" aria-hidden="true" />
             )}
           </button>
```

### Exact edit inventory (12 edits, 0 logic changes)

| # | Location | Edit |
|---|----------|------|
| 1 | `import` line | Add `useReducedMotion` to framer-motion import |
|
