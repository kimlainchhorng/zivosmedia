# DeepSeek run — 2026-06-13T22:49:00.128Z

- model: deepseek-chat
- task: Analyze src/pages/salon/PublicSalonCheckinPage.tsx (customer-facing PUBLIC salon walk-in check-in kiosk, route /salon/:slug/check-in — store looked up via store_profiles by slug; TWO views: (1) Step-1 pick a service from salon_services + enter name/phone then salon_public_create_walkin RPC; (2) Confirmation view ?id=bookingId showing live queue position/ETA via salon_public_get_walkin_status RPC, polled 30s + salon_bookings realtime) for PREMIUM interaction-polish parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change supabase queries, the salon_public_create_walkin / salon_public_get_walkin_status RPCs, mutations, routing, polling/realtime, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. CONTEXT: shadcn Button/Input/Label ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those (the Join-the-queue Button + Name/Phone Inputs). Focus ONLY on RAW interactive elements with ZERO active:scale and ZERO focus rings. I believe there are exactly 3 raw controls: (A) confirmation-view Back-to-store Link ~L280 className 'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'; (B) step-1 Back-to-store Link ~L294 className 'mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground' (A and B share the substring 'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'); (C) the service-selection button ~L320 with cn() base 'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors'. Propose exact classNames: for the two back Links append active:scale-[0.97] + transition-all + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring + rounded-sm; for the service button (a genuinely focusable wide card-like button) append active:scale-[0.98] + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring and UPGRADE transition-colors to transition-all. Confirm there are NO other raw button/a/Link controls (the status cards ~L220/L261 are non-interactive divs — confirm they get NOTHING). Flag any fetched-but-unused fields (ServiceRow: id/name/price_cents/duration_minutes/description/photo_url; StoreLite: id/name/slug; StatusRow: id/status/service_name/client_name/store_name/store_slug/position_in_queue/estimated_wait_minutes) — note ServiceRow.description + photo_url appear fetched but never rendered; advise whether surfacing description as a tiny display-only line is in-scope or out-of-scope. Check responsive at 375/768/1280 (single max-w-md centered column; service list space-y-2). Return a CONCISE line-referenced punch list. Under ~800 tokens.
- files: src/pages/salon/PublicSalonCheckinPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis: `PublicSalonCheckinPage.tsx` — Premium Interaction Pass

### Short Plan

Apply the same `active:scale` + `focus-visible:ring` tokens from `JobPostingDetailPage` to the 3 raw controls in this page. No logic changes. No shadcn edits.

### Proposed Changes

**File:** `src/pages/salon/PublicSalonCheckinPage.tsx`

**Edit 1 (confirmation Back link, ~L280):**
```diff
- className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
+ className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**Edit 2 (step-1 Back link, ~L294):**
```diff
- className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
+ className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**Edit 3 (service button, ~L320):**
```diff
- className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", ...)}
+ className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", ...)}
```

### Confirmation of No Other Raw Controls

✅ **Status cards (~L220, L261):** Non-interactive `<div>`s — no `onClick`, no `<a>`, no `<button>`. Correctly skipped.

✅ **shadcn controls:** `Button` (Join the queue), `Input` (name/phone), `Label` — already ship tokens. Skipped.

### Fetched-but-Unused Fields

- **`ServiceRow.description`** — fetched but never rendered. **Out of scope** (adding it would be a display change, not a className swap).
- **`ServiceRow.photo_url`** — fetched but never rendered. **Out of scope** (would require an `<img>` tag and layout shift).

### Responsive Check

- Single `max-w-md` centered column at all breakpoints.
- Service list `space-y-2` — no grid, no crush risk.
- Confirmation view `px-4 py-10 sm:py-16` — safe at 375/768/1280.

### Verification

Run `npm run update` — should pass with 0 errors (3 className-only insertions, no logic changes).
