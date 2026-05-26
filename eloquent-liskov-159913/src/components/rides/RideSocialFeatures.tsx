/**
 * RideSocialFeatures — Ride sharing, commute buddies, social leaderboards, ride reviews
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, Star, Share2, MapPin, Clock, Heart, MessageCircle, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/shared/StarRating";
import SafeCaption from "@/components/social/SafeCaption";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const commuteBuddies = [
  { id: "1", name: "Sarah K.", route: "Downtown → Midtown", match: 92, rides: 24, avatar: "SK" },
  { id: "2", name: "James L.", route: "Airport → Financial", match: 87, rides: 15, avatar: "JL" },
  { id: "3", name: "Priya M.", route: "University → Tech Park", match: 78, rides: 8, avatar: "PM" },
];

const leaderboard = [
  { rank: 1, name: "Alex T.", points: 4820, rides: 156, badge: "🏆" },
  { rank: 2, name: "You", points: 3940, rides: 128, badge: "🥈" },
  { rank: 3, name: "Maria S.", points: 3610, rides: 112, badge: "🥉" },
  { rank: 4, name: "David R.", points: 2980, rides: 95, badge: "" },
  { rank: 5, name: "Lisa W.", points: 2450, rides: 78, badge: "" },
];

const rideReviews = [
  { id: "1", author: "Emma J.", rating: 5, text: "Super smooth ride to the airport. Driver was very professional and the car was spotless!", time: "2h ago", likes: 12 },
  { id: "2", author: "Carlos M.", rating: 4, text: "Good ride overall. Took an alternate route that saved 10 minutes. Would recommend.", time: "5h ago", likes: 8 },
  { id: "3", author: "Amy L.", rating: 5, text: "Best ride experience in this city. Music was great and conversation was fun!", time: "1d ago", likes: 23 },
];

export default function RideSocialFeatures() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"buddies" | "leaderboard" | "reviews">("buddies");
  const [likedReviews, setLikedReviews] = useState<string[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);

  const toggleLike = (id: string) => {
    setLikedReviews((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const submitReview = () => {
    if (!reviewText.trim()) return;
    toast.success("Review submitted! Thank you.");
    setReviewText("");
    setReviewRating(5);
    setShowReviewForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex gap-2">
        {[
          { id: "buddies" as const, label: "Buddies", icon: Users },
          { id: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
          { id: "reviews" as const, label: "Reviews", icon: Star },
        ].map((s) => (
          <Button key={s.id} size="sm" variant={activeSection === s.id ? "default" : "outline"} onClick={() => setActiveSection(s.id)} className="flex-1 gap-1.5">
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </Button>
        ))}
      </div>

      {activeSection === "buddies" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Commute Buddies
              </CardTitle>
              <p className="text-xs text-muted-foreground">People with similar commute routes</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {commuteBuddies.map((buddy) => (
                <div key={buddy.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">{buddy.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{buddy.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {buddy.route}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{buddy.rides} shared rides</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="secondary" className="text-[10px]">{buddy.match}% match</Badge>
                    <Button size="sm" variant="ghost" className="h-7 text-xs block ml-auto" onClick={() => navigate("/chat", { state: { openChat: { userId: buddy.id, name: buddy.name } } })}>
                      Invite
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full gap-2">
            <Share2 className="w-4 h-4" /> Share Your Commute Route
          </Button>
        </motion.div>
      )}

      {activeSection === "leaderboard" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Monthly Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    entry.name === "You" ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-foreground w-6 text-center">
                      {entry.badge || `#${entry.rank}`}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${entry.name === "You" ? "text-primary" : "text-foreground"}`}>{entry.name}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.rides} rides this month</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">{entry.points.toLocaleString()} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-accent/30 border-accent">
            <CardContent className="pt-4 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">880 points to #1</p>
              <Progress value={82} className="h-2" />
              <p className="text-xs text-muted-foreground">Complete 7 more rides to overtake Alex T.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeSection === "reviews" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Community Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rideReviews.map((review) => (
                <div key={review.id} className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{review.author}</span>
                      <StarRating value={review.rating} size="xs" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{review.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <SafeCaption text={review.text} />
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      className={`flex items-center gap-1 text-xs transition-colors ${likedReviews.includes(review.id) ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => toggleLike(review.id)}
                    >
                      <ThumbsUp className={`w-3 h-3 ${likedReviews.includes(review.id) ? "fill-primary" : ""}`} />
                      {review.likes + (likedReviews.includes(review.id) ? 1 : 0)}
                    </button>
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="w-3 h-3" /> Reply
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full gap-2" onClick={() => setShowReviewForm(v => !v)}>
            <Star className="w-4 h-4" /> Write a Review
          </Button>
          <AnimatePresence>
            {showReviewForm && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button type="button" key={n} onClick={() => setReviewRating(n)}>
                      <Star className={`w-5 h-5 ${n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  rows={3}
                />
                <Button size="sm" className="w-full" disabled={!reviewText.trim()} onClick={submitReview}>
                  Submit Review
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
