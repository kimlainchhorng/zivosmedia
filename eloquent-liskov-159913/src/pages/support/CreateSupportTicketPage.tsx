/**
 * CreateSupportTicketPage — /support/new
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import LifeBuoy from "lucide-react/dist/esm/icons/life-buoy";

const CATEGORIES = ["account", "payments", "trips", "chat", "merchant", "other"] as const;

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function CreateSupportTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("other");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id || !subject) { toast.error("Subject required"); return; }
    setBusy(true);
    try {
      const { error } = await (dbFrom("support_tickets") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
        user_id: user.id, subject, body: body || null, category, priority, status: "open",
      });
      if (error) throw error;
      toast.success("Ticket submitted — we'll respond within 24h");
      navigate("/support");
    } catch {
      toast.error("Couldn't submit ticket");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-md">
        <h1 className="text-2xl font-bold mb-1 inline-flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-primary" />Get help</h1>
        <p className="text-sm text-muted-foreground mb-6">Describe what's wrong — we'll get back ASAP.</p>
        <div className="space-y-3">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high" | "urgent")} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="What happened?" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <button type="button" onClick={() => void submit()} disabled={busy || !subject} className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit ticket"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
