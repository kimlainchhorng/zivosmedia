/**
 * AIChatbotWidget — Real AI-powered support using Gemini via ai-support-chat edge function
 * Supports user order tracking and merchant Meta performance insights
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Sparkles, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIChatbotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "Hi! 👋 I'm ZIVO Assistant. I can help you track orders, understand your sales performance, or answer any questions. What can I help with?" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // If not authenticated, use local fallback
    if (!user) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Please log in to get personalized support. I can help with order tracking, Meta performance, and more once you're signed in!"
        }]);
        setIsStreaming(false);
      }, 500);
      return;
    }

    try {
      const apiMessages = newMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-support-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Too many requests. Please wait a moment.");
        } else if (resp.status === 402) {
          toast.error("AI service temporarily unavailable.");
        }
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: err.error || "Sorry, I'm having trouble connecting. Please try again in a moment."
        }]);
        setIsStreaming(false);
        return;
      }

      // Stream SSE response
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
              );
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch (err) {
      console.warn("[AIChatbot] Stream error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again shortly."
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, user]);

  const quickActions = ["Track Order", "Meta Performance", "Report Issue", "Help"];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 5rem)" }}
            className="fixed right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)]">
            <Card className="flex flex-col h-[480px] shadow-2xl border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">ZIVO AI Assistant</p>
                    <p className="text-xs opacity-80">Powered by Gemini</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Close chat" className="text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                      msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.content || (isStreaming ? "..." : "")}
                    </div>
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 text-sm">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {messages.length <= 2 && (
                <div className="px-3 pb-2 flex gap-1 flex-wrap">
                  {quickActions.map((action) => (
                    <Badge key={action} variant="outline" className="cursor-pointer text-xs hover:bg-muted"
                      onClick={() => setInput(action)}>
                      {action}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <Input placeholder="Ask anything..." value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()} className="text-sm" disabled={isStreaming} />
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || isStreaming}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — bottom offset includes safe-area inset so the button sits clear
          of the iOS home indicator on devices that have one. */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 1rem)" }}
        className="fixed right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </motion.button>
    </>
  );
}
