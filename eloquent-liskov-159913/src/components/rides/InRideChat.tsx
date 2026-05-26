/**
 * InRideChat — Enhanced with voice notes, photo sharing, arrival countdown, typing indicator
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Camera, MapPin, X, Phone, Mic, MicOff, Image, Clock, CheckCheck, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "driver";
  text: string;
  type: "text" | "location" | "photo" | "voice";
  timestamp: Date;
  status?: "sent" | "delivered" | "read";
  duration?: number; // voice note seconds
}

interface InRideChatProps {
  driverName?: string;
  driverRating?: number;
  arrivalMinutes?: number;
  onClose?: () => void;
  onCall?: () => void;
}

const quickReplies = [
  "I'm here",
  "On my way",
  "5 minutes",
  "Blue jacket 🧥",
  "Can you wait?",
  "Thanks! 👍",
];

export default function InRideChat({
  driverName = "Marcus T.",
  driverRating = 4.92,
  arrivalMinutes = 4,
  onClose,
  onCall,
}: InRideChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "driver", text: "Hi! I'm on my way to pick you up.", type: "text", timestamp: new Date(Date.now() - 120000) },
    { id: "2", sender: "driver", text: "I'll be there in about 5 minutes.", type: "text", timestamp: new Date(Date.now() - 60000) },
  ]);
  const [input, setInput] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [driverTyping, setDriverTyping] = useState(false);
  const [countdown, setCountdown] = useState(arrivalMinutes * 60);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, driverTyping]);

  // Arrival countdown
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  const sendMessage = (text: string, type: ChatMessage["type"] = "text", duration?: number) => {
    if (!text.trim() && type === "text") return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      type,
      timestamp: new Date(),
      status: "sent",
      duration,
    };
    setMessages(prev => [...prev, msg]);
    setInput("");
    setShowQuickReplies(false);

    // Simulate delivery + read
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "delivered" } : m)), 500);
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "read" } : m)), 1500);

    // Simulate driver typing then reply
    setTimeout(() => setDriverTyping(true), 1500);
    setTimeout(() => {
      setDriverTyping(false);
      const replies = ["Got it!", "See you soon!", "No problem 👍", "Understood!", "Almost there!"];
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: "driver",
        text: replies[Math.floor(Math.random() * replies.length)],
        type: "text",
        timestamp: new Date(),
      }]);
    }, 3000 + Math.random() * 2000);
  };

  const sendLocation = () => {
    sendMessage("📍 Shared my exact location", "location");
    toast.success("Location sent to driver");
  };

  const sendPhoto = () => {
    sendMessage("📸 Photo shared", "photo");
    toast.success("Photo sent to driver");
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recordingRef.current) clearInterval(recordingRef.current);
      const duration = recordingTime;
      setIsRecording(false);
      setRecordingTime(0);
      sendMessage(`🎙️ Voice note (${duration}s)`, "voice", duration);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      recordingRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const renderStatus = (status?: string) => {
    if (!status) return null;
    return (
      <span className="inline-flex items-center ml-1">
        {status === "read" ? <CheckCheck className="w-3 h-3 text-primary" /> : status === "delivered" ? <CheckCheck className="w-3 h-3 text-primary-foreground/40" /> : <CheckCheck className="w-3 h-3 text-primary-foreground/20" />}
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden flex flex-col h-[520px]">
      {/* Header with arrival countdown */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {driverName.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-sm font-bold text-foreground">{driverName}</span>
            <p className="text-[10px] text-muted-foreground">⭐ {driverRating}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Arrival countdown */}
          <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold gap-1">
            <Clock className="w-3 h-3" />
            {mins}:{secs.toString().padStart(2, "0")}
          </Badge>
          <button type="button" onClick={onCall} className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center min-w-[36px] min-h-[36px]">
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-momentum">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2", msg.sender === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted/40 text-foreground rounded-bl-md")}>
              {msg.type === "location" && (
                <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /><span className="text-[10px] font-bold">Location shared</span></div>
              )}
              {msg.type === "voice" && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center"><Mic className="w-3 h-3" /></div>
                  <div className="flex-1 h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden"><motion.div className="h-full bg-primary-foreground/50 rounded-full" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: msg.duration || 3 }} /></div>
                  <span className="text-[9px]">{msg.duration}s</span>
                </div>
              )}
              {msg.type === "photo" && (
                <div className="w-32 h-20 rounded-lg bg-muted/30 flex items-center justify-center mb-1"><Image className="w-6 h-6 text-muted-foreground/50" /></div>
              )}
              <p className="text-xs">{msg.text}</p>
              <div className={cn("flex items-center gap-0.5 mt-1", msg.sender === "user" ? "justify-end" : "")}>
                <span className={cn("text-[9px]", msg.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>{formatTime(msg.timestamp)}</span>
                {msg.sender === "user" && renderStatus(msg.status)}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {driverTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-muted/40 rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 overflow-hidden shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {quickReplies.map(reply => (
                <button type="button" key={reply} onClick={() => sendMessage(reply)} className="px-3 py-1.5 rounded-full bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-muted/50 whitespace-nowrap shrink-0">{reply}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-border/30 bg-card shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-500 flex-1">Recording... {recordingTime}s</span>
            <Button size="sm" variant="destructive" className="h-9 rounded-full px-4 text-xs font-bold" onClick={toggleRecording}>
              <MicOff className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={sendLocation} className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0 hover:bg-muted/50 min-w-[36px] min-h-[36px]">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </button>
            <button type="button" onClick={sendPhoto} className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0 hover:bg-muted/50 min-w-[36px] min-h-[36px]">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
            <button type="button" onClick={toggleRecording} className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center shrink-0 hover:bg-muted/50 min-w-[36px] min-h-[36px]">
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)} placeholder="Message..." className="h-9 text-xs flex-1" />
            <Button size="sm" onClick={() => sendMessage(input)} disabled={!input.trim()} className="w-9 h-9 rounded-full p-0 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
