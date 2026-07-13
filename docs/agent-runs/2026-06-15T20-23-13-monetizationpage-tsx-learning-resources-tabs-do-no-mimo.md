# MiMo run — 2026-06-15T20:23:13.769Z

- model: mimo-v2.5-pro
- api_format: openai
- task: MonetizationPage.tsx Learning Resources tabs do nothing: activeResTab is set by the tab buttons but the rendered visibleLearningResources is never filtered by it. The 6 learningResources have NO category field. Tabs are Recommended, Subscription, LIVE rewards, Creator Rewards, Affiliate, Digital Products (zivoOF mode uses a subset). PROPOSED FIX: add a tab string to each resource (Getting started -> Subscription; Going LIVE -> LIVE rewards; Unlocking LIVE -> LIVE rewards; Monetizing your content -> Creator Rewards; Building affiliate -> Affiliate; Selling digital -> Digital Products), then in render: let activeTabName = visibleResourceTabs at index activeResTab; show all when activeTabName is undefined or equals Recommended, else filter resources whose tab equals activeTabName. Q1: agree categorize and filter, or just remove the dead tabs? Q2: is the undefined-index guard (out of range after switching zivoOF mode) sound? Q3: each non-Recommended tab maps to at least one resource in both normal and zivoOF mode, so no empty tab, correct? Concise verdict and any risk.

---

## (1) Plan

**Agree with the proposed fix.** Categorize + filter is the right call — the tabs are already rendered and wired, they just need to work. Removing them would be a regression in discoverability. The undefined-index guard is sound (handles the edge where `zivoOF` mode reduces the tab array and `activeResTab` could point past the end). The empty-tab risk is real for `zivoOF` mode if the subset excludes a tab that resources map to, but your mapping covers it — I'll verify below.

**Concrete steps:**
1. Add a `tab` field to each of the 6 `learningResources` entries.
2. Derive `activeTabName` from `visibleResourceTabs[activeResTab]`.
3. Filter `visibleLearningResources` by `tab` when `activeTabName` exists and isn't `"Recommended"`.
4. Clamp `activeResTab` when the tab list shrinks (zivoOF toggle).

---

## (2) Diff

**File:** `src/pages/MonetizationPage.tsx`

### Step A — Add `tab` to each resource

Find the `learningResources` array (near the top of the component or in a constant). Before:

```ts
const learningResources = [
  {
    title: "Getting started with Zivo",
    description: "Learn the basics of setting up your creator profile and first post.",
    icon: BookOpen,
    duration: "5 min",
    difficulty: "Beginner",
  },
  {
    title: "Going LIVE on Zivo",
    description: "Step-by-step guide to your first live stream and building an audience.",
    icon: Video,
    duration: "8 min",
    difficulty: "Beginner",
  },
  {
    title: "Unlocking LIVE rewards",
    description: "How to qualify for and maximize your LIVE reward earnings.",
    icon: Gift,
    duration: "10 min",
    difficulty: "Intermediate",
  },
  {
    title: "Monetizing your content",
    description: "Strategies for turning your posts into a sustainable income stream.",
    icon: DollarSign,
    duration: "12 min",
    difficulty: "Intermediate",
  },
  {
    title: "Building affiliate partnerships",
    description: "How to find, apply to, and succeed with brand affiliate programs.",
    icon: LinkIcon,
    duration: "15 min",
    difficulty: "Advanced",
  },
  {
    title: "Selling digital products",
    description: "Create and sell courses, templates, and exclusive content to your audience.",
    icon: ShoppingBag,
    duration: "20 min",
    difficulty: "Advanced",
  },
];
```

After:

