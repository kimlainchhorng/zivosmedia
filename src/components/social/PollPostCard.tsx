/**
 * PollPostCard — Interactive poll/quiz post for the feed
 */
import { useState, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, CheckCircle2, Clock, Sparkles, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface PollOption {
  text: string;
  votes?: number;
}

interface PollPostCardProps {
  id: string;
  question: string;
  options: PollOption[];
  pollType: "poll" | "quiz";
  correctOptionIndex?: number;
  totalVotes: number;
  expiresAt?: string | null;
  createdAt: string;
  authorName: string;
  authorAvatar?: string | null;
}

function PollPostCardInner({
  id, question, options, pollType, correctOptionIndex,
  totalVotes: initialTotal, expiresAt, createdAt, authorName, authorAvatar,
}: PollPostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [totalVotes, setTotalVotes] = useState(initialTotal);
  const [localOptions, setLocalOptions] = useState(options);

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const leadingOptionIndex = localOptions.reduce((leader, option, index) => {
    const leaderVotes = localOptions[leader]?.votes || 0;
    return (option.votes || 0) > leaderVotes ? index : leader;
  }, 0);
  const statusCopy = isExpired
    ? "Final results"
    : voted
      ? "Live results"
      : pollType === "quiz"
        ? "Pick your answer"
        : "Vote to reveal";
  const leadingOption = localOptions[leadingOptionIndex];
  const leadingPercent = totalVotes > 0 ? Math.round(((leadingOption?.votes || 0) / totalVotes) * 100) : 0;
  const participationCopy = totalVotes === 0
    ? "Be the first vote"
    : voted || isExpired
      ? `${leadingPercent}% chose the leader`
      : `${totalVotes} already joined`;
  // Check if user already voted
  useQuery({
    queryKey: ["poll-vote", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("poll_votes")
        .select("option_index")
        .eq("poll_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setVoted(true);
        setSelectedIndex(data.option_index);
      }
      return data;
    },
    enabled: !!user,
  });

  const handleVote = async (index: number) => {
    if (!user) {
      toast("Log in to vote", {
        description: "Create a free ZIVO account to vote in polls and personalize your feed.",
        action: {
          label: "Log in",
          onClick: () => {
            window.location.assign(`/login?redirect=${encodeURIComponent("/feed")}`);
          },
        },
      });
      return;
    }
    if (voted || isExpired) return;
    setVoted(true);
    setSelectedIndex(index);
    setTotalVotes((p) => p + 1);
    setLocalOptions((prev) =>
      prev.map((o, i) => ({
        ...o,
        votes: (o.votes || 0) + (i === index ? 1 : 0),
      }))
    );

    await (supabase as any).from("poll_votes").insert({
      poll_id: id,
      user_id: user.id,
      option_index: index,
    });
    queryClient.invalidateQueries({ queryKey: ["poll-vote", id, user.id] });

    if (pollType === "quiz" && correctOptionIndex !== undefined) {
      if (index === correctOptionIndex) {
        toast.success("Correct! 🎉");
      } else {
        toast.error("Wrong answer!");
      }
    }
  };

  return (
    <div className="mx-3 my-2.5 overflow-hidden rounded-2xl border border-border/30 bg-background/92 shadow-sm transition-colors duration-200 hover:border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Avatar className="zivo-social-avatar-ring h-10 w-10">
          <AvatarImage src={authorAvatar || ""} />
          <AvatarFallback className="bg-transparent text-xs font-bold text-primary">{authorName[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{authorName}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</p>
        </div>
        <div className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">{pollType === "quiz" ? "Quiz" : "Poll"}</span>
        </div>
      </div>

      {/* Question */}
      <div className="px-4 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {statusCopy}
        </div>
        <p className="text-[15px] font-semibold leading-snug text-foreground">{question}</p>
      </div>

      <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70">
            <Users className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{totalVotes}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Votes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{leadingOptionIndex + 1}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Leader</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/20 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{isExpired ? "Ended" : "Live"}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Status</p>
          </div>
        </div>
      </div>
      <div className="zivo-social-share-preview mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {voted || isExpired ? (
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              {voted || isExpired ? "Current leader" : "Participation"}
            </span>
            <span className="block truncate text-sm font-bold text-foreground">
              {voted || isExpired ? leadingOption?.text || "Option" : participationCopy}
            </span>
          </span>
        </div>
        <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums">
          {voted || isExpired ? `${leadingPercent}%` : pollType === "quiz" ? "Quiz" : "Vote"}
        </span>
      </div>
      {/* Options */}
      <div className="px-4 pb-3 space-y-2">
        {localOptions.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
          const isSelected = selectedIndex === i;
          const isCorrect = pollType === "quiz" && correctOptionIndex === i;
          const isLeader = (voted || isExpired) && totalVotes > 0 && leadingOptionIndex === i;

          return (
            <motion.button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voted || isExpired}
              aria-label={
                voted || isExpired
                  ? `${opt.text}, ${pct}% with ${opt.votes || 0} vote${(opt.votes || 0) === 1 ? "" : "s"}`
                  : `Vote for ${opt.text}`
              }
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border border-border/30 bg-muted/20 text-left transition-all",
                voted ? "cursor-default" : "cursor-pointer active:scale-[0.98]",
                isSelected && isCorrect && "ring-2 ring-emerald-500/70",
                isSelected && !isCorrect && pollType === "quiz" && "ring-2 ring-destructive/70",
                isLeader && "border-primary/40",
                !voted && !isExpired && "hover:-translate-y-0.5 hover:border-primary/40",
              )}
              whileTap={!voted ? { scale: 0.98 } : {}}
            >
              {/* Progress bar */}
              {voted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-2xl",
                    isSelected ? "bg-primary/15" : isLeader ? "bg-primary/10" : "bg-muted"
                  )}
                />
              )}
              <div className="relative flex min-h-[54px] items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-foreground">{opt.text}</span>
                  {(voted || isExpired) && (
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {(opt.votes || 0)} vote{(opt.votes || 0) === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
                {voted && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isLeader && <Trophy className="h-3.5 w-3.5 text-primary" />}
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    <span className="zivo-social-chip rounded-full px-2 py-1 text-xs font-bold text-primary">{pct}%</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="zivo-social-engagement-summary mt-1 flex items-center justify-between gap-3 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-semibold">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        </div>
        {expiresAt && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-semibold">{isExpired ? "Ended" : `Ends ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const PollPostCard = memo(PollPostCardInner);
export default PollPostCard;
