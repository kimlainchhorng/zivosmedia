/**
 * ChatPollBubble — In-chat poll voting component
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Users from "lucide-react/dist/esm/icons/users";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChatPollBubbleProps {
  pollId: string;
  question: string;
  options: { text: string }[];
  isAnonymous?: boolean;
  creatorName: string;
}

interface ChatPollVoteRow {
  option_index: number;
  user_id: string;
}

export default function ChatPollBubble({ pollId, question, options, isAnonymous, creatorName }: ChatPollBubbleProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get votes
  const { data: votes = [] } = useQuery({
    queryKey: ["chat-poll-votes", pollId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chat_poll_votes" as any)
        .select("option_index, user_id")
        .eq("poll_id", pollId);
      return (data ?? []) as ChatPollVoteRow[];
    },
  });

  const myVote = votes.find((v) => v.user_id === user?.id);
  const totalVotes = votes.length;

  const handleVote = async (index: number) => {
    if (!user || myVote) return;
    await (supabase as any).from("chat_poll_votes").insert({
      poll_id: pollId,
      user_id: user.id,
      option_index: index,
    });
    queryClient.invalidateQueries({ queryKey: ["chat-poll-votes", pollId] });
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3 max-w-[280px]">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Poll by {creatorName}</span>
      </div>
      <p className="text-sm font-medium text-foreground mb-2">{question}</p>

      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const voteCount = votes.filter((v) => v.option_index === i).length;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isMyVote = myVote?.option_index === i;

          return (
            <button type="button"
              key={i}
              onClick={() => handleVote(i)}
              disabled={!!myVote}
              className={cn(
                "w-full relative rounded-lg overflow-hidden text-left transition-all",
                myVote ? "cursor-default" : "cursor-pointer active:scale-[0.98]",
                isMyVote && "ring-1 ring-primary/50",
                !myVote && "border border-border/60 hover:border-primary/40",
                myVote && "border border-border/30"
              )}
            >
              {myVote && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  className={cn("absolute inset-y-0 left-0 rounded-lg", isMyVote ? "bg-primary/15" : "bg-muted/50")}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium">{opt.text}</span>
                {myVote && (
                  <div className="flex items-center gap-1">
                    {isMyVote && <CheckCircle2 className="h-3 w-3 text-primary" />}
                    <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        {isAnonymous && <span>• Anonymous</span>}
      </div>
    </div>
  );
}
