/**
 * CreateEventPage — /events-hub/create
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import HubFormShell, { Field, fieldClass } from "@/components/hubs/HubFormShell";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id || !title || !startsAt) { toast.error("Title and start time are required"); return; }
    setBusy(true);
    try {
      const { data, error } = await (dbFrom("events") as { insert: (p: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } })
        .insert({
          creator_id: user.id,
          title,
          description: description || null,
          starts_at: new Date(startsAt).toISOString(),
          location: location || null,
          capacity: capacity ? parseInt(capacity, 10) : null,
          visibility: "public",
        })
        .select("id")
        .single();
      if (error || !data) throw error || new Error("Failed");
      const eventId = data.id;

      // Auto-RSVP the creator as 'going' so they show up in the attendee
      // count and the going_count trigger increments immediately. Non-fatal:
      // the event exists either way.
      try {
        await (dbFrom("event_rsvps") as { upsert: (p: unknown, o: unknown) => Promise<{ error: unknown }> })
          .upsert(
            { event_id: eventId, user_id: user.id, status: "going" },
            { onConflict: "event_id,user_id" },
          );
      } catch {
        /* non-fatal — creator can RSVP from the detail page */
      }

      toast.success("Event created!");
      navigate(`/events-hub/${eventId}`);
    } catch {
      toast.error("Couldn't create event");
    }
    setBusy(false);
  };

  return (
    <HubFormShell
      backTo="/events-hub"
      backLabel="Events"
      badge="Host on ZIVO"
      badgeIcon={CalendarPlus}
      title="Create an event"
      subtitle="Gather your community for a meetup, party, or meeting."
      submitLabel="Create event"
      onSubmit={() => void submit()}
      busy={busy}
      canSubmit={!!title && !!startsAt}
    >
      <Field label="Title" htmlFor="ev-title" required>
        <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className={fieldClass} />
      </Field>
      <Field label="Description" htmlFor="ev-desc">
        <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening?" rows={3} className={`${fieldClass} resize-none`} />
      </Field>
      <Field label="Start time" htmlFor="ev-start" required>
        <input id="ev-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={fieldClass} />
      </Field>
      <Field label="Location" htmlFor="ev-loc" optional>
        <input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where is it?" className={fieldClass} />
      </Field>
      <Field label="Capacity" htmlFor="ev-cap" optional>
        <input id="ev-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Max attendees" className={fieldClass} />
      </Field>
    </HubFormShell>
  );
}
