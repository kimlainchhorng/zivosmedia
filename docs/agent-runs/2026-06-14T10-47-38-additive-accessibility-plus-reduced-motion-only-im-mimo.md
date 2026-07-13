# MiMo run — 2026-06-14T10:47:38.635Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Import useReducedMotion from framer-motion extending existing motion import add const reduceMotion equals useReducedMotion after const navigate. For every entrance motion.div and motion.header set initial to reduceMotion question false colon original object. Applies to header Progress-Overview-Hero Tabs-wrapper per-course-rows per-certification-rows and Benefits-Card. For staggered ones set transition delay to reduceMotion question 0 colon original on Tabs delay 0.1 per-course delay index times 0.05 per-cert delay index times 0.05 Benefits delay 0.3. There are TWO perpetual loops. First the header GraduationCap wrapper motion.div with animate rotate array and transition repeat Infinity duration 3 set both animate and transition to undefined and add aria-hidden true. Second the hero glow circle motion.div with animate scale array and transition repeat Infinity duration 4 set both animate and transition to undefined and add aria-hidden true. Add aria-label Back to back motion.button and aria-hidden true to ArrowLeft. Add aria-hidden true to decorative icons Sparkles and hero BookOpen Award Clock and per-course status icons CheckCircle Lock Video and per-course Trophy badge and per-course meta Clock BookOpen and per-course Play and per-cert CheckCircle and per-cert Lock and Benefits Star and four Benefits CheckCircle. Promote the h3 Your Progress to h2 and promote all h4 to h3 namely per-course course.title per-cert cert.name and Certification Benefits. Append motion-reduce colon animate-none to the loading Loader2 animate-spin className. Leave whileHover whileTap and cert.icon emoji and Button visible text Review Continue Start. Do NOT guard animate on entrance ones only initial and delay. Verify each item.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/TrainingAcademy.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the task carefully. I need to make additive accessibility and reduced-motion changes to `TrainingAcademy.tsx`. Let me break down every item:

1. **Import `useReducedMotion`** from framer-motion (extend existing motion import)
2. **Add `const reduceMotion = useReducedMotion()`** after `const navigate`
3. **Entrance motion.div and motion.header**: set `initial` to `reduceMotion ? false : original object` for:
   - header (motion.header)
   - Progress-Overview-Hero (first motion.div in main)
   - Tabs-wrapper (second motion.div wrapping Tabs)
   - per-course-rows (each course motion.div)
   - per-certification-rows (each cert motion.div)
   - Benefits-Card (last motion.div in certifications tab)

4. **Staggered delays** — set `transition.delay` to `reduceMotion ? 0 : original`:
   - Tabs delay 0.1
   - per-course delay index * 0.05
   - per-cert delay index * 0.05
   - Benefits delay 0.3

5. **TWO perpetual loops**:
   - Header GraduationCap wrapper motion.div: set `animate` and `transition` to `undefined`, add `aria-hidden="true"`
   - Hero glow circle motion.div: set `animate` and `transition` to `undefined`, add `aria-hidden="true"`

6. **aria-label "Back"** on back motion.button, **aria-hidden="true"** on ArrowLeft icon

7. **aria-hidden="true"** on decorative icons:
   - Sparkles (header)
   - Hero BookOpen, Award, Clock (in the 3 stat boxes)
   - Per-course status icons: CheckCircle, Lock, Video
   - Per-course Trophy badge
   - Per-course meta: Clock, BookOpen
   - Per-course Play (in the Button)
   - Per-cert CheckCircle
   - Per-cert Lock
   - Benefits Star
   - 4 Benefits CheckCircle

8. **Heading promotions**:
   - h3 "Your Progress" → h2
   - h4 course.title → h3
   - h4 cert.name → h3
   - h4 "Certification Benefits" → h3

9. **Loader2**: append `motion-reduce:animate-none` to the `animate-spin` className

10. Leave whileHover, whileTap, cert.icon emoji, and Button visible text untouched.

11. Do NOT guard `animate` on entrance ones — only `initial` and `delay`.

Let me now write the diff carefully.

Let me re-read the source to be precise:

```tsx
import { useState } from "react";
import { motion } from "framer-motion";
```

Change to:
```tsx
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
```

After `const navigate = useNavigate();` add:
```tsx
  const reduceMotion = useReducedMotion();
```

Now let me go through each item:

**Header (motion.header)**:
```tsx
<motion.header
  className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
>
```
→ change `initial` to `reduceMotion ? false : { opacity: 0, y: -20 }`

