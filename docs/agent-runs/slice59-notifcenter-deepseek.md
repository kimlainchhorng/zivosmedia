# DeepSeek run — 2026-06-14T06:26:46.322Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/NotificationCenterPage.tsx (707-line notification inbox: sticky header with Back + "Mark all read" + a horizontally-scrolling segmented TAB filter [All/Unread/Social/Orders/Travel/Jobs/Live/Creator/Wellness/Alerts/System]; a date-grouped list of notification rows; chat-type rows expose inline Reply / Preview-profile / Mute action icon buttons + a Delete icon button; an inline reply panel [text input + Cancel + Send]; a mute-duration dropdown of chips; a "Load more" Button). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, hooks (useMutedThreads/useAllowMessageRequests/useQuery), supabase queries/realtime, mutate/insert, byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep its existing transition class + scale number; no flip — do NOT renumber the scale).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear, set-value, send, delete). A toggle with a DYNAMIC action-label ("Mute"/"Unmute") should NOT also get aria-pressed (double-announcement).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier [keep existing or renumber?], transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L405 TAB filter buttons (raw `<button>`, mapped over TABS, single-select segmented filter; selection bg-conveyed via `bg-ig-gradient text-white border-primary` else `bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70`). Static base: `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation`. Has transition-all, NO scale, NO focus-visible. onClick setActiveTab(tab.key). In a `overflow-x-auto scrollbar-hide` row; PARENT is the neutral sticky header (bg-background/95). Constant label per tab. → my plan: ADD aria-pressed={isActive} + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the static base (segmented-filter tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — bg-ig-gradient is the button's OWN selected fill, ring renders against neutral header parent). Confirm.

B) L529 Reply icon button (raw `<button>`, icon-only, ALREADY `aria-label="Reply"`): `h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all`. ALREADY active:scale-90 + transition-all + hover:bg. One-shot (opens reply). → ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (keep active:scale-90 — do NOT renumber to 95; no flip; ring color? own fill bg-primary/10 tint on neutral row parent). Confirm ring color.

C) L544 Preview-profile icon button (raw `<button>`, icon-only, ALREADY `aria-label="Preview profile"`): `h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center`. ALREADY active:scale-90 + transition-all. One-shot (opens profile sheet). → ring-ONLY append (keep scale-90; ring-ring neutral row parent). Confirm.

D) L551 Mute/Unmute icon button (raw `<button>`, icon-only, DYNAMIC `aria-label={rowMuted ? "Unmute" : "Mute"}`). cn base: `h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all` + conditional (`rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"`). ALREADY active:scale-90 + transition-all. Two-way toggle, muted state bg-conveyed AND dynamic action-label. → ring-ONLY append into cn first arg (keep scale-90). aria QUESTION: it's a two-way bg-conveyed toggle BUT has a dynamic action-label — does the dynamic-label rule (like play/pause) mean NO aria-pressed? Decide aria-pressed vs none.

E) L571 Delete icon button (raw `<button>`, icon-only, ALREADY `aria-label="Delete notification"`): `p-1.5 rounded-lg hover:bg-destructive/10 transition-colors`. Has transition-colors, NO scale, NO focus-visible. One-shot destructive. → my plan: FLIP transition-colors→transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier 95; flip required — transition-colors gaining a new scale; OUTWARD ring-ring neutral row parent; NO aria-pressed — one-shot destructive). Confirm.

F) L617 Cancel text button (raw `<button>`, in reply panel): `shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground`. NO transition, NO scale, NO focus-visible. Small inline text-link, one-shot (closes reply). Has hover:text color. → my plan: APPEND `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-all because scale + hover:text both animate; no existing transition class so no "flip" — just add transition-all; OUTWARD ring-ring neutral DialogContent/panel parent; NO aria). Confirm tier + transition.

G) L624 Send-reply icon button (raw `<button>`, icon-only, ALREADY `aria-label="Send reply"`): `shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all`. ALREADY active:scale-90 + transition-all. One-shot send. → ring-ONLY append (keep scale-90; OUTWARD ring color? bg-ig-gradient own fill on neutral panel parent). Confirm ring color.

H) L649 Mute-duration chips (raw `<button>`, mapped over MUTE_DURATIONS, in the mute dropdown): `h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center`. NO transition, NO scale, NO focus-visible. Medium chip, one-shot (set mute duration). Has hover:bg. → my plan: APPEND `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (medium chip tier [0.98]; transition-all because scale + hover:bg; no existing transition → add transition-all, no flip; OUTWARD ring-ring neutral parent; NO aria — one-shot set-value). Confirm.

