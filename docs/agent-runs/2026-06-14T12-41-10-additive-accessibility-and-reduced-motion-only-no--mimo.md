# MiMo run — 2026-06-14T12:41:10.051Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility and reduced motion only, no visual or behavioral change. This is an English only React TSX page using framer motion with a detail modal wrapped in AnimatePresence. One, extend the framer motion import to add useReducedMotion and create const reduceMotion equals useReducedMotion inside the component. Two, for every entrance animation that uses initial, wrap the whole initial object in a ternary so initial becomes reduceMotion question mark false colon the original object, leaving animate and transition and exit unchanged. This includes the two modal motion.div elements (the backdrop overlay and the bottom sheet). Three, for every infinite repeat Infinity loop animation, guard BOTH animate and transition so each becomes reduceMotion question mark undefined colon the original. Four, the icon only back button needs aria-label Back on the motion.button and aria-hidden true on the ArrowLeft icon. The icon only modal close button needs aria-label Close and aria-hidden true on the X icon. Five, add aria-hidden true to decorative lucide icons. Six, promote the Payslip History h3 heading to h2 keeping classNames to fix an h1 to h3 skip. Report the exact edits.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/financial/WeeklyPayslips.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
The user wants me to create a precise set of edits for `src/pages/financial/WeeklyPayslips.tsx` in the zivodriver project. Let me carefully analyze the file and produce the exact edits needed.

Let me go through each requirement:

1. **Import `useReducedMotion`** — extend the framer-motion import to add `useReducedMotion`, create `const reduceMotion = useReducedMotion()` inside the component.

2. **Guard entrance animations** — for every motion element with `initial` as an object, wrap the initial object: `initial={reduceMotion ? false : { opacity: 0, y: -20 }}`. Leave `animate`, `transition`, `exit` unchanged.

   Entrance animations with `initial` as an object:
   - `<motion.header>` — `initial={{ opacity: 0, y: -20 }}`
   - Hero Earnings Card `<motion.div>` — `initial={{ opacity: 0, y: 20 }}`
   - Quick Stats `<motion.div>` — `initial={{ opacity: 0, y: 20 }}`
   - Payslip History `<motion.div>` — `initial={{ opacity: 0, y: 20 }}`
   - Each payslip row `<motion.button>` — `initial={{ opacity: 0, x: -20 }}`
   - Modal backdrop `<motion.div>` — `initial={{ opacity: 0 }}`
   - Modal bottom sheet `<motion.div>` — `initial={{ opacity: 0, y: 100, scale: 0.95 }}`
   - Net Pay change badge `<motion.div>` — `initial={{ scale: 0 }}`
   - Net Pay amount `<motion.p>` — `initial={{ scale: 0.5, opacity: 0 }}`

   Wait, the task says "for every entrance animation that uses initial" — let me re-read. It says "for every entrance animation that uses initial, wrap the whole initial object in a ternary so initial becomes reduceMotion ? false : the original object". 

   And specifically mentions "the two modal motion.div elements (the backdrop overlay and the bottom sheet)" are included. So ALL elements with `initial` should get this treatment.

3. **Guard infinite repeat animations** — for every infinite repeat animation, guard BOTH `animate` and `transition` so each becomes `reduceMotion ? undefined : the original`.

   Infinite repeat animations:
   - Sparkles icon wrapper: `animate={{ rotate: [0, 15, -15, 0] }}` + `transition={{ repeat: Infinity, ... }}`
   - Header icon wrapper: `animate={{ rotate: [0, 3, -3, 0] }}` + `transition={{ repeat: Infinity, ... }}`
   - Header icon shimmer: `animate={{ x: [-100, 100] }}` + `transition={{ repeat: Infinity, ... }}`
   - Loader spinner: `animate={{ rotate: 360 }}` + `transition={{ repeat: Infinity, ... }}`
   - Hero mesh gradient 1: `animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0] }}` + `transition={{ repeat: Infinity, ... }}`
   - Hero mesh gradient 2: `animate={{ scale: [1.2, 1, 1.2], rotate: [0, -60, 0] }}` + `transition={{ repeat: Infinity, ... }}`
   - Hero shimmer overlay: `animate={{ x: [-200, 400] }}` + `transition={{ repeat: Infinity, ... }}`
   - Payslip History shimmer: `animate={{ x: [-200, 400] }}` + `transition={{ repeat: Infinity, ... }}`
   - Modal shimmer overlay: `animate={{ x: [-200, 400] }}` + `transition={{ repeat: Infinity, ... }}`

4. **Back button a11y** — `aria-label="Back"` on the `motion.button`, `aria-hidden="true"` on the `<ArrowLeft>` icon.

