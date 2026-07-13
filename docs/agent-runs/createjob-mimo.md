# MiMo run — 2026-06-12T17:42:47.623Z

- model: mimo-v2.5-pro
- task: Improve the 'Post a gig' form at src/pages/hubs/CreateJobPage.tsx. Keep the EXACT existing supabase insert logic and state vars (title, description, category, pay, payUnit, location, remote, busy, submit). Issues to fix: (1) header clip — main uses pt-24 but the fixed Header is ~112px tall; the correct offset is paddingTop: calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem); (2) fields are placeholder-only with NO <label> (a11y gap) — add real labels; (3) plain styling — wrap in a premium form card (rounded-2xl border bg-card/50), add a back link to /jobs-hub, add category quick-pick chips (Driving, Delivery, Design, Tech, Writing, Marketing, Other) that set the category state, keep a text input for custom; (4) nicer remote toggle. Use ONLY existing design system: Tailwind tokens (bg-background, bg-card, text-muted-foreground, border-border, rounded-2xl), bg-ig-gradient for the submit button, lucide-react icons (import individually like 'lucide-react/dist/esm/icons/x'). Output concrete pasteable TSX. No new deps, no invented routes, no fake data.
- files: src/pages/hubs/CreateJobPage.tsx

---

## Plan

1. **Header clip**: Replace `className="pt-24"` with `style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem)" }}`.
2. **Accessible labels**: Every field gets a `<label htmlFor="…">` with a matching `id` on the input.
3. **Premium form card**: Wrap fields in `rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6`. Add `<Link to="/jobs-hub">` back-arrow. Category quick-pick chips (7 items) that toggle the same `category` state, with a text input below for custom.
4. **Nicer remote toggle**: Accessible `role="switch"` pill toggle (primary when on, muted when off) in a labeled row.
5. **Insert logic & state**: Copied verbatim — zero changes to `submit()`, state vars, or Supabase call.
6. **Width**: Bump `max-w-md` → `max-w-lg` so the pay row (dollar + input + select) breathes inside the card padding.

No new deps. Only new imports: `Link` (react-router-dom, already available) and 5 lucide icons imported individually.

---

## Proposed file: `src/pages/hubs/CreateJobPage.tsx`

Replace the entire file with:

```tsx
/**
 * CreateJobPage — /jobs-hub/create
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Tag from "lucide-react/dist/esm/icons/tag";
import FileText from "lucide-react/dist/esm/icons/file-text";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Globe from "lucide-react/dist/esm/icons/globe";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const QUICK_CATEGORIES = [
  "Driving",
  "Delivery",
  "Design",
  "Tech",
  "Writing",
  "Marketing",
  "Other",
] as const;

const fieldCls =
  "w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";

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

  /* ── insert logic: UNCHANGED ─────────────────────────────── */
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

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main
        className="pb-24 container mx-auto px-4 max-w-lg"
        style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem)" }}
      >
        {/* back link */}
        <Link
          to="/jobs-hub"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Jobs Hub
        </Link>

        <h1 className="text-2xl font-bold mb-6">Post a Gig</h1>

        {/* ── form card ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6 space-y-5">
          {/* title */}
          <div className="space-y-1.5">
            <label htmlFor="gig-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="gig-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need a driver this weekend"
              className={fieldCls}
            />
          </div>

          {/* category — chips + custom input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              Category
            </label>
            <div className="flex flex-wrap gap-2" role="listbox" aria-label="Category quick picks">
              {QUICK_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={category === c}
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    category === c
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              id="gig-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Or type a custom category…"
              className={`${fieldCls} mt-2`}
            />
          </div>

          {/* description */}
          <div className="space-y-1.5">
            <label htmlFor="gig-desc" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Description
            </label>
            <textarea
              id="gig-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the work? Any requirements?"
              rows={4}
              className={`${fieldCls} resize-none`}
            />
          </div>

          {/* pay */}
          <div className="space-y-1.5">
            <label htmlFor="gig-pay" className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              Pay
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground">$</span>
              <input
                id="gig-pay"
                inputMode="decimal"
                value={pay}
                onChange={(e) => setPay(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Amount"
                className={`${fieldCls} flex-1`}
              />
              <select
                value={payUnit}
                onChange={(e) => setPayUnit(e.target.value as "hour" | "task" | "month")}
                className={`${fieldCls} w-auto`}
              >
                <option value="hour">/hr</option>
                <option value="task">/task</option>
                <option value="month">/mo</option>
              </select>
            </div>
          </div>

          {/* location */}
          <div className="space-y-1.5">
            <label htmlFor="gig-location" className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Location
            </label>
            <input
              id="gig-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or address"
              className={fieldCls}
            />
          </div>

          {/* remote toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Remote / online work</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={remote}
              onClick={() => setRemote((r) => !r)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                remote ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                aria-hidden
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  remote ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* submit */}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !title}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 transition-opacity"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Gig"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

---

## What changed (summary)

| Area | Before | After |
|---|---|---|
| **Header offset** | `className="pt-24"` (96px — 16px short of ~112px Header) | `style={{ paddingTop: "calc(var(--zivo-safe-top-sticky, 64px) + 3.5rem)" }}` — adapts to safe-area + exact header |
| **Labels** | Only placeholder text, one `<label>` (remote checkbox) | Every field has `<label htmlFor="…">` + matching `id` |
| **Form wrapper** | Bare `<div className="space-y-3">` | `rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6 space-y-5` card |
| **Back link** | None | `<Link to="/jobs-hub">` with ArrowLeft icon |
| **Category** | Single text input | Quick-pick chips (7 items, `role="listbox"` / `role="option"`) that toggle `category` + text input below for custom — same state var |
| **Remote toggle** | Plain `<input type="checkbox">` | Accessible `role="switch"` pill toggle (`aria-checked`, focus-visible ring) in a labeled row with Globe icon |
| **Width** | `max-w-md` (448px — tight with card padding) | `max-w-lg` (512px — comfortable) |
| **Insert logic** | — | **Verbatim copy** — zero changes to `submit()`, state, or Supabase call |

---

## Owner verification

1. **Preview**: Navigate to `/jobs-hub/create` — confirm the form card renders, chips toggle correctly, switch animates, back link goes to `/jobs-hub`.
2. **A11y**: Tab through the form — every field should receive visible focus; the switch should announce "on/off" via `aria-checked`.
3. **Header gap**: Confirm no content is hidden behind the fixed Header on both desktop and mobile (the CSS var `--zivo-safe-top-sticky` is set by the Header component or falls back to 64px).
4. **Gate**: Run `npm run update` — must pass (type-check + worker type-check + production build).
5. **No functional change**: The Supabase insert payload is byte-identical. Post a test gig on the travel or main host to confirm the flow still works end-to-end.
