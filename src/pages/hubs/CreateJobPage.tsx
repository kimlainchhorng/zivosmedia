/**
 * CreateJobPage — /jobs-hub/create
 * Post a gig or job into the gig hub (job_postings).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Wifi from "lucide-react/dist/esm/icons/wifi";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const CATEGORY_CHIPS = ["Driving", "Delivery", "Design", "Tech", "Writing", "Marketing", "Other"];

const fieldClass =
  "w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow";

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
      const { data, error } = await (dbFrom("job_postings") as { insert: (p: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } })
        .insert({
          poster_id: user.id, title,
          description: description || null,
          category: category || null,
          pay_cents: pay ? Math.round(parseFloat(pay) * 100) : null,
          pay_unit: pay ? payUnit : null,
          location: location || null,
          remote, status: "open",
        })
        .select("id")
        .single();
      if (error || !data) throw error || new Error("Failed");
      toast.success("Posted!");
      navigate(`/jobs-hub/${data.id}`);
    } catch {
      toast.error("Couldn't post job");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Clears the fixed Header (≈ safe-area inset + 48px row) on every device. */}
      <main className="pb-24 container mx-auto px-4 max-w-lg" style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem)" }}>
        <button
          type="button"
          onClick={() => navigate("/jobs-hub")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="w-4 h-4" /> All gigs
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-orange-500/10 border border-border text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
          Reach earners on ZIVO
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Post a gig or job</h1>
        <p className="text-sm text-muted-foreground mb-6">Describe the work — applicants can apply with one tap.</p>

        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="job-title" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Title <span className="text-rose-500">*</span></label>
            <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Need a driver this weekend" className={fieldClass} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label htmlFor="job-category" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORY_CHIPS.map((c) => {
                const active = category.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(active ? "" : c)}
                    aria-pressed={active}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-ig-gradient text-white border-transparent"
                        : "bg-background border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <input id="job-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Or type a custom category" className={fieldClass} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="job-desc" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea id="job-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the work? Any requirements or schedule?" rows={4} className={`${fieldClass} resize-none`} />
          </div>

          {/* Pay */}
          <div className="space-y-1.5">
            <label htmlFor="job-pay" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pay <span className="font-medium normal-case tracking-normal text-muted-foreground/70">(optional)</span></label>
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground">$</span>
              <input id="job-pay" inputMode="decimal" value={pay} onChange={(e) => setPay(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Amount" className={`flex-1 ${fieldClass}`} />
              <select aria-label="Pay unit" value={payUnit} onChange={(e) => setPayUnit(e.target.value as "hour" | "task" | "month")} className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="hour">/hr</option><option value="task">/task</option><option value="month">/mo</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label htmlFor="job-location" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Location <span className="font-medium normal-case tracking-normal text-muted-foreground/70">(optional)</span></label>
            <input id="job-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or area" className={fieldClass} />
          </div>

          {/* Remote toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={remote}
            onClick={() => setRemote((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-background border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Wifi className="w-4 h-4 text-muted-foreground" /> Remote / online work
            </span>
            <span className={`relative h-6 w-11 rounded-full transition-colors ${remote ? "bg-ig-gradient" : "bg-muted"}`}>
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${remote ? "translate-x-5" : ""}`} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !title}
            className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-ig-gradient text-white font-bold text-sm shadow-md shadow-black/10 disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post gig"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
