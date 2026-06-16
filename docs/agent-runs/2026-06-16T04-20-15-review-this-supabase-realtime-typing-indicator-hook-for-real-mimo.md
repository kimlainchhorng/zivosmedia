# MiMo advisor — Review this Supabase Realtime typing-indicator hook for real correctness bugs: stale timers/Map leaks, channel subscription/cleanup races, same-topic sender/receiver conflicts, queue-flush edge cases. Be terse, tag P0/P1/P2 with a one-line fix each.

Files: /Users/kimlain/Documents/GitHub/ZIVO-CHAT/src/hooks/useTypingBus.ts

## Review: `useTypingBus.ts`

**P1 — Sender channel stuck after error; all broadcasts silently dropped.**
`CHANNEL_ERROR`/`TIMED_OUT` sets `senderReady = false` but leaves `senderChannel` non-null. `getOrCreateSenderChannel()` returns the dead channel; subsequent `send()` calls fail silently and messages queue until idle-close discards them.
**Fix:** Set `senderChannel = null` inside the error/closed status branch so the next `broadcastTyping` creates a fresh channel.

**P2 — `timers` Map leaks entries on `typing: false`.**
When `typing` is falsy the old timer is cleared but `timers.delete(from)` is never called, so the Map accumulates entries for every user who ever typed (bounded by the effect lifetime, but still unnecessary).
**Fix:** Add `timers.delete(from)` after `clearTimeout(existing)` when `!typing`.

**P2 — HMR stale singletons (dev-only).**
Module-level `senderChannel`/`senderQueue` survive Vite HMR but the `supabase` client may re-init, leaving a dangling channel reference.
**Fix:** Null the singletons in `import.meta.hot?.dispose`.

Everything else is solid: the functional-updater pattern avoids stale closures, the `timers` Map + channel are correctly torn down in the effect cleanup, the `to === currentUserId` guard prevents sender/receiver self-echo on the shared topic, and the idle-close + re-create path is sound.
