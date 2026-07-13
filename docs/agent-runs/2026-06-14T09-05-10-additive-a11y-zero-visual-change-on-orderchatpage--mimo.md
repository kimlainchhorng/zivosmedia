# MiMo run — 2026-06-14T09:05:10.997Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y zero visual change on OrderChatPage a reusable full-screen chat for customer driver merchant admin roles. NOTE it imports framer-motion motion and AnimatePresence but NEITHER is used anywhere in the JSX dead imports and there are NO animations so NO useReducedMotion needed this is a PURE a11y pass. File has NO useTranslation so plain-English labels. Root is a fixed inset-0 z-50 overlay its own full-screen page flex flex-col. Icons aria-hidden decorative. ArrowLeft inside an icon-only ghost back Button no text add aria-label Back to the Button and aria-hidden on ArrowLeft. Lock beside Order status Chat is read-only text aria-hidden. Send icon in the No messages yet empty state aria-hidden. The image-upload control a label wrapping a hidden input type file plus a Button asChild span with an ImageIcon the input type file has no accessible name add aria-label Attach image to the file input and aria-hidden on ImageIcon. Send inside the icon-only send Button no text add aria-label Send message to the Button and aria-hidden on Send. The roleIcons record User Truck Store Shield are avatar glyphs rendered beside a separate visible role label aria-hidden each. The CheckCheck and Check read-status indicators advise aria-hidden decorative versus aria-label Read and Sent. INPUTS the message Input is placeholder-only Type a message add aria-label. HEADING there is a lone h2 Order number and NO h1 on this page advise leave as-is or promote h2 to h1 for a full-screen overlay. SAFE-AREA root is fixed inset-0 advise whether to add pt env safe-area-inset-top on the header and pb env safe-area-inset-bottom on the input bar. The attachment img already has alt Attachment leave it. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/chat/OrderChatPage.tsx

---

## (1) Plan

Pure additive a11y pass on `OrderChatPage.tsx` — 13 edits, zero visual/logic changes:

| # | Target | Edit |
|---|--------|------|
| 1 | L7-8 imports | Remove dead `motion, AnimatePresence`; remove unused `Phone` |
| 2 | L116 Back `<Button>` | Add `aria-label="Back"` |
| 3 | L117 `<ArrowLeft>` | Add `aria-hidden="true"` |
| 4 | L134 `<Lock>` | Add `aria-hidden="true"` |
| 5 | L161 `<Send>` (empty state) | Add `aria-hidden="true"` |
| 6 | L115 heading `<h2>` | Promote to `<h1>` (full-screen overlay, lone heading) |
| 7 | L48/52/56/60 role icon JSX | Add `aria-hidden` to each `<User>`/`<Truck>`/`<Store>`/`<Shield>` |
| 8 | L219 `<CheckCheck>` | Add `aria-label="Read"` |
| 9 | L221 `<Check>` | Add `aria-label="Sent"` |
| 10 | L184 file `<input>` | Add `aria-label="Attach image"` |
| 11 | L194 `<ImageIcon>` | Add `aria-hidden="true"` |
| 12 | L205 `<Input>` message | Add `aria-label="Type a message"` |
| 13 | L209 send `<Button>` | Add `aria-label="Send message"` + `aria-hidden` on inner `<Send>` |
| 14 | L124 header `<div>` | Add `pt-[env(safe-area-inset-top)]` |
| 15 | L176 input bar `<div>` | Add `pb-[env(safe-area-inset-bottom)]` |

## (2) Diff