ALSO CONFIRM I should LEAVE these: shadcn back `<Button aria-label="Back" variant="ghost" size="icon">` L381; shadcn "Mark all read" `<Button variant="ghost" size="sm">` L392; shadcn "Load more" `<Button variant="outline">` L676 (all ship their own focus/scale tokens); the L481 row container (plain `<div onClick>` cursor-pointer hover:bg-accent/40 — NOT keyboard-focusable, has no role/tabIndex; adding a focus ring would be inert and adding tabIndex/role is a structural change beyond a display-only pass — LEAVE + flag?); the L599 reply `<input>` (raw input with its OWN existing `focus:ring-2 focus:ring-primary/40` — already styled; converting focus:→focus-visible:ring-ring would recolor + change trigger semantics, a churn — LEAVE + flag?); the row motion.div (entrance/layout anim, the onClick lives on the inner div), skeletons, empty-state, Badge, BellOff status icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note A/H are mapped templates (single edit hits all instances); B/C/D/E/F/G one each.
- files: src/pages/NotificationCenterPage.tsx

---

# Plan

**File:** `src/pages/NotificationCenterPage.tsx`  
**Scope:** Premium interaction + a11y token pass on 8 controls (A–H).  
**Rule:** className + display-only aria only; preserve all logic byte-identical.

---

## Per-control analysis

