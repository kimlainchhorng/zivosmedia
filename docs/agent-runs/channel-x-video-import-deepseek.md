# DeepSeek run — 2026-06-15T21:57:41.077Z

- model: deepseek-chat
- task: Review the current Channel X video import implementation. User says we have not proven it works because remote Supabase function is not deployed. Propose a focused update so Codex can prove end-to-end composer behavior without posting a share link, while keeping X bearer token server-side and using native video media. Review files: src/components/channels/ChannelPostComposer.tsx, src/components/channels/ChannelPostCard.tsx, supabase/functions/channel-resolve-x-video/index.ts
- files: src/components/channels/ChannelPostComposer.tsx, src/components/channels/ChannelPostCard.tsx, supabase/functions/channel-resolve-x-video/index.ts

---

# Plan: Make X Video Import Testable Without Deploying the Edge Function

## Problem
The `channel-resolve-x-video` edge function is not deployed to Supabase, so the composer's X video import flow always fails with "X video import backend is not deployed yet." We can't prove the composer works end-to-end.

## Solution
Add a **local-only bypass** that lets the composer simulate a successful X video import response when the edge function is unavailable. This keeps the X bearer token server-side (never exposed to the client) while allowing Codex to verify:
1. The URL detection regex works
2. The URL stripping from body text works
3. The media payload construction works
4. The `channel-broadcast` call works with imported X media

## Changes

### 1. `src/components/channels/ChannelPostComposer.tsx`
Add a `VITE_X_VIDEO_MOCK` env var check. When set to `"1"` and the edge function returns a 404/501 error, inject a mock video response instead of showing an error toast.

**Before** (around line 230-250):
```typescript
const { data: resolved, error: resolveError } = await supabase.functions.invoke("channel-resolve-x-video", {
  body: { url },
});
if (resolveError || (resolved as any)?.error) {
  const rawMessage = ...;
  const message = /failed to send a request to the edge function/i.test(rawMessage)
    ? "X video import backend is not deployed yet..."
    : rawMessage;
  toast.error(message);
  setSubmitting(false);
  return;
}
```

**After:**
```typescript
const { data: resolved, error: resolveError } = await supabase.functions.invoke("channel-resolve-x-video", {
  body: { url },
});

// Local dev mock: when the edge function isn't deployed, simulate a successful
// response so we can test the composer flow end-to-end without deploying.
// Set VITE_X_VIDEO_MOCK=1 in .env.local to enable.
const isMockMode = import.meta.env.VITE_X_VIDEO_MOCK === "1";
const isFunctionUnavailable = resolveError && (
  /failed to send a request to the edge function/i.test(
    await getFunctionErrorMessage(resolveError, "")
  ) ||
  (resolved as any)?.error === "x_not_configured"
);

if (isFunctionUnavailable && isMockMode) {
  // Inject a mock video response so the composer flow can be verified
  // without deploying the edge function or configuring X_BEARER_TOKEN.
  const mockVideos = [{
    url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
    type: "video",
    name: `x-${url.match(/\d{5,30}/)?.[0] || "mock"}.mp4`,
    mime_type: "video/mp4",
    duration_ms: 10000,
    width: 1280,
    height: 720,
    preview_image_url: "https://picsum.photos/seed/xmock/640/360",
    source: "x",
    source_url: url,
    source_id: url.match(/\d{5,30}/)?.[0] || "mock",
  }];
  for (const video of mockVideos) {
    importedXMedia.push(video);
  }
  if (mockVideos.length > 0) importedXUrls.push(url);
  continue; // Skip the error handling below
}

if (resolveError || (resolved as any)?.error) {
  // ... existing error handling ...
}
```

### 2. `.env.local` (add to existing file)
```
VITE_X_VIDEO_MOCK=1
```

## What the owner must do
1. **Nothing to deploy** — this is a local-only dev tool
2. Add `VITE_X_VIDEO_MOCK=1` to your `.env.local`
3. Run `npm run dev` and test pasting an X URL in the channel composer
4. The composer should:
   - Detect the X URL
   - Show "Importing X video..." toast
   - Successfully add a mock video to the post
   - Strip the X URL from the body text
   - Post successfully with the mock video attached

## Verification
After applying, Codex can:
1. Open a channel at `/c/some-channel`
2. Paste `https://x.com/username/status/123456789` in the composer
3. Verify the mock video appears in the media grid
4. Submit the post
5. Verify the post appears in the channel feed with the video

The mock uses a real public MP4 URL (Big Buck Bunny) so the video player will actually work in the card.
