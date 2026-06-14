# MiMo run — 2026-06-14T07:23:58.518Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File has NO framer-motion and NO useTranslation so plain Back. Child AnnouncementCard is a same-file sub-component IN SCOPE for aria only. Edits: (1) the icon-only ghost back Button gets aria-label Back, its ArrowLeft gets aria-hidden true. (2) aria-hidden true on the decorative config Icon inside AnnouncementCard next to visible title text. (3) aria-hidden true on the empty-state Megaphone icon. (4) the location pin emoji before targetCity wrapped in a span aria-hidden true. (5) the loading skeleton div has Tailwind animate-pulse - append motion-reduce:animate-none. The four TabsTriggers have visible text so NO aria-label. Single h1 fine no change. Filter is imported but unused - LEAVE IT do not remove. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/AnnouncementCenter.tsx

---

## Plan

Five additive a11y edits in `src/pages/driver/AnnouncementCenter.tsx`, zero logic/visual changes:

| # | Target | Edit |
|---|--------|------|
| 1 | Back `<Button>` (line ~66) + `<ArrowLeft>` (line ~67) | Add `aria-label="Back"` to Button; add `aria-hidden="true"` to ArrowLeft |
| 2 | `<Icon>` inside `AnnouncementCard` (line ~41) | Add `aria-hidden="true"` |
| 3 | Empty-state `<Megaphone>` (line ~101) | Add `aria-hidden="true"` |
| 4 | `📍` emoji before `targetCity` (line ~56) | Wrap in `<span aria-hidden="true">` |
| 5 | Loading skeleton div (line ~94) | Append `motion-reduce:animate-none` to className |

---

## Proposed diff

```diff
--- a/src/pages/driver/AnnouncementCenter.tsx
+++ b/src/pages/driver/AnnouncementCenter.tsx
@@ -38,7 +38,7 @@ function AnnouncementCard({ announcement }: { announcement: AnnouncementBanner }
       <div className="flex items-start gap-3">
         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bgClass)}>
-          <Icon className={cn("w-5 h-5", config.iconClass)} />
+          <Icon className={cn("w-5 h-5", config.iconClass)} aria-hidden="true" />
         </div>
         <div className="flex-1 min-w-0">
@@ -53,7 +53,7 @@ function AnnouncementCard({ announcement }: { announcement: AnnouncementBanner }
       {announcement.targetCity && (
         <Badge variant="outline" className="text-xs">
-          📍 {announcement.targetCity}
+          <span aria-hidden="true">📍</span> {announcement.targetCity}
         </Badge>
       )}
@@ -63,8 +63,8 @@ export default function AnnouncementCenter() {
         <div className="flex items-center gap-3 px-4 py-3">
-          <Button variant="ghost" size="icon" onClick={goBack}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
@@ -91,11 +91,11 @@ export default function AnnouncementCenter() {
         {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => (
-            <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
+            <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse motion-reduce:animate-none" />
           ))
         ) : filtered.length === 0 ? (
           <div className="text-center py-12">
-            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
+            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
             <p className="text-muted-foreground">No announcements</p>
```

**Totals:** 7 `aria-hidden="true"` attrs added (ArrowLeft, Icon, Megaphone, plus 4 via the 3 icon elements + emoji span), 1 `aria-label` added, 1 `motion-reduce:animate-none` appended, 1 emoji wrapped. 0 logic lines touched. `Filter` import left as-is.

---

## Owner verification

1. Run `npm run update` (type-check + worker type-check + build) — must pass at 0 errors.
2. Visual check at 375/768/1280: no layout shift from the emoji `<span>` wrapper (it's inline, zero-width, no visual effect).
3. Keyboard check: Tab to the back button → screen reader announces "Back".
4. `prefers-reduced-motion`: skeleton shimmer stops.
