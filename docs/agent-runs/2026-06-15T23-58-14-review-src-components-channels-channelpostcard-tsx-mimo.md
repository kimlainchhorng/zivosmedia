# MiMo run — 2026-06-15T23:58:14.478Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review src/components/channels/ChannelPostCard.tsx for the next focused Telegram-style channel post fix. User says the media post still looks the same after only shrinking the timestamp pill. Suggest a minimal scoped diff to make single media/video channel bubbles smaller and more Telegram-like without changing data or lightbox logic. Focus on outer bubble max-width, no body media spacing, and single video aspect ratio.
- files: src/components/channels/ChannelPostCard.tsx

---

## Plan

Three targeted changes to make single-media/video channel bubbles tighter and more Telegram-like, all scoped purely to presentation:

1. **Narrower bubble max-width for media-only posts** — The non-compact bubble is `max-w-[min(30rem,calc(100%-4.75rem))]` (≈480px), far too wide for a Telegram-style media bubble. Add a `mediaOnlyPost` check and use a tighter `max-w-[22rem]` (~352px, closer to Telegram's ≈320px media post).

2. **Zero top margin on media grid for media-only posts** — The media grid is always `mt-3` now. For posts with no text body and only media, this pushes the image down unnecessarily. Use `mt-0` when there's no body text to flush the media to the bubble edge.

3. **Single video gets 16:9 aspect ratio** — All single media items are forced `aspect-square`. Telegram renders video thumbnails at landscape ratios. Single videos should be `aspect-video` (16:9); single images stay `aspect-square`.

---

## Proposed Diff

**File:** `src/components/channels/ChannelPostCard.tsx`

### Change 1 — Add `mediaOnlyPost` variable (~line 645, after `stickerOnlyPost`)

```diff
   const stickerOnlyPost =
     stickerItems.length > 0 &&
     !hasBody &&
     !linkPreview &&
     !pollAttachment &&
     voiceItems.length === 0 &&
     musicItems.length === 0 &&
     fileItems.length === 0 &&
     media.length === 0;
+  const mediaOnlyPost =
+    media.length > 0 &&
+    !hasBody &&
+    !linkPreview &&
+    !pollAttachment &&
+    voiceItems.length === 0 &&
+    musicItems.length === 0 &&
+    fileItems.length === 0 &&
+    stickerItems.length === 0;
   const showBottomFooter = !compactBubble && (!hasVisualContent || visibleReactions.length > 0);
```

### Change 2 — Tighter bubble max-width for media-only posts (~line 668, the outer `className`)

```diff
               compactBubble ? "max-w-[min(26rem,78%)] px-2.5 py-1.5" : "max-w-[min(30rem,calc(100%-4.75rem))] px-3 py-2 pb-1.5",
             ],
+          mediaOnlyPost && !compactBubble && "max-w-[22rem] p-1",
```

This sits right after the existing ternary inside the `cn()` array, before the `highlight` line. It narrows media-only bubbles to ~352px and reduces padding to 4px (the subtlest shell around the image).

### Change 3 — Media grid: zero top margin for media-only posts, single video gets 16:9 (~lines 818–824)

**Before:**
```tsx
        {media.length > 0 && (
          <div className={`mt-3 grid gap-1.5 ${gridClass}`}>
            {media.slice(0, 6).map((m, i) => {
              const isFirstOfThree = media.length === 3 && i === 0;
              const isOverflow = media.length > 6 && i === 5;
              const video = isVideo(m);
              return (
                <button type="button"
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`relative overflow-hidden rounded-xl bg-muted ${
                    isFirstOfThree ? "col-span-2 aspect-[2/1]" : "aspect-square"
                  }`}
```

**After:**
```tsx
        {media.length > 0 && (
          <div className={`${mediaOnlyPost ? "mt-0" : "mt-3"} grid gap-1.5 ${gridClass}`}>
            {media.slice(0, 6).map((m, i) => {
              const isFirstOfThree = media.length === 3 && i === 0;
              const isOverflow = media.length > 6 && i === 5;
              const video = isVideo(m);
              return (
                <button type="button"
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`relative overflow-hidden rounded-xl bg-muted ${
                    isFirstOfThree ? "col-span-2 aspect-[2/1]" : media.length === 1 && video ? "aspect-video" : "aspect-square"
                  }`}
```

The `aspect-video` class maps to `aspect-ratio: 16 / 9` in Tailwind, giving video thumbnails a natural landscape frame inside the tighter 352px bubble (≈198px tall).

---

## What the owner must verify / deploy

1. **Preview at narrow + wide widths** — Post a single-image, single-video, and two-media post in a test channel. Confirm:
   - Single media posts render at ~352px max (visibly narrower than multi-media posts).
   - Single videos are 16:9 landscape, not square-cropped.
   - Multi-media posts (2+, 3, 4+) are **unchanged** (still 30rem max, still square tiles).
   - Text+media posts are **unchanged** (still 30rem max, still `mt-3` gap).
   - Sticker-only / poll / voice-only posts are **unchanged**.

2. **Stats overlay** — The `PostMediaStatsOverlay` still sits flush in the bottom-right corner of the last media tile. No positional change needed since the tile dimensions change but the overlay is `absolute`-positioned.

3. **Lightbox** — No lightbox changes; it renders full-screen independently of the bubble size.

4. **Run `npm run update`** — type-check + worker type-check + production build must pass (0 errors).
