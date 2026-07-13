# MiMo run — 2026-06-13T20:58:47.466Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Bring VoiceRoomDetailPage.tsx to visual and responsive parity (375/768/1280) with the premium reference JobPostingDetailPage.tsx. Hard rule: do NOT change any supabase queries, mutations, react-query keys, routing, the GroupCallLauncher wiring, or the 10s participants polling - only JSX and Tailwind classes and tiny display-only logic. Fix these real gaps: (1) started_at and ended_at are fetched but never shown - display a relative/short time (e.g. 'Started 10:30 AM' when live, 'Ended 11:45 AM' when ended) in a meta row; (2) the header is a plain badge-row plus a separate h1 - replace it with the reference header pattern: a rounded-2xl bg-primary/10 icon chip with a Mic icon, the topic as the title, and a right-side Live/Ended badge stack; keep the small 'Voice room' label. Add a polished flex-wrap meta row (text-xs text-muted-foreground with inline-flex icon spans) showing the start/end time, the participant count, and the Voice room label. Add border-t border-border/40 separation around the Actions section. Keep the host card and participants strip but make sure they sit cleanly in the new layout. Refined active:scale-[0.98] on buttons (already present - keep). No framer-motion. Return the revised JSX for ONLY the room-loaded branch (the div with className space-y-5).
- files: src/pages/hubs/VoiceRoomDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

1. **Replace the header** — swap the flat badge-row + standalone `<h1>` for the reference pattern: a `h-12 w-12 rounded-2xl bg-primary/10` icon chip (Mic), the topic as `text-xl font-extrabold`, and a right-aligned Live/Ended badge pill. Drop the separate "Voice room" text from the header (it moves to the meta row per the task).
2. **Add a polished meta row** — `flex flex-wrap items-center gap-3 text-xs text-muted-foreground` with three items: (a) Radio icon + "Voice room", (b) a start/end time derived from `started_at` / `ended_at` using `toLocaleTimeString` (no new imports), (c) Users icon + participant count.
3. **Add `border-t border-border/40`** around the Actions section.
4. **Everything else untouched** — host card, participants strip, all buttons, all mutations/queries/polling/GroupCallLauncher wiring.

Only the room-loaded `<div className="space-y-5">` branch changes. No new imports (the existing `Radio`, `Users`, `Mic` icons are already imported). No framer-motion.

---

## Proposed diff

**File:** `src/pages/hubs/VoiceRoomDetailPage.tsx`

Replace the entire room-loaded branch (the `<div className="space-y-5">` block, lines ~192–297 of the original) with:

```tsx
          <div className="space-y-5">
            {/* Header — icon chip + topic + Live/Ended badge */}
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight">{room.topic}</h1>
              </div>
              {room.is_live ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] font-extrabold uppercase shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-foreground text-[11px] font-extrabold uppercase shrink-0">
                  Ended
                </span>
              )}
            </div>

            {/* Meta row — voice room label + time + participant count */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" /> Voice room
              </span>
              {(room.is_live ? room.started_at : room.ended_at) && (
                <span className="inline-flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" />
                  {room.is_live
                    ? `Started ${new Date(room.started_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                    : `Ended ${new Date(room.ended_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {participants.length} listening
              </span>
            </div>

            {room.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{room.description}</p>
            )}

            {/* Host card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
              <Avatar className="h-10 w-10">
                <AvatarImage src={hostProfile?.avatar_url ?? undefined} />
                <AvatarFallback>{(hostProfile?.full_name ?? "H").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold flex items-center gap-1">
                  {hostProfile?.full_name ?? "Host"}
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </p>
                <p className="text-[11px] text-muted-foreground">Hosting</p>
              </div>
            </div>

            {/* Participants strip */}
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                {participants.length} listening
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => {
                  const profile = profiles[p.user_id];
                  return (
                    <div
                      key={p.user_id}
                      className="flex flex-col items-center gap-1 w-14"
                      title={profile?.full_name ?? "Listener"}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[9px] font-semibold truncate w-full text-center">
                        {p.user_id === room.host_id ? "Host" : profile?.full_name?.split(" ")[0] ?? "Guest"}
                      </p>
                    </div>
                  );
                })}
                {participants.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No one's joined yet.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              {!room.is_live ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  This room has ended.
                </p>
              ) : isHost ? (
                <>
                  <button
                    type="button"
                    onClick={() => joinMut.mutate()}
                    disabled={joinMut.isPending}
                    className={cn(
                      "w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ig-gradient text-white font-extrabold text-sm transition-all active:scale-[0.98] disabled:opacity-60",
                    )}
                  >
                    {joinMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    Open mic
                  </button>
                  <button
                    type="button"
                    onClick={() => endMut.mutate()}
                    disabled={endMut.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-card border-2 border-rose-500/40 text-rose-600 font-bold text-sm hover:bg-rose-500/5 transition-colors disabled:opacity-60"
                  >
                    {endMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                    End room
                  </button>
                </>
              ) : meParticipant ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCallActive(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.
