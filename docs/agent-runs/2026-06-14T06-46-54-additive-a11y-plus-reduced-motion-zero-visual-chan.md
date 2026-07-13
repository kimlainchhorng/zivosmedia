# DeepSeek run — 2026-06-14T06:46:54.534Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File has framer-motion (6 entrance motion.div, no infinite loops), no useTranslation. Add useReducedMotion from framer-motion, variable reduceMotion in DriverReferrals. Guard all 6 entrances initial opacity 0 y 20 with whole-object false form initial reduceMotion ? false : object, keep animate intact; the 5 that have a transition delay wrap transition reduceMotion ? undefined : object. Icon-only ghost back Button needs aria-label Back; the icon-only Copy Button needs aria-label like Copy referral code. The 5 share-grid buttons (Link SMS WhatsApp QR Share) each have a visible text span label so only aria-hidden their icons (LinkIcon, MessageSquare, the inline WhatsApp svg, QrCode, Share2). aria-hidden true also on ArrowLeft, hero Star, the inner Copy icon, stats Users CheckCircle2 Clock, empty-state Users, the 3 milestone-checkmark CheckCircle2, QR-dialog Download (button has visible text), how-it-works Star. Confirm heading order h1 then h2 then CardTitle h3 is fine no skip. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Referrals.tsx

---

## Plan

1. **Add `useReducedMotion`** from framer-motion at the top of the component
2. **Guard all 6 entrance `motion.div`s** with `initial: reduceMotion ? false : { opacity: 0, y: 20 }` (whole-object false)
3. **Guard the 5 `transition.delay`** with `transition: reduceMotion ? undefined : { delay: 0.1 }` pattern
4. **Add `aria-label="Back"`** to the ghost icon-only Back button
5. **Add `aria-label="Copy referral code"`** to the icon-only Copy button
6. **Add `aria-hidden="true"`** to all decorative icons: ArrowLeft, hero Star, Copy icon, stats Users/CheckCircle2/Clock, empty-state Users, 3 milestone CheckCircle2, QR Download icon, how-it-works Star, and the 5 share-grid icons (LinkIcon, MessageSquare, WhatsApp SVG, QrCode, Share2) — since each has a visible `<span>` label
7. **Confirm heading order**: `h1` → `h2` → `CardTitle` (renders as `h3`) — no skip, no change needed

## Diff

