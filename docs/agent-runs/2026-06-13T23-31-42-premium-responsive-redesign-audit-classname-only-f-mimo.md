# MiMo run — 2026-06-13T23:31:42.796Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium + responsive redesign audit (className-only). File: src/pages/PublicDocumentView.tsx (287 lines, route /d/:token — public invoice/estimate document view via get_shared_document RPC, read-only). HARD RULE: do NOT change supabase queries/RPCs/PDF-gen/routing/component logic — ONLY JSX/Tailwind className changes. Premium interaction tokens: cards/wide active:scale-[0.98], links/chips active:scale-[0.97], icon-only active:scale-[0.95]; add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring; upgrade transition to transition-all. shadcn Button/Card ALREADY ship tokens — SKIP; only RAW button/a/Link/input/clickable-Card(onClick) need tokens; non-clickable div/Card gets none. MY FINDING: this page has ZERO raw interactive controls — the ONLY two controls are the 'Print' Button (variant=outline size=sm onClick=window.print, L179) and the 'Download PDF' Button (size=sm onClick=handleDownload, L182), BOTH shadcn (already ship active:scale + ring). Everything else (the Card/CardContent, the invoice table/tr/td, all div/p/h1/h2/span, the loading Loader2, the notFound Card) is non-interactive with NO onClick. So my conclusion: NO className token edits needed — the page is already interaction-compliant. QUESTIONS: (1) Confirm there are genuinely ZERO raw interactive controls I missed (any clickable element that isn't a shadcn Button?). (2) Responsive at 375/768/1280: the 4-column invoice table (w-full text-sm: Description/Qty-Hrs/Rate/Amount), the header 'flex justify-between flex-wrap', the Bill-To/Vehicle 'grid-cols-1 sm:grid-cols-2', the totals 'w-full sm:w-64' — any crush or horizontal-overflow risk at 375px? Should the table get overflow-x-auto (className-only) as a safety net, or does w-full + text-wrap already prevent overflow? (3) Flag any fetched-but-unused fields (I see Resolved.expires_at typed/fetched but never read on the client — expiry is enforced server-side in the RPC; all store* fields ARE consumed by generateDocumentPdf). Keep it tight — if there's truly nothing to edit, say so plainly.
- files: src/pages/PublicDocumentView.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me carefully audit `src/pages/PublicDocumentView.tsx` against the premium interaction token rules.

**Control inventory:**

1. **"Print" Button** (`L179`) — `<Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">` — **shadcn `<Button>`**. Already ships `active:scale-[0.98]` + `transition-all` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. **SKIP.**

2. **"Download PDF" Button** (`L182`) — `<Button size="sm" onClick={handleDownload} className="gap-1.5">` — **shadcn `<Button>`**. Same. **SKIP.**

**Everything else:**
- `<div className="min-h-screen flex items-center justify-center">` — loading spinner container, non-interactive
- `<Loader2>` — non-interactive icon
- `<Card>` / `<CardContent>` — shadcn, no `onClick`, non-interactive
- `<AlertTriangle>` — non-interactive icon
- `<h1>`, `<h2>`, `<p>`, `<span>`, `<div>` — all non-interactive
- `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` — all non-interactive
- `<FileText>` — non-interactive icon

**Zero raw interactive controls.** The user's finding is correct.

**Responsive audit at 375px:**

The 4-column `<table>`:
- `w-full text-sm` — the table takes full width
- Columns: Description (left), Qty/Hrs (right), Rate (right), Amount (right)
- At 375px with `text-sm`, 4 columns of data could be tight but:
  - Description + category text wraps naturally (`<td>` content)
  - Qty/Hrs: short values like "1", "2 hr"
  - Rate: "$150.00"
  - Amount: "$150.00"
  - With `px-2` padding, this should fit at 375px for typical values, but **long description text** in the first `<td>` could push the table wider.

The safe defensive play is `overflow-x-auto` on the table's wrapper div. This is a **display-only className edit** — no logic changes. It doesn't affect the print layout (`print:overflow-visible` could be added but `overflow-x-auto` doesn't clip in print mode since the browser handles pagination). Actually, `overflow-x-auto` on the wrapper div is purely defensive — if content fits (which it usually does), the scrollbar doesn't appear. If a very long description or price pushes wider, the user can scroll horizontally instead of the table overflowing invisibly.

**Should I propose it?** The user asked. I think the right answer is: yes, `overflow-x-auto` on the table wrapper is a zero-risk defensive className addition. It's the standard pattern for responsive tables in Tailwind. Let me check — the table's wrapper is `<div className="border-t border-border pt-4">`. Adding `overflow-x-auto` here is clean.

**Fetched-but-unused fields:**

`Resolved.expires_at` — typed in the `Resolved` type and returned by the RPC, but **never read** in the client JS. Expiry is enforced server-side in the `get_shared_document` RPC (the security definer function checks expiry before returning). This is correctly identified by the user.

Any others? Let me check the `store_profiles` select: `name, address, phone, logo_url, ar_settings`. All consumed: `name` → `storeName`, `address` → `storeAddr`, `phone` → `storePhone`, `logo_url` → `storeLogoUrl` → `storeLogoData`, `ar_settings` → destructured into `storePhone2`/`storeEmail`/`storeStateReg`/`storeTerms`. All used by `generateDocumentPdf`. ✓

From the RPC `doc` object — it's `any` typed, and the code accesses many fields. No unused fetch since the RPC returns the whole document. The `Resolved.expires_at` is the only typed-but-unused field.

**Conclusion:**

1. **Zero raw interactive controls** — confirmed. Both controls are shadcn `<Button>`s.
2. **Responsive** — the 4-column table *could* overflow on very narrow screens with long descriptions. One defensive `overflow-x-auto` className addition is warranted. Everything else (header `flex-wrap`, Bill-To/Vehicle `grid-cols-1 sm:grid-cols-2`, totals `w-full sm:w-64`) is responsive-safe.
3. **Fetched-but-unused** — `expires_at` only, server-side enforced.

**Proposed edit:** One className addition — `overflow-x-auto` on the table wrapper div. This is a pure display/defensive change, no logic.

Let me also check: does `min-w-0` need to go on the description `<td>` to enable truncation? Actually, tables don't use `min-w-0` the same way flex/grid do — table cells shrink to their minimum content width by default. The issue is more about the table itself expanding beyond its container. `overflow-x-auto` on the parent is the correct fix.

Wait, actually let me re-examine. The table has `w-full` which should constrain it to the parent width. The issue is that `w-full` on a `<table>` sets `width: 100%`
