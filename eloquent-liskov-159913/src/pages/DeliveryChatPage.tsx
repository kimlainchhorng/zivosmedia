import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/app/AppLayout";
import { cn } from "@/lib/utils";

interface DeliveryMessage {
  id: string;
  delivery_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function DeliveryChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initial load
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("delivery_messages")
        .select("id, delivery_id, sender_id, body, created_at")
        .eq("delivery_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMessages((data ?? []) as DeliveryMessage[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Realtime new messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`delivery-chat-${id}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_messages",
          filter: `delivery_id=eq.${id}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            // Skip if we already inserted optimistically (same id).
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as DeliveryMessage];
          });
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Autoscroll to bottom whenever messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!id || !user || !input.trim() || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const { error } = await (supabase as any).from("delivery_messages").insert({
      delivery_id: id,
      sender_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      // Restore the input so the user can retry.
      setInput(body);
    }
  };

  return (
    <AppLayout title="Delivery chat" hideHeader>
      <div className="flex flex-col h-[100dvh]">
        <div className="shrink-0 sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40">
          <div className="flex items-center gap-2.5 px-4 pt-safe pb-3">
            <button type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-bold text-[16px] flex-1">Delivery chat</h1>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-[12px] text-muted-foreground py-12">
              No messages yet. Say hi to coordinate the handoff.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug",
                      mine
                        ? "bg-violet-500 text-white rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 border-t border-border/40 p-3 pb-safe">
          <div className="flex items-center gap-2 bg-muted/40 rounded-2xl px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Message your driver…"
              className="flex-1 bg-transparent outline-none text-[14px]"
            />
            <button type="button"
              onClick={() => void send()}
              disabled={!input.trim() || sending}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                input.trim() && !sending
                  ? "bg-violet-500 text-white active:scale-90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
