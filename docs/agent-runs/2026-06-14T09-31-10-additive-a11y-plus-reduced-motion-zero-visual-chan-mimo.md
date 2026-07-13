# MiMo run — 2026-06-14T09:31:10.160Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on VerifyPhone a driver phone-verification screen with a phone-entry step and an OTP-entry step. File imports framer-motion motion and has NO useTranslation so plain-English labels. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory ONE framer-motion surface the card motion.div initial opacity 0 y 20 animate opacity 1 y 0 no transition SPATIAL GUARD initial to false under reduceMotion. TWO CSS animate-spin Loader2 spinners one inside the Send Code Button which has text one inside the Verify Button which has text both decorative advise aria-hidden plus append motion-reduce:animate-none NOT role status. Icons aria-hidden decorative. ONE icon-only Button the back Button with ArrowLeft add aria-label Back and aria-hidden the ArrowLeft. The big step icon Phone in phone step and ShieldCheck in otp step inside a circle decorative aria-hidden. The CheckCircle2 inside the Verify Button which has text aria-hidden. The phone text Input has only a placeholder advise add aria-label Phone number. The InputOTP has no label advise add aria-label Verification code. HEADINGS h1 Verify Phone Number then h2 Enter your phone number or Enter verification code contiguous advise leave AS-IS. Safe-area root is min-h-screen flex flex-col normal-flow header is normal-flow not sticky not fixed advise no change. There are pre-existing eslint errors an empty block two error any casts and a useless escape leave all of them untouched. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/VerifyPhone.tsx

---

## Plan (12 discrete edits, 0 logic lines)

| # | What | Why |
|---|------|-----|
| 1 | Extend `framer-motion` import → add `useReducedMotion` | needed for motion guard |
| 2 | `const reduceMotion = useReducedMotion();` inside component | hook call |
| 3 | `motion.div` `initial` → conditional `{ opacity: 0, y: 20 }` vs `false` | spatial guard |
| 4 | `Phone` icon → `aria-hidden="true"` | decorative |
| 5 | `ShieldCheck` icon → `aria-hidden="true"` | decorative |
| 6 | Phone `<Input>` → add `aria-label="Phone number"` | no visible label |
| 7 | Send-Code `Loader2` → `aria-hidden="true"` + `motion-reduce:animate-none` | decorative spinner |
| 8 | `<InputOTP>` → add `aria-label="Verification code"` | no visible label |
| 9 | Verify `Loader2` → `aria-hidden="true"` + `motion-reduce:animate-none` | decorative spinner |
| 10 | `CheckCircle2` → `aria-hidden="true"` | decorative |
| 11 | Back `<Button>` → add `aria-label="Back"` | icon-only button |
| 12 | `ArrowLeft` → `aria-hidden="true"` | decorative |

Headings (h1 → h2), safe-area root, normal-flow header, and all pre-existing eslint errors left untouched. No visual change at default motion.

---

## Proposed diff

**File:** `src/pages/driver/VerifyPhone.tsx`

```diff
--- a/src/pages/driver/VerifyPhone.tsx
+++ b/src/pages/driver/VerifyPhone.tsx
@@ -3,7 +3,7 @@
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { Phone, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
@@ -43,6 +43,7 @@
   const navigate = useNavigate();
   const goBack = useGoBack();
   const [searchParams] = useSearchParams();
+  const reduceMotion = useReducedMotion();
   const redirect = searchParams.get("redirect");
 
   const [step, setStep] = useState<"phone" | "otp">("phone");
@@ -99,7 +100,7 @@
         <Button variant="ghost" size="icon" onClick={goBack}>
-          <ArrowLeft className="h-5 w-5" />
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
-        <h1 className="text-lg font-semibold">Verify Phone Number</h1>
+        <h1 className="text-lg font-semibold" aria-label="Back">Verify Phone Number</h1>
       </div>
```

Wait — re-reading: the `aria-label="Back"` goes on the **Button**, not the h1. Let me redo this correctly.

---

**Corrected diff:**

```diff
--- a/src/pages/driver/VerifyPhone.tsx
+++ b/src/pages/driver/VerifyPhone.tsx
@@ -3,7 +3,7 @@
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { Phone, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
@@ -43,6 +43,7 @@
   const navigate = useNavigate();
   const goBack = useGoBack();
   const [searchParams] = useSearchParams();
+  const reduceMotion = useReducedMotion();
   const redirect = searchParams.get("redirect");
 
   const [step, setStep] = useState<"phone" | "otp">("phone");
@@ -98,8 +99,8 @@
       {/* Header */}
       <div className="flex items-center gap-3 p-4 border-b border-border">
-        <Button variant="ghost" size="icon" onClick={goBack}>
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
         <h1 className="text-lg font-semibold">Verify Phone Number</h1>
       </div>
@@ -108,7 +109,7 @@
       <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="w-full max-w-sm space-y-6"
         >
@@ -118,9 +119,9 @@
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
               {step === "phone" ? (
-                <Phone className="w-8 h-8 text-primary" />
+                <Phone className="w-8 h-8 text-primary" aria-hidden="true" />
               ) : (
-                <ShieldCheck className="w-8 h-8 text-primary" />
+                <ShieldCheck className="w-8 h-8 text-primary" aria-hidden="true" />
               )}
             </div>
           </div>
@@ -141,6 +142,7 @@
                   placeholder="(225) 276-6662"
                   value={phoneInput}
                   onChange={(e) => handlePhoneChange(e.target.value)}
+                  aria-label="Phone number"
                   className="text-center text-lg tracking-wider h-14"
                   autoFocus
                 />
@@ -153,7 +155,7 @@
                 >
                   {loading ? (
-                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
+                    <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
                   ) : null}
                   Send Code
                 </Button>
@@ -173,6 +175,7 @@
                   <InputOTP maxLength={6} value={otp} onChange={setOtp}>
+                  aria-label="Verification code"
                   <InputOTPGroup>
```

Wait, that's wrong — `aria-label` needs to go on the `<InputOTP>` component as a prop, not between tags. Let me write this more carefully with exact line references.

---

## Precise per-edit specification

Below are the **12 edits** with exact before → after for each change. All in `src/pages/driver/VerifyPhone.tsx`.

### Edit 1 — Import (line 5)
```
BEFORE: import { motion } from "framer-motion";
AFTER:  import { motion, useReducedMotion } from "framer-motion";
```

### Edit 2 — Hook call (after line 45, after `const [searchParams] = useSearchParams();`)
```
BEFORE:   const redirect = searchParams.get("redirect");
AFTER:    const reduceMotion = useReducedMotion();
          const redirect = searchParams.get("redirect");
```

### Edit 3 — Motion div spatial guard (line ~110)
```
BEFORE:           initial={{ opacity: 0, y: 20 }}
AFTER:            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
```

### Edit 4 — Back Button `aria-label` (line ~100)
```
BEFORE:         <Button variant="ghost" size="icon" onClick={goBack}>
AFTER:          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
```

### Edit 5 — ArrowLeft `aria-hidden` (line ~101)
```
BEFORE:           <ArrowLeft className="h-5 w-5" />
AFTER:            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
```

### Edit 6 — Phone icon `aria-hidden` (line ~121)
```
BEFORE:                 <Phone className="w-8 h-8 text-primary" />
AFTER:                  <Phone className="w-8 h-8 text-primary" aria-hidden="true" />
```

### Edit 7 — ShieldCheck icon `aria-hidden` (line
