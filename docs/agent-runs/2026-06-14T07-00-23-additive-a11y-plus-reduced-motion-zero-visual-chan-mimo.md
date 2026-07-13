# MiMo run — 2026-06-14T07:00:23.773Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (AnimatePresence plus one entrance motion.div in offers map with transition delay, NO infinite loops) and HAS useTranslation. Add useReducedMotion by extending import to motion AnimatePresence useReducedMotion, const reduceMotion in component. offers map motion.div initial opacity 0 y 8 transition delay - guard initial reduceMotion false and wrap transition reduceMotion undefined keep animate. KEY: the 5 TabsTrigger are ICON-ONLY (icon plus numeric count badge, no text label) so each needs aria-label naming category and inner icon aria-hidden: Offers Car, Payments DollarSign, Incentives Gift, Announcements Megaphone, System Bell - use t 2-arg fallback. 3 header icon-only buttons need aria-label plus icon aria-hidden: back t common.back ArrowLeft, refresh Refresh RefreshCw, settings Settings icon. RefreshCw template literal animate-spin change to animate-spin motion-reduce:animate-none. MarkAllReadButton has visible text so only aria-hidden CheckCheck. EmptyState icon props component-level leave. Confirm single h1. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/NotificationsInbox.tsx

---

## Plan

Seven targeted edits in `src/pages/driver/NotificationsInbox.tsx` — all additive a11y + reduced-motion, zero visual/logic change:

1. **Import**: extend framer-motion import with `useReducedMotion`.
2. **Component const**: `const reduceMotion = useReducedMotion();`
3. **Offers map `motion.div`**: guard `initial` with `reduceMotion` (false → `{ opacity: 0, y: 8 }`), pass `transition: reduceMotion ? undefined : { delay: i * 0.03 }`, keep `animate`.
4. **5 `<TabsTrigger>`**: add `aria-label` with `t(key, fallback)` on each; mark inner icon `aria-hidden="true"`.
5. **3 header `<button>`s**: add `aria-label` + mark inner icon `aria-hidden="true"`. Back/Refresh/Settings.
6. **`RefreshCw` template literal**: `animate-spin motion-reduce:animate-none`.
7. **`MarkAllReadButton` `<CheckCheck>`**: `aria-hidden="true"` (button has visible text).
8. Confirm single `<h1>` — already present ✓.

---

## Diff

```diff
--- a/src/pages/driver/NotificationsInbox.tsx
+++ b/src/pages/driver/NotificationsInbox.tsx
@@ -1 +1 @@
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
@@ 
 const DriverNotificationsInbox = () => {
   const navigate = useNavigate();
   const goBack = useGoBack();
   const { t } = useTranslation();
+  const reduceMotion = useReducedMotion();
   const [isRefreshing, setIsRefreshing] = useState(false);
```

**Back button** (L~89):
```diff
-          <button
-            onClick={goBack}
-            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
-          >
-            <ArrowLeft className="w-5 h-5" />
+          <button
+            onClick={goBack}
+            aria-label={t("common.back", "Back")}
+            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
+          >
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
```

**Refresh button** (L~97):
```diff
-          <button
-            onClick={handleRefresh}
-            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
-          >
-            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
+          <button
+            onClick={handleRefresh}
+            aria-label={t("notifications.refresh", "Refresh")}
+            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
+          >
+            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
```

**Settings button** (L~103):
```diff
-          <button
-            onClick={() => navigate("/settings")}
-            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
-          >
-            <Settings className="w-5 h-5" />
+          <button
+            onClick={() => navigate("/settings")}
+            aria-label={t("notifications.settings", "Settings")}
+            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
+          >
+            <Settings className="w-5 h-5" aria-hidden="true" />
```

**5 TabsTrigger** (each gets `aria-label` on trigger + `aria-hidden="true"` on icon):
```diff
             <TabsTrigger
               value="offers"
+              aria-label={t("notifications.tabOffers", "Offers")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Car className="w-3.5 h-3.5" />
+              <Car className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.offers)}
             </TabsTrigger>
             <TabsTrigger
               value="payments"
+              aria-label={t("notifications.tabPayments", "Payments")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <DollarSign className="w-3.5 h-3.5" />
+              <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.payments)}
             </TabsTrigger>
             <TabsTrigger
               value="incentives"
+              aria-label={t("notifications.tabIncentives", "Incentives")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Gift className="w-3.5 h-3.5" />
+              <Gift className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.incentives)}
             </TabsTrigger>
             <TabsTrigger
               value="announcements"
+              aria-label={t("notifications.tabAnnouncements", "Announcements")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Megaphone className="w-3.5 h-3.5" />
+              <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.announcements)}
             </TabsTrigger>
             <TabsTrigger
               value="system"
+              aria-label={t("notifications.tabSystem", "System")}
               className="flex items-center justify-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
             >
-              <Bell className="w-3.5 h-3.5" />
+              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
               {renderBadge(unreadByCategory.system)}
             </TabsTrigger>
```

**Offers map `motion.div`** (reduced-motion guard):
```diff
-                  <motion.div
-                    key={offer.id}
-                    initial={{ opacity: 0, y: 8 }}
-                    animate={{ opacity: 1, y: 0 }}
-                    transition={{ delay: i * 0.03 }}
-                  >
+                  <motion.div
+                    key={offer.id}
+                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
+                    animate={{ opacity: 1, y: 0 }}
+                    transition={reduceMotion ? undefined : { delay: i * 0.03 }}
+                  >
```

**`MarkAllReadButton` CheckCheck icon**:
```diff
-      <CheckCheck className="w-4 h-4" />
+      <CheckCheck className="w-4 h-4" aria-hidden="true" />
```

---

## Summary of exact edits

| # | What | Edit type |
|---|------|-----------|
| 1 | Import line | Add `useReducedMotion` to framer-motion import |
| 2 | Component body | Add `const reduceMotion = useReducedMotion();` |
| 3 | Back `<button>` | `aria-label={t("common.back","Back")}` + icon `aria-hidden="true"` |
| 4 | Refresh `<button>` | `aria-label={t("notifications.refresh","Refresh")}` + icon `aria-hidden="true"` |
| 5 | Settings `<button>` | `aria-label={t("notifications.settings","Settings")}` + icon `aria-hidden="true"` |
| 6 | RefreshCw template | Append `motion-reduce:animate-none` to `animate-spin` string |
| 7–11 | 5× TabsTrigger | Each: `aria-label={t("notifications.tabX","X")}` on trigger, `aria-hidden="true"` on icon |
| 12 | Offers `motion.div` | `initial={reduceMotion ? false : …}`, `transition={reduceMotion ? undefined : …}`, keep `animate` |
| 13 | MarkAllReadButton | `<CheckCheck aria-hidden="true">` (button has visible text already) |
| ✓ | `<h1>` | Already single h1 at L~93 — confirmed |

**0 logic lines touched.** All `onClick`, `navigate`, `refetchAll`, `markAsRead`, `markAllAsRead`, Supabase hooks, rendering branches byte-identical. EmptyState `icon` props left at component level (they're passed as component references, not rendered
