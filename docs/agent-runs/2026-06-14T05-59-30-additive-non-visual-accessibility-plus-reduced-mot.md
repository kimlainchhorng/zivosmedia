# DeepSeek run — 2026-06-14T05:59:30.080Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is DeliveryProofCapture, MOUNTED on /map. It is NOT a Sheet - it is a plain motion.div glass card, but in Map.tsx it is rendered TWICE, each time inside a shadcn Dialog/DialogContent (Radix Dialog: focus trap, role=dialog, Escape) whose DialogContent has NO DialogTitle (the card renders only a visual <p>Delivery Proof</p> + <p>Optional photo verification</p>, not a DialogTitle), so Radix logs a missing-Title warning and the dialog has no accessible name. The component has useState/useRef hooks, NO early return. Single entrance motion.div (initial opacity 0 y 12, spring). Header: a decorative Camera icon in a rounded tile + 'Delivery Proof'/'Optional photo verification' text, and an optional icon-only close motion.button (whileTap scale 0.9) containing only an X icon. Preview area: when a photo is chosen, an img with alt='Delivery proof preview' plus an icon-only clear motion.button (whileTap scale 0.9) containing only an X icon; when empty, a large decorative Camera icon + 'Take a photo of the delivery' text. Two hidden file inputs (className 'hidden' = display:none, triggered programmatically via button click). Action buttons: 'Take Photo' (Camera icon + text), 'Choose File' (ImagePlus icon + text); when a photo is selected a single 'Upload & Complete' (Check icon + text) button that while uploading swaps to a Loader2 (animate-spin) + 'Uploading...' text; and a ghost 'Skip Photo' button. Upload success/failure is reported via the app toast system (useToast). Questions, concise verdict per point: (1) aria-hidden true on the decorative icons: header Camera, empty-state Camera, Take-Photo Camera, ImagePlus, Loader2, Check, and the two X icons inside the icon-only buttons? (2) aria-label on the two ICON-ONLY buttons - close button = 'Close', clear-preview button = 'Remove photo' (plain English, file imports no t())? (3) Reduced-motion: guard the single entrance (initial opacity 0 y 12) with useReducedMotion initial false, and LEAVE the two whileTap scale-downs unguarded (user-triggered)? (4) Loader2 uses animate-spin - add motion-reduce:animate-none so it freezes visible under prefers-reduced-motion? (5) The parent DialogContent in Map.tsx (both mount sites, lines ~1688 and ~1706) has NO DialogTitle - is adding a VisuallyHidden/sr-only DialogTitle in Map.tsx the minimal correct fix for the dialog accessible name, or defer to a parent-scope slice? If add, recommend exact title text ('Delivery proof' / 'Pickup proof'). (6) The two hidden file inputs are display:none and triggered via button - confirm they are correctly out of the a11y tree and need no action? (7) The img already has alt='Delivery proof preview' - confirm adequate, no live region needed since the card sits in a focus-trapped Radix dialog and upload status goes through the toast system?
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/driver/DeliveryProofCapture.tsx

---

# DeliveryProofCapture — Accessibility + Reduced-Motion Audit

## Plan

1. **Decorative icons** → add `aria-hidden="true"` to all 7 presentational icons (header Camera, empty-state Camera, Take-Photo Camera, ImagePlus, Loader2, Check, and both X icons in icon-only buttons)
2. **Icon-only buttons** → add `aria-label` (close = "Close", clear-preview = "Remove photo")
3. **Reduced-motion** → guard the entrance `motion.div` `initial` with `useReducedMotion()` (false when reduced), leave `whileTap` unguarded
4. **Loader2 spin** → add `motion-reduce:animate-none` to the `animate-spin` class
5. **DialogTitle** → add `<VisuallyHidden>` / `sr-only` `<DialogTitle>` in `Map.tsx` at both mount sites (text: "Delivery proof")
6. **Hidden file inputs** → confirm correct (display:none, programmatic trigger) — no action needed
7. **img alt** → confirm adequate — no live region needed (toast system handles upload status)

## Diff

### File: `src/components/driver/DeliveryProofCapture.tsx`

