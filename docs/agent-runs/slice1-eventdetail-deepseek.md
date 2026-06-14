# DeepSeek run — 2026-06-13T20:44:30.250Z

- model: deepseek-chat
- task: Bring EventDetailPage.tsx to visual and responsive parity (375/768/1280) with the premium reference JobPostingDetailPage.tsx. Hard rule: do NOT change any supabase queries, mutations, react-query keys, or routing - only JSX and Tailwind classes and tiny display-only logic. Fix these real gaps: (1) ends_at is fetched but never shown - display an end time or date range; (2) visibility is fetched but unused - show a Private badge when visibility is not public; (3) no Full state when going_count is greater than or equal to capacity - show a Full badge and disable the Going button. Match the reference header pattern: a rounded-2xl bg-primary/10 icon chip with a Calendar icon, the title, and a right-side badge. Add a polished flex-wrap meta row, border-t separation around the RSVP section, and refined active:scale buttons. No framer-motion. Return the revised JSX for ONLY the event-loaded branch (the div with className space-y-5).
- files: src/pages/hubs/EventDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

I'll revise the event-loaded JSX branch (the `div` with `className="space-y-5"`) to match the `JobPostingDetailPage` reference pattern while keeping all existing data fetches and mutations untouched. Changes:

1. **Header pattern**: Replace the plain `<h1>` with a flex row: rounded-2xl `bg-primary/10` icon chip (Calendar icon), title + subtitle, and a right-side badge (Private/Full).
2. **End time display**: Show `ends_at` as either a date range or just the end time.
3. **Visibility badge**: Show a "Private" badge when `visibility !== 'public'`.
4. **Full state**: When `going_count >= capacity`, show a "Full" badge and disable the "Going" button.
5. **Meta row**: Flex-wrap row with location, going/capacity, visibility badge, end time.
6. **Border-t separation** around the RSVP section.
7. **Refined active:scale buttons** (0.98 instead of 0.97).
8. **No framer-motion**.

## Proposed Change

**File**: `src/pages/hubs/EventDetailPage.tsx`

Replace the event-loaded branch (lines ~100-170, the `div` with `className="space-y-5"`) with:

```tsx
<div className="space-y-5">
  {event.cover_url && (
    <div className="rounded-2xl overflow-hidden bg-muted aspect-[16/9]">
      <img src={event.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
    </div>
  )}

  {/* Header: icon chip + title + right badge */}
  <div className="flex items-start gap-3">
    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      <Calendar className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight">{event.title}</h1>
      {isCreator && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
          Your event
        </p>
      )}
    </div>
    {/* Right-side badges */}
    <div className="flex flex-col gap-1 shrink-0">
      {event.capacity != null && event.going_count >= event.capacity && (
        <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 text-sm font-extrabold">
          Full
        </span>
      )}
      {event.visibility && event.visibility !== "public" && (
        <span className="px-3 py-1 rounded-full bg-muted text-foreground text-sm font-extrabold">
          Private
        </span>
      )}
    </div>
  </div>

  {/* Meta row: flex-wrap */}
  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-1">
      <Calendar className="w-3.5 h-3.5" /> {startsAtLabel}
    </span>
    {event.ends_at && (
      <span className="inline-flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" /> Ends{" "}
        {new Date(event.ends_at).toLocaleString(undefined, {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit",
        })}
      </span>
    )}
    {event.location && (
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" /> {event.location}
      </span>
    )}
    <span className="inline-flex items-center gap-1">
      <Users className="w-3.5 h-3.5" /> {event.going_count} going
      {event.capacity ? ` / ${event.capacity} capacity` : ""}
    </span>
  </div>

  {event.description && (
    <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
      {event.description}
    </p>
  )}

  {/* RSVP section with border-t separation */}
  {user && !isCreator && (
    <div className="pt-4 border-t border-border/40">
      <div className="grid grid-cols-3 gap-2">
        {([
          { v: "going",    label: "Going",    icon: CheckCircle2, accent: "bg-emerald-500 text-white border-emerald-500" },
          { v: "maybe",    label: "Maybe",    icon: HelpCircle,   accent: "bg-amber-500 text-white border-amber-500" },
          { v: "declined", label: "Decline",  icon: XCircle,      accent: "bg-rose-500 text-white border-rose-500" },
        ] as const).map((opt) => {
          const active = myRsvp === opt.v;
          const isFull = opt.v === "going" && event.capacity != null && event.going_count >= event.capacity && myRsvp !== "going";
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => rsvpMut.mutate(opt.v)}
              disabled={rsvpMut.isPending || isFull}
              className={cn(
                "inline-flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60",
                active
                  ? opt.accent
                  : "bg-card text-foreground border-border hover:border-primary/40",
              )}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  )}

  {!user && (
    <button
      type="button"
      onClick={() => navigate(`/login?redirect=/events-hub/${id}`)}
      className="w-full py-3 rounded-xl bg-ig-gradient text-white font-bold text-sm"
    >
      Sign in to RSVP
    </button>
  )}
</div>
```

## What to verify

1. **`npm run update`** must pass (type-check + worker + build).
2. **Preview** an event with `ends_at` set → end time should appear.
3. **Preview** an event with `visibility: "private"` → "Private" badge shows.
4. **Preview** an event where `going_count >= capacity` → "Full" badge shows + "Going" button is disabled (unless user already clicked Going).
5. **Preview** at 375/768/1280 widths → meta row wraps correctly.
6. **No supabase queries, mutations, react-query keys, or routing changed** — only JSX/Tailwind/display logic.
