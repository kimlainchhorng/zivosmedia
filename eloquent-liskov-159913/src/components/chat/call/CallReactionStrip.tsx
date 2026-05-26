/**
 * CallReactionStrip — Always-visible 1-tap emoji bar shown above the
 * call controls. Each tap fans out via the LiveKit data channel and
 * appears for every participant through the existing reactions overlay.
 */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👏", "🔥"];

interface Props {
  onReaction: (emoji: string) => void;
}

export default function CallReactionStrip({ onReaction }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
      style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 96px)" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-xl ring-1 ring-white/10 shadow-lg">
        {QUICK_REACTIONS.map((emo) => (
          <button type="button"
            key={emo}
            aria-label={`Send ${emo} reaction`}
            onClick={() => onReaction(emo)}
            className="grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-110 hover:bg-white/15 active:scale-95"
          >
            {emo}
          </button>
        ))}
      </div>
    </div>
  );
}
