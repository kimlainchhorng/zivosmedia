/**
 * EventsHubPage — /events-hub
 * Browse upcoming events with RSVP. Uses EventRSVPCard.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EventRSVPCard, { type EventData } from "@/components/events/EventRSVPCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import { useNavigate } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function EventsHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[] | null>(null);
  const [myStatuses, setMyStatuses] = useState<Record<string, "going" | "maybe" | "declined">>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("events") as { select: (s: string) => { eq: (k: string, v: string) => { gte: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: EventData[] | null }> } } } } })
        .select("id, title, description, starts_at, location, cover_url, capacity")
        .eq("visibility", "public")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(50);
      if (cancelled) return;
      setEvents((data as EventData[] | null) || []);

      if (user?.id && data?.length) {
        const ids = data.map((e) => e.id);
        const { data: rsvps } = await (dbFrom("event_rsvps") as { select: (s: string) => { in: (k: string, v: string[]) => { eq: (k: string, v: string) => Promise<{ data: { event_id: string; status: "going" | "maybe" | "declined" }[] | null }> } } })
          .select("event_id, status")
          .in("event_id", ids)
          .eq("user_id", user.id);
        if (!cancelled) {
          const map: Record<string, "going" | "maybe" | "declined"> = {};
          (rsvps || []).forEach((r) => { map[r.event_id] = r.status; });
          setMyStatuses(map);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Events</h1>
            <p className="text-sm text-muted-foreground">RSVP to local meetups, parties, and meetings.</p>
          </div>
          <button type="button" onClick={() => navigate("/events-hub/create")} className="inline-flex min-h-[40px] items-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold touch-manipulation">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {events == null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No upcoming events. Be the first to host one.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => <EventRSVPCard key={ev.id} event={ev} myStatus={myStatuses[ev.id] ?? null} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