```diff
--- a/src/pages/driver/Referrals.tsx
+++ b/src/pages/driver/Referrals.tsx
@@ -1,6 +1,6 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
 import { ArrowLeft, Gift, Copy, Share2, Users, Star, Clock, CheckCircle2, Link as LinkIcon, MessageSquare, QrCode, Download } from "lucide-react";
@@ -19,6 +19,7 @@ const SHARE_MESSAGE_TEMPLATE = (code: string, link: string) =>
 const DriverReferrals = () => {
   const navigate = useNavigate();
   const goBack = useGoBack();
+  const reduceMotion = useReducedMotion();
   const { 
     referrals, 
     isLoading, 
@@ -66,7 +67,7 @@ const DriverReferrals = () => {
           <Button
             variant="ghost"
             size="icon"
-            onClick={goBack}
+            onClick={goBack} aria-label="Back"
             className="rounded-full"
           >
             <ArrowLeft className="w-5 h-5" aria-hidden="true" />
@@ -79,7 +80,7 @@ const DriverReferrals = () => {
       <div className="p-4 space-y-6">
         {/* Points Balance Hero */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <Card className="bg-gradient-to-br from-warning/20 via-warning/10 to-background border-warning/20">
@@ -87,7 +88,7 @@ const DriverReferrals = () => {
               <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
-                <Star className="w-8 h-8 text-warning" />
+                <Star className="w-8 h-8 text-warning" aria-hidden="true" />
               </div>
               <p className="text-sm text-muted-foreground mb-1">Reward Points</p>
               <h2 className="text-4xl font-bold text-warning mb-1">{pointsTotal.toLocaleString()} pts</h2>
@@ -101,8 +102,8 @@ const DriverReferrals = () => {
         {/* Milestone Rewards */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          transition={reduceMotion ? undefined : { delay: 0.1 }}
         >
           <Card>
             <CardHeader className="pb-2">
@@ -148,8 +149,8 @@ const DriverReferrals = () => {
         {/* Referral Code Section */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.15 }}
+          transition={reduceMotion ? undefined : { delay: 0.15 }}
         >
           <Card>
             <CardHeader className="pb-2">
@@ -165,7 +166,7 @@ const DriverReferrals = () => {
                 <Button
                   variant="outline"
                   size="icon"
-                  onClick={copyCode}
+                  onClick={copyCode} aria-label="Copy referral code"
                   className="h-14 w-14 rounded-xl shrink-0"
                 >
-                  <Copy className="w-5 h-5" />
+                  <Copy className="w-5 h-5" aria-hidden="true" />
                 </Button>
               </div>
               
@@ -175,7 +176,7 @@ const DriverReferrals = () => {
                   className="h-11 flex-col gap-1 rounded-xl"
                   size="sm"
                 >
-                  <LinkIcon className="w-4 h-4" />
+                  <LinkIcon className="w-4 h-4" aria-hidden="true" />
                   <span className="text-[10px]">Link</span>
                 </Button>
                 <Button
@@ -184,7 +185,7 @@ const DriverReferrals = () => {
                   className="h-11 flex-col gap-1 rounded-xl"
                   size="sm"
                 >
-                  <MessageSquare className="w-4 h-4" />
+                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                   <span className="text-[10px]">SMS</span>
                 </Button>
                 <Button
@@ -194,7 +195,7 @@ const DriverReferrals = () => {
                   className="h-11 flex-col gap-1 rounded-xl text-[#25D366]"
                   size="sm"
                 >
-                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
+                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                   </svg>
                   <span className="text-[10px]">WhatsApp</span>
@@ -206,7 +207,7 @@ const DriverReferrals = () => {
                       className="h-11 flex-col gap-1 rounded-xl"
                       size="sm"
                     >
-                      <QrCode className="w-4 h-4" />
+                      <QrCode className="w-4 h-4" aria-hidden="true" />
                       <span className="text-[10px]">QR</span>
                     </Button>
                   </DialogTrigger>
@@ -224,7 +225,7 @@ const DriverReferrals = () => {
                         onClick={() => downloadQRAsPng(referralLink, `zivo-referral-${referralCode}.png`)}
                         className="gap-2"
                       >
-                        <Download className="w-4 h-4" />
+                        <Download className="w-4 h-4" aria-hidden="true" />
                         Save QR Image
                       </Button>
                     </div>
@@ -237,7 +238,7 @@ const DriverReferrals = () => {
                   className="h-11 flex-col gap-1 rounded-xl"
                   size="sm"
                 >
-                  <Share2 className="w-4 h-4" />
+                  <Share2 className="w-4 h-4" aria-hidden="true" />
                   <span className="text-[10px]">Share</span>
                 </Button>
               </div>
@@ -249,8 +250,8 @@ const DriverReferrals = () => {
         {/* Stats Cards */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          transition={reduceMotion ? undefined : { delay: 0.2 }}
           className="grid grid-cols-3 gap-3"
         >
           <Card className="text-center">
@@ -258,7 +259,7 @@ const DriverReferrals = () => {
               <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
-                <Users className="w-5 h-5 text-primary" />
+                <Users className="w-5 h-5 text-primary" aria-hidden="true" />
               </div>
               <p className="text-xl font-bold">{referrals.length}</p>
               <p className="text-xs text-muted-foreground">Invited</p>
@@ -269,7 +270,7 @@ const DriverReferrals = () => {
             <CardContent className="p-4">
               <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
-                <CheckCircle2 className="w-5 h-5 text-success" />
+                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
               </div>
               <p className="text-xl font-bold">{activeReferrals}</p>
               <p className="text-xs text-muted-foreground">Active</p>
@@ -280,7 +281,7 @@ const DriverReferrals = () => {
             <CardContent className="p-4">
               <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-warning/10 flex items-center justify-center">
-                <Clock className="w-5 h-5 text-warning" />
+                <Clock className="w-5 h-5 text-warning" aria-hidden="true" />
               </div>
               <p className="text-xl font-bold">{pendingReferrals}</p>
               <p className="text-xs text-muted-foreground">Pending</p>
@@ -291,8 +292,8 @@ const DriverReferrals = () => {
         {/* Referrals List with Milestone Progress */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          transition={reduceMotion ? undefined : { delay: 0.3 }}
         >
           <Card>
             <CardHeader>
@@ -312,7 +313,7 @@ const DriverReferrals = () => {
               ) : referrals.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
-                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
+                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                   <p>No referrals yet</p>
                   <p className="text-sm">Share your code to start earning points!</p>
                 </div>
@@ -370,7 +371,7 @@ const DriverReferrals = () => {
                       <div className="flex items-center gap-4 text-xs">
                         <div className={`flex items-center gap-1 ${referral.tripsCompleted >= 1 ? "text-success" : "text-muted-foreground"}`}>
                           {referral.tripsCompleted >= 1 ? (
-                            <CheckCircle2 className="w-3.5 h-3.5" />
+                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                           ) : (
                             <div className="w-3.5 h-3.5 rounded-full border border-current" />
                           )}
@@ -378,7 +379,7 @@ const DriverReferrals = () => {
                         </div>
                         <div className={`flex items-center gap-1 ${referral.tripsCompleted >= 10 ? "text-success" : "text-muted-foreground"}`}>
                           {referral.tripsCompleted >= 10 ? (
-                            <CheckCircle2 className="w-3.5 h-3.5" />
+                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                           ) : (
                             <div className="w-3.5 h-3.5 rounded-full border border-current" />
                           )}
@@ -386,7 +387,7 @@ const DriverReferrals = () => {
                         </div>
                         <div className={`flex items-center gap-1 ${referral.tripsCompleted >= 50 ? "text-success" : "text-muted-foreground"}`}>
                           {referral.tripsCompleted >= 50 ? (
-                            <CheckCircle2 className="w-3.5 h-3.5" />
+                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                           ) : (
                             <div className="w-3.5 h-3.5 rounded-full border border-current" />
                           )}
@@ -403,8 +404,8 @@ const DriverReferrals = () => {
         {/* How It Works */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.4 }}
+          transition={reduceMotion ? undefined : { delay: 0.4 }}
         >
           <Card>
             <CardHeader>
@@ -443,7 +444,7 @@ const DriverReferrals = () => {
                 <div className="w-8 h-8 rounded-full bg-warning text-warning-foreground flex items-center justify-center text-sm font-bold shrink-0">
-                  <Star className="w-4 h-4" />
+                  <Star className="w-4 h-4" aria-hidden="true" />
                 </div>
                 <div>
                   <p className="font-medium">Up to 700 points per referral!</p>
```

## Summary of edits

| Change | Count |
|--------|-------|
| `useReducedMotion` import + variable | 2 |
| `initial` guard (whole-object `false`) | 6 |
| `transition` guard (`undefined`) | 5 |
| `aria-label="Back"` on ghost button | 1 |
| `aria-label="Copy referral code"` on Copy button | 1 |
| `aria-hidden="true"` on decorative icons | 16 |

## Owner verification

- **No visual change at default motion** — `reduceMotion` is `false` by default, so all `initial`/`transition` objects remain identical
- **Heading order confirmed**: `h1` "Referrals" → `h2` "Reward Points" → `CardTitle` (renders as `h3`) — no skip
- **No logic changes** — all `onClick`, `navigate`, `copyCode`, `copyLink`, `
