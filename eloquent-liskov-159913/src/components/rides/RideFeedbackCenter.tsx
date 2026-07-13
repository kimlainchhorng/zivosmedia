/**
 * RideFeedbackCenter — Post-ride surveys, driver compliments, quality scoring, feedback history
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ThumbsUp, Star, Heart, Award, TrendingUp, Send, CheckCircle, Smile, Frown, Meh, Car, Shield, Music, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SafeCaption from "@/components/social/SafeCaption";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

type Tab = "survey" | "compliments" | "history";

const qualityMetrics = {
  overallScore: 4.7,
  totalFeedback: 34,
  categories: [
    { name: "Cleanliness", score: 4.8, icon: Sparkles },
    { name: "Safety", score: 4.9, icon: Shield },
    { name: "Navigation", score: 4.5, icon: Navigation },
    { name: "Comfort", score: 4.6, icon: Car },
  ],
};

const complimentTags = [
  { id: "great-convo", label: "Great conversation", icon: "💬", count: 8 },
  { id: "smooth-drive", label: "Smooth driving", icon: "🚗", count: 12 },
  { id: "super-clean", label: "Super clean car", icon: "✨", count: 6 },
  { id: "knows-routes", label: "Knows the routes", icon: "🗺️", count: 9 },
  { id: "on-time", label: "Always on time", icon: "⏰", count: 15 },
  { id: "friendly", label: "Very friendly", icon: "😊", count: 11 },
];

const feedbackHistory = [
  { id: "1", driver: "Marcus T.", rating: 5, comment: "Excellent ride, very smooth!", date: "Today", compliments: ["Smooth driving", "Super clean"] },
  { id: "2", driver: "Sarah K.", rating: 5, comment: "Best driver on the platform!", date: "2 days ago", compliments: ["Great conversation", "On time"] },
  { id: "3", driver: "James L.", rating: 4, comment: "Good ride, took a slightly longer route", date: "Last week", compliments: ["Friendly"] },
  { id: "4", driver: "Ana M.", rating: 5, comment: "", date: "Last week", compliments: ["Smooth driving"] },
];

export default function RideFeedbackCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("survey");
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyMood, setSurveyMood] = useState<string | null>(null);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");

  const tabs = [
    { id: "survey" as const, label: "Survey", icon: MessageSquare },
    { id: "compliments" as const, label: "Compliments", icon: Heart },
    { id: "history" as const, label: "History", icon: TrendingUp },
  ];

  const toggleCompliment = (id: string) => {
    setSelectedCompliments(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const submitSurvey = () => {
    if (!confirmContentSafe(feedbackText, "feedback")) return;
    toast.success("Feedback submitted! Thank you 🎉");
    setSurveyStep(0);
    setSurveyRating(0);
    setSurveyMood(null);
    setSelectedCompliments([]);
    setFeedbackText("");
  };

  return (
    <div className="space-y-4">
      {/* Quality score card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/5 border border-amber-500/20 p-5">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <span className="text-2xl font-black text-amber-500">{qualityMetrics.overallScore}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Your Ride Quality Score</p>
            <p className="text-[10px] text-muted-foreground">Based on {qualityMetrics.totalFeedback} feedback reports</p>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("w-3.5 h-3.5", i < Math.round(qualityMetrics.overallScore) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {qualityMetrics.categories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.name} className="rounded-xl bg-card/60 p-2 text-center">
                <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                <p className="text-sm font-black text-foreground">{cat.score}</p>
                <p className="text-[8px] text-muted-foreground">{cat.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "survey" && (
            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-2 px-1">
                {[0, 1, 2].map(s => (
                  <div key={s} className={cn("h-1 rounded-full flex-1 transition-colors", surveyStep >= s ? "bg-primary" : "bg-muted/30")} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {surveyStep === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-card border border-border/40 p-5 text-center space-y-4">
                    <p className="text-sm font-bold text-foreground">How was your last ride?</p>
                    <div className="flex justify-center gap-4">
                      {[
                        { id: "great", icon: Smile, label: "Great", color: "text-emerald-500" },
                        { id: "okay", icon: Meh, label: "Okay", color: "text-amber-500" },
                        { id: "poor", icon: Frown, label: "Poor", color: "text-red-500" },
                      ].map(mood => {
                        const Icon = mood.icon;
                        const selected = surveyMood === mood.id;
                        return (
                          <button type="button" key={mood.id} onClick={() => { setSurveyMood(mood.id); setSurveyStep(1); }} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all", selected ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-primary/20")}>
                            <Icon className={cn("w-10 h-10", mood.color)} />
                            <span className="text-xs font-bold text-foreground">{mood.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {surveyStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-card border border-border/40 p-5 space-y-4">
                    <p className="text-sm font-bold text-foreground text-center">Rate your driver</p>
                    <div className="flex justify-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.button key={i} whileTap={{ scale: 1.3 }} onClick={() => setSurveyRating(i + 1)}>
                          <Star className={cn("w-10 h-10 transition-colors", i < surveyRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                        </motion.button>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-foreground text-center">Add compliments</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {complimentTags.map(tag => (
                        <button type="button" key={tag.id} onClick={() => toggleCompliment(tag.id)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all", selectedCompliments.includes(tag.id) ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border/40 text-foreground hover:border-primary/20")}>
                          <span>{tag.icon}</span> {tag.label}
                        </button>
                      ))}
                    </div>
                    <Button className="w-full h-11 rounded-xl font-bold" disabled={surveyRating === 0} onClick={() => setSurveyStep(2)}>
                      Continue
                    </Button>
                  </motion.div>
                )}

                {surveyStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-card border border-border/40 p-5 space-y-4">
                    <p className="text-sm font-bold text-foreground text-center">Anything else to share?</p>
                    <textarea
                      placeholder="Optional: Tell us more about your experience..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      className="w-full h-24 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button className="w-full h-11 rounded-xl font-bold gap-2" onClick={submitSurvey}>
                      <Send className="w-4 h-4" /> Submit Feedback
                    </Button>
                    <button type="button" onClick={submitSurvey} className="w-full text-xs text-muted-foreground font-bold py-2">Skip</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === "compliments" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Compliments you've given to drivers</p>
              <div className="grid grid-cols-2 gap-2">
                {complimentTags.map(tag => (
                  <div key={tag.id} className="rounded-xl bg-card border border-border/40 p-3 flex items-center gap-2">
                    <span className="text-lg">{tag.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-foreground truncate">{tag.label}</p>
                      <p className="text-[9px] text-muted-foreground">{tag.count} times</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3 text-center">
                <Award className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">Top Complimenter!</p>
                <p className="text-[10px] text-muted-foreground">You've given {complimentTags.reduce((s, t) => s + t.count, 0)} compliments total</p>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {feedbackHistory.map((fb, i) => (
                <motion.div key={fb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card border border-border/40 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{fb.driver.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{fb.driver}</span>
                        <span className="text-[10px] text-muted-foreground">{fb.date}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={cn("w-3 h-3", j < fb.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {fb.comment && <p className="text-[11px] text-foreground mt-2 pl-13"><SafeCaption text={fb.comment} /></p>}
                  {fb.compliments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pl-13">
                      {fb.compliments.map(c => (
                        <Badge key={c} variant="outline" className="text-[8px] font-bold text-primary border-primary/20 bg-primary/5">{c}</Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
