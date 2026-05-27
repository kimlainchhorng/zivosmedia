# ZIVO Cloudflare Setup

This config adds Cloudflare hosting in two pieces:

- Cloudflare Pages serves the preview web app at `https://preview.zivollc.com`.
- A Cloudflare Worker serves R2 media/downloads and can also serve the built Vite app from `dist` with SPA fallback.
- Serve R2 media through `/media/*` and large downloads through `/downloads/*`, with public `GET`/`HEAD` and secret-protected `PUT`/`DELETE`.
- Proxy `/share/c/:handle` to the existing Supabase `channel-og` Edge Function for link previews.

Supabase remains the main backend for database, auth, RLS, realtime, and existing Edge Functions.

## Current deployment

- Worker: `zivo-web`
- Public URL: `https://zivo-web.myzivo.workers.dev`
- Pages project: `zivo-preview`
- Pages preview URL: `https://zivo-preview.pages.dev`
- Custom preview domain: `https://preview.zivollc.com`
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

## Deploy

Build the app, then deploy the Worker:

```sh
npm run build
npx wrangler deploy --keep-vars
```

The account has the workers.dev subdomain `myzivo.workers.dev`, so deploys publish at `https://zivo-web.myzivo.workers.dev`.

Deploy the static preview app to Cloudflare Pages:

```sh
npm run cloudflare:pages:deploy
```

The Pages deploy script removes `dist/downloads` before upload because Cloudflare Pages has a 25 MiB file limit and the large Mac installer now lives in R2.

Your production domain is `zivollc.com`. The safe preview domain is `preview.zivollc.com`, pointed from Lovable DNS to `zivo-preview.pages.dev`.

Public DNS for `zivollc.com` is currently served by Name.com nameservers. The Cloudflare zone exists but is still initializing. To activate Cloudflare DNS, update the domain nameservers at Name.com to:

- `emerson.ns.cloudflare.com`
- `lauryn.ns.cloudflare.com`

After the nameserver change propagates, Cloudflare DNS can manage apex and `www` directly. Until then, Lovable DNS is managing `zivollc.com`, and only the `preview` CNAME is pointed to Cloudflare Pages.

## Next app integration step

Keep current Supabase uploads working while migrating one bucket at a time. The safest first candidate is public, high-bandwidth media such as store assets or post media. Once the R2 Worker is live, add a small upload helper that writes to `/media/<key>` and stores that public URL in the same database fields currently used for Supabase Storage URLs.
