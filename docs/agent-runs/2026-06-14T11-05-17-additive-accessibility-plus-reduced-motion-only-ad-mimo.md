# MiMo run — 2026-06-14T11:05:17.919Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Add useReducedMotion from framer-motion as var reduceMotion. For framer-motion entrance elements with spatial initial props opacity y or x guard the whole initial object with reduceMotion ternary to false. For stagger delays set transition delay to 0 when reduceMotion using delay reduceMotion ? 0 : original. Append motion-reduce colon animate-none to the loading skeleton CSS animate-pulse and add aria-hidden true to those skeleton divs. Add aria-hidden true to decorative icons. Add aria-label Back to the icon-only back button. Do not add aria-label to any control that has visible text such as the Post button or the Trending and Recent tabs or the like button with a visible count, only aria-hidden their inner icons. Fix heading skip where h1 is followed by post title h3 by promoting those post title h3 headings to h2 with no visual change keeping className unchanged. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/community/DriverForum.tsx

---

## Plan

| # | Change | Scope |
|---|--------|-------|
| 1 | Add `useReducedMotion` import + hook call | imports, top of component |
| 2 | Guard `initial` on `renderPost` motion.div with `reduceMotion ? false : …` | 1 element |
| 3 | Guard stagger `delay` on same element with `reduceMotion ? 0 : …` | 1 element |
| 4 | `animate-pulse` → add `motion-reduce:animate-none`; add `aria-hidden="true"` | 3 skeleton divs |
| 5 | `aria-label="Back"` on icon-only back button | 1 button |
| 6 | `aria-hidden="true"` on all 12 decorative lucide icons | 12 icons |
| 7 | `<h3 className="font-medium …">` post title → `<h2>` (heading-skip fix) | 1 element |
| 8 | **Do NOT** add aria-label to Post button / Trending / Recent tabs / like button — they have visible text | 0 |

No logic or layout changes. All changes are additive accessibility + reduced-motion guards.

---

## Proposed diff

**File:** `src/pages/community/DriverForum.tsx`

```diff
--- a/src/pages/community/DriverForum.tsx
+++ b/src/pages/community/DriverForum.tsx
@@ -1,5 +1,5 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, MessageSquare, ThumbsUp, Eye, User, Plus, Search, TrendingUp, Clock, Pin } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Card, CardContent } from "@/components/ui/card";
@@ -24,6 +24,7 @@ const DriverForum = () => {
   const navigate = useNavigate();
   const { driver } = useAuth();
+  const reduceMotion = useReducedMotion();
   const [searchQuery, setSearchQuery] = useState("");
   const [activeTab, setActiveTab] = useState("trending");
   const [isDialogOpen, setIsDialogOpen] = useState(false);
@@ -68,9 +69,9 @@ const DriverForum = () => {
   const renderPost = (post: typeof posts[0], index: number) => (
     <motion.div
       key={post.id}
-      initial={{ opacity: 0, y: 20 }}
+      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
-      transition={{ delay: index * 0.05 }}
+      transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
     >
       <Card className="glass-card cursor-pointer hover:bg-muted/30 transition-colors">
         <CardContent className="p-4">
@@ -78,7 +79,7 @@ const DriverForum = () => {
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
-              <User className="w-5 h-5 text-primary" />
+              <User className="w-5 h-5 text-primary" aria-hidden="true" />
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
-                {post.isPinned && <Pin className="w-3 h-3 text-primary" />}
+                {post.isPinned && <Pin className="w-3 h-3 text-primary" aria-hidden="true" />}
                 <Badge className={`text-xs ${getCategoryColor(post.category)}`}>
                   {post.category}
@@ -86,7 +87,7 @@ const DriverForum = () => {
               </div>
-              <h3 className="font-medium line-clamp-2">{post.title}</h3>
+              <h2 className="font-medium line-clamp-2">{post.title}</h2>
               <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{post.content}</p>
               <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
@@ -96,15 +97,15 @@ const DriverForum = () => {
                   className={`flex items-center gap-1 transition-colors ${
                     post.likedBy.includes(driver?.id || "") ? "text-primary" : "hover:text-primary"
                   }`}
                 >
-                  <ThumbsUp className={`w-3 h-3 ${post.likedBy.includes(driver?.id || "") ? "fill-primary" : ""}`} />
+                  <ThumbsUp className={`w-3 h-3 ${post.likedBy.includes(driver?.id || "") ? "fill-primary" : ""}`}
