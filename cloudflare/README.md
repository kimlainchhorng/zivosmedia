# ZIVO Cloudflare Setup

This config adds Cloudflare hosting in two pieces:

- Cloudflare Pages serves the preview web app at `https://preview.zivosmedia.com`.
- A Cloudflare Worker serves R2 media/downloads and can also serve the built Vite app from `dist` with SPA fallback.
- Serve R2 media through `/media/*` and large downloads through `/downloads/*`, with public `GET`/`HEAD` and secret-protected `PUT`/`DELETE`.
- Proxy `/api/ai/chat` to DeepSeek or Claude from the Worker so browser code never sees provider API keys. The bridge accepts `provider: "auto" | "claude" | "deepseek"` and falls back to the other configured provider when the primary provider is busy or temporarily unavailable.
- Proxy `/share/c/:handle` to the existing Supabase `channel-og` Edge Function for link previews.
  Configure this with `SUPABASE_URL` or the more specific `CHANNEL_OG_FUNCTION_URL`.

Supabase remains the main backend for database, auth, RLS, realtime, and existing Edge Functions.

## Current deployment

- Worker: `zivo`
- Public URL: `https://zivo.myzivo.workers.dev`
- Legacy allowed Worker URL: `https://zivo-web.myzivo.workers.dev`
- Pages project: `zivo-preview`
- Pages preview URL: `https://zivo-preview.pages.dev`
- Custom preview domain: `https://preview.zivosmedia.com`
- Auto repair software domain: `https://zivosoftware.com`
- R2 buckets: `zivo-media` and `zivo-media-dev`
- Migrated R2 object: `downloads/auto-repair/ZIVO Auto Repair Software-1.0.0-arm64.dmg`

## One-time Cloudflare account setup

Install Wrangler on a machine with npm available:

```sh
npm install -D wrangler
npx wrangler login
```

Create the R2 buckets:

```sh
npx wrangler r2 bucket create zivo-media
npx wrangler r2 bucket create zivo-media-dev
```

Set the production write token. Use a long random value and keep it secret:

```sh
npx wrangler secret put MEDIA_WRITE_TOKEN
```

Skip this until the app or Supabase Edge Functions need to write directly to the Worker. Public reads from R2 already work without this secret.

Set the DeepSeek API key for the AI chat bridge:

```sh
npx wrangler secret put DEEPSEEK_API_KEY
```

If a DeepSeek key was ever pasted into chat or committed locally, revoke it in the DeepSeek dashboard and create a fresh key before setting the Worker secret.

Set the Claude API key for Claude-backed chat:

```sh
npx wrangler secret put ANTHROPIC_API_KEY
```

This is optional and only works with Anthropic API billing. A Claude Pro chat subscription cannot be used as a Worker/API key. If `ANTHROPIC_API_KEY` is not configured, auto mode uses DeepSeek for live website requests.

Do not use `VITE_` variables for either provider key. Browser code should call the Worker bridge only.

## Local development

Copy the example vars and set a local token:

```sh
cp cloudflare/.dev.vars.example .dev.vars
npx wrangler dev
```

Upload a test object:

```sh
curl -X PUT "http://localhost:8787/media/smoke/hello.txt" \
  -H "Authorization: Bearer $MEDIA_WRITE_TOKEN" \
  -H "Content-Type: text/plain" \
  --data "hello from zivo"
```

Read it back:

```sh
curl "http://localhost:8787/media/smoke/hello.txt"
```

Test the local DeepSeek bridge after adding `DEEPSEEK_API_KEY` to `.dev.vars`:

```sh
curl -X POST "http://localhost:8787/api/ai/chat" \
  -H "Content-Type: application/json" \
  --data '{"provider":"deepseek","message":"Give me one short Cambodia travel tip.","mode":"travel","stream":false}'
```

Test Claude after adding `ANTHROPIC_API_KEY`:

```sh
curl -X POST "http://localhost:8787/api/ai/chat" \
  -H "Content-Type: application/json" \
  --data '{"provider":"claude","message":"Give me one short support greeting for ZIVO.","mode":"support","stream":false}'
```

