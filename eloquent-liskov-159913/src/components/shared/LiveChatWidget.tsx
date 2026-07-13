import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Headphones, Loader2, Sparkles, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatMode = "ai" | "human";

const quickReplies = [
  "Order status",
  "Payment help",
  "ETA info",
  "Flight booking",
  "Hotel help",
  "Talk to human",
];

const ESCALATION_CATEGORIES = [
  { value: "payment", label: "Payment Issue" },
  { value: "order", label: "Order Problem" },
  { value: "safety", label: "Safety Concern" },
  { value: "booking", label: "Booking Help" },
  { value: "other", label: "Other" },
];

const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-support-chat`;

const LiveChatWidget = () => {
  const location = useLocation();
  const isRidesPage = location.pathname.startsWith("/rides") || location.pathname.startsWith("/airport-transfers");
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", content: "Hi! I'm ZIVO AI Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationCategory, setEscalationCategory] = useState("");
  const [escalationMessage, setEscalationMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [pulseVisible, setPulseVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Pulse the FAB periodically
  useEffect(() => {
    if (isOpen) return;
    const timer = setInterval(() => {
      setPulseVisible(prev => !prev);
    }, 4000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const switchMode = (mode: ChatMode) => {
    setChatMode(mode);
    if (mode === "human") {
      setShowEscalation(true);
    } else {
      setShowEscalation(false);
    }
  };

  const streamChat = async (allMessages: ChatMessage[]) => {
    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages = allMessages.map((m) => ({
      role: m.role === "system" ? "user" : m.role,
      content: m.content,
    }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: apiMessages }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        toast.error("AI is busy, please try again in a moment");
      } else if (resp.status === 402) {
        toast.error("Service temporarily unavailable");
      } else {
        toast.error(errorData.error || "Something went wrong");
      }
      throw new Error(errorData.error || "Stream failed");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const assistantId = Date.now() + 1;

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            const snapshot = assistantContent;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
            );
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            const snapshot = assistantContent;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
            );
          }
        } catch { /* ignore */ }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    if (text === "Talk to human") {
      switchMode("human");
      return;
    }

    const userMsg: ChatMessage = { id: Date.now(), role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);

    try {
      await streamChat(updated);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Chat error:", e);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const submitEscalation = async () => {
    if (!escalationCategory) {
      toast.error("Please select a category");
      return;
    }
    setIsSubmittingTicket(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ticketNumber = `ZS-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from("support_tickets").insert({
        ticket_number: ticketNumber,
        user_id: user?.id || null,
        subject: ESCALATION_CATEGORIES.find((c) => c.value === escalationCategory)?.label || "Support Request",
        description: escalationMessage || "Customer requested human support via AI chat",
        category: escalationCategory,
        priority: escalationCategory === "safety" ? "urgent" : "normal",
        status: "open",
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `Ticket **${ticketNumber}** created! A human agent will get back to you shortly. You can continue chatting with me in the meantime.`,
        },
      ]);
      setShowEscalation(false);
      setChatMode("ai");
      setEscalationCategory("");
      setEscalationMessage("");
      toast.success(`Ticket ${ticketNumber} created`);
    } catch (err) {
      console.error("Ticket creation error:", err);
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  if (isRidesPage || isDismissed) return null;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed right-4 md:right-6 z-50" style={{ bottom: "calc(72px + 88px + var(--zivo-safe-bottom,0px))" }}>
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              drag
              dragConstraints={{ top: -400, bottom: 100, left: -300, right: 0 }}
              dragElastic={0.1}
              dragMomentum={false}
              whileDrag={{ scale: 1.1 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-xl shadow-primary/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation cursor-grab active:cursor-grabbing"
            >
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
              {pulseVisible && (
                <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
            </motion.button>
            {/* Dismiss button */}
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
              className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-muted border border-border rounded-full flex items-center justify-center shadow-md hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
              aria-label="Close chat widget"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+5rem)] md:bottom-6 right-2 md:right-6 z-50 w-[calc(100vw-16px)] md:w-[380px] h-[520px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary to-primary/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  {chatMode === "ai" ? (
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Headphones className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-primary-foreground text-sm">
                    {chatMode === "ai" ? "ZIVO AI Support" : "Human Support"}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-xs text-primary-foreground/80">
                      {chatMode === "ai" ? "AI Online" : "Agent Available"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <button type="button"
                  onClick={() => switchMode(chatMode === "ai" ? "human" : "ai")}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                  title={chatMode === "ai" ? "Switch to human" : "Switch to AI"}
                >
                  <ArrowLeftRight className="w-4 h-4 text-primary-foreground" />
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode indicator bar */}
            <div className="flex border-b border-border/30 shrink-0">
              <button type="button"
                onClick={() => switchMode("ai")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  chatMode === "ai" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                AI Assistant
              </button>
              <button type="button"
                onClick={() => switchMode("human")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  chatMode === "human" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Headphones className="w-3 h-3" />
                Human Agent
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "assistant" ? "bg-primary/15" : "bg-muted"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[78%] p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-muted/60 rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    }`}
                  >
                    {msg.content || (isStreaming && msg.role === "assistant" ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Escalation Form */}
            {showEscalation && (
              <div className="px-4 pb-2 border-t border-border/50 pt-3 space-y-2 shrink-0">
                <p className="text-xs font-semibold text-foreground">Connect to human support</p>
                <div className="flex gap-1.5 flex-wrap">
                  {ESCALATION_CATEGORIES.map((cat) => (
                    <button type="button"
                      key={cat.value}
                      onClick={() => setEscalationCategory(cat.value)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-200 ${
                        escalationCategory === cat.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={escalationMessage}
                  onChange={(e) => setEscalationMessage(e.target.value)}
                  placeholder="Describe your issue (optional)..."
                  className="w-full px-3 py-2 bg-muted rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/50 resize-none h-16"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1 rounded-xl"
                    onClick={() => { setShowEscalation(false); setChatMode("ai"); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs flex-1 rounded-xl"
                    onClick={submitEscalation}
                    disabled={isSubmittingTicket}
                  >
                    {isSubmittingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Ticket"}
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Replies */}
            {!showEscalation && chatMode === "ai" && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                  {quickReplies.map((reply) => (
                    <button type="button"
                      key={reply}
                      onClick={() => sendMessage(reply)}
                      disabled={isStreaming}
                      className="flex-shrink-0 px-3 py-1.5 text-[11px] bg-muted/80 rounded-full hover:bg-muted transition-colors disabled:opacity-50 font-medium"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/50 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder={chatMode === "ai" ? "Ask ZIVO AI..." : "Type a message..."}
                  disabled={isStreaming || showEscalation}
                  className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
                <Button
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => sendMessage(input)}
                  disabled={isStreaming || !input.trim() || showEscalation}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChatWidget;
