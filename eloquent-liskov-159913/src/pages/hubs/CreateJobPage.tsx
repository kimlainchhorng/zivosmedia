/**
 * CreateJobPage — /jobs-hub/create
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

export default function CreateJobPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [pay, setPay] = useState("");
  const [payUnit, setPayUnit] = useState<"hour" | "task" | "month">("hour");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id || !title) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      const { error } = await (dbFrom("job_postings") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
        poster_id: user.id, title,
        description: description || null,
        category: category || null,
        pay_cents: pay ? Math.round(parseFloat(pay) * 100) : null,
        pay_unit: pay ? payUnit : null,
        location: location || null,
        remote, status: "open",
      });
      if (error) throw error;
      toast.success("Posted!");
      navigate("/jobs-hub");
    } catch {
      toast.error("Couldn't post job");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Post a gig or job</h1>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Need a driver this weekend)" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (driving, delivery, design...)" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the work? Any requirements?" rows={4} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <div className="flex items-center gap-2">
            <span className="text-lg text-muted-foreground">$</span>
            <input inputMode="decimal" value={pay} onChange={(e) => setPay(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Pay amount" className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={payUnit} onChange={(e) => setPayUnit(e.target.value as "hour" | "task" | "month")} className="px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none">
              <option value="hour">/hr</option><option value="task">/task</option><option value="month">/mo</option>
            </select>
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
            Remote / online work
          </label>
          <button type="button" onClick={() => void submit()} disabled={busy || !title} className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
