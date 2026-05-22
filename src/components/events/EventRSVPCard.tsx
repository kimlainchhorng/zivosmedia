/**
 * EventRSVPCard — render an event with RSVP buttons.
 * Tap Going/Maybe/Decline to upsert into event_rsvps.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Users from "lucide-react/dist/esm/icons/users";

export interface EventData {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  location?: string | null;
  cover_url?: string | null;
  capacity?: number | null;
  going_count?: number;
}

interface Props {
  event: EventData;
  myStatus?: "going" | "maybe" | "declined" | null;
  onRSVP?: (status: "going" | "maybe" | "declined") => void;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function EventRSVPCard({ event, myStatus, onRSVP }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const rsvp = async (status: "going" | "maybe" | "declined") => {
    if (!user?.id) return;
    setBusy(true);
    try {
      await (dbFrom("event_rsvps") as { upsert: (p: unknown, o: unknown) => Promise<unknown> }).upsert(
        { event_id: event.id, user_id: user.id, status },
        { onConflict: "event_id,user_id" },
      );
      toast.success(`RSVP: ${status}`);
      onRSVP?.(status);
    } catch {
      toast.error("Couldn't RSVP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm max-w-[320px]">
	      {event.cover_url && <img src={event.cover_url} alt="" className="w-full aspect-[16/9] object-cover" loading="lazy" decoding="async" />}
      <div className="p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Event</p>
        <p className="text-base font-bold">{event.title}</p>
        {event.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>}
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(parseISO(event.starts_at), "EEE, MMM d · p")}</div>
          {event.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.location}</div>}
          {event.going_count != null && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{event.going_count} going{event.capacity ? ` / ${event.capacity}` : ""}</div>}
        </div>
        <div className="mt-3 flex gap-1.5">
          {(["going","maybe","declined"] as const).map((s) => (
            <button type="button"
              key={s}
              onClick={() => void rsvp(s)}
              disabled={busy}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition active:scale-95 ${myStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"}`}
            >
              {s === "going" ? "Going" : s === "maybe" ? "Maybe" : "Can't"}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
