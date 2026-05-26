import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ShieldAlert, Clock, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeOutgoingMessage, assessChatMessageRisk } from "@/lib/security/chatContentSafety";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import InTripCallButton from "./InTripCallButton";
import { Badge } from "@/components/ui/badge";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rideRequestId: string;
  counterpartName?: string;
  senderRole: "rider" | "driver";
  /** When true, show all messages with status pills + inline approve/block controls. Auto-detected from useAuth().isAdmin if omitted. */
  adminMode?: boolean;
}

interface TripMessage {
  id: string;
  sender_id: string;
  content: string;
  moderation_status: string;
  created_at: string;
  sender_role?: string | null;
}

export default function TripChatSheet({ open, onOpenChange, rideRequestId, counterpartName, senderRole, adminMode }: Props) {
  const { user, isAdmin } = useAuth();
  const requestedAdmin = adminMode ?? isAdmin;
  const [verifiedAdmin, setVerifiedAdmin] = useState(false);
  const isAdminView = requestedAdmin && verifiedAdmin;

  // Server-verify admin role before honoring admin UI affordances
  useEffect(() => {
    let cancelled = false;
    if (!requestedAdmin || !user) { setVerifiedAdmin(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
      if (!cancelled) setVerifiedAdmin(!error && data === true);
    })();
    const warn = setTimeout(() => {
      if (!cancelled && requestedAdmin && !verifiedAdmin && import.meta.env.DEV) {
        console.warn("[TripChatSheet] adminMode requested but user is not a verified admin — controls hidden.");
      }
    }, 2000);
    return () => { cancelled = true; clearTimeout(warn); };
  }, [requestedAdmin, user?.id]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !rideRequestId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("trip_messages")
        .select("id, sender_id, content, moderation_status, created_at, sender_role")
        .eq("ride_request_id", rideRequestId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as TripMessage[]);
    };
    fetchMessages();

    const unsubscribeInsert = subscribeToPooledPostgresChanges(
      {
        poolKey: `trip-chat:${rideRequestId}`,
        event: "INSERT",
        schema: "public",
        table: "trip_messages",
        filter: `ride_request_id=eq.${rideRequestId}`,
      },
      (payload) => {
        const next = payload.new as TripMessage;
        setMessages((prev) => prev.find((m) => m.id === next.id) ? prev : [...prev, next]);
      }
    );

    const unsubscribeUpdate = subscribeToPooledPostgresChanges(
      {
        poolKey: `trip-chat:${rideRequestId}`,
        event: "UPDATE",
        schema: "public",
        table: "trip_messages",
        filter: `ride_request_id=eq.${rideRequestId}`,
      },
      (payload) => {
        const next = payload.new as Partial<TripMessage> & { id: string };
        setMessages((prev) => prev.map((m) => m.id === next.id ? { ...m, ...next } : m));
      }
    );

    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
    };
  }, [open, rideRequestId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || !user || sending) return;
    const sanitized = sanitizeOutgoingMessage(input).slice(0, 500);
    if (!sanitized) return;
    const risk = assessChatMessageRisk(sanitized);
    if (risk.blocked) {
      toast.error("Message blocked by safety filters");
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("trip_messages")
      .insert({
        ride_request_id: rideRequestId,
        trip_id: rideRequestId,
        sender_id: user.id,
        sender_type: senderRole,
        sender_role: senderRole,
        content: sanitized,
        body: sanitized,
        moderation_status: "pending",
      } as any)
      .select("id")
      .single();
    setSending(false);
    if (error) { toast.error("Could not send"); return; }
    setInput("");
    // Fire-and-forget moderation
    supabase.functions.invoke("moderate-trip-message", { body: { message_id: data.id } }).catch(() => {});
  };

  const moderate = async (id: string, decision: "clean" | "blocked") => {
    setModeratingId(id);
    const { error } = await supabase.functions.invoke("admin-moderate-message", {
      body: { message_id: id, decision },
    });
    setModeratingId(null);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(decision === "clean" ? "Message approved" : "Message blocked");
  };

  // Admin sees everything; regular users see clean messages or their own.
  const visibleMessages = isAdminView
    ? messages
    : messages.filter((m) => m.moderation_status === "clean" || m.sender_id === user?.id);

  const statusPill = (status: string) => {
    if (status === "clean") return <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/15 text-emerald-600 border-0">clean</Badge>;
    if (status === "blocked") return <Badge className="text-[10px] h-4 px-1.5 bg-destructive/15 text-destructive border-0">blocked</Badge>;
    return <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/15 text-amber-600 border-0">{status}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/30 flex flex-row items-center justify-between gap-2 space-y-0">
          <SheetTitle className="text-sm flex items-center gap-2">
            {counterpartName || (senderRole === "rider" ? "Driver" : "Rider")}
            {isAdminView && <Badge variant="outline" className="text-[10px]">Admin view</Badge>}
          </SheetTitle>
          {!isAdminView && <InTripCallButton rideRequestId={rideRequestId} />}
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div className="space-y-2">
            {visibleMessages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi!</p>
            )}
            {visibleMessages.map((m) => {
              const isMe = m.sender_id === user?.id;
              const isPending = m.moderation_status === "pending" || m.moderation_status === "pending_review";
              const isBlocked = m.moderation_status === "blocked";
              const showAdminControls = isAdminView && m.moderation_status !== "clean";
              return (
                <div key={m.id} className={cn("flex flex-col", isMe && !isAdminView ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                    isAdminView ? "bg-muted text-foreground" : (isMe ? "bg-emerald-500 text-white" : "bg-muted text-foreground"),
                    isBlocked && "opacity-60 line-through"
                  )}>
                    {isAdminView && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-medium capitalize text-muted-foreground">{m.sender_role || "—"}</span>
                        {statusPill(m.moderation_status)}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    {!isAdminView && isMe && (isPending || isBlocked) && (
                      <p className="text-[10px] mt-1 opacity-90 flex items-center gap-1">
                        {isBlocked ? <ShieldAlert className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isBlocked ? "Blocked by safety" : "Reviewing..."}
                      </p>
                    )}
                  </div>
                  {showAdminControls && (
                    <div className="flex gap-1.5 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        disabled={moderatingId === m.id}
                        onClick={() => moderate(m.id, "clean")}
                      >
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={moderatingId === m.id}
                        onClick={() => moderate(m.id, "blocked")}
                      >
                        <ShieldAlert className="w-3 h-3" /> Block
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!isAdminView && (
          <div className="border-t border-border/30 p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message..."
              maxLength={500}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              className="flex-1"
            />
            <Button onClick={send} disabled={!input.trim() || sending} size="icon" className="bg-emerald-500 hover:bg-emerald-600">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
