/**
 * MutualFollowsBadge — "Followed by Alice + 3 others" social proof line.
 *
 * Pure renderer. Pair with `useMutualFollows` to fetch the data in bulk
 * for a list of target users in a single round-trip — avoids N+1 queries
 * when surfaced inside a carousel of suggested users.
 */
import { Sparkles, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Mutual {
  /** Top 1–2 mutual names to render inline. */
  names: string[];
  /** Total mutual count (>= names.length). */
  total: number;
}

interface Props {
  mutual: Mutual | null | undefined;
  className?: string;
}

export function MutualFollowsBadge({ mutual, className }: Props) {
  if (!mutual || mutual.total === 0 || mutual.names.length === 0) return null;

  const [first, second] = mutual.names;
  const remainder = mutual.total - (second ? 2 : 1);

  let text: string;
  if (remainder <= 0 && !second) text = `Followed by ${first}`;
  else if (remainder <= 0 && second) text = `Followed by ${first} & ${second}`;
  else if (remainder === 1) text = `Followed by ${first} + 1 other`;
  else text = `Followed by ${first} + ${remainder} others`;
  const proofLabel = mutual.total === 1 ? "1 mutual follow" : `${mutual.total} mutual follows`;
  const proofStrength =
    mutual.total >= 8
      ? { label: "Strong proof", width: "100%" }
      : mutual.total >= 3
        ? { label: "Warm proof", width: `${Math.max(48, mutual.total * 12)}%` }
        : { label: "Light proof", width: "32%" };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border border-white/45 bg-white/60 px-2.5 py-1 text-[10px] font-black leading-none text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur-md transition-transform hover:-translate-y-0.5",
        className,
      )}
      title={text}
      aria-label={`${text}. ${proofLabel}`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-500">
        <UsersRound className="h-2.5 w-2.5" />
      </span>
      <span className="truncate">{text}</span>
      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 px-1 text-[8px] font-black text-cyan-600">
        {mutual.total}
      </span>
      {mutual.total > 1 && (
        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-[8px] font-black text-primary">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      )}
      <span className="hidden h-1 w-8 overflow-hidden rounded-full bg-cyan-500/10 sm:block" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-cyan-400 via-primary to-emerald-400"
          style={{ width: proofStrength.width }}
        />
      </span>
      <span className="sr-only">{proofStrength.label}.</span>
    </span>
  );
}
