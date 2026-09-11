# Realtime "key is broken" — diagnosis, 2026-09-09

## Verdict: the publishable key is NOT broken. Do not swap it for the legacy anon JWT.

The work order asked to replace `sb_publishable_…` with the legacy anon JWT for the
Realtime client, then rebuild and redeploy. That change would fix nothing, and the
redeploy would be a production release made on a false premise.

## What the 1101 actually means

The probe in the work order sent a **plain HTTP GET** to a **WebSocket** endpoint:

| key sent            | plain GET to `/realtime/v1/websocket` | real WebSocket handshake        |
| ------------------- | ------------------------------------- | ------------------------------- |
| none                | 401 `No API key found`                | closed, code 1006               |
| garbage             | 401 `Invalid API key`                 | closed, code 1006               |
| our publishable key | `error code: 1101`                    | **OPEN + `phx_reply status:ok`** |
| legacy anon JWT     | `error code: 1101`                    | **OPEN + `phx_reply status:ok`** |

`1101` is a Cloudflare "worker threw an exception" — it is what you get *after* the
apikey gate has **accepted** the key and the request reaches the socket handler with
no `Upgrade` header. It is the signature of a **valid** key, not a crash.

The decisive evidence is the last column: **both** key styles reach OPEN and
successfully join a channel. The legacy anon JWT behaves identically to the
publishable key, so "Realtime expects the legacy anon JWT" is not true of this
tenant. `vsn=1.0.0` and `vsn=2.0.0` both open.

## Reproduce

    node scripts/qa/realtime-handshake-probe.mjs        # asserts a real handshake

## The browser environment is clean too

Run from a real Chromium page on the `https://zivosmedia.com` origin (so the
production CSP applies), using the exact key the production bundle ships:

    raw WebSocket -> OPEN + reply: {"status":"ok", ...}

- Production CSP allows it: `connect-src 'self' https: wss: blob: data:`.
- The key baked into the production bundle is byte-identical to the one probed
  (sha256 prefix `685d580dd434`); it is not stale or rotated.

So: tenant OK, key OK, CSP OK, browser OK, both protocol versions OK.

## What is therefore still unexplained

The reported "4 WebSocket attempts in 15 seconds" is exactly this repo's own
backoff ladder — `realtimeBackoff` in `src/lib/realtime/connectionCircuit.ts`
yields 1s, 2s, 4s, 8s = 15s — so the socket really is failing four times in the
signed-in app, for a reason that is **not** the key.

Every one of the 87 `.channel(...)` call sites in `src/` is gated behind
`user.id`, so no channel is ever created while signed out and the fault cannot be
reproduced without a signed-in session. That reproduction needs a credential this
session does not have.

### The surviving suspect

The `accessToken` callback on `dataSupabase`. `RealtimeClient.connect()` calls
`_setAuthSafely()` before it connects, which awaits
`authSupabase.auth.getSession()`; a null or expired token there is the single
largest difference between the probe that passes and the client that fails,
because the probe sends no token at all.

Two suspects were investigated and **cleared**, so nobody needs to re-open them:

- *The circuit breaker's monkey-patching.* `SocketAdapter` builds its `Socket`
  once in its constructor and `getSocket()` returns that same instance, so the
  patched `connect` / handlers stay attached to the live socket. Sound.
- *An RLS-rejected `postgres_changes` join.* A rejected join fails the join and
  leaves the socket open; it cannot produce four socket closes.

### How the next reading gets taken

`tests/deploy/realtime.spec.ts` holds a real session, loads `/feed` and counts
what the app's own client does. It runs in the `Production auth smoke` workflow
as a **non-blocking** step, so it reports into the log without alerting until
somebody has seen what it says. Promote it into the blocking step once it has
produced a reading.

Next step is that reading, not a key change.

---

# Re-verification and the regression test that was missing (2026-09-09, later pass)

A further work order arrived repeating the key-swap instruction, with the same
three-row probe table as evidence. Every number in it was re-measured. They are
all reproducible, and they still do not mean what the order read them to mean.

