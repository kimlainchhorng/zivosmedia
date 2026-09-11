# Supabase Realtime gateway investigation

Recipient: support@supabase.com

Sent from the owner's connected email account. Supabase acknowledged **SU-467601** on 9 September 2026 at 02:18:10 UTC. This is an acknowledgement, not a provider diagnosis or resolution. Gmail thread: `1a083f0ae79f8b79`.

Subject: Realtime gateway HTTP 500/1101 while WebSocket succeeds — slirphzzwcogdbkeicff

Hello Supabase Support,

Please investigate the Realtime gateway for ZIVO project slirphzzwcogdbkeicff (zivosmedia.com, us-east-1).

On 9 September 2026 around 01:54–02:11 UTC:
- A normal HTTPS GET to /realtime/v1/websocket?apikey=<public_key_omitted>&vsn=2.0.0 returns HTTP 500 with error 1101. vsn=1.0.0 does the same.
- Cloudflare Ray IDs: a38293250e26257a-MIA (v1), a3829328ec8e257a-MIA (v2).
- The same endpoint without an API key returns HTTP 401. Driver control project yiedlgoxwjmansszdypf also returns 401 without a key.
- Actual WebSocket upgrades for both protocol versions succeed from our verification environment. The installed Supabase JS SDK, including the application connection circuit, successfully subscribed and round-tripped an ephemeral broadcast from a browser on zivosmedia.com.
- Management API Realtime health reports ACTIVE_HEALTHY, database and replication connected, suspend=false. The supabase_realtime publication exists with the core chat/notification/social tables. Recent aggregate Realtime logs show replication disconnect/reconnect warnings but no error-level events.

The owner’s signed-in browser audit reports repeated WebSocket failures across routes. We are correcting client retry timing and static-route subscription behavior separately. Please investigate the 1101 gateway errors and whether regional or request-header-specific routing could explain this discrepancy. We do not yet have evidence that the tenant itself needs re-provisioning.

No API keys, access tokens, customer messages or payment data are included in this request. Please provide a support reference and your findings.

Thank you,
ZIVO

## Follow-up sent on the same ticket

Gmail message `1a084385b0e8543c`, same thread. Supplied equivalent-request controls: Main and Driver both return 401 without a key and both return 500/1101 for keyed ordinary HTTPS requests with protocol 2.0.0. DFW Ray IDs: Main `a383193a08d9d2c8-DFW`; Driver `a3831964bd597142-DFW`. Explained that the earlier unequal request shapes do not establish a Main-only tenant outage, while actual Main WebSocket checks continue to pass. Asked Support to investigate the common non-upgrade HTTP handling and any regional WebSocket issue. No keys, tokens or customer/payment data were sent.
