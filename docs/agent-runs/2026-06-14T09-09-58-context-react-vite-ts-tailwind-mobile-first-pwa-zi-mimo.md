# MiMo run — 2026-06-14T09:09:58.898Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/JobApplicantsPage.tsx (109-line "Employer view: applicants for a single job" at /personal/jobs/:id/applicants; Supabase-backed: useEffect Promise.all loads career_jobs.select(id,title) + career_applications.select("*, profiles(...)").eq(job_id).order(created_at desc); useState job/apps/loading; setStatus(appId,status) does supabase.update({status,reviewed_at}) + optimistic setApps + toast on error; downloadResume(path) does supabase.storage.createSignedUrl + window.open; layout: sticky header [shadcn ghost Back Button + truncated "Applicants — {title}" h1] + a list of applicant Cards, each w/ an avatar img/UserCircle + name/email/date + a status badge <span> + an action row [conditional shadcn Resume Button + a mailto Email <a> + a native status <select>]). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, onChange, navigate, supabase, storage, window.open, href, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own tokens). Don't change href. Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled. LEAVE native form fields (the <select> has a native focus outline + aria-label) unless there's a clear house pattern.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → use transition-all (FLIP from transition-colors, or ADD transition-all where there was no transition class).
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

A) L91 EMAIL LINK (raw <a href={`mailto:${a.applicant_email}`}>, VISIBLE text "Email" + a Mail icon, base `inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent` [bordered own-surface chip/pill-style link, hover:bg-accent bg-color ON ITSELF, NO transition/scale/focus]; inside an applicant Card bg-card neutral; an <a> is natively keyboard-focusable; rounded-md already present) → applied: APPENDED `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: transition-all (NEW — hover:bg-accent bg-color + new scale must both animate) + [0.97] links/chips/pills tier + OUTWARD ring-ring on neutral bg-card (rounded-md already traces the ring) + NO aria (visible "Email" text) + href (mailto) byte-identical.

ALSO CONFIRM I should LEAVE: the shadcn ghost Back <Button> L59 (own tokens, aria-label="Back"); the shadcn Resume <Button> L86 (own tokens, size sm outline); the native status <select> L95 (native form field — already has aria-label="Application status" + a native focus outline; a press-scale is inappropriate for a dropdown; LEAVE — but is adding a focus-visible:ring to a native select a house pattern, or LEAVE entirely?); the status badge <span> L81 (non-interactive); the avatar <img> L72 (alt="", decorative, lazy) + UserCircle fallback; the truncated h1 (non-interactive); all ArrowLeft/Download/Mail/UserCircle icons (decorative).

Be concise and exact. Return the precise final className after-string for A + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) A — is transition-all correct (hover:bg-accent is a bg-color) and [0.97] the right tier for a bordered chip-style mailto <a>? + is OUTWARD ring correct?; (2) the native <select> — LEAVE entirely (native focus) or add a focus-visible ring for consistency? what's the house standard for native selects?
- files: src/pages/app/personal/JobApplicantsPage.tsx

---

## Plan

One raw interactive control to edit: the Email `<a>` link (A). All others are either shadcn-owned (Back/Resume Buttons) or native form fields (the `<select>` with existing `aria-label`).

## Verdict: A is **CORRECT**

**Final className for A (L91 Email `<a>`):**

```
inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

No new aria attrs. `href={`mailto:${a.applicant_email}`}` byte-identical.

**Why each token is right:**
- `transition-all` — NEW (no prior transition class). `hover:bg-accent` is a bg-color ON THE ELEMENT; new `active:scale` is a transform. Both must animate → `transition-all`. ✓
- `active:scale-[0.97]` — links/chips/pills tier (bordered `px-3 py-1.5 text-xs` mailto link). ✓
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — OUTWARD ring. `rounded-md` already present so ring traces. Sits inside applicant Card `bg-card` neutral, NOT a flush child of overflow-hidden. ✓
- NO aria — visible "Email" text label. ✓

## Controls **LEFT** (confirmed correct):

| Control | Why leave |
|---|---|
| shadcn Back `<Button>` L59 | Own tokens, already `aria-label="Back"` |
| shadcn Resume `<Button>` L86 | Own tokens, `size="sm" variant="outline"` |
| **Native `<select>` L95** | Native form field — already has `aria-label="Application status"` + browser-native focus outline. **No house pattern exists for overriding native select focus with custom rings** (100+ prior slices consistently leave native `<select>`/`<input>` form controls). Adding `active:scale` is inappropriate for a dropdown. **LEAVE entirely.** |
| Status badge `<span>` L81 | Non-interactive |
| Avatar `<img>` / UserCircle | Decorative (`alt=""`) |
| Truncated `<h1>` | Non-interactive |
| All icons (ArrowLeft/Download/Mail/UserCircle) | Decorative |

## No other raw interactive controls missed

The applicant `<Card>`s have no `onClick`/`cursor-pointer` (non-interactive containers). The cover note `<p>` is non-interactive. That's the full inventory: 1 raw control edited (A), 0 new aria, 0 logic lines touched.

## Owner verification

- `npm run update` must pass (type-check + worker type-check + production build).
- Preview: the Email link renders inside each applicant Card row alongside the Resume button and status select — verify the scale + ring look correct at 375px width (the `flex flex-wrap items-center gap-2` action row wraps gracefully).
- Owner flags (logic — FLAG not fix): (a) `setStatus` does a live `supabase.update` on `career_applications` — confirm RLS gates by job ownership so only the employer can change status; (b) `downloadResume` creates a signed URL from `job-resumes` bucket — confirm the bucket RLS restricts access appropriately; (c) the `(supabase as any)` casts bypass typing — regenerate types when convenient; (d) `reviewed_at` is set on every status change, not just "reviewed" — confirm intended.
