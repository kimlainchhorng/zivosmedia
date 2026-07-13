# MiMo run — 2026-06-14T08:38:09.682Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on DriverTrainingHub. File imports framer-motion motion and NO useTranslation so plain-English labels. TWO components DriverTrainingHub and CourseCard each needs its own const reduceMotion useReducedMotion. Motion inventory. ONE motion.header initial opacity 0 y minus 20 GUARD initial. ONE back motion.button ONLY whileHover whileTap LEAVE UNTOUCHED. ONE decorative motion.div wrapping GraduationCap with animate rotate array 0 5 minus5 0 transition repeat Infinity duration 3 this is a PERPETUAL loop GUARD it so reduced motion users see NO infinite motion set animate reduceMotion ? undefined colon the rotate array and transition reduceMotion ? undefined colon the repeat object. ONE compliance-banner motion.div initial opacity 0 scale 0.95 GUARD initial. ONE progress-hero motion.div initial opacity 0 y 20 GUARD initial. ONE cert-per-item motion.div initial opacity 0 y 8 transition delay i 0.04 GUARD initial and delay. ONE badge-per-item motion.div initial opacity 0 x minus 20 delay i 0.05 GUARD initial and delay. ONE CourseCard motion.div initial opacity 0 x minus 10 delay index 0.04 GUARD initial and delay. Full-screen loading Loader2 className w-8 h-8 animate-spin append motion-reduce animate-none and add role status aria-label Loading. Icons aria-hidden decorative ALL the lucide icons that sit beside visible text or are ornamental ArrowLeft Sparkles GraduationCap ShieldAlert the four progress-hero stat icons BookOpen CheckCircle Award Clock the three TabsTrigger icons BookOpen Award Trophy the Shield in Required heading the cert-status ShieldCheck ShieldAlert AlertTriangle the Calendar the Play the cert empty-state Award the badge CheckCircle the badge empty-state Trophy the Star the four benefits CheckCircle and in CourseCard the CheckCircle Video Clock BookOpen. Back motion.button icon-only gets aria-label Back. HEADING the page has h1 Training Hub then multiple h3 Your Progress Required Optional Courses and several h4 course and badge titles and Certification Benefits a multi-level h1 to h3 to h4 mess. Advise whether to DEFER the full heading restructure to a dedicated pass or whether a simple safe in-file fix exists. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverTrainingHub.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the file carefully and plan all the required changes.

## Motion inventory (from the code):

