/**
 * GroupPoll — in-chat poll for groups ("Where should we eat tonight?")
 * Renders question + options with vote bars, calls onVote with selected option.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import Check from "lucide-react/dist/esm/icons/check";

export interface PollOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  /** Map of optionId → vote count */
  votes: Record<string, number>;
  /** Set of option IDs the current user has voted for */
  myVotes: Set<string>;
  multiSelect: boolean;
  totalVoters: number;
  closesAt?: string | null;
}

interface Props {
  poll: PollData;
  onVote: (optionId: string) => void;
  disabled?: boolean;
}

export default function GroupPoll({ poll, onVote, disabled }: Props) {
  const totalVotes = useMemo(
    () => Object.values(poll.votes).reduce((a, b) => a + b, 0),
    [poll.votes],
  );

  const closed = poll.closesAt ? new Date(poll.closesAt).getTime() < Date.now() : false;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm max-w-[280px]">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {closed ? "Poll · closed" : "Poll"}
      </p>
      <p className="text-[15px] font-bold text-foreground mb-3">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const count = poll.votes[opt.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMine = poll.myVotes.has(opt.id);
          return (
            <button type="button"
              key={opt.id}
              onClick={() => !disabled && !closed && onVote(opt.id)}
              disabled={disabled || closed}
              className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-muted/40 px-3 py-2 text-left active:scale-[0.98] transition disabled:opacity-60"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
                className={`absolute inset-y-0 left-0 ${isMine ? "bg-primary/20" : "bg-foreground/5"}`}
              />
              <div className="relative flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {isMine && (
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {opt.emoji && <span className="text-base leading-none shrink-0">{opt.emoji}</span>}
                  <span className="font-semibold truncate">{opt.label}</span>
                </div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground shrink-0">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] text-muted-foreground">
        {poll.totalVoters} {poll.totalVoters === 1 ? "voter" : "voters"} · {poll.multiSelect ? "Multi-select" : "Single choice"}
      </p>
    </div>
  );
}
