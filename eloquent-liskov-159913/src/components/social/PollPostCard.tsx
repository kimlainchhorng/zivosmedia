/**
 * PollPostCard — Interactive poll/quiz post for the feed
 */
import { useState, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, CheckCircle2, Clock, Users } from "lucide-react";
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

  // Check if user already voted
  const { data: existingVote } = useQuery({
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

    if (pollType === "quiz" && correctOptionIndex !== undefined) {
      if (index === correctOptionIndex) {
        toast.success("Correct! 🎉");
      } else {
        toast.error("Wrong answer!");
      }
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={authorAvatar || ""} />
          <AvatarFallback>{authorName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{authorName}</p>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
          <BarChart3 className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">{pollType === "quiz" ? "Quiz" : "Poll"}</span>
        </div>
      </div>

      {/* Question */}
      <div className="px-4 pb-3">
        <p className="text-[15px] font-medium text-foreground">{question}</p>
      </div>

      {/* Options */}
      <div className="px-4 pb-3 space-y-2">
        {localOptions.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
          const isSelected = selectedIndex === i;
          const isCorrect = pollType === "quiz" && correctOptionIndex === i;

          return (
            <motion.button
              key={i}
              onClick={() => handleVote(i)}
              disabled={voted || isExpired}
              className={cn(
                "w-full relative rounded-xl overflow-hidden text-left transition-all",
                voted ? "cursor-default" : "cursor-pointer active:scale-[0.98]",
                isSelected && isCorrect && "ring-2 ring-emerald-500",
                isSelected && !isCorrect && pollType === "quiz" && "ring-2 ring-destructive",
                !voted && "border border-border/60 hover:border-primary/40",
                voted && "border border-border/30"
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
                    "absolute inset-y-0 left-0 rounded-xl",
                    isSelected ? "bg-primary/15" : "bg-muted/50"
                  )}
                />
              )}
              <div className="relative flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-foreground">{opt.text}</span>
                {voted && (
                  <div className="flex items-center gap-1.5">
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        </div>
        {expiresAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{isExpired ? "Ended" : `Ends ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const PollPostCard = memo(PollPostCardInner);
export default PollPostCard;
