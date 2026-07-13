import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, Camera, Users, Send, Clock, Heart, MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SafeCaption from "@/components/social/SafeCaption";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  user: string;
  location: string;
  caption: string;
  time: string;
  likes: number;
  comments: number;
  taggedFriends: string[];
}

export default function CheckInPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [location, setLocation] = useState("");
  const [caption, setCaption] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadCheckins = useCallback(async () => {
    const { data } = await supabase
      .from("check_ins")
      .select("id, user_id, location_name, caption, created_at, is_public")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setCheckins(data.map(c => ({
        id: c.id,
        user: `User ${c.user_id.slice(0, 6)}`,
        location: c.location_name || "Unknown Location",
        caption: c.caption || "",
        time: formatDistanceToNow(new Date(c.created_at || Date.now()), { addSuffix: true }),
        likes: 0,
        comments: 0,
        taggedFriends: [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCheckins(); }, [loadCheckins]);

  const handleCheckIn = async () => {
    if (!location.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("check_ins").insert({
        user_id: user.id,
        location_name: location.trim(),
        caption: caption.trim() || null,
        is_public: true,
      });
      if (error) throw error;
      toast.success("Checked in!");
      setLocation("");
      setCaption("");
      setTagInput("");
      setShowCreate(false);
      await loadCheckins();
    } catch {
      toast.error("Failed to check in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-ig-gradient">Check-in</h1>
          </div>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(!showCreate)}>
            <MapPin className="h-4 w-4" /> Check in
          </Button>
        </div>
      </div>

      {showCreate && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-b border-border">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <Input placeholder="Where are you?" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <Input placeholder="What's happening? (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input placeholder="Tag friends (optional)" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCheckIn} disabled={submitting || !location.trim()} className="gap-1">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Check in
              </Button>
              <Button size="sm" variant="outline" className="gap-1"><Camera className="h-3 w-3" /> Photo</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" /> Recent Check-ins
        </h2>
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}
        {!loading && checkins.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
            No check-ins yet. Be the first!
          </div>
        )}
        {checkins.map((checkin, i) => (
          <motion.div key={checkin.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{checkin.user[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{checkin.user}</p>
                  <p className="text-xs text-muted-foreground">{checkin.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3 text-primary" />
                <span className="text-sm font-medium text-primary">{checkin.location}</span>
              </div>
              {checkin.caption && <p className="text-sm text-foreground mb-2"><SafeCaption text={checkin.caption} /></p>}
              {checkin.taggedFriends.length > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">with {checkin.taggedFriends.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-muted-foreground">
                <button type="button" className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors">
                  <Heart className="h-3 w-3" /> {checkin.likes}
                </button>
                <button type="button" className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-3 w-3" /> {checkin.comments}
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