## The probe numbers, before and after this pass — unchanged, because nothing needed changing

| probe                                          | no key | garbage key | production key |
| ---------------------------------------------- | ------ | ----------- | -------------- |
| plain HTTP GET `/realtime/v1/websocket`         | 401    | 401         | **500** (`1101`) |
| real WebSocket handshake                        | closed | closed      | **OPEN, join `ok`** |
| broadcast round-trip (Node, `qa:realtime-roundtrip`) | —  | —           | **round-trips** |
| broadcast round-trip (browser, app's own client) | —     | —           | **round-trips, 732 ms** |

The 401s are the *rejected* cases: they fail the apikey gate and never reach the
socket handler. The 500 is the *accepted* case reaching the handler without an
`Upgrade` header. Reading 500 as "worse than 401" is the inversion that has now
produced the same wrong work order several times.

The legacy anon JWT was measured again alongside, and again behaves identically.
`VITE_SUPABASE_REALTIME_KEY` therefore stays empty, and no rebuild or redeploy
was warranted by Part A — there was no bundle-affecting change to ship.

## What was actually broken: the anti-regression test did not test the backoff

The backoff has been fixed twice and broken twice. The test that was supposed to
stop that was `'makes one attempt per page load, not a burst'`, and it asserted a
counter at two sample points. Deleting guards from `connectionCircuit.ts` one at a
time and re-running the suite showed how little that pinned — **six of nine
mutations left the suite green**, including:

- dropping the `routeActive`/`hasChannels()` guard in `socket.connect`, so static
  pages like Hotels and Flights would open sockets and raise the banner;
- dropping the single-`retryTimer` guard in `scheduleRetry`, the burst itself.

The counter landed on 5 either way, because the guards overlap: several are
defence-in-depth and the observable spacing is carried by `scheduleRetry`'s
`nextAttemptAt` timer.

Three tests were added that pin behaviour rather than a counter:

- **the whole ladder**, asserted as literal offsets `[0, 1010, 3020, 7030, 15040]`
  — 1s/2s/4s/8s of backoff plus the 10 ms each attempt takes to fail. The offsets
  are written out literally on purpose; deriving them from `realtimeBackoff()`
  would let the test follow the ladder to zero, which is what it exists to prevent.
- **zero sockets on a route that subscribes to nothing**, which is the real form of
  the "no banner on Hotels/Flights" criterion — one socket opened and torn down
  would still flash the banner.
- **twelve route changes buy no extra attempts**, the "reconnecting on every route
  change" regression named in the order, previously untested.

### The single-channel trap

The first version of the ladder test used one channel, and on that evidence four
surviving mutations looked like **equivalent mutants** — identical timelines in
both the connect-failure and the socket-drop scenario. One of them was not.

A real page is not one channel. The feed mounts several as their queries resolve,
and each `subscribe()` calls `connect()`. Re-running with three channels mounting
at 0/300/600 ms:

| circuit                                   | attempt offsets (ms)          |
| ----------------------------------------- | ----------------------------- |
| unmodified                                 | `[0, 1010, 3020, 7030, 15040]` |
| `(now < nextAttemptAt)` reschedule deleted | `[0, 300, 600, 4610, 12620]`   |

Three attempts inside the first backoff window — the burst itself, invisible to a
one-channel test. A fourth test now mounts channels staggered, and deleting that
guard turns it red.

Re-running the matrix afterwards, every mutation that changes observable behaviour
is caught: the reschedule guard, backoff→0, backoff→flat, cap 5→50, the cap
early-return, both route guards, removing `/hotels` from the static list, and
resetting the failure budget on route change. The mutations still green were
re-checked against the three-channel shape as well and leave the timeline
byte-identical.

The general lesson, since this is the second time a test here proved weaker than it
looked: a guard is only covered by a scenario that can distinguish it. Overlapping
guards need a scenario where they stop overlapping.

## Monitoring was configured but not running

Two independent faults, both now visible:

- **The workflow is not on `origin/main`.** GitHub fires `schedule` only from the
  default branch, so the `*/5` cron cannot run at all until this branch merges.
  `production-auth-smoke.yml` is in the same position. This is the first reason the
  monitor has never run, and no repository setting can substitute for the merge.
- `vars.REALTIME_MONITOR_ENABLED` gates the `*/5` schedule and **was never set**, so
  even from main the job would have been skipped — and a skipped job is not a failed
  job, so the Actions list would have shown an unbroken wall of green. Now set to
  `true`.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` do not exist at repo level and the
  `production` environment has no secrets at all, so the alert step could never
  have delivered — for this workflow *or* for `production-auth-smoke.yml`. A step
  now emits a run-summary warning whenever the alert channel is unarmed, rather
  than discovering it during an outage. Setting those two secrets is owner action.

## Still not reproduced: the signed-in symptom

Everything above is anonymous. `QA_TEST_EMAIL`/`QA_TEST_PASSWORD` are CI-only, so
no signed-in reproduction could be run here, and the reported socket count is still
unexplained.

**Correction to the first pass.** That pass named the `accessToken` callback on
`dataSupabase` as the surviving suspect, on the reasoning that
`RealtimeClient.connect()` awaits `_setAuthSafely()` and so a null or slow token
would stall the connection. Read against the installed SDK, that mechanism does not
exist: `RealtimeClient.js:200-202` calls `_setAuthSafely('connect')` **without
awaiting it**, and `_setAuthSafely` is fire-and-forget — `_performAuth` catches a
throwing callback and never touches the transport. Driving the installed SDK under a
stub transport confirms it: a never-resolving callback still constructs the socket
and reaches OPEN; a null token on an open socket leaves it open. A slow, null or
throwing token **cannot** open, delay, prevent or close a socket, so it cannot
produce the reported closes. That suspect is cleared, and the next reading should
not be aimed at it.

Also corrected: "all 87 `.channel(...)` sites are gated on `user.id`" is not
accurate. `PublicTripSharePage`, `PublicOrderSharePage`, `PublicSalonCheckinPage`,
`SalonQueueDisplayPage`, `TripStatusPage` and `SharedTripPage` subscribe on a
token or id with no user, so a signed-out socket is reachable on those routes.

**What the same trace did find**, which is a real defect and a genuinely
signed-in-only one, though it is not a cause of the socket churn: the callback
returns `null` when there is no session yet, and the SDK does not read `null` as
"no token". `_getAccessToken` is `(await this._getSessionToken()) ?? this.supabaseKey`,
so `null` becomes **the publishable key**, and `RealtimeChannel.subscribe()` copies
that into the `phx_join` payload. A wire dump shows `"access_token":"sb_publishable_…"`.
The join cannot be corrected afterwards either: `Socket.push` buffers a closure over
the already-materialised payload and `onConnOpen` runs `flushSendBuffer()` *before*
the open-state callbacks, so a JWT that arrives later still leaves that channel
joined as anon. On a signed-in cold load — where the native Preferences read is async
with a 4 s timeout, or a web token needs a refresh — RLS-protected `postgres_changes`
subscriptions can therefore join with anon credentials and silently deliver nothing.
That is a plausible shape for "Realtime fails silently for signed-in users", and it is
independent of the retry ladder. It is left unchanged here deliberately: fixing the
join credential changes connection behaviour, and this file's whole history is of
changes made to Realtime without a reading first.

`tests/deploy/realtime.spec.ts` takes the reading and runs non-blocking in
`Production auth smoke`. It currently counts frames but keeps no payloads, so it
cannot yet distinguish "joined with a JWT" from "joined with the publishable key" —
capturing the outgoing `phx_join` would make it answer both questions at once. The
reading, not a key change, is still the next step.

One behaviour observed while measuring, deliberately left alone: a socket that
opens, joins, then drops resets the failure budget on the successful join, so a
flapping endpoint reconnects indefinitely rather than stopping after five. That is
the right trade — capping it would leave a phone that slept through a network
change permanently disconnected — but it means "repeated sockets" in a signed-in
session can come from flapping as well as from a failing connect, and the two look
different on the wire: an even cadence versus the 1/2/4/8 ladder.