1. **motion.header** — `initial={{ opacity: 0, y: -20 }}` animate={{ opacity: 1, y: 0 }}` → GUARD initial
2. **motion.button** (back) — `whileHover={{ scale: 1.05 }}` `whileTap={{ scale: 0.95 }}` → LEAVE UNTOUCHED
3. **motion.div** (GraduationCap wrapper) — `animate={{ rotate: [0, 5, -5, 0] }}` `transition={{ repeat: Infinity, duration: 3 }}` → GUARD perpetual loop
4. **motion.div** (compliance banner) — `initial={{ opacity: 0, scale: 0.95 }}` `animate={{ opacity: 1, scale: 1 }}` → GUARD initial
5. **motion.div** (progress hero) — `initial={{ opacity: 0, y: 20 }}` `animate={{ opacity: 1, y: 0 }}` → GUARD initial
6. **motion.div** (cert per-item) — `initial={{ opacity: 0, y: 8 }}` `animate={{ opacity: 1, y: 0 }}` `transition={{ delay: i * 0.04 }}` → GUARD initial and delay
7. **motion.div** (badge per-item) — `initial={{ opacity: 0, x: -20 }}` `animate={{ opacity: 1, x: 0 }}` `transition={{ delay: i * 0.05 }}` → GUARD initial and delay
8. **CourseCard motion.div** — `initial={{ opacity: 0, x: -10 }}` `animate={{ opacity: 1, x: 0 }}` `transition={{ delay: index * 0.04 }}` → GUARD initial and delay

## Changes needed:

### 1. Imports
- Add `useReducedMotion` from `framer-motion`

### 2. DriverTrainingHub component
- Add `const reduceMotion = useReducedMotion();` inside the component

### 3. Guard motion.header initial
```tsx
initial={reduceMotion ? false : { opacity: 0, y: -20 }}
```

### 4. Back motion.button — LEAVE UNTOUCHED

### 5. Guard GraduationCap perpetual loop
```tsx
animate={reduceMotion ? undefined : { rotate: [0, 5, -5, 0] }}
transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
```

### 6. Guard compliance banner initial
```tsx
initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
```

### 7. Guard progress hero initial
```tsx
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
```

### 8. Guard cert per-item initial and delay
```tsx
initial={reduceMotion ? false : { opacity: 0, y: 8 }}
transition={reduceMotion ? { duration: 0 } : { delay: i * 0.04 }}
```

### 9. Guard badge per-item initial and delay
```tsx
initial={reduceMotion ? false : { opacity: 0, x: -20 }}
transition={reduceMotion ? { duration: 0 } : { delay: i * 0.05 }}
```

### 10. CourseCard component
- Add `const reduceMotion = useReducedMotion();` inside CourseCard
- Guard initial and delay:
```tsx
initial={reduceMotion ? false : { opacity: 0, x: -10 }}
transition={reduceMotion ? { duration: 0 } : { delay: index * 0.04 }}
```

### 11. Loader2 loading screen
```tsx
<Loader2 className="w-8 h-8 animate-spin text-primary motion-reduce:animate-none" />
// and add role="status" aria-label="Loading"
```

Wait, the task says "append motion-reduce animate-none". Let me re-read: "Full-screen loading Loader2 className w-8 h-8 animate-spin append motion-reduce animate-none and add role status aria-label Loading"

So: `className="w-8 h-8 animate-spin text-primary motion-reduce:animate-none"` and add `role="status"` and `aria-label="Loading"`.

### 12. aria-hidden on decorative icons

Let me go through ALL icons:

**ArrowLeft** (back button) — inside a button with visible text? No, it's icon-only with an aria-label "Back" (which we need to add). The icon itself is decorative → `aria-hidden="true"`

**Sparkles** — next to "Training Hub" text, decorative → `aria-hidden="true"`

**GraduationCap** — decorative icon in the header → `aria-hidden="true"`

**ShieldAlert** (compliance banner) — beside text, decorative → `aria-hidden="true"`

**BookOpen** (progress hero stat) — decorative → `aria-hidden="true"`
**CheckCircle** (progress hero stat) — decorative → `aria-hidden="true"`
**Award** (progress hero stat) — decorative → `aria-hidden="true"`
**Clock** (progress hero stat) — decorative → `aria-hidden="true"`

**BookOpen** (TabsTrigger "Courses") — beside visible text → `aria-hidden="true"`
**Award** (TabsTrigger "Certs") — beside visible text → `aria-hidden="true"`
**Trophy** (TabsTrigger "Badges") — beside visible text → `aria-hidden="true"`

**Shield** (Required heading) — beside visible text → `aria-hidden="true"`

**ShieldCheck** (cert status) — beside text/badge, decorative → `aria-hidden="true"`
**ShieldAlert** (cert status) — beside text/badge, decorative → `aria-hidden="true"`
**AlertTriangle** (cert status) — beside text/badge, decorative → `aria-hidden="true"`

**Calendar** (cert date) — beside text → `aria-hidden="true"`

**Play** (Renew Certification button) — beside visible text → `aria-hidden="true"`

**Award** (cert empty state) — decorative → `aria-hidden="true"`

**CheckCircle** (badge item) — beside visible cert name → `aria-hidden="true"`

**Trophy** (badge empty state) — decorative → `aria-hidden="true"`

**Star** (Certification Benefits heading) — beside visible text → `aria-hidden="true"`

**CheckCircle** × 4 (benefits list) — beside visible text → `aria-hidden="true"`

**In CourseCard:**
**CheckCircle** (complete icon) — this one shows as the course status icon with a white color inside a gradient badge. It's beside text ("Review"/"Continue"/"Start" button). But visually it's part of the status indicator. Decorative since the button text conveys the state → `aria-hidden="true"`

Wait, actually looking at the CourseCard more carefully:

The icon in the `w-10 h-10` square is a visual indicator — `CheckCircle` for complete, `Video` for not complete. These are beside visible text content (the course title, description, etc.). They're decorative → `aria-hidden="true"`

**Video** — same, decorative → `aria-hidden="true"`

**Clock** (duration info) — beside text → `aria-hidden="true"`
**BookOpen** (lessons info) — beside text → `aria-hidden="true"`

Wait, let me re-read the task for CourseCard specifically: "in CourseCard the CheckCircle Video Clock BookOpen"

So yes, those 4 in CourseCard need `aria-hidden="true"`.

### 13. Back button aria-label
Add `aria-label="Back"` to the motion.button.

### 14. Heading structure

The task says: "Advise whether to DEFER the full heading restructure to a dedicated pass or whether a simple safe in-file fix exists."

Current structure:
- h1 "Training Hub" (in header)
- h3 "Your Progress" (progress hero)
- h3 "Required" (section heading)
- h3 "Optional Courses" (section heading) — wait, actually "Optional Courses" doesn't have a heading explicitly. Let me re-check.

Looking at the code:
- h1: "Training Hub" 
- h3: "Your Progress" (inside progress hero)
- h3: "Required" (section heading in courses tab)
- h3: "Optional Courses" — wait, I don't see this. Let me look again.

Actually looking at the code:
- `h1`: "Training Hub" (line in header)
- `h3`: "Your Progress" (progress hero)
- h3 with `text-xs font-semibold text-destructive uppercase`: "Required" (with Shield icon)
- There's no explicit h3 for "Optional Courses" — wait: `h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"` — no, it's missing. Let me re-read.