**Back button + ArrowLeft**:
```tsx
<motion.button
  onClick={() => navigate(-1)}
  className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <ArrowLeft className="w-5 h-5" />
</motion.button>
```
→ add `aria-label="Back"` to motion.button, add `aria-hidden="true"` to ArrowLeft

**Sparkles**:
```tsx
<Sparkles className="w-4 h-4 text-warning" />
```
→ add `aria-hidden="true"`

**GraduationCap perpetual loop wrapper**:
```tsx
<motion.div
  animate={{ rotate: [0, 5, -5, 0] }}
  transition={{ repeat: Infinity, duration: 3 }}
  className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20"
>
  <GraduationCap className="w-5 h-5 text-warning" />
</motion.div>
```
→ set `animate={undefined}`, `transition={undefined}`, add `aria-hidden="true"`

**Progress Overview Hero (first motion.div)**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative overflow-hidden p-6 rounded-3xl..."
>
```
→ `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

**Hero glow circle (second perpetual loop)**:
```tsx
<motion.div
  className="absolute -top-16 -right-16 w-32 h-32 rounded-full"
  style={{ background: "..." }}
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ repeat: Infinity, duration: 4 }}
/>
```
→ set `animate={undefined}`, `transition={undefined}`, add `aria-hidden="true"`

**h3 "Your Progress" → h2**:
```tsx
<h3 className="text-lg font-bold">Your Progress</h3>
```
→ `<h2 className="text-lg font-bold">Your Progress</h2>`

**Hero stat icons: BookOpen, Award, Clock**:
```tsx
<BookOpen className="h-5 w-5 text-primary-foreground" />
<Award className="h-5 w-5 text-primary-foreground" />
<Clock className="h-5 w-5 text-primary-foreground" />
```
→ add `aria-hidden="true"` to each

**Tabs wrapper (second motion.div)**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
```
→ `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`, `transition={{ delay: reduceMotion ? 0 : 0.1 }}`

**Per-course rows**:
```tsx
<motion.div
  key={course.id}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05 }}
  className={...}
>
```
→ `initial={reduceMotion ? false : { opacity: 0, x: -20 }}`, `transition={{ delay: reduceMotion ? 0 : index * 0.05 }}`

**h4 course.title → h3**:
```tsx
<h4 className="font-semibold">{course.title}</h4>
```
→ `<h3 className="font-semibold">{course.title}</h3>`

**Per-course status icons**: CheckCircle, Lock, Video — add `aria-hidden="true"`

**Trophy in badge**:
```tsx
<Trophy className="h-3 w-3 mr-1" />
```
→ add `aria-hidden="true"`

**Per-course meta icons**: Clock, BookOpen:
```tsx
<Clock className="h-3 w-3" />
<BookOpen className="h-3 w-3" />
```
→ add `aria-hidden="true"`

**Per-course Play** (in Button):
```tsx
<Play className="h-4 w-4 mr-1" /> Continue
...
<Play className="h-4 w-4 mr-1" /> Start
```
→ add `aria-hidden="true"` to both Play icons

**Per-certification rows**:
```tsx
<motion.div
  key={cert.id}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05 }}
  className={...}
>
```
→ same treatment

**h4 cert.name → h3**:
```tsx
<h4 className="font-semibold">{cert.name}</h4>
```
→ `<h3 className="font-semibold">{cert.name}</h3>`

**Per-cert CheckCircle**:
```tsx
<CheckCircle className="h-4 w-4 text-success" />
```
→ add `aria-hidden="true"`

**Per-cert Lock**:
```tsx
<Lock className="h-5 w-5 text-muted-foreground" />
```
→ add `aria-hidden="true"`

**Benefits Card**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="p-5 rounded-3xl..."
>
```
→ `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`, `transition={{ delay: reduceMotion ? 0 : 0.3 }}`

**h4 "Certification Benefits" → h3**:
```tsx
<h4 className="font-semibold mb-3 flex items-center gap-2">
  <Star className="h-5 w-5 text-warning" />
  Certification Benefits
</h4>
```
→ `<h3 ...>...</h3>`

**Star**:
→ add `aria-hidden="true"`

**4 Benefits CheckCircle**:
→ add `aria-hidden="true"` to all four

**Loader2**:
```tsx
<Loader2 className="w-8 h-8 animate-spin text-primary" />
```
→ `<Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none text-primary" />`

Now let me write the full diff. Since the file is at `src/pages/tools/TrainingAcademy.tsx`, I'll provide the diff.

