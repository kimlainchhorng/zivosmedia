import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Send, Inbox, User, BellRing } from "lucide-react";
import { LoadingPanel, SectionShell, StatCard } from "./LodgingOperationsShared";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LodgingMessage {
  id: string;
  store_id: string;
  reservation_id: string | null;
  guest_id: string | null;
  sender_role: "guest" | "staff";
  body: string;
  created_at: string;
  read_at: string | null;
}

const QUICK_REPLIES = [
  { label: "Pre-arrival info", text: "Hello! Looking forward to having you. Check-in is from 3 PM. If you arrive earlier we'll happily store your bags." },
  { label: "Wi-Fi", text: "Wi-Fi network and password are in your room welcome card. Let us know if you need a stronger signal." },
  { label: "Late checkout", text: "We can offer late checkout until 1 PM (subject to availability). Just confirm and we'll arrange it." },
  { label: "Thanks for staying", text: "Thank you so much for staying with us! We'd love a quick review when you have a moment." },
];

export default function LodgingInboxSection({ storeId }: { storeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: reservations = [], isLoading: resLoading } = useLodgeReservations(storeId, "all");
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["lodging_messages", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodging_messages")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as LodgingMessage[];
    },
  });

  const messages = messagesQuery.data || [];

  // Group by reservation
  const threads = useMemo(() => {
    const map = new Map<string, LodgingMessage[]>();
    for (const m of messages) {
      const key = m.reservation_id || "_general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [messages]);

  // Build the visible reservation list — reservations + any with messages
  const reservationList = useMemo(() => {
    const list = (reservations || []).map((r: any) => ({
      id: r.id,
      guestName: r.guest_name || r.guest?.full_name || "Guest",
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
    }));
    return list;
  }, [reservations]);

  useEffect(() => {
    if (!activeReservationId && reservationList.length > 0) {
      setActiveReservationId(reservationList[0].id);
    }
  }, [reservationList, activeReservationId]);

  const activeMessages = activeReservationId ? threads.get(activeReservationId) || [] : [];
  const activeReservation = reservationList.find((r) => r.id === activeReservationId);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, [activeMessages.length, activeReservationId]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (!activeReservationId) throw new Error("No reservation selected");
      const reservation = reservations.find((r: any) => r.id === activeReservationId);
      const { error } = await (supabase as any).from("lodging_messages").insert({
        store_id: storeId,
        reservation_id: activeReservationId,
        guest_id: (reservation as any)?.guest_id || (reservation as any)?.guest?.id || null,
        sender_role: "staff",
        sender_user_id: user?.id || null,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["lodging_messages", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Send failed"),
  });

  const createConciergeTask = useMutation({
    mutationFn: async (msg: LodgingMessage) => {
      const reservation: any = reservations.find((r: any) => r.id === msg.reservation_id);
      const guestName = reservation?.guest_name || reservation?.guest?.full_name || "Guest";
      const roomNumber = reservation?.room_number || reservation?.room?.name || null;
      const title = msg.body.length > 60 ? `${msg.body.slice(0, 57)}…` : msg.body;
      const { error } = await (supabase as any).from("lodging_concierge_tasks").insert({
        store_id: storeId,
        reservation_id: msg.reservation_id,
        source_message_id: msg.id,
        guest_name: guestName,
        room_number: roomNumber,
        request_type: "general",
        title,
        description: msg.body,
        priority: "normal",
        status: "open",
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concierge task created", {
        description: "Linked back to this guest message.",
        action: { label: "Open task", onClick: () => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "lodge-concierge" } })) },
      });
      qc.invalidateQueries({ queryKey: ["lodging-sidebar-badges", storeId] });
      qc.invalidateQueries({ queryKey: ["lodging_concierge_tasks", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not create task"),
  });
  const unreadCount = messages.filter((m) => m.sender_role === "guest" && !m.read_at).length;

  return (
    <SectionShell title="Guest Inbox" subtitle="One conversation per reservation. Send pre-arrival, in-stay, and post-stay messages." icon={MessageSquareText}>
      <LodgingQuickJump active="lodge-inbox" />
      <LodgingSectionStatusBanner title="Guest Inbox" icon={MessageSquareText} countLabel="Unread from guests" countValue={unreadCount} fixLabel="Open Reservations" fixTab="lodge-reservations" />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Threads" value={String(threads.size)} icon={Inbox} />
        <StatCard label="Messages" value={String(messages.length)} icon={MessageSquareText} />
        <StatCard label="Unread" value={String(unreadCount)} icon={User} />
      </div>

      {resLoading || messagesQuery.isLoading ? <LoadingPanel /> : (
        <div className="grid gap-0 sm:grid-cols-[280px_1fr] rounded-lg border border-border overflow-hidden bg-card">
          {/* Left: reservation list */}
          <div className="border-r border-border max-h-[60vh] overflow-y-auto">
            {reservationList.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No reservations yet — once you have bookings they'll appear here.</div>
            ) : (
              reservationList.map((r) => {
                const thread = threads.get(r.id) || [];
                const last = thread[thread.length - 1];
                const unread = thread.filter((m) => m.sender_role === "guest" && !m.read_at).length;
                const isActive = r.id === activeReservationId;
                return (
                  <button type="button"
                    key={r.id}
                    onClick={() => setActiveReservationId(r.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                      isActive ? "bg-primary/10" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate flex-1">{r.guestName}</p>
                      {unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{unread}</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.checkIn ? new Date(r.checkIn).toLocaleDateString() : ""} — {r.status}
                    </p>
                    {last && <p className="text-xs text-muted-foreground truncate mt-0.5">{last.body}</p>}
                  </button>
                );
              })
            )}
          </div>

          {/* Right: thread */}
          <div className="flex flex-col min-h-[400px]">
            {activeReservation ? (
              <>
                <div className="border-b border-border px-3 py-2 bg-muted/30">
                  <p className="text-sm font-semibold">{activeReservation.guestName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeReservation.checkIn} → {activeReservation.checkOut}
                  </p>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-background/30">
                  {activeMessages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">No messages yet — send the first one below.</p>
                  ) : activeMessages.map((m) => (
                    <div key={m.id} className={cn("group max-w-[80%] rounded-2xl px-3 py-2 text-sm", m.sender_role === "staff" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()}</p>
                        {m.sender_role === "guest" && (
                          <button type="button"
                            onClick={() => createConciergeTask.mutate(m)}
                            disabled={createConciergeTask.isPending}
                            className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 opacity-0 transition group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                            title="Create concierge task from this message"
                          >
                            <BellRing className="mr-1 inline h-2.5 w-2.5" /> Task
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((q) => (
                      <Button key={q.label} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDraft(q.text)}>
                        {q.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message…"
                      rows={2}
                      className="flex-1 resize-none"
                    />
                    <Button onClick={() => draft.trim() && send.mutate(draft.trim())} disabled={!draft.trim() || send.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                Select a reservation to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
