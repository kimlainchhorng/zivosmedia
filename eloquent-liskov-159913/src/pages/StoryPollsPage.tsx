import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Send, Plus, Trash2, BarChart3, HelpCircle, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PollOption { id: string; text: string; votes: number; }
interface QuizOption { id: string; text: string; isCorrect: boolean; }
interface StoryPoll {
  id: string;
  type: "poll" | "quiz";
  question: string;
  options: (PollOption | QuizOption)[];
  totalVotes: number;
  createdAt: string;
  active: boolean;
}

export default function StoryPollsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [polls, setPolls] = useState<StoryPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPolls = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("feedback_submissions")
      .select("id, subject, message, created_at")
      .eq("category", "story_poll")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      const parsed: StoryPoll[] = data.flatMap(row => {
        try {
          const parsed = JSON.parse(row.message ?? "{}");
          return [{
            id: row.id,
            type: parsed.type ?? "poll",
            question: row.subject ?? "",
            options: parsed.options ?? [],
            totalVotes: parsed.totalVotes ?? 0,
            createdAt: formatDistanceToNow(new Date(row.created_at!), { addSuffix: true }),
            active: true,
          }];
        } catch {
          return [];
        }
      });
      setPolls(parsed);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadPolls(); }, [loadPolls]);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"poll" | "quiz">("poll");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const addOption = () => { if (options.length < 4) setOptions([...options, ""]); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => { const o = [...options]; o[i] = val; setOptions(o); };

  const handleCreate = async () => {
    if (!question.trim() || options.some(o => !o.trim())) return;
    if (!user) { toast.error("Sign in to create polls"); return; }

    const pollOptions = options.map((text, i) => createType === "quiz"
      ? { id: String(i), text, isCorrect: i === correctIndex }
      : { id: String(i), text, votes: 0 });

    const payload = { type: createType, options: pollOptions, totalVotes: 0 };
    const { data, error } = await supabase
      .from("feedback_submissions")
      .insert({
        category: "story_poll",
        subject: question.trim(),
        message: JSON.stringify(payload),
        user_id: user.id,
      })
      .select("id, created_at")
      .single();

    if (error) { toast.error("Failed to save poll"); return; }

    const newPoll: StoryPoll = {
      id: data.id,
      type: createType,
      question,
      options: pollOptions,
      totalVotes: 0,
      createdAt: "Just now",
      active: true,
    };
    setPolls([newPoll, ...polls]);
    setQuestion("");
    setOptions(["", ""]);
    setShowCreate(false);
    toast.success("Poll created!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-ig-gradient">Polls & Quizzes</h1>
          </div>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <Badge variant={createType === "poll" ? "default" : "outline"} className="cursor-pointer gap-1" onClick={() => setCreateType("poll")}>
                  <BarChart3 className="h-3 w-3" /> Poll
                </Badge>
                <Badge variant={createType === "quiz" ? "default" : "outline"} className="cursor-pointer gap-1" onClick={() => setCreateType("quiz")}>
                  <HelpCircle className="h-3 w-3" /> Quiz
                </Badge>
              </div>
              <Input placeholder="Ask a question..." value={question} onChange={(e) => setQuestion(e.target.value)} />
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  {createType === "quiz" && (
                    <button type="button" onClick={() => setCorrectIndex(i)} className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === correctIndex ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {i === correctIndex && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                    </button>
                  )}
                  <Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)} />
                  {options.length > 2 && (
                    <Button aria-label="Remove option" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={addOption}><Plus className="h-3 w-3" /> Add option</Button>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} className="gap-1"><Send className="h-3 w-3" /> Post to Story</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
        {!loading && polls.length === 0 && (
          <div className="text-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No polls yet</p>
            <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create your first poll</Button>
          </div>
        )}
        {!loading && polls.map((poll, i) => (
          <motion.div key={poll.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={poll.type === "quiz" ? "secondary" : "outline"} className="text-xs capitalize gap-1">
                  {poll.type === "quiz" ? <HelpCircle className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  {poll.type}
                </Badge>
                {poll.active && <Badge variant="default" className="text-xs">Active</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">{poll.createdAt}</span>
              </div>
              <p className="font-semibold text-foreground mb-3">{poll.question}</p>
              <div className="space-y-2">
                {poll.options.map((opt) => {
                  const isPoll = poll.type === "poll";
                  const votes = isPoll ? (opt as PollOption).votes : 0;
                  const pct = poll.totalVotes > 0 && isPoll ? Math.round((votes / poll.totalVotes) * 100) : 0;
                  const isCorrect = !isPoll && (opt as QuizOption).isCorrect;

                  return (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`text-foreground ${isCorrect ? "font-semibold" : ""}`}>
                          {isCorrect && <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />}
                          {opt.text}
                        </span>
                        {isPoll && <span className="text-xs text-muted-foreground">{pct}%</span>}
                      </div>
                      {isPoll && <Progress value={pct} className="h-2" />}
                    </div>
                  );
                })}
              </div>
              {poll.totalVotes > 0 && (
                <p className="text-xs text-muted-foreground mt-3">{poll.totalVotes} votes</p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