### A) L405 Tab filter buttons (mapped template)
- **Current:** `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation`
- **Has:** `transition-all`, NO scale, NO focus-visible
- **Plan:** ADD `aria-pressed={isActive}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral sticky header parent (`bg-background/95`)
- **Tier:** segmented-filter `[0.97]` ✓
- **Flip?** NO — `transition-all` already present
- **Final base:** `"shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### B) L529 Reply icon button
- **Current:** `"h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all"`
- **Has:** `active:scale-90` + `transition-all` + `hover:bg`
- **Plan:** ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — `bg-primary/10` is the button's OWN fill, parent is neutral row
- **Tier:** keep existing `scale-90` — do NOT renumber
- **Flip?** NO
- **Final:** `"h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### C) L544 Preview-profile icon button
- **Current:** `"h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center"`
- **Has:** `active:scale-90` + `transition-all`
- **Plan:** ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral row parent
- **Tier:** keep existing `scale-90`
- **Flip?** NO
- **Final:** `"h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### D) L551 Mute/Unmute icon button
- **Current (cn 1st arg):** `"h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all"`
- **Has:** `active:scale-90` + `transition-all`
- **Plan:** ring-ONLY append into cn 1st arg `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral row parent
- **Tier:** keep existing `scale-90`
- **Flip?** NO
- **aria:** **NO `aria-pressed`** — dynamic action-label ("Mute"/"Unmute") means SR already announces state; adding `aria-pressed` would double-announce (per rule: "A toggle with a DYNAMIC action-label should NOT also get aria-pressed")
- **Final cn 1st arg:** `"h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### E) L571 Delete icon button
- **Current:** `"p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"`
- **Has:** `transition-colors`, NO scale, NO focus-visible
- **Plan:** FLIP `transition-colors`→`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral row parent
- **Tier:** icon-only `scale-95` ✓
- **Flip?** YES — gaining a NEW CSS scale on a `transition-colors` control
- **aria:** NO `aria-pressed` — one-shot destructive
- **Final:** `"p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### F) L617 Cancel text button
- **Current:** `"shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"`
- **Has:** NO transition, NO scale, NO focus-visible; has `hover:text`
- **Plan:** APPEND `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral panel parent
- **Tier:** small inline text-link `[0.97]` ✓
- **Flip?** NO — no existing transition class to flip; just add `transition-all`
- **aria:** NO — one-shot close with visible text
- **Final:** `"shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### G) L624 Send-reply icon button
- **Current:** `"shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"`
- **Has:** `active:scale-90` + `transition-all`
- **Plan:** ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — `bg-ig-gradient` is the button's OWN fill, parent is neutral panel
- **Tier:** keep existing `scale-90`
- **Flip?** NO
- **Final:** `"shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### H) L649 Mute-duration chips (mapped template)
- **Current:** `"h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center"`
- **Has:** NO transition, NO scale, NO focus-visible; has `hover:bg`
- **Plan:** APPEND `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — neutral panel parent
- **Tier:** medium chip `[0.98]` ✓
- **Flip?** NO — no existing transition class; just add `transition-all`
- **aria:** NO — one-shot set-value
- **Final:** `"h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

---

## Controls to LEAVE untouched (confirmed)

| Control | Line | Reason |
|---------|------|--------|
| shadcn Back `<Button>` | L381 | Ships own focus/scale tokens |
| shadcn "Mark all read" `<Button>` | L392 | Ships own focus/scale tokens |
| L481 row container `<div>` | L481 | NOT keyboard-focusable (no `role`/`tabIndex`); adding focus ring would be inert; adding `tabIndex`+`role` is structural change beyond display-only scope |
| L599 reply `<input>` | L599 | Already has `focus:ring-2 focus:ring-primary/40`; converting to `focus-visible:ring-ring` would recolor + change trigger semantics = churn |
| shadcn "Load more" `<Button>` | L676 | Ships own focus/scale tokens |
| row `motion.div` | L480 | Entrance/layout animation, presentational |
| Skeletons | L445 | Presentational |
| Empty-state | L456 | Presentational |
| `Badge`, `BellOff` icons | Various | Decorative/non-interactive |

---

## Diff

```diff
--- a/src/pages/NotificationCenterPage.tsx
+++ b/src/pages/NotificationCenterPage.tsx
@@ -402,7 +402,7 @@ export default function NotificationCenterPage() {
               <button type="button"
                 key={tab.key}
                 onClick={() => setActiveTab(tab.key)}
-                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation ${
+                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   isActive
                     ? "bg-ig-gradient text-white border-primary"
                     : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70"
@@ -410,6 +410,7 @@ export default function NotificationCenterPage() {
               >
                 {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                 <span>{tab.label}</span>
+                {isActive && <span className="sr-only">, selected</span>}
                 {badge > 0 && (
                   <span className={`text-[10px] font-bold rounded-full px-1.5 ${isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-ig-gradient text-white"}`}>
                     {badge}
@@ -526,7 +527,7 @@ export default function NotificationCenterPage() {
                               setReplyText("");
                             }}
                             aria-label="Reply"
-                            className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all"
+                            className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           >
                             <CornerUpLeft className="h-4 w-4" />
                           </button>
@@ -534,7 +535,7 @@ export default function NotificationCenterPage() {
                             onClick={(e) => { e.stopPropagation(); setPreviewUserId(threadId!); }}
                             aria-label="Preview profile"
-                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center"
+                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           >
                             <UserCircle2 className="h-4 w-4" />
                           </button>
@@ -546,7 +547,7 @@ export default function NotificationCenterPage() {
                               setMuteOpenFor((cur) => (cur === threadId ? null : threadId!));
                             }}
                             aria-label={rowMuted ? "Unmute" : "Mute"}
-                            className={cn(
+                            className={cn(
-                              "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all",
+                              "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                               rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"
                             )}
                           >
@@ -568,7 +569,7 @@ export default function NotificationCenterPage() {
                           }}
-                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
+                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           aria-label="Delete notification"
                         >
                           <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
@@ -614,7 +615,7 @@ export default function NotificationCenterPage() {
                             <button type="button"
                               onClick={() => { setReplyOpenFor(null); setReplyText(""); }}
                               disabled={replySending}
-                              className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
+                              className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                             >
                               Cancel
                             </button>
@@ -622,7 +623,7 @@ export default function NotificationCenterPage() {
                               onClick={() => void sendReply()}
                               disabled={!replyText.trim() || replySending}
                               aria-label="Send reply"
-                              className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
+                              className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                             >
                               {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                             </button>
@@ -646,7 +647,7 @@ export default function NotificationCenterPage() {
                                   mute(threadId, d.id as MuteDurationId);
                                   setMuteOpenFor(null);
                                   toast.success(`Muted · ${d.label.toLowerCase()}`);
-                                className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center"
+                                className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                               >
                                 {d.label}
                               </button>
```

---

## Guard grep expectations

After apply:
- `focus-visible:ring` = 8 (A×1 template, B, C, D, E, F, G, H×1 template)
- `aria-pressed` = 1 (A — `{isActive}`)
- `active:scale-90` = 3 (B, C, D — kept, not renumbered)
- `active:scale-95` = 1 (E — new, icon-only)
- `active:scale-[0.97]` = 2 (A, F — segmented filter + text-link)
- `active:scale-[0.98]` = 1 (H — medium chip)
- `transition-all` = 8 (A already had it; B/C/D/G kept; E flipped from `transition-colors`; F/H added fresh)
- `transition-colors` = 0 (E was the only one, now flipped)
- `ring-inset` = 0
- `ring-white/70` = 0
- `ring-ring` = 8 (all controls have neutral parents)
- FLIPs = 1 (E: `transition-colors`→`transition-all`)
- `aria-pressed` on D = 0 (confirmed: dynamic action-label → NO double-announce)

---

## Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at 375/768/1280 — all controls should render without crush
3. Tab filter: keyboard-navigate with Tab — each tab should show a visible focus ring
4. Reply/Preview/Mute/Delete buttons: Tab to focus — ring should appear
5. Cancel button + Send button in reply panel: Tab to focus — rings appear
6. Mute-duration chips: Tab to focus — rings appear
7. Confirm no double-press effects (no control has both `whileTap` and CSS `active:scale` — none of these use framer `whileTap`)
