# DeepSeek run — 2026-06-14T06:59:46.094Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion (AnimatePresence plus one entrance motion.div in the offers map with transition delay, NO infinite loops) and HAS useTranslation t with common.back. Add useReducedMotion from framer-motion by extending the import to motion AnimatePresence useReducedMotion, const reduceMotion in the component. The offers map motion.div initial opacity 0 y 8 transition delay i times 0.03 - guard initial whole-object reduceMotion ? false : object and wrap transition reduceMotion ? undefined : object, keep animate. KEY POINT: the 5 TabsTrigger are ICON-ONLY (each holds just an icon plus renderBadge which is a numeric count, no text category label) so EACH of the 5 TabsTrigger needs an aria-label naming the category, and the inner icon gets aria-hidden: offers aria-label Offers icon Car, payments aria-label Payments icon DollarSign, incentives aria-label Incentives icon Gift, announcements aria-label Announcements icon Megaphone, system aria-label System icon Bell - use t with 2-arg fallback like t notifications.offers Offers. Three header icon-only buttons need aria-label plus icon aria-hidden: back button t common.back ArrowLeft, refresh button Refresh fallback RefreshCw, settings-nav button Settings fallback Settings icon. RefreshCw uses template literal animate-spin - change to animate-spin motion-reduce:animate-none. MarkAllReadButton has visible text Mark all as read so only aria-hidden its CheckCheck icon. EmptyState icon props are component-level leave them. Confirm single h1. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/NotificationsInbox.tsx

---

## Plan

1. **Import `useReducedMotion`** from framer-motion (extend existing import)
2. **Add `const reduceMotion = useReducedMotion()`** in component body
3. **Guard the offers map `motion.div`** — `initial` becomes `reduceMotion ? false : { opacity: 0, y: 8 }`, `transition` becomes `reduceMotion ? undefined : { delay: i * 0.03 }`
4. **Add `aria-label` to each of the 5 `TabsTrigger`** with `t()` 2-arg fallback, and `aria-hidden` on each inner icon
5. **Add `aria-label` + icon `aria-hidden`** to the 3 header icon-only buttons (back, refresh, settings-nav)
6. **Add `motion-reduce:animate-none`** to the `RefreshCw` className template literal
7. **Add `aria-hidden`** to the `CheckCheck` icon in `MarkAllReadButton`
8. **Confirm single `<h1>`** — already present

## Diff

**File: `src/pages/driver/NotificationsInbox.tsx`**

```diff
--- a/src/pages/driver/NotificationsInbox.tsx
+++ b/src/pages/driver/NotificationsInbox.tsx
@@ -1,7 +1,7 @@
 import { useState, useCallback } from "react";
 import { ArrowLeft, Settings, Car, Gift, Megaphone, Bell, CheckCheck, DollarSign, RefreshCw } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { EmptyState } from "@/components/common/EmptyState";
 import { useNotificationsInbox } from "@/hooks/useNotificationsInbox";
 import OfferHistoryItem from "@/components/notifications/inbox/OfferHistoryItem";
 import IncentiveItem from "@/components/notifications/inbox/IncentiveItem";
 import AnnouncementItem from "@/components/notifications/inbox/AnnouncementItem";
 import SystemAlertItem from "@/components/notifications/inbox/SystemAlertItem";
 import PaymentNotificationItem from "@/components/notifications/inbox/PaymentNotificationItem";
 import BottomNav from "@/components/BottomNav";
 import { useTranslation } from "@/hooks/useTranslation";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

 const DriverNotificationsInbox = () => {
   const navigate = useNavigate();
   const goBack = useGoBack();
   const { t } = useTranslation();
+  const reduceMotion = useReducedMotion();
   const [isRefreshing, setIsRefreshing] = useState(false);
   const {
     offers,
@@ -67,7 +68,7 @@ const DriverNotificationsInbox = () => {
       size="sm"
       onClick={() => markAllAsRead(category)}
       className="w-full justify-center gap-2 text-muted-foreground"
     >
-      <CheckCheck className="w-4 h-4" />
+      <CheckCheck className="w-4 h-4" aria-hidden="true" />
       {t("notifications.markAllRead", "Mark all as read")}
     </Button>
   );
@@ -79,19 +80,22 @@ const DriverNotificationsInbox = () => {
         <div className="flex items-center gap-3">
           <button
             onClick={goBack}
+            aria-label={t("common.back", "Back")}
             className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
           <div className="flex-1">
             <h1 className="text-lg font-semibold text-foreground">
               {t("notificationsPage.title", "Notifications")}
             </h1>
             <p className="text-xs text-muted-foreground">
               {totalUnread > 0
                 ? `${totalUnread} ${t("notifications.unread", "unread")}`
                 : t("notifications.allRead", "All caught up")}
             </p>
           </div>
           <button
             onClick={handleRefresh}
+            aria-label={t("notifications.refresh", "Refresh")}
             className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
           >
-            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
+            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
           </button>
           <button
             onClick={() => navigate("/settings")}
+            aria-label={t("notifications.settings", "Settings")}
             className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
           >
-            <Settings className="w-5 h-5" />
+            <Settings className="w-5 h-5" aria-hidden="true" />
           </button>
         </div>
       </header>
@@ -113,6 +117,7 @@ const DriverNotificationsInbox = () => {
           <TabsList className="w-full grid grid-cols-5 bg-muted rounded-xl p-1 mb-4">
             <TabsTrigger
               value="offers"
+              aria-label={t("notifications.offers", "Offers")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Car className="w-3.5 h-3.5" />
+              <Car className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.offers)}
             </TabsTrigger>
             <TabsTrigger
               value="payments"
+              aria-label={t("notifications.payments", "Payments")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <DollarSign className="w-3.5 h-3.5" />
+              <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.payments)}
             </TabsTrigger>
             <TabsTrigger
               value="incentives"
+              aria-label={t("notifications.incentives", "Incentives")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Gift className="w-3.5 h-3.5" />
+              <Gift className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.incentives)}
             </TabsTrigger>
             <TabsTrigger
               value="announcements"
+              aria-label={t("notifications.announcements", "Announcements")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Megaphone className="w-3.5 h-3.5" />
+              <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.announcements)}
             </TabsTrigger>
             <TabsTrigger
               value="system"
+              aria-label={t("notifications.system", "System")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Bell className="w-3.5 h-3.5" />
+              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.system)}
             </TabsTrigger>
           </TabsList>
@@ -148,7 +153,7 @@ const DriverNotificationsInbox = () => {
                 {offers.map((offer, i) => (
                   <motion.div
                     key={offer.id}
-                    initial={{ opacity: 0, y: 8 }}
+                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                     animate={{ opacity: 1, y: 0 }}
-                    transition={{ delay: i * 0.03 }}
+                    transition={reduceMotion ? undefined : { delay: i * 0.03 }}
                   >
                     <OfferHistoryItem offer={offer} />
                   </motion.div>
```

## Verification

- **Single `<h1>`** confirmed at line 91: `<h1 className="text-lg font-semibold text-foreground">`
- **EmptyState icons** left untouched (component-level props)
- **0 logic changes** — all edits are additive (imports, aria attrs, className additions, motion guard)
- **`npm run update`** must pass before marking done
