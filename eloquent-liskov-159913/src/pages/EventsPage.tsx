/**
 * EventsPage — Discover, create & RSVP to events
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { ArrowLeft, Plus, Calendar, MapPin, Users, Clock, Ticket, Globe, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, isToday } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["All", "Music", "Sports", "Tech", "Art", "Food", "Social", "Business", "Health"];

export default function EventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", location: "", start_time: "", category: "Social", is_free: true });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["social-events", selectedCategory],
    queryFn: async () => {
      let query = (supabase as any)
        .from("social_events")
        .select("*")
        .eq("status", "published")
        .order("start_time", { ascending: true });
      if (selectedCategory !== "All") query = query.eq("category", selectedCategory);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("event_attendees")
        .select("event_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Login required");
      const existing = myRsvps.find((r: any) => r.event_id === eventId);
      if (existing) {
        await (supabase as any).from("event_attendees").delete().eq("event_id", eventId).eq("user_id", user.id);
      } else {
        const { error } = await (supabase as any).from("event_attendees").insert({
          event_id: eventId, user_id: user.id, status: "going",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["social-events"] });
      toast.success("RSVP updated!");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      const { error } = await (supabase as any).from("social_events").insert({
        ...newEvent, host_id: user.id, status: "published", visibility: "public",
        start_time: new Date(newEvent.start_time).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-events"] });
      toast.success("Event created!");
      setShowCreate(false);
      setNewEvent({ title: "", description: "", location: "", start_time: "", category: "Social", is_free: true });
    },
  });

  const rsvpSet = new Set(myRsvps.map((r: any) => r.event_id));
  const filtered = events.filter((e: any) =>
    !searchQuery || e.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead
        title="Events – ZIVO | Discover Local & Online Events"
        description="Find and join events near you on ZIVO. Discover meetups, concerts, food festivals, and more."
        canonical="/events"
      />
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">Events</h1>
          {user && (
            <button type="button" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading events...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No events found</p>
          </div>
        ) : (
          filtered.map((event: any, i: number) => {
            const isRsvpd = rsvpSet.has(event.id);
            const eventDate = new Date(event.start_time);
            const past = isPast(eventDate) && !isToday(eventDate);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-card rounded-2xl border border-border/30 overflow-hidden ${past ? "opacity-60" : ""}`}
              >
                {/* Cover */}
                {event.cover_image_url && (
                  <img
                    src={event.cover_image_url}
	                    alt={event.title}
	                    className="w-full h-36 object-cover"
	                    loading="lazy"
	                    decoding="async"
	                  />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">{event.title}</h3>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{event.description}</p>
                      )}
                    </div>
                    {event.category && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0">
                        {event.category}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(eventDate, "MMM d, yyyy · h:mm a")}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                    {event.is_online && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Online
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.attendee_count || 0} going
                    </span>
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" />
                      {event.is_free ? "Free" : `$${((event.ticket_price_cents || 0) / 100).toFixed(2)}`}
                    </span>
                  </div>

                  {user && !past && (
                    <button type="button"
                      onClick={() => rsvpMutation.mutate(event.id)}
                      disabled={rsvpMutation.isPending}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isRsvpd
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isRsvpd ? "Cancel RSVP" : "RSVP — I'm Going"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Event Sheet */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 space-y-4">
                <h3 className="text-base font-bold">Create Event</h3>
                <input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Location"
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="datetime-local"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!newEvent.title || !newEvent.start_time || createMutation.isPending}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Event"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ZivoMobileNav />
    </div>
  );
}
