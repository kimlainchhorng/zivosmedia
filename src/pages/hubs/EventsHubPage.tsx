/**
 * EventsHubPage — /events-hub
 * Browse upcoming events with RSVP. Uses EventRSVPCard.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EventRSVPCard, { type EventData } from "@/components/events/EventRSVPCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import CalendarCheck from "lucide-react/dist/esm/icons/calendar-check";
import Users from "lucide-react/dist/esm/icons/users";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const STEPS = [
  { icon: CalendarDays, title: "Discover", desc: "Find meetups, parties & meetings near you" },
  { icon: CalendarCheck, title: "RSVP in a tap", desc: "Mark yourself going or maybe" },
  { icon: Users, title: "Show up & connect", desc: "Meet people who share your interests" },
];

type RangeKey = "all" | "today" | "week";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
];

export default function EventsHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[] | null>(null);
  const [myStatuses, setMyStatuses] = useState<Record<string, "going" | "maybe" | "declined">>({});
  const [range, setRange] = useState<RangeKey>("all");
  const listingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("events") as { select: (s: string) => { eq: (k: string, v: string) => { gte: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: EventData[] | null }> } } } } })
        .select("id, title, description, starts_at, location, cover_url, capacity, going_count")
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

  const shown = useMemo(() => {
    const list = events || [];
    if (range === "all") return list;
    const now = new Date();
    const end = new Date(now);
    if (range === "today") end.setHours(23, 59, 59, 999);
    else end.setDate(end.getDate() + 7);
    return list.filter((e) => new Date(e.starts_at) <= end);
  }, [events, range]);

  const scrollTo = (ref: RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-safe-header pb-24">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-background to-orange-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl py-8 sm:py-10"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-border text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
                What's on near you
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
                <span className="text-ig-gradient">Events</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">
                RSVP to local meetups, parties, and meetings — or host your own and bring people together.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/events-hub/create")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-lg shadow-black/10 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="w-4 h-4" /> Create event
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(listingsRef)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse events <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="container mx-auto px-4 pt-2 pb-10 sm:pb-14">
          <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
            <h2 className="text-base font-bold mb-6 text-center">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center text-fuchsia-500">
                    <step.icon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ig-gradient text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground max-w-[14rem]">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Events ── */}
        <section ref={listingsRef} className="container mx-auto px-4 scroll-mt-28">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">
              Upcoming{events && events.length > 0 ? ` (${events.length})` : ""}
            </h2>
          </div>

          {/* Date filter — only when there are events */}
          {events && events.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {RANGES.map((r) => {
                const active = range === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    aria-pressed={active}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "bg-ig-gradient text-white border-transparent" : "bg-background border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          {events == null ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card/30"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center mb-4 text-fuchsia-500">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-1">No upcoming events</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Be the first to host one — gather your community for a meetup, party, or meeting.
              </p>
              <button
                type="button"
                onClick={() => navigate("/events-hub/create")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Plus className="w-4 h-4" /> Create event
              </button>
            </motion.div>
          ) : shown.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No events in this range — try “All”.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map((ev) => <EventRSVPCard key={ev.id} event={ev} myStatus={myStatuses[ev.id] ?? null} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