Actually wait - looking at the file path more carefully, the context file says `../zivodriver/src/pages/tools/TrainingAcademy.tsx`. But per AGENTS.md, the zivodriver project is at `yiedlgoxwjmansszdypf`. The file path in the repo would be `src/pages/tools/TrainingAcademy.tsx` based on the project structure. But the task just says to provide context - the actual file path might be different. Let me just use the file as given and note the path.

Actually, the context header says `../zivodriver/src/pages/tools/TrainingAcademy.tsx` which suggests this is in a sibling `zivodriver` directory. But since this is a monorepo context, the file might be at a different path. I'll reference it as `src/pages/tools/TrainingAcademy.tsx` and note it could be in a zivodriver subproject.

Let me write out the complete diff now. I'll be very precise.

Let me count all the aria-hidden items carefully:

1. ArrowLeft (back button icon)
2. Sparkles (header)
3. GraduationCap wrapper (aria-hidden on the wrapper div)
4. Hero glow circle (aria-hidden on the wrapper div)
5. Hero BookOpen (stat 1)
6. Hero Award (stat 2)
7. Hero Clock (stat 3)
8. Per-course CheckCircle (complete status)
9. Per-course Lock (locked status)
10. Per-course Video (default status)
11. Per-course Trophy (badge)
12. Per-course meta Clock
13. Per-course meta BookOpen
14. Per-course Play (in "Continue" button)
15. Per-course Play (in "Start" button)
16. Per-cert CheckCircle (earned indicator)
17. Per-cert Lock (not earned)
18. Benefits Star
19. Benefits CheckCircle #1
20. Benefits CheckCircle #2
21. Benefits CheckCircle #3
22. Benefits CheckCircle #4

Wait, looking at the task more carefully: "Add aria-hidden true to decorative icons Sparkles and hero BookOpen Award Clock and per-course status icons CheckCircle Lock Video and per-course Trophy badge and per-course meta Clock BookOpen and per-course Play and per-cert CheckCircle and per-cert Lock and Benefits Star and four Benefits CheckCircle."

So that's:
- Sparkles ✓
- Hero: BookOpen, Award, Clock ✓
- Per-course status: CheckCircle, Lock, Video ✓
- Per-course Trophy ✓
- Per-course meta: Clock, BookOpen ✓
- Per-course Play ✓
- Per-cert: CheckCircle, Lock ✓
- Benefits Star ✓
- Benefits: 4× CheckCircle ✓

The GraduationCap and glow circle get aria-hidden as part of the perpetual loop treatment.

The ArrowLeft gets aria-hidden as part of the back button treatment.

Now, for the two perpetual loops, the task says to set `animate` and `transition` to `undefined`. In JSX, to pass `undefined`, I can either:
- Use `animate={undefined}` explicitly
- Simply omit the prop

The task says "set both animate and transition to undefined", so I'll write them as `animate={undefined}` and `transition={undefined}`.

Let me write the diff now. I'll produce a unified diff.

Actually, let me think about whether the Play icon appears once or twice. Looking at the code:

```tsx
{isComplete ? (
  "Review"
) : course.lessonsCompleted > 0 ? (
  <>
    <Play className="h-4 w-4 mr-1" /> Continue
  </>
) : (
  <>
    <Play className="h-4 w-4 mr-1" /> Start
  </>
)}
```

So Play appears in two places (Continue and Start), but only one renders at a time per course row. I should add `aria-hidden="true"` to both instances.

OK, let me write the complete file diff. Given the complexity, I'll provide the full modified file or a comprehensive diff.

Let me write the diff in unified format. I need to be very careful with line numbers. Let me re-read the source and create the diff.

Actually, I think providing the full after-file might be clearest, but the diff approach is more precise. Let me do a unified diff.

Let me just carefully write out every change. I'll organize by section.

One more thing: the task says "Do NOT guard animate on entrance ones only initial and delay." So I should NOT add `animate={reduceMotion ? ... : ...}` to entrance animations — only change `initial` and `transition.delay`. This means the `animate` prop on entrance motion.divs stays as-is (e.g., `animate={{ opacity: 1, y: 0 }}`). Only the perpetual loop ones get `animate={undefined}`.

Let me produce the diff now.

Looking more carefully at the Play icons - there are two `<Play className="h-4 w-4 mr-1" />` in the ternary. Both should get `aria-hidden="true"`.

Also, I see that the Button has visible text ("Review", "Continue", "Start") so it doesn't need aria-label. The Play icons are decorative alongside text, so `aria-hidden="true"` is correct.

Let me count all heading promotions:
- `h3` "Your Progress" → `h