5. **Modal close button a11y** — `aria-label="Close"` on the close `motion.button`, `aria-hidden="true"` on the `<X>` icon.

6. **Decorative lucide icons** — add `aria-hidden="true"` to decorative lucide icons.

7. **Heading promotion** — change `h3` to `h2` for the "Payslip History" heading.

Let me identify which lucide icons are decorative (not inside a button as the primary content that would need it, but just standalone decorative):

Looking at the icons:
- `<Sparkles className="w-4 h-4 text-primary" />` — decorative, inside a motion.div animation wrapper
- `<FileText className="w-5 h-5 text-primary relative z-10" />` — decorative (header icon)
- `<Loader2 className="w-8 h-8 text-primary" />` — decorative (loading spinner)
- `<FileText className="w-10 h-10 text-primary" />` — decorative (empty state)
- `<Wallet className="w-4 h-4 text-primary" />` — decorative (label icon)
- `<TrendingUp className="w-3 h-3" />` — decorative (inside a badge, not a button)
- `<TrendingDown className="w-3 h-3" />` — decorative (inside a badge, not a button)
- `<FileText className="w-3 h-3" />` — decorative (inline with text)
- `<Clock className="w-3 h-3" />` — decorative (inline with text)
- Stat icons `<stat.icon className="w-5 h-5 text-white" />` — these are DollarSign, TrendingUp, TrendingDown — decorative
- `<Calendar className="w-4 h-4" />` — decorative (heading icon)
- `<FileText className="w-6 h-6 text-white" />` — decorative (payslip row icon)
- `<ChevronRight className="w-5 h-5 text-muted-foreground" />` — decorative (payslip row arrow)
- `<Receipt className="w-5 h-5 text-white" />` — decorative (modal header icon)
- `<DollarSign className="w-4 h-4 text-success" />` — decorative (inline with text)
- `<TrendingUp className="w-4 h-4 text-success" />` — decorative (inline with text)
- `<TrendingDown className="w-4 h-4 text-destructive" />` — decorative (inline with text)
- `<Wallet className="w-4 h-4 text-primary" />` — decorative (modal net pay icon)
- `<Download className="w-4 h-4 mr-2" />` — this is inside a `<Button>`, decorative

Wait, I need to be careful. Icons inside interactive elements (buttons) that already have text labels are decorative. Icons that are the sole content of a button need `aria-label` on the button (already handled for back and close). Let me be more precise about which are truly standalone decorative.

Actually, for the back button and close button, I'm adding `aria-label` to the button and `aria-hidden` to the icon inside. For all other icons that are purely decorative (have adjacent text or are in visual embellishment), they should get `aria-hidden="true"`.

Let me also think about the `<stat.icon>` — since these are rendered dynamically, I can't directly add `aria-hidden` to a component reference. The syntax would be `<stat.icon className="w-5 h-5 text-white" aria-hidden="true" />` — lucide icons should accept this since they spread SVG props.

Now let me be really precise about the edits. This is a big file so I'll produce a clean diff.

Let me count the entrance animations that need `initial` guarding:

1. `motion.header` L51: `initial={{ opacity: 0, y: -20 }}`
2. Hero Earnings Card `motion.div` L78: `initial={{ opacity: 0, y: 20 }}`
3. Net Pay change badge `motion.div` L97: `initial={{ scale: 0 }}`
4. Net Pay amount `motion.p` L111: `initial={{ scale: 0.5, opacity: 0 }}`
5. Quick Stats item `motion.div` L127: `initial={{ opacity: 0, y: 20 }}`
6. Payslip History `motion.div` L155: `initial={{ opacity: 0, y: 20 }}`
7. Each payslip row `motion.button` L167: `initial={{ opacity: 0, x: -20 }}`
8. Modal backdrop `motion.div` L197: `initial={{ opacity: 0 }}`
9. Modal bottom sheet `motion.div` L203: `initial={{ opacity: 0, y: 100, scale: 0.95 }}`

Now the infinite repeat animations:

1. Sparkles wrapper `motion.div` L57: animate + transition
2. Header icon wrapper `motion.div` L67: animate + transition  
3. Header icon shimmer `motion.div` L71: animate + transition
4. Loader spinner `motion.div` L87: animate + transition
5. Hero mesh gradient 1 `motion.div` L84: animate + transition
6. Hero mesh gradient 2 `motion.div` L91: animate + transition
7. Hero shimmer overlay `motion.div` L99: animate + transition
8. Payslip History shimmer `motion.div` L161: animate + transition
9. Modal shimmer `motion.div` L209: animate + transition

