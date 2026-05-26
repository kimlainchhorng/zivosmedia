/**
 * CoinTransferBubble — Renders a 'coin_transfer' direct_messages row.
 */
import { Coins, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  amount: number;
  note?: string | null;
  isOwn: boolean;
}

export default function CoinTransferBubble({ amount, note, isOwn }: Props) {
  return (
    <div className={cn(
      "max-w-[260px] rounded-2xl p-3 shadow-sm",
      "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-pink-500/10 border border-amber-500/30",
      isOwn ? "ml-auto" : "mr-auto",
    )}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
          <Coins className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
            {isOwn ? "You sent" : "You received"}
          </div>
          <div className="text-lg font-extrabold text-foreground flex items-center gap-1">
            {amount.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">coins</span>
          </div>
        </div>
      </div>
      {note && <div className="mt-2 text-[12px] text-foreground/80 italic line-clamp-3">"{note}"</div>}
    </div>
  );
}