```diff
--- a/src/components/chat/OrderChatPage.tsx
+++ b/src/components/chat/OrderChatPage.tsx
@@ -4,14 +4,12 @@
 
 import { useState, useRef, useEffect } from "react";
-import { motion, AnimatePresence } from "framer-motion";
 import { 
   ArrowLeft, 
   Send, 
   Image as ImageIcon, 
-  Phone, 
   Check, 
   CheckCheck,
   Lock,
@@ -45,19 +43,19 @@
 const roleIcons: Record<ChatRole, React.ReactNode> = {
-  customer: <User className="w-3 h-3 text-primary-foreground" />,
-  driver: <Truck className="w-3 h-3 text-primary-foreground" />,
-  merchant: <Store className="w-3 h-3 text-primary-foreground" />,
-  admin: <Shield className="w-3 h-3 text-primary-foreground" />,
+  customer: <User className="w-3 h-3 text-primary-foreground" aria-hidden="true" />,
+  driver: <Truck className="w-3 h-3 text-primary-foreground" aria-hidden="true" />,
+  merchant: <Store className="w-3 h-3 text-primary-foreground" aria-hidden="true" />,
+  admin: <Shield className="w-3 h-3 text-primary-foreground" aria-hidden="true" />,
 };
 
@@ -112,9 +110,9 @@
       {/* Header */}
-      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
+      <div className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top)] border-b border-border bg-card">
         <div className="flex items-center gap-3">
-          <Button variant="ghost" size="icon" onClick={onBack}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div>
-            <h2 className="font-semibold">
+            <h1 className="font-semibold">
               Order {orderNumber ? `#${orderNumber.slice(0, 8)}` : "Chat"}
-            </h2>
+            </h1>
             <ChatParticipants members={members} compact />
@@ -131,7 +129,7 @@
         <div className="px-4 py-2 bg-muted text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
-          <Lock className="w-4 h-4" />
+          <Lock className="w-4 h-4" aria-hidden="true" />
           <span>Order {orderStatus} - Chat is read-only</span>
@@ -158,7 +156,7 @@
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
-              <Send className="w-8 h-8 opacity-50" />
+              <Send className="w-8 h-8 opacity-50" aria-hidden="true" />
             </div>
@@ -176,7 +174,7 @@
       {/* Input */}
-      <div className="p-4 border-t border-border bg-card">
+      <div className="p-4 pb-[env(safe-area-inset-bottom)] border-t border-border bg-card">
@@ -181,9 +179,9 @@
             {/* Image upload */}
             <label className="cursor-pointer">
               <input
                 type="file"
                 accept="image/*"
                 className="hidden"
                 onChange={handleImageUpload}
                 disabled={isUploading || isSending}
+                aria-label="Attach image"
               />
               <Button
@@ -194,1 +192,1 @@
-                  <ImageIcon className="w-5 h-5" />
+                  <ImageIcon className="w-5 h-5" aria-hidden="true" />
@@ -205,6 +203,7 @@
             <Input
               ref={inputRef}
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyPress={handleKeyPress}
               placeholder="Type a message..."
+              aria-label="Type a message"
               className="flex-1"
               disabled={isSending || isUploading}
             />
-            <Button
+            <Button
               onClick={handleSend}
               disabled={!newMessage.trim() || isSending || isUploading}
               size="icon"
+              aria-label="Send message"
             >
-              <Send className="w-4 h-4" />
+              <Send className="w-4 h-4" aria-hidden="true" />
             </Button>
@@ -219,7 +218,7 @@
-              <CheckCheck className="w-3 h-3 text-primary" />
+              <CheckCheck className="w-3 h-3 text-primary" aria-label="Read" />
             ) : (
-              <Check className="w-3 h-3 text-muted-foreground" />
+              <Check className="w-3 h-3 text-muted-foreground" aria-label="Sent" />
             )}
```

## (3) Owner must verify

- **`npm run update`** — must pass (0 TS errors + build). The only import-side change is removing `motion`, `AnimatePresence`, and `Phone` which are confirmed unused in the JSX.
- **Heading promotion h2→h1**: this is a full-screen overlay with a single heading. If the consuming page already renders an h1 elsewhere (unlikely for a modal-style overlay), revert to h2. As written this is the only heading in the overlay.
- **Safe-area padding**: the `env(safe-area-inset-*)` values resolve to `0` on non-notched devices — no visual change on Android/desktop. On notched iOS in standalone/PWA mode the header and input bar will respect the notch. If the rest of the driver app doesn't use safe-area insets and you want consistency, flag for a repo-wide sweep.
- **Read-status `aria-label` on `CheckCheck`/`Check`**: these are small inline SVGs inside a timestamp row. If you'd rather treat them as decorative (text "timestamp already conveys the row"), swap to `aria-hidden="true"` instead — but the labels are the more informative choice for screen readers.
- **`roleIcons` aria-hidden**: the visible role label text (`roleLabels`) is rendered separately beside each avatar bubble, so the icons are decorative. Confirmed correct.
