# MiMo run — 2026-06-13T20:47:00.832Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Bring EventDetailPage.tsx to visual and responsive parity (375/768/1280) with the premium reference JobPostingDetailPage.tsx. Hard rule: do NOT change any supabase queries, mutations, react-query keys, or routing - only JSX and Tailwind classes and tiny display-only logic. Fix these real gaps: (1) ends_at is fetched but never shown - display an end time or date range; (2) visibility is fetched but unused - show a Private badge when visibility is not public; (3) no Full state when going_count is greater than or equal to capacity - show a Full badge and disable the Going button. Match the reference header pattern: a rounded-2xl bg-primary/10 icon chip with a Calendar icon, the title, and a right-side badge. Add a polished flex-wrap meta row, border-t separation around the RSVP section, and refined active:scale buttons. No framer-motion. Return the revised JSX for ONLY the event-loaded branch (the div with className space-y-5).
- files: src/pages/hubs/EventDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

1. **Add imports**: `Lock` icon from lucide (for Private badge).
2. **Add display-only computations** (above the `return`): `endsAtLabel` memo, `isFull` boolean, `isPrivate` boolean. No query/mutation changes.
3. **Replace the event-loaded `<div className="space-y-5">`** with premium JSX matching `JobPostingDetailPage` patterns:
   - Header: rounded-2xl `bg-primary/10` Calendar chip + title + right-side badges (Full / Private).
   - Flex-wrap meta row (`text-xs text-muted-foreground`) showing date range, location, attendance.
   - `border-t border-border/40` separating the RSVP section.
   - Full state: disable Going button when at/over capacity, show "Full" badge + helper text.
   - Refined `active:scale-[0.98]` on all buttons.
   - Private badge when `visibility !== "public"`.

---

## Proposed changes

### File: `src/pages/hubs/EventDetailPage.tsx`

**① Add `Lock` to imports (line with lucide icons):**

```diff
 import {
-  ArrowLeft, Calendar, MapPin, Users, Loader2, CheckCircle2, HelpCircle, XCircle,
+  ArrowLeft, Calendar, MapPin, Users, Loader2, CheckCircle2, HelpCircle, XCircle, Lock,
 } from "lucide-react";
```

**② Add three display-only computed values after the `rsvpMut` block and before `startsAtLabel`:**

```diff
  const startsAtLabel = useMemo(() => {
    if (!event?.starts_at) return "";
    const d = new Date(event.starts_at);
    return d.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }, [event?.starts_at]);

+  const endsAtLabel = useMemo(() => {
+    if (!event?.ends_at) return "";
+    const end = new Date(event.ends_at);
+    const start = event.starts_at ? new Date(event.starts_at) : null;
+    // Same day → show end time only
+    if (start && end.toDateString() === start.toDateString()) {
+      return end.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
+    }
+    // Different day → full date + time
+    return end.toLocaleString(undefined, {
+      weekday: "short", month: "short", day: "numeric",
+      hour: "numeric", minute: "2-digit",
+    });
+  }, [event?.ends_at, event?.starts_at]);
+
+  const isFull =
+    !!event && event.capacity != null && event.capacity > 0 && event.going_count >= event.capacity;
+
+  const isPrivate = !!event && !!event.visibility && event.visibility !== "public";
```

**③ Replace the entire event-loaded branch `<div className="space-y-5">` … `</div>` with:**

```jsx
          <div className="space-y-5">
            {/* Cover image */}
            {event.cover_url && (
              <div className="rounded-2xl overflow-hidden bg-muted aspect-[16/9]">
                <img src={event.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            )}

            {/* Header: icon chip + title + badges */}
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

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                {event.going_count} going{event.capacity ? ` \u00B7 ${event.capacity} cap.` : ""}
              </span>
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
                {event.description}
              </p>
            )}

            {/* RSVP section — border-t separated */}
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

            {/* Sign in to RSVP */}
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
```

---

## What changed at a glance

| Gap | Fix |
|-----|-----|
| `ends_at` fetched, never shown | `endsAtLabel` memo → appended to date meta row with ` – ` separator; shows time-only for same-day, full date+time for multi-day |
| `visibility` fetched, unused | `isPrivate` → "Private" badge with `Lock` icon in header (right of title) |
| No Full state | `isFull = going_count >= capacity` → "Full" rose badge in header; Going button disabled + dimmed; helper text below buttons |
| Flat header | Icon chip (`Calendar` in `rounded-2xl bg-primary/10`) + `flex-1` title + right-side badges |
| Vertical meta list | Horizontal `flex flex-wrap` meta row with `text-xs` + `inline-flex` icon spans |
| No RSVP separation | `border-t border-border/40 pt-4` wrapping the RSVP grid |
| `active:scale-[0.97]` | Bumped to `active:scale-[0.98]` + added `hover:bg-{color}-600` on active-state accent buttons |
| Sign-in button | Wrapped in `border-t` container; `font-extrabold` + `py-3.5` to match reference Apply button |

**Not touched:** all `useQuery`/`useMutation` calls, query keys, Supabase selects, routing, `EventRow` type.

---

## Owner verification

1. `npm run update` — must pass (types + worker types + build).
2. Preview at `/events-hub/<id>` at 375 / 768 / 1280: header chip + badges render; meta row wraps cleanly on 375; RSVP grid is 3-col at all widths.
3. Create a test event with `ends_at` set → confirm date range renders correctly (same-day shows end time only; multi-day shows full range).
4. Set an
