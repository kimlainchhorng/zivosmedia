# Supabase Edge Function Deployment

This project keeps browser-facing function calls disabled until the matching
Supabase Edge Function is visible in the live project.

## Current Blocker

- `analytics-event-track` exists locally and is declared in `supabase/config.toml`.
- A fresh read-only check on 2026-08-30 found `notification-manage`,
  `social-notification-manage`, and `push-device-manage` active, while three
  critical deploy-readiness functions remain absent. See
  `docs/qa/edge-function-live-gap-2026-06-03.json`.
- A CLI deploy attempt failed with a hosted capacity response: max function count
  reached; upgrade the plan, disable the spend cap, or free a function slot before
  enabling browser calls.

## Release Rules

- Keep `VITE_ANALYTICS_EVENT_TRACK_ENABLED=false` in frontend deploy env until
  `analytics-event-track` is deployed and an OPTIONS/POST smoke succeeds.
- Keep `VITE_NOTIFICATION_MANAGE_ENABLED=false` until an authenticated production
  POST smoke succeeds. While disabled, UI mutation
  controls show a temporary-unavailable message instead of calling the missing
  function.
- Keep `VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED=false` until authenticated
  production mark-read/create
  smoke checks succeed. While disabled, social notification reads stay visible
  but write/read-state mutations do not call the missing function.
- Keep `VITE_PUSH_DEVICE_MANAGE_ENABLED=false` until an authenticated production
  revoke smoke succeeds. While disabled, device
  lists still load but revoke actions are rolled back with a temporary message.
- Keep `VITE_TALENT_INVITE_NOTIFICATION_ENABLED=false` until
  `talent-invite-notification` is deployed and an authenticated invite smoke
  succeeds. While disabled, open-to-work talent browsing remains available but
  invite buttons show a temporary-unavailable message.
- Keep `VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED=false` until
  `admin-broadcast-notification` is deployed and authenticated admin preview/send
  smokes succeed. While disabled, broadcast history remains available but preview
  and send actions show a temporary-unavailable message.
- Do not delete, pause, or replace existing live functions just to create a slot
  without a product owner approval and rollback plan.
- After capacity is resolved, deploy `analytics-event-track` with
  `verify_jwt=false`, because the function performs its own CORS and payload
  validation for anonymous analytics.
- Run `npm run qa:edge-function-deploy-contracts` and
  `npm run qa:edge-function-slot-readiness` before flipping the feature flag.
- Use `docs/qa/edge-function-live-gap-2026-06-03.json` as the current blocker
  snapshot until a fresh Supabase function list proves those functions are live.

## Optional Live Snapshot Check

The slot readiness script is read-only. By default it reads
`docs/qa/edge-function-live-gap-2026-06-03.json` so the current known live gap
is visible in every generated report. For a stricter live comparison, pass a
fresh JSON snapshot from the Supabase dashboard, MCP function list, or
Management API:

```bash
node scripts/qa/edge-function-slot-readiness.mjs --live-snapshot=docs/qa/live-edge-functions.json --write-report
```

The snapshot may be either an array of functions or an object with a `functions`
array. Each function should include at least `slug`.
