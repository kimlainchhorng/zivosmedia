import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Play, Pause, SkipForward, Users, MessageCircle, Send, Plus, Tv, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Room { id: string; title: string; host: string; viewers: number; media: string; }
interface ChatMessage { id: string; user: string; text: string; }

export default function WatchPartyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMedia, setNewMedia] = useState("");
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("id, title, host_name, viewer_count, topic")
      .eq("status", "live")
      .eq("topic", "watch_party")
      .order("viewer_count", { ascending: false })
      .limit(20);

    if (data) {
      setRooms(data.map(r => ({
        id: r.id,
        title: r.title ?? "Watch Party",
        host: r.host_name ?? "Unknown",
        viewers: r.viewer_count ?? 0,
        media: r.topic ?? "Unknown",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    if (!user) { toast.error("Sign in to create a room"); return; }

    setCreating(true);
    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        topic: "watch_party",
        host_name: user.email?.split("@")[0] ?? "You",
        status: "live",
        viewer_count: 1,
      })
      .select("id, title, host_name, viewer_count, topic")
      .single();

    if (error) {
      toast.error("Failed to create room");
    } else if (data) {
      const room: Room = {
        id: data.id,
        title: data.title ?? newTitle,
        host: data.host_name ?? "You",
        viewers: 1,
        media: newMedia || "Live",
      };
      setRooms(prev => [room, ...prev]);
      setActiveRoom(room);
      setMessages([]);
      toast.success("Room created!");
    }

    setShowCreate(false);
    setNewTitle("");
    setNewMedia("");
    setCreating(false);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), user: user?.email?.split("@")[0] ?? "You", text: chatInput }]);
    setChatInput("");
  };

  const leaveRoom = async () => {
    if (activeRoom && user) {
      const { data } = await supabase.from("live_streams").select("user_id").eq("id", activeRoom.id).single();
      if (data?.user_id === user.id) {
        await supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", activeRoom.id);
        setRooms(prev => prev.filter(r => r.id !== activeRoom.id));
      }
    }
    setActiveRoom(null);
  };

  if (activeRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-black aspect-video relative flex items-center justify-center">
          <div className="text-6xl">🎬</div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex gap-2">
              <Button aria-label="Play or pause" size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button aria-label="Skip forward" size="icon" variant="ghost" className="text-white h-8 w-8"><SkipForward className="h-4 w-4" /></Button>
            </div>
            <Badge variant="destructive" className="text-xs gap-1"><Users className="h-3 w-3" />{activeRoom.viewers}</Badge>
          </div>
        </div>

        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground text-sm">{activeRoom.title}</h2>
              <p className="text-xs text-muted-foreground">Hosted by {activeRoom.host}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={leaveRoom}>Leave</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px]">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Say something to the group!</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback className="text-xs bg-primary/20 text-primary">{msg.user[0]}</AvatarFallback></Avatar>
              <div>
                <span className="text-xs font-semibold text-foreground">{msg.user}</span>
                <p className="text-sm text-foreground">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input placeholder="Say something..." value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="text-sm" />
          <Button aria-label="Send" size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <Tv className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-ig-gradient">Watch Party</h1>
          </div>
          <Button size="sm" className="rounded-full gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Room
          </Button>
        </div>
      </div>

      {showCreate && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden border-b border-border">
          <div className="p-4 space-y-3">
            <Input placeholder="Room title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Input placeholder="What are you watching? (optional)" value={newMedia} onChange={(e) => setNewMedia(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1">
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Start Party
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="text-center py-16">
          <Tv className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No active watch parties</p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Start one</Button>
        </div>
      )}

      <div className="p-4 space-y-3">
        {rooms.map((room, i) => (
          <motion.div key={room.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setActiveRoom(room); setMessages([]); }}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-2xl">🎬</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm">{room.title}</h3>
                  <p className="text-xs text-muted-foreground">Hosted by {room.host}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" />{room.viewers}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