OK, let me now produce the exact diff. Given the file is substantial, I'll structure this as a clear before/after for each section.

Actually, let me re-examine the line numbers. The file is provided as a raw text, so I'll work from the content.

Let me just carefully go through and produce the diff. Since this is a large number of edits, I'll present them clearly.

Let me count and organize:

**Import change:**
```
- import { motion, AnimatePresence } from "framer-motion";
+ import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

**Add hook:**
After `const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);`
```
  const reduceMotion = useReducedMotion();
```

Now for each entrance animation, I'll show the change.

For infinite animations, each one needs both `animate` and `transition` guarded.

Let me now write out the complete diff. Given the size, I'll use a unified diff format.

Actually, let me be really precise. I'll go section by section.

Let me re-read the source more carefully to get exact line content.

OK here's my plan for the diff. I'll present it as a series of precise before→after blocks since there are many edits and a unified diff might be hard to read. Let me produce the most precise representation.

Actually, the user asked for "the exact edits" so let me just list them clearly. I'll do before/after for each change.

Let me organize by category:

### 1. Import + Hook

**Import line:**
Before: `import { motion, AnimatePresence } from "framer-motion";`
After: `import { motion, AnimatePresence, useReducedMotion } from "framer-motion";`

**Hook declaration (after useState):**
Before:
```
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
```
After:
```
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const reduceMotion = useReducedMotion();
```

### 2. Entrance animation guards (initial)

**motion.header:**
Before: `initial={{ opacity: 0, y: -20 }}`
After: `initial={reduceMotion ? false : { opacity: 0, y: -20 }}`

**Hero Earnings Card motion.div:**
Before: `initial={{ opacity: 0, y: 20 }}`
After: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

**Net Pay change badge motion.div:**
Before: `initial={{ scale: 0 }}`
After: `initial={reduceMotion ? false : { scale: 0 }}`

**Net Pay amount motion.p:**
Before: `initial={{ scale: 0.5, opacity: 0 }}`
After: `initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}`

**Quick Stats motion.div:**
Before: `initial={{ opacity: 0, y: 20 }}`
After: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

**Payslip History motion.div:**
Before: `initial={{ opacity: 0, y: 20 }}`
After: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

**Each payslip row motion.button:**
Before: `initial={{ opacity: 0, x: -20 }}`
After: `initial={reduceMotion ? false : { opacity: 0, x: -20 }}`

**Modal backdrop motion.div:**
Before: `initial={{ opacity: 0 }}`
After: `initial={reduceMotion ? false : { opacity: 0 }}`

**Modal bottom sheet motion.div:**
Before: `initial={{ opacity: 0, y: 100, scale: 0.95 }}`
After: `initial={reduceMotion ? false : { opacity: 0, y: 100, scale: 0.95 }}`

### 3. Infinite repeat guards (animate + transition)

For each infinite animation:

**Sparkles wrapper:**
Before:
```
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
```
After:
```
                animate={reduceMotion ? undefined : { rotate: [0, 15, -15, 0] }}
                transition={reduceMotion ? undefined : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
```

**Header icon wrapper:**
Before:
```
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
```
After:
```
            animate={reduceMotion ? undefined : { rotate: [0, 3, -3, 0] }}
            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
```

**Header icon shimmer:**
Before:
```
              animate={{ x: [-100, 100] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
```
After:
```
              animate={reduceMotion ? undefined : { x: [-100, 100] }}
              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
```

**Loader spinner:**
Before:
```
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
```
After:
```
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1, ease: "linear" }}
```

**Hero mesh gradient 1:**
Before:
```
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, 90, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
```
After:
```
                  animate={reduceMotion ? undefined : { 
                    scale: [1, 1.3, 1],
                    rotate: [0, 90, 0],
                  }}
                  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 8, ease: "easeInOut" }}
```

**Hero mesh gradient 2:**
Before:
```
                  animate={{ 
                    scale: [1.2, 1, 1.2],
                    rotate: [0, -60, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
```
After:
```
                  animate={reduceMotion ? undefined : { 
                    scale: [1.2, 1, 1.2],
                    rotate: [0, -60, 0],
                  }}
                  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 6, ease: "easeInOut" }}
```

**Hero shimmer overlay:**
Before:
```
                animate={{ x: [-200, 400] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
```
After:
```
                animate={reduceMotion ? undefined : { x: [-200, 400] }}
                transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
```

**Payslip History shimmer:**
Before:
```
                animate={{ x: [-200, 400] }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
```
After:
```
                animate={reduceMotion ? undefined : { x: [-200, 400] }}
                transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
```

**Modal shimmer:**
Before:
```
                  animate={{ x: [-200, 400] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
```
After:
```
