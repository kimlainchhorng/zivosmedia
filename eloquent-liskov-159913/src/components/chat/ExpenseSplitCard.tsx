/**
 * ExpenseSplitCard — render a Splitwise-style expense bubble inside a group.
 *
 * Shows total + payer + per-member share with settle/unsettled state.
 * Tap a row to mark your own share settled.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Receipt from "lucide-react/dist/esm/icons/receipt";
import Check from "lucide-react/dist/esm/icons/check";

export interface ExpenseShare {
  user_id: string;
  share_cents: number;
  settled_at: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface ExpenseData {
  id: string;
  title: string;
  total_cents: number;
  currency: string;
  paid_by: string;
  payer_name?: string | null;
  shares: ExpenseShare[];
}

interface Props {
  expense: ExpenseData;
  currentUserId?: string;
  onSettle?: (expenseId: string) => void;
}

export default function ExpenseSplitCard({ expense, currentUserId, onSettle }: Props) {
  const totalSettled = useMemo(
    () => expense.shares.filter((s) => s.settled_at).reduce((a, s) => a + s.share_cents, 0),
    [expense.shares],
  );
  const myShare = expense.shares.find((s) => s.user_id === currentUserId);
  const isPayer = currentUserId === expense.paid_by;
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm max-w-[300px]"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-full bg-pink-500/15 flex items-center justify-center">
          <Receipt className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Split bill</p>
      </div>

      <p className="text-[15px] font-bold text-foreground leading-tight">{expense.title}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{fmt(expense.total_cents)}</p>
      <p className="text-[11px] text-muted-foreground mb-3">
        Paid by {expense.payer_name || (isPayer ? "you" : "a member")} · {fmt(totalSettled)} of {fmt(expense.total_cents)} settled
      </p>

      <div className="space-y-1.5">
        {expense.shares.map((s) => {
          const isMine = s.user_id === currentUserId;
          const settled = !!s.settled_at;
          return (
            <button type="button"
              key={s.user_id}
              onClick={() => isMine && !settled && onSettle?.(expense.id)}
              disabled={!isMine || settled}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition ${
                isMine && !settled ? "hover:bg-muted/40 active:scale-[0.98]" : ""
              } ${settled ? "opacity-60" : ""}`}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {(s.full_name || "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-xs font-medium truncate">
                {isMine ? "You" : (s.full_name || "Member")}
              </span>
              <span className="text-xs font-semibold tabular-nums">{fmt(s.share_cents)}</span>
              {settled ? (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </span>
              ) : isMine ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary shrink-0">Pay</span>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">Owes</span>
              )}
            </button>
          );
        })}
      </div>

      {myShare && !myShare.settled_at && !isPayer && (
        <button type="button"
          onClick={() => onSettle?.(expense.id)}
          className="mt-2.5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:opacity-80"
        >
          Pay {fmt(myShare.share_cents)}
        </button>
      )}
    </motion.div>
  );
}