```diff
--- a/src/components/driver/DeliveryProofCapture.tsx
+++ b/src/components/driver/DeliveryProofCapture.tsx
@@ -1,7 +1,8 @@
 import { useState, useRef } from "react";
 import { Camera, ImagePlus, X, Loader2, Check } from "lucide-react";
 import { motion } from "framer-motion";
+import { useReducedMotion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { uploadDeliveryProof } from "@/services/deliveryProofService";
 import { useToast } from "@/hooks/use-toast";
@@ -15,6 +16,7 @@ interface DeliveryProofCaptureProps {
 export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSkip, onClose }: DeliveryProofCaptureProps) {
   const { toast } = useToast();
+  const shouldReduceMotion = useReducedMotion();
   const [preview, setPreview] = useState<string | null>(null);
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [isUploading, setIsUploading] = useState(false);
@@ -51,7 +53,7 @@ export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSki

   return (
     <motion.div
-      initial={{ opacity: 0, y: 12 }}
+      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ type: "spring", stiffness: 300, damping: 25 }}
       className="w-full max-w-md mx-auto rounded-2xl overflow-hidden"
@@ -67,7 +69,7 @@ export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSki
         <div className="flex items-center gap-2.5">
           <div className="w-9 h-9 rounded-[14px] flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
-            <Camera className="h-4.5 w-4.5 text-primary" />
+            <Camera className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
           </div>
           <div>
             <p className="text-[15px] font-semibold text-foreground">Delivery Proof</p>
@@ -76,9 +78,10 @@ export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSki
         </div>
         {onClose && (
           <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
+            aria-label="Close"
             className="w-8 h-8 rounded-full flex items-center justify-center"
             style={{ background: "hsl(var(--muted) / 0.5)" }}
           >
-            <X className="h-4 w-4 text-muted-foreground" />
+            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
           </motion.button>
         )}
       </div>
@@ -93,14 +96,15 @@ export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSki
             <>
               <img src={preview} alt="Delivery proof preview" className="w-full h-full object-cover" />
               <motion.button whileTap={{ scale: 0.9 }} onClick={handleClear}
+                aria-label="Remove photo"
                 className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                 style={{ background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(8px)" }}
               >
-                <X className="h-4 w-4 text-foreground" />
+                <X className="h-4 w-4 text-foreground" aria-hidden="true" />
               </motion.button>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
-              <Camera className="h-12 w-12 mb-2 opacity-40" />
+              <Camera className="h-12 w-12 mb-2 opacity-40" aria-hidden="true" />
               <p className="text-sm">Take a photo of the delivery</p>
             </div>
           )}
@@ -112,17 +116,17 @@ export function DeliveryProofCapture({ orderId, driverId, onProofUploaded, onSki
         {!preview ? (
           <div className="grid grid-cols-2 gap-2">
             <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 rounded-xl h-11">
-              <Camera className="h-4 w-4" /> Take Photo
+              <Camera className="h-4 w-4" aria-hidden="true" /> Take Photo
             </Button>
             <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl h-11">
-              <ImagePlus className="h-4 w-4" /> Choose File
+              <ImagePlus className="h-4 w-4" aria-hidden="true" /> Choose File
             </Button>
           </div>
         ) : (
           <Button onClick={handleUpload} disabled={isUploading} className="w-full rounded-xl h-11">
-            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Check className="h-4 w-4 mr-2" /> Upload & Complete</>}
+            {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Uploading...</> : <><Check className="h-4 w-4 mr-2" aria-hidden="true" /> Upload & Complete</>}
           </Button>
         )}
```

### File: `src/pages/Map.tsx` (both Dialog mount sites, lines ~1688 and ~1706)

Add import at top:
```diff
+import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
```

Then at each mount site (search for `<DialogContent className="...">` that contains `<DeliveryProofCapture`):

```diff
 <DialogContent className="sm:max-w-md p-0 gap-0 bg-transparent border-0 shadow-none">
+  <VisuallyHidden>
+    <DialogTitle>Delivery proof</DialogTitle>
+  </VisuallyHidden>
   <DeliveryProofCapture ... />
 </DialogContent>
```

Repeat for the second mount site (pickup proof variant — use "Pickup proof" if the context is pickup, otherwise "Delivery proof").

## Verdict per point

| # | Question | Verdict |
|---|----------|---------|
| 1 | `aria-hidden="true"` on decorative icons? | **YES** — all 7 icons are presentational: header Camera, empty-state Camera, Take-Photo Camera, ImagePlus, Loader2, Check, and both X icons. Applied in diff above. |
| 2 | `aria-label` on icon-only buttons? | **YES** — close button = `"Close"`, clear-preview button = `"Remove photo"`. Plain English, no `t()` needed. Applied in diff above. |
| 3 | Reduced-motion guard on entrance? | **YES** — `initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}`. `whileTap` left unguarded (user-triggered). Applied in diff above. |
| 4 | Loader2 `animate-spin` → `motion-reduce:animate-none`? | **YES** — appended `motion-reduce:animate-none` to the className. Applied in diff above. |
| 5 | DialogTitle in Map.tsx? | **YES** — add `<VisuallyHidden><DialogTitle>Delivery proof</DialogTitle></VisuallyHidden>` inside both `<DialogContent>` blocks. This is the minimal correct fix (no layout change, no visual change, Radix stops logging the warning). Text: "Delivery proof" (or "Pickup proof" if the second instance is for pickup). |
| 6 | Hidden file inputs? | **CONFIRMED** — `className="hidden"` = `display:none`, programmatically triggered via `ref.current?.click()`. Correctly out of the a11y tree. No action needed. |
| 7 | img `alt="Delivery proof preview"`? | **ADEQUATE** — the card sits inside a focus-trapped Radix dialog with a named title. Upload status goes through the toast system (which is announced by live regions). No additional live region needed. |

## Owner verification

1. **Import `useReducedMotion`** from `"framer-motion"` — verify the import is present (it's a named export, available in framer-motion v10+)
2. **Import `VisuallyHidden`** from `"@radix-ui/react-visually-hidden"` in `Map.tsx` — verify the package is installed (`@radix-ui/react-visually-hidden` should already be a dependency via shadcn/ui)
3. **Second mount site** — confirm whether the second `<DeliveryProofCapture>` is for pickup proof (title "Pickup proof") or also delivery proof
4. **Run `npm run update`** — must pass before committing
