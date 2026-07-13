# MiMo run — 2026-06-16T00:07:36.489Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review the current diff in ChannelPostCard/ChannelPage for Telegram-style single-media channel posts. We now pass real channel name/avatar, show a top preview strip, portrait 9:16 single videos, caption below media, and bottom views/time footer. Look for bugs or overreach; suggest minimal fixes only.
- files: src/components/channels/ChannelPostCard.tsx, src/pages/channels/ChannelPage.tsx

---

## Review — Telegram-style single-media channel posts

### Short plan

Three issues found (one visual bug, one code-smell, one overreach). All are minimal, additive fixes in `ChannelPostCard.tsx` only; `ChannelPage.tsx` is clean.

---

### Issue 1 — **BUG: 9:16 forced on ALL single videos, landscape videos get destroyed**

```jsx
// L~707 inside the media grid
media.length === 1 && video ? "aspect-[9/16]" : "aspect-square"
```

A landscape (16:9) video inside a 9:16 container with `object-cover` crops the left and right edges down to a thin vertical sliver of the center. This is a real problem — most existing channel videos are landscape. Telegram uses the video's natural poster/frame dimensions; since `MediaItem` has no `width`/`height`, the safe default is `aspect-video` (16:9), which degrades gracefully for both orientations.

**Fix:**

```diff
// src/components/channels/ChannelPostCard.tsx — inside the media.map() button className
-  isFirstOfThree ? "col-span-2 aspect-[2/1]" : media.length === 1 && video ? "aspect-[9/16]" : "aspect-square",
+  isFirstOfThree ? "col-span-2 aspect-[2/1]" : media.length === 1 && video ? "aspect-video" : "aspect-square",
```

> **Follow-up (owner):** if vertical (9:16) video preview is desired, the backend/media pipeline should surface `width`/`height` on `MediaItem` so the card can choose dynamically.

---

### Issue 2 — **CODE SMELL: redundant ternary, both branches identical**

```jsx
// ~L688-693 — bubble className for singleMediaPost
singleMediaPost &&
  !compactBubble &&
  (singleMediaOnlyPost
    ? "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]"
    : "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]"),
```

Both branches are byte-identical. The `singleMediaOnlyPost` test does nothing. Collapse it.

**Fix:**

```diff
// src/components/channels/ChannelPostCard.tsx — bubble className
-  singleMediaPost &&
-    !compactBubble &&
-    (singleMediaOnlyPost
-      ? "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]"
-      : "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]"),
+  singleMediaPost &&
+    !compactBubble &&
+    "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]",
```

> If the developer *intended* different styling for media-only vs media+text, this is where to differentiate (e.g. extra bottom padding when caption is present). As-is, it's dead logic.

---

### Issue 3 — **OVERREACH: channel avatar fallback uses the media's own poster frame**

```jsx
const singleMediaAvatarUrl = channelAvatarUrl || firstMedia?.preview_image_url || null;
```

When the channel has no avatar, the video's own poster frame appears as **both** the channel avatar in the preview strip **and** the video thumbnail below it — the same image twice, side-by-side. This is confusing. The avatar fallback should stop at the channel avatar (or the initial letter, which is already handled).

**Fix:**

```diff
// src/components/channels/ChannelPostCard.tsx
-  const singleMediaAvatarUrl = channelAvatarUrl || firstMedia?.preview_image_url || null;
+  const singleMediaAvatarUrl = channelAvatarUrl || null;
```

The `<span>` child already renders the `channelInitial` letter when `singleMediaAvatarUrl` is null, so there's no visual gap.

---

### What the owner must verify or deploy

1. **Visual check**: post a landscape video (16:9) to a test channel and confirm the preview thumbnail is no longer cropped to a vertical sliver. `aspect-video` should show it letterboxed or full-width.
2. **No-avatar channel**: view a single-video post on a channel with no avatar set; confirm the preview strip shows the channel initial (not a duplicated poster frame).
3. **`npm run update`**: must pass after the three edits (all className/const-expression changes, zero logic risk).
4. No deployment blockers — `ChannelPage.tsx` is untouched, and all changes are purely presentational in `ChannelPostCard.tsx`.