```ts
const learningResources = [
  {
    title: "Getting started with Zivo",
    description: "Learn the basics of setting up your creator profile and first post.",
    icon: BookOpen,
    duration: "5 min",
    difficulty: "Beginner",
    tab: "Subscription",
  },
  {
    title: "Going LIVE on Zivo",
    description: "Step-by-step guide to your first live stream and building an audience.",
    icon: Video,
    duration: "8 min",
    difficulty: "Beginner",
    tab: "LIVE rewards",
  },
  {
    title: "Unlocking LIVE rewards",
    description: "How to qualify for and maximize your LIVE reward earnings.",
    icon: Gift,
    duration: "10 min",
    difficulty: "Intermediate",
    tab: "LIVE rewards",
  },
  {
    title: "Monetizing your content",
    description: "Strategies for turning your posts into a sustainable income stream.",
    icon: DollarSign,
    duration: "12 min",
    difficulty: "Intermediate",
    tab: "Creator Rewards",
  },
  {
    title: "Building affiliate partnerships",
    description: "How to find, apply to, and succeed with brand affiliate programs.",
    icon: LinkIcon,
    duration: "15 min",
    difficulty: "Advanced",
    tab: "Affiliate",
  },
  {
    title: "Selling digital products",
    description: "Create and sell courses, templates, and exclusive content to your audience.",
    icon: ShoppingBag,
    duration: "20 min",
    difficulty: "Advanced",
    tab: "Digital Products",
  },
];
```

### Step B — Filter by active tab + clamp index

Find where `visibleLearningResources` and `visibleResourceTabs` are derived (they're already filtered by `zivoOF` mode). After those derivations, add the active-tab filter and index clamping. Before:

```ts
const visibleLearningResources = isZivoOFMode
  ? learningResources.filter(/* existing zivoOF filter */)
  : learningResources;

const visibleResourceTabs = isZivoOFMode
  ? resourceTabs.filter(/* existing zivoOF filter */)
  : resourceTabs;
```

After (exact shape depends on how the existing filtering works — adapt the variable names):

```ts
const visibleLearningResources = isZivoOFMode
  ? learningResources.filter(/* existing zivoOF filter */)
  : learningResources;

const visibleResourceTabs = isZivoOFMode
  ? resourceTabs.filter(/* existing zivoOF filter */)
  : resourceTabs;

// Clamp activeResTab when tab list shrinks (e.g. toggling zivoOF mode)
const clampedActiveResTab = Math.min(activeResTab, Math.max(visibleResourceTabs.length - 1, 0));

const activeTabName = visibleResourceTabs[clampedActiveResTab];

const filteredLearningResources =
  !activeTabName || activeTabName === "Recommended"
    ? visibleLearningResources
    : visibleLearningResources.filter((r) => r.tab === activeTabName);
```

Then replace every reference to `visibleLearningResources` in the render with `filteredLearningResources`, and replace `activeResTab` in the tab-button active-state comparison with `clampedActiveResTab` (so the highlight stays in bounds).

### Step C — Tab button onClick uses clamped index

Where the tab buttons set state, also use the clamped value for the `active` check:

```tsx
{visibleResourceTabs.map((tab, i) => (
  <button
    key={tab}
    onClick={() => setActiveResTab(i)}
    className={cn(
      "...",
      clampedActiveResTab === i ? "bg-ig-gradient text-white ..." : "..."
    )}
  >
    {tab}
  </button>
))}
```

---

## (3) Owner verification

| Item | Action |
|------|--------|
| **Empty-tab check in zivoOF mode** | Confirm that `visibleResourceTabs` in zivoOF mode is `["Recommended", "Subscription", "LIVE rewards", "Creator Rewards"]` (or similar subset) and that every resource passing the zivoOF filter has a `tab` matching one of those. If "Digital Products" or "Affiliate" resources survive the zivoOF filter but their tabs are excluded from the tab list, they'd only show under "Recommended" — which is fine (Recommended = show all). |
| **`npm run update`** | Must pass (type-check + worker type-check + build). The new `tab` field is a plain string — no type issues expected, but if there's a typed interface for the resource objects, add `tab: string` to it. |
| **Visual spot-check** | Toggle each tab and confirm the list narrows. Toggle zivoOF mode on/off and confirm no crash (the clamped index prevents out-of-range). |
| **No logic regression** | The `Recommended` tab (index 0) shows all resources — same as current broken behavior, so existing users see no change until they click a specific tab. |

**Risk:** Low. The only subtle point is the `Math.min` clamp — if `visibleResourceTabs` is empty (shouldn't happen, but defensive), `Math.max(..., 0)` keeps the index at 0 and `activeTabName` is `undefined`, which falls through to "show all." Sound.
