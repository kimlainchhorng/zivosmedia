/**
 * FeedSkeleton — content placeholder shown while the feed query is loading.
 * Matches the vertical-scroll reel layout (with For You/Following tabs,
 * full TikTok-style right action column, hashtag chips, top comment ribbon,
 * and music ticker) so the page doesn't jump or flash on load.
 */
import { Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";

export default function FeedSkeleton() {
  const actionItems = Array.from({ length: 6 });
  const hashtagWidths = ["w-16", "w-20", "w-12"];
  const storyItems = Array.from({ length: 5 });
  const warmupItems = [
    { label: "Stories", value: "Syncing", Icon: Radio },
    { label: "Posts", value: "Ranking", Icon: Sparkles },
    { label: "Safety", value: "Checked", Icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" role="status" aria-live="polite" aria-label="Loading your Zivo feed">
      <div className="relative h-full w-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_72%,rgba(217,70,239,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_48%,rgba(255,255,255,0.05))]" />
        <div className="absolute inset-0 opacity-30 zivo-reel-skeleton-shimmer" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <div className="zivo-feed-glass absolute left-4 top-[calc(var(--zivo-safe-top-overlay,12px)+58px)] z-10 flex max-w-[min(26rem,calc(100vw-2rem))] items-center gap-2 rounded-full px-3 py-2 text-white">
          <div className="zivo-feed-primary-orb relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full animate-pulse">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-white/86">Loading feed</p>
            <p className="truncate text-[10px] font-bold text-white/55">Preparing stories, posts, and live signals</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-cyan-300/16 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
            Live
          </span>
        </div>

        <div
          className="absolute left-1/2 flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-2 shadow-2xl backdrop-blur-xl sm:gap-3"
          style={{ top: "var(--zivo-safe-top-overlay, 12px)" }}
        >
          <div className="h-7 w-20 rounded-full bg-white/22 animate-pulse" />
          <div className="h-7 w-24 rounded-full bg-white/10 animate-pulse" />
        </div>

        <div
          className="absolute right-3 flex gap-2 sm:right-4 sm:gap-2.5 lg:hidden"
          style={{ top: "var(--zivo-safe-top-overlay, 12px)" }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-10 rounded-full border border-white/10 bg-white/12 shadow-lg backdrop-blur-md animate-pulse sm:h-11 sm:w-11" />
          ))}
        </div>

        <div
          className="absolute left-3 right-3 hidden gap-3 overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/10 px-3 py-3 shadow-2xl backdrop-blur-xl md:flex lg:hidden"
          style={{ top: "calc(var(--zivo-safe-top-overlay, 12px) + 62px)" }}
        >
          {storyItems.map((_, i) => (
            <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <div className="h-14 w-14 rounded-full border border-white/15 bg-[conic-gradient(from_140deg,rgba(34,211,238,0.35),rgba(217,70,239,0.28),rgba(255,255,255,0.14),rgba(34,211,238,0.35))] p-[2px] animate-pulse">
                <div className="h-full w-full rounded-full bg-white/12" />
              </div>
              <div className={i % 2 === 0 ? "h-2 w-12 rounded-full bg-white/12 animate-pulse" : "h-2 w-10 rounded-full bg-white/12 animate-pulse"} />
            </div>
          ))}
        </div>

        <div
          className="zivo-feed-glass absolute left-4 hidden w-[236px] rounded-[1.45rem] p-3 text-white lg:block"
          style={{ top: "calc(var(--zivo-safe-top-overlay, 12px) + 92px)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Warmup</p>
              <p className="text-sm font-black text-white">Building your feed</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/70">
              3D
            </span>
          </div>
          <div className="space-y-2">
            {warmupItems.map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-2.5 py-2">
                <span className="zivo-feed-action-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-3.5 w-3.5 text-cyan-100" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black text-white">{label}</p>
                  <p className="truncate text-[10px] font-semibold text-white/54">{value}</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.65)]" />
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute right-2 flex flex-col items-center gap-4 sm:right-3 sm:gap-5 lg:right-4 lg:gap-6"
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 100px)" }}
        >
          <div className="h-12 w-12 rounded-full border-2 border-white/30 bg-white/15 shadow-[0_0_24px_rgba(34,211,238,0.18)] animate-pulse sm:h-[3.25rem] sm:w-[3.25rem] lg:h-14 lg:w-14" />
          <div className="h-11 w-11 rounded-full border border-white/10 bg-white/12 shadow-lg backdrop-blur-md animate-pulse lg:h-12 lg:w-12" />
          {actionItems.map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 rounded-full border border-white/10 bg-white/14 shadow-lg backdrop-blur-md animate-pulse lg:h-11 lg:w-11" />
              <div className={i % 2 === 0 ? "h-2.5 w-7 rounded-full bg-white/10 animate-pulse" : "h-2.5 w-9 rounded-full bg-white/10 animate-pulse"} />
            </div>
          ))}
          <div className="h-11 w-11 rounded-full border border-white/15 bg-[conic-gradient(from_90deg,rgba(255,255,255,0.18),rgba(34,211,238,0.28),rgba(217,70,239,0.24),rgba(255,255,255,0.18))] shadow-[0_0_24px_rgba(217,70,239,0.18)] animate-pulse lg:h-12 lg:w-12" />
        </div>

        <div
          className="absolute left-4 right-20 space-y-2 sm:right-24"
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 96px)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full border border-white/20 bg-white/15 shadow-lg animate-pulse sm:h-11 sm:w-11" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded-full bg-white/16 animate-pulse" />
              <div className="h-2.5 w-24 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="ml-auto hidden h-7 w-16 rounded-full border border-white/10 bg-white/15 animate-pulse sm:block" />
          </div>

          <div className="space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
          </div>

          <div className="flex gap-1.5">
            {hashtagWidths.map((width) => (
              <div key={width} className={`${width} h-5 rounded-full border border-white/10 bg-white/10 animate-pulse`} />
            ))}
          </div>

          <div className="flex max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-2 backdrop-blur-md">
            <div className="h-6 w-6 rounded-full bg-white/15 animate-pulse shrink-0" />
            <div className="h-2.5 w-2/3 rounded bg-white/10 animate-pulse" />
          </div>

          <div className="flex max-w-xs items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-1.5 backdrop-blur-md">
            <div className="h-7 w-7 shrink-0 rounded-full bg-white/15 animate-pulse" />
            <div className="h-2.5 w-32 rounded bg-white/10 animate-pulse" />
          </div>

          <div className="flex max-w-sm items-center gap-2 rounded-[1.15rem] border border-white/10 bg-white/10 px-2.5 py-2 backdrop-blur-md">
            <div className="h-9 w-9 shrink-0 rounded-2xl bg-white/15 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-2.5 w-28 rounded bg-white/12 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="h-7 w-14 rounded-full bg-white/12 animate-pulse" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-black/30 px-4 pb-[max(0.5rem,var(--zivo-safe-bottom,0px))] pt-2 backdrop-blur-md">
          <div className="mb-2 grid grid-cols-3 gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/55">
            <span>Stories</span>
            <span className="text-center">Posts</span>
            <span className="text-right">Signals</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 rounded-r-full bg-gradient-to-r from-cyan-400/70 via-emerald-300/70 to-fuchsia-400/70 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