Oh wait, in the code:
```jsx
<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
  Optional Courses
</h3>
```
Yes, there is one.

And in badges tab:
- h4: `{cert.certification_name}` (badge name)
- h4: "Certification Benefits"

And in CourseCard:
- h4: `{course.title}`

So the hierarchy is:
- h1: "Training Hub"
  - h3: "Your Progress"
  - h3: "Required"
  - h3: "Optional Courses"
  - h3: (TabsTriggers act as section switches, implicit)
  - h4: course titles
  - h4: badge names
  - h4: "Certification Benefits"

The issue: Going from h1 → h3 skips h2 entirely. And then h4 course titles are under h3 section headings.

My advice: This is a heading-level hierarchy issue. The simplest safe in-file fix would be:
- Keep h1 "Training Hub"
- Change h3 "Your Progress" → h2
- Change h3 "Required" and h3 "Optional Courses" → h2
- Keep h4 course/badge titles under h2 sections — that's valid (h2 → h4 still skips h3, but the tabs provide the implicit grouping)

Actually, the cleanest fix:
- h1: "Training Hub" ✓
- h2: "Your Progress", "Required", "Optional Courses" (change h3 → h2)
- h3: course titles, badge names, "Certification Benefits" (change h4 → h3)

This creates a clean h1 → h2 → h3 hierarchy. It's a safe className-only change (well, tag change but purely semantic). No logic. I'd recommend doing it in-file since it's mechanical.

Let me now write the diff.

Actually, let me think about this more carefully. The task says "Confirm or correct exact edits only no logic changes" and "Advise whether to DEFER the full heading restructure to a dedicated pass or whether a simple safe in-file fix exists."

My recommendation: The heading fix is purely mechanical (swap h3→h2 and h4→h3 tags), changes zero logic and zero styling (the existing `text-xs`/`text-sm`/`text-base`/`text-lg` className sizes control the visual appearance, not the semantic tags). It's safe to do in-file alongside the a11y pass. But it does add ~8 more edits to the diff. If the owner prefers a smaller diff, DEFER is fine. I'll include both options.

Actually wait — the task says to advise. Let me just advise and include the fix as optional.

Let me now compose the full plan.

Let me count all the icons that need aria-hidden:

In DriverTrainingHub:
1. ArrowLeft (back
