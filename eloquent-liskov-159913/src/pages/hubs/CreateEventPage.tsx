/**
 * CreateEventPage — /events-hub/create
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

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
      toast.success("Event created!");
      navigate(`/events-hub`);
    } catch {
      toast.error("Couldn't create event");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create an event</h1>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Start time</label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity (optional)" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="button" onClick={() => void submit()} disabled={busy || !title || !startsAt} className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create event"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
