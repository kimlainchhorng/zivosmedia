/**
 * AIConciergeTrigger Component
 * Premium 2026-era floating AI concierge with context awareness
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User } from "lucide-react";
import { useMyTrips } from "@/hooks/useMyTrips";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

const quickReplies = [
  "Track my booking",
  "Change reservation",
  "Refund status",
  "Speak to agent",
];

export function AIConciergeTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hi! I'm your ZIVO Concierge. I see you're flying to London tomorrow. How can I help?" },
  ]);
  const [input, setInput] = useState("");

  const { user } = useAuth();
  const { data: upcomingTrips } = useMyTrips("upcoming");
  const hasUpcomingTrips = upcomingTrips && upcomingTrips.length > 0;
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("is_read", false).then(({ count }) => {
        if (count) setAlertCount(count);
      });
  }, [user]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), type: "user", text }]);
    setInput("");

    if (user) {
      await supabase.from("feedback_submissions").insert({
        category: "concierge_message",
        subject: "Concierge Chat",
        message: text,
        user_id: user.id,
      });
    }

    setTimeout(() => {
      const response = hasUpcomingTrips
        ? "Thanks for your message! A support agent will assist you shortly. Average wait time: 2 mins."
        : "Thanks for reaching out! Our team will get back to you soon. For faster help, check our Help Center.";
      setMessages((prev) => [...prev, { id: Date.now() + 1, type: "bot", text: response }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed right-4 sm:right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_0_30px_hsl(var(--primary)/0.3)] flex items-center justify-center z-50 group"
          style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 96px)" }}
        >
          {/* Notification Badge */}
          {alertCount > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
          )}
          
          <ChatIcon className="w-6 h-6" />
          
          {/* Tooltip */}
          <span className="absolute right-16 bg-popover text-popover-foreground text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border/50">
            {alertCount > 0 ? "Flight delay alert (1)" : "Need help?"}
          </span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[360px] max-w-[360px] h-[min(500px,calc(100vh-12rem))] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 96px)" }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary to-accent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-primary-foreground">ZIVO Concierge</p>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-primary-foreground/80">Online</span>
                  </div>
                </div>
              </div>
              <button type="button" 
                onClick={() => setIsOpen(false)} 
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === "bot" ? "bg-primary/20" : "bg-muted"}`}
                  >
                    {msg.type === "bot" ? (
                      <Bot className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                      msg.type === "bot"
                        ? "bg-muted rounded-tl-sm text-foreground"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Replies */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {quickReplies.map((reply) => (
                  <button type="button"
                    key={reply}
                    onClick={() => sendMessage(reply)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-muted rounded-full hover:bg-muted/80 transition-colors text-foreground"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-muted rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <button type="button"
                  onClick={() => sendMessage(input)}
                  className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIConciergeTrigger;
