import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mic, MicOff, Hand, Users, Plus, Radio, Volume2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

interface Space {
  id: string;
  title: string;
  host: string;
  listeners: number;
  topic: string;
}

const TOPICS = ["All", "Technology", "Music", "Business", "Wellness", "Sports", "Comedy"];

export default function AudioSpacesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("Technology");
  const [creating, setCreating] = useState(false);

  const loadSpaces = useCallback(async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("id, title, host_name, viewer_count, topic, status")
      .eq("status", "live")
      .order("viewer_count", { ascending: false })
      .limit(20);

    if (data) {
      setSpaces(data.map(s => ({
        id: s.id,
        title: s.title ?? "Untitled Space",
        host: s.host_name ?? "Unknown",
        listeners: s.viewer_count ?? 0,
        topic: s.topic ?? "General",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const filtered = selectedTopic === "All" ? spaces : spaces.filter(s => s.topic === selectedTopic);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    if (!user) { toast.error("Sign in to go live"); return; }

    setCreating(true);
    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        topic: newTopic,
        host_name: user.email?.split("@")[0] ?? "You",
        status: "live",
        viewer_count: 1,
      })
      .select("id, title, host_name, viewer_count, topic")
      .single();

    if (error) {
      toast.error("Failed to start space");
    } else if (data) {
      const newSpace: Space = {
        id: data.id,
        title: data.title ?? newTitle,
        host: data.host_name ?? "You",
        listeners: data.viewer_count ?? 1,
        topic: data.topic ?? newTopic,
      };
      setSpaces(prev => [newSpace, ...prev]);
      setActiveSpace(newSpace);
      setIsMuted(false);
      toast.success("You're live!");
    }

    setShowCreate(false);
    setNewTitle("");
    setCreating(false);
  };

  const leaveSpace = async () => {
    if (activeSpace && user) {
      // End the stream if the user is the host
      const { data: stream } = await supabase
        .from("live_streams")
        .select("user_id")
        .eq("id", activeSpace.id)
        .single();
      if (stream?.user_id === user.id) {
        await supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", activeSpace.id);
        setSpaces(prev => prev.filter(s => s.id !== activeSpace.id));
      }
    }
    setActiveSpace(null);
  };

  if (activeSpace) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-gradient-to-b from-primary/20 to-background p-4 pt-12">
          <div className="flex items-center justify-between mb-6">
            <Button aria-label="Leave" variant="ghost" size="icon" onClick={leaveSpace}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Badge variant="destructive" className="animate-pulse gap-1">
              <Radio className="h-3 w-3" /> LIVE
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-ig-gradient mb-1">{activeSpace.title}</h1>
          <p className="text-sm text-muted-foreground">{activeSpace.topic} · {activeSpace.listeners} listening</p>
        </div>

        <div className="flex-1 p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Host</h3>
          <div className="flex gap-4 mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{activeSpace.host[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <Mic className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs font-medium text-foreground">{activeSpace.host}</span>
            </motion.div>
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            <Users className="h-4 w-4 inline mr-1" />
            Listeners ({activeSpace.listeners})
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.min(12, activeSpace.listeners) }).map((_, i) => (
              <Avatar key={i} className="h-10 w-10">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">U{i + 1}</AvatarFallback>
              </Avatar>
            ))}
            {activeSpace.listeners > 12 && (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                +{activeSpace.listeners - 12}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-center gap-4">
          <Button aria-label="Raise hand" variant={handRaised ? "default" : "outline"} size="icon" className="rounded-full h-12 w-12" onClick={() => setHandRaised(!handRaised)}>
            <Hand className="h-5 w-5" />
          </Button>
          <Button aria-label="Mute or unmute" variant={isMuted ? "outline" : "default"} size="icon" className="rounded-full h-14 w-14" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button variant="destructive" size="sm" className="rounded-full px-6" onClick={leaveSpace}>
            Leave
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Spaces – ZIVO | Live Audio Conversations"
        description="Join live audio conversations on ZIVO. Discover spaces on tech, music, business, wellness, and more."
        canonical="/spaces"
      />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-ig-gradient">Spaces</h1>
          </div>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TOPICS.map((topic) => (
            <Badge key={topic} variant={selectedTopic === topic ? "default" : "outline"} className="cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setSelectedTopic(topic)}>
              {topic}
            </Badge>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-4 space-y-3">
              <Input placeholder="Space title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {TOPICS.filter(t => t !== "All").map((t) => (
                  <Badge key={t} variant={newTopic === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewTopic(t)}>{t}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1">
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Go Live
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Radio className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No live spaces right now</p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Start one</Button>
        </div>
      )}

      <div className="p-4 space-y-3">
        {filtered.map((space) => (
          <Card key={space.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => { setActiveSpace(space); setIsMuted(true); setHandRaised(false); }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{space.topic}</Badge>
                  <Badge variant="destructive" className="text-xs gap-1 animate-pulse"><Radio className="h-2 w-2" /> LIVE</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{space.title}</h3>
                <p className="text-sm text-muted-foreground">Hosted by {space.host}</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">{space.listeners}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
