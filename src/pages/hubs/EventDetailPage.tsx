/**
 * EventDetailPage — /events-hub/:id
 *
 * Single-event view with title / description / start time / location +
 * RSVP buttons. Attendee count comes from the denormalized events.going_count
 * column (kept in sync by the event_rsvps trigger).
 */
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowLeft, Calendar, MapPin, Users, Loader2, CheckCircle2, HelpCircle, XCircle, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cover_url: string | null;
  capacity: number | null;
  going_count: number;
  visibility: string | null;
};

type RsvpStatus = "going" | "maybe" | "declined";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async (): Promise<EventRow | null> => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("events")
        .select("id, creator_id, title, description, starts_at, ends_at, location, cover_url, capacity, going_count, visibility")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as EventRow) ?? null;
    },
    enabled: !!id,
  });

  const { data: myRsvp } = useQuery({
    queryKey: ["event-rsvp", id, user?.id],
    queryFn: async (): Promise<RsvpStatus | null> => {
      if (!id || !user) return null;
      const { data } = await (supabase as any)
        .from("event_rsvps")
        .select("status")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.status as RsvpStatus) ?? null;
    },
    enabled: !!id && !!user,
  });

  const isCreator = !!event && !!user && event.creator_id === user.id;

  const rsvpMut = useMutation({
    mutationFn: async (status: RsvpStatus) => {
      if (!user) throw new Error("Sign in to RSVP");
      if (!id) throw new Error("Missing event");
      const { error } = await (supabase as any)
        .from("event_rsvps")
        .upsert(
          { event_id: id, user_id: user.id, status },
          { onConflict: "event_id,user_id" },
        );
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "going" ? "You're going!" : status === "maybe" ? "Marked maybe" : "Declined");
      qc.invalidateQueries({ queryKey: ["event-rsvp", id, user?.id] });
      qc.invalidateQueries({ queryKey: ["event", id] });
    },
    onError: (err: any) => toast.error(err?.message ?? "RSVP failed"),
  });

  const startsAtLabel = useMemo(() => {
    if (!event?.starts_at) return "";
    const d = new Date(event.starts_at);
    return d.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }, [event?.starts_at]);

  const endsAtLabel = useMemo(() => {
    if (!event?.ends_at) return "";
    const end = new Date(event.ends_at);
    const start = event.starts_at ? new Date(event.starts_at) : null;
    if (start && end.toDateString() === start.toDateString()) {
      return end.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return end.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }, [event?.ends_at, event?.starts_at]);

  const isFull =
    !!event && event.capacity != null && event.capacity > 0 && event.going_count >= event.capacity;
  const isPrivate = !!event && !!event.visibility && event.visibility !== "public";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-safe-header pb-24 container mx-auto px-4 max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/events-hub")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All events
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !event ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold mb-1">Event not found</p>
            <p className="text-sm text-muted-foreground">
              This event may have been removed or is no longer available.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {event.cover_url && (
              <div className="rounded-2xl overflow-hidden bg-muted aspect-[16/9]">
                <img src={event.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight">{event.title}</h1>
                {isCreator && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary mt-0.5">
                    Your event
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {isFull && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 text-[11px] font-bold uppercase tracking-wide">
                    Full
                  </span>
                )}
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold uppercase tracking-wide">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {startsAtLabel}
                  {endsAtLabel && <> &ndash; {endsAtLabel}</>}
                </span>
              </span>
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" /> {event.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0" />
                {event.going_count} going{event.capacity ? ` · ${event.capacity} cap.` : ""}
              </span>
            </div>

            {event.description && (
              <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
                {event.description}
              </p>
            )}

            {user && !isCreator && (
              <div className="space-y-3 pt-4 border-t border-border/40">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "going",    label: "Going",    icon: CheckCircle2, accent: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" },
                    { v: "maybe",    label: "Maybe",    icon: HelpCircle,   accent: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" },
                    { v: "declined", label: "Decline",  icon: XCircle,      accent: "bg-rose-500 text-white border-rose-500 hover:bg-rose-600" },
                  ] as const).map((opt) => {
                    const active = myRsvp === opt.v;
                    const goingDisabled = opt.v === "going" && isFull && !active;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => rsvpMut.mutate(opt.v)}
                        disabled={rsvpMut.isPending || goingDisabled}
                        className={cn(
                          "inline-flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60",
                          active
                            ? opt.accent
                            : goingDisabled
                              ? "bg-muted/50 text-muted-foreground border-border cursor-not-allowed"
                              : "bg-card text-foreground border-border hover:border-primary/40",
                        )}
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {isFull && !myRsvp && (
                  <p className="text-xs text-center text-muted-foreground">
                    This event is at full capacity.
                  </p>
                )}
              </div>
            )}

            {!user && (
              <div className="pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => navigate(`/login?redirect=/events-hub/${id}`)}
                  className="w-full py-3.5 rounded-xl bg-ig-gradient text-white font-extrabold text-sm active:scale-[0.98] transition-all"
                >
                  Sign in to RSVP
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