For coordinated provider selection, omit `provider` or send `provider: "auto"`. Auto mode prefers Claude for support/site-builder prompts only when an Anthropic API key is configured; otherwise it uses DeepSeek. Travel prompts prefer DeepSeek, with fallback to Claude only when API access exists.

When running the React app with Vite and the Worker separately, point the browser app at the local Worker:

```sh
VITE_ZIVO_WORKER_API_ORIGIN=http://localhost:8787
```

## Deploy

Before a Cloudflare deploy, make sure the software-domain browser values are
configured in the private deploy environment or CI secret store:

```sh
VITE_ZIVO_SOFTWARE_SUPABASE_URL=https://<software-project-ref>.supabase.co
VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY=<software-project-publishable-key>
```

`npm run cloudflare:check`, `npm run cloudflare:deploy`, and
`npm run cloudflare:pages:deploy` all run the software-domain env guard before
publishing. The guard prevents `zivosoftware.com` from shipping with the main
Zivo media Supabase key by accident.

Run the local release gate, then deploy the Worker:

```sh
npm run cloudflare:deploy
```

The account has the workers.dev subdomain `myzivo.workers.dev`, so deploys publish at `https://zivo.myzivo.workers.dev`. The old `zivo-web` workers.dev origin remains in the allowed-origin list for compatibility while DNS and callers settle.

Deploy the static preview app to Cloudflare Pages:

```sh
npm run cloudflare:pages:deploy
```

The Pages deploy script removes `dist/downloads` before upload because Cloudflare Pages has a 25 MiB file limit and the large Mac installer now lives in R2.

`npm run cloudflare:check` runs the same local gate before the Worker dry-run. Both Cloudflare deploy scripts run `npm run security:scan` and `npm run deploy:preflight:local` before publishing, so local/preview deploys use the same safety gates as the Netlify preview path.

Your production domain is `zivosmedia.com`. The safe preview domain is `preview.zivosmedia.com`, pointed from Lovable DNS to `zivo-preview.pages.dev`.

The dedicated chat domain is `zivoschat.com`. Point both `zivoschat.com` and
`www.zivoschat.com` to the same Cloudflare-hosted app. The edge worker redirects
the domain root to:

```txt
/chat
```

The React app keeps that host focused on chat, auth, legal, and account support
routes so unrelated product surfaces redirect back to `/chat`.

The dedicated business software domain is `zivosoftware.com`. Point both `zivosoftware.com` and `www.zivosoftware.com` to the same Cloudflare-hosted app. The React app restricts that host to business software flows only: the category portal, business setup, business software downloads, auth callbacks, and the auto repair workspace for store `a914b90d-c249-4794-ba5e-3fdac0deed44`. Consumer app routes such as Home, Reels, Chat, and Profile redirect back to:

```txt
/business
```

Supabase Auth must also allow the software domain as a post-login destination in the dedicated software project `ydxztoresbdeoeijhxww`. In Supabase Dashboard → Authentication → URL Configuration, keep that project's Site URL on `https://zivosoftware.com`, then add these Redirect URLs:

```txt
https://zivosoftware.com/**
https://www.zivosoftware.com/**
```

Keep the main project `slirphzzwcogdbkeicff` on `https://zivosmedia.com`. Supabase only redirects to URLs that are present in each project's allowlist.

In Supabase Auth password settings for project `ydxztoresbdeoeijhxww`, enable
leaked password protection if the project is on a plan that supports it. This is
the live security advisor warning currently reported for the software project.

Public DNS for `zivosmedia.com` is currently served by Name.com nameservers. The Cloudflare zone exists but is still initializing. To activate Cloudflare DNS, update the domain nameservers at Name.com to:

- `emerson.ns.cloudflare.com`
- `lauryn.ns.cloudflare.com`

After the nameserver change propagates, Cloudflare DNS can manage apex and `www` directly. Until then, Lovable DNS is managing `zivosmedia.com`, and only the `preview` CNAME is pointed to Cloudflare Pages.

## Next app integration step

Keep current Supabase uploads working while migrating one bucket at a time. The safest first candidate is public, high-bandwidth media such as store assets or post media. Once the R2 Worker is live, add a small upload helper that writes to `/media/<key>` and stores that public URL in the same database fields currently used for Supabase Storage URLs.
