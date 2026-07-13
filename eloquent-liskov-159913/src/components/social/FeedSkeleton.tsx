/**
 * FeedSkeleton — content placeholder shown while the feed query is loading.
 * Matches the vertical-scroll reel layout (with For You/Following tabs,
 * full TikTok-style right action column, hashtag chips, top comment ribbon,
 * and music ticker) so the page doesn't jump or flash on load.
 */
export default function FeedSkeleton() {
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <div className="relative w-full h-full">
        {/* Subtle moving shimmer over the whole frame */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5" />
        <div
          className="absolute inset-0 opacity-30 zivo-reel-skeleton-shimmer"
        />

        {/* Top center — For You / Following tabs */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 sm:gap-8"
          style={{ top: "var(--zivo-safe-top-overlay, 12px)" }}
        >
          <div className="h-4 w-16 rounded-full bg-white/15 animate-pulse" />
          <div className="h-4 w-20 rounded-full bg-white/10 animate-pulse" />
        </div>

        {/* Top right — Live / Discover / Search */}
        <div
          className="absolute right-3 sm:right-4 flex gap-2 sm:gap-2.5 lg:hidden"
          style={{ top: "var(--zivo-safe-top-overlay, 12px)" }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/10 animate-pulse" />
          ))}
        </div>

        {/* Right action rail — full TikTok stack: avatar + 6 buttons + sound disk */}
        <div
          className="absolute right-2 sm:right-3 lg:right-4 flex flex-col items-center gap-4 sm:gap-5 lg:gap-6"
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 100px)" }}
        >
          {/* Author avatar */}
          <div className="h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-full bg-white/15 animate-pulse" />
          {/* Mute */}
          <div className="h-11 w-11 lg:h-12 lg:w-12 rounded-full bg-white/15 animate-pulse" />
          {/* Like / Comment / Views / Share / Save / More — icon + count */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full bg-white/15 animate-pulse" />
              <div className="h-2.5 w-7 rounded bg-white/10 animate-pulse" />
            </div>
          ))}
          {/* Sound disk */}
          <div className="h-11 w-11 lg:h-12 lg:w-12 rounded-full bg-white/15 animate-pulse" />
        </div>

        {/* Bottom-left — author block + caption + hashtags + top comment + music */}
        <div
          className="absolute left-4 right-20 sm:right-24 space-y-2"
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 96px)" }}
        >
          {/* Author row */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/15 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-white/15 animate-pulse" />
              <div className="h-2.5 w-24 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="ml-auto h-7 w-16 rounded-md bg-white/15 animate-pulse" />
          </div>

          {/* Caption — 2 lines */}
          <div className="space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
          </div>

          {/* Hashtag chips */}
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-full bg-white/10 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="h-5 w-12 rounded-full bg-white/10 animate-pulse" />
          </div>

          {/* Top comment ribbon */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/15 animate-pulse" />
            <div className="h-2.5 w-2/3 rounded bg-white/10 animate-pulse" />
          </div>

          {/* Music ticker */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-white/15 animate-pulse" />
            <div className="h-2.5 w-32 rounded bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* Bottom progress bar placeholder */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" />
      </div>
    </div>
  );
}
