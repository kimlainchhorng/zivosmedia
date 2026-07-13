# MiMo run — 2026-06-14T06:57:32.835Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (one entrance motion.div in TabsContent, NO infinite loops), NO useTranslation so plain Back. Add useReducedMotion from framer-motion, const reduceMotion in DriverAchievements. The single motion.div entrance initial opacity 0 y 10 transition duration 0.2 - guard initial whole-object reduceMotion ? false : object, keep animate and transition. aria: icon-only back button aria-label Back. aria-hidden true on ArrowLeft, header Trophy, the TabsTrigger category Icon. AchievementBadge icon prop component-level leave. Confirm single h1. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverAchievements.tsx

---

## Plan

Six surgical edits to `src/pages/driver/DriverAchievements.tsx` — a11y attributes + reduced-motion guard. Zero visual change, zero logic touched.

---

## Proposed edits

**File:** `src/pages/driver/DriverAchievements.tsx`

### 1. Import `useReducedMotion`

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### 2. Add `reduceMotion` constant (inside component, after existing hooks)

After:
```ts
const { driver } = useAuth() as any;
```
Add:
```ts
const reduceMotion = useReducedMotion();
```

### 3. Guard the `motion.div` initial

```diff
-                initial={{ opacity: 0, y: 10 }}
+                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
```

### 4. Back button — add `aria-label`

```diff
          <button
            onClick={goBack}
-            className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center"
+            className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center"
+            aria-label="Back"
          >
-            <ArrowLeft className="w-5 h-5 text-foreground" />
+            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
```

### 5. Trophy icon — `aria-hidden`

```diff
-            <Trophy className="w-4 h-4 text-primary" />
+            <Trophy className="w-4 h-4 text-primary" aria-hidden="true" />
```

### 6. TabsTrigger category Icon — `aria-hidden`

```diff
              <TabsTrigger key={cat} value={cat} className="gap-1 text-xs">
-                <Icon className="w-3.5 h-3.5" />
+                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {config.label}
```

---

## Checklist

| Item | Status |
|------|--------|
| `useReducedMotion` imported + used | ✅ |
| motion.div initial guarded for reduced-motion | ✅ |
| `aria-label="Back"` on icon-only back button | ✅ |
| `aria-hidden="true"` on ArrowLeft, Trophy, TabsTrigger Icon | ✅ |
| AchievementBadge `icon` prop left alone (component-level) | ✅ |
| Single `<h1>` confirmed — "Achievements" | ✅ |
| No logic/onClick/hook changes | ✅ |

**Owner must verify:** `npm run update` (type-check + worker type-check + production build must pass) before committing.
