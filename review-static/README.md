# ZIVO Media — Dedicated Review-only static build

A standalone, dependency-free static site published to the **Cloudflare Pages Review
project**. It is deliberately **not** the production application bundle.

## Why this exists
The production build contains mutation-capable / unresolved production paths, so it was
correctly withheld from Review. This build has **none of that**: no framework, no Supabase
client, no auth, no network. It renders deterministic fictional fixtures with every control
disabled.

## Guarantees (verified)
- Deterministic **local fictional fixtures** only (`src/fixtures.js`) — no real accounts, media, contacts, phone numbers.
- **No authentication requirement**, **no production Supabase calls**, **no provider object creation**, **no database mutation**, **no message send / booking / location update / Admin mutation** — there is no such code; it is a static renderer.
- **Every action control is `disabled`** (verified: 6/6 buttons disabled) with a "no action" notice.
- Shows the **full 40-char SHA**, **build timestamp**, `Environment: Review`, `Demo data only`, `Actions disabled` in a sticky banner.
- **Safe 404** for unknown routes: server unknown paths → `404.html` (HTTP 404); hash routing has no SPA catch-all; unknown snapshots show an in-app 404.
- **No source maps** (build fails if any `.map` is emitted); **no `sourceMappingURL`**.
- Strict CSP (`connect-src 'none'`, `script-src 'self'`, `default-src 'none'`) + security headers (`_headers`).
- Passes static **secret** and **network-target** scans (0 supabase refs, 0 external URLs, 0 `fetch`/XHR/WebSocket).

## Cloudflare Pages settings
- **Build command:** `node review-static/build.mjs`
- **Build output directory:** `review-static/dist`
- **Root directory:** repository root
- **Environment variables:** none required (there are no secrets). Optional `REVIEW_SHA` /
  `REVIEW_BUILT` overrides; otherwise `CF_PAGES_COMMIT_SHA` (full) or `git rev-parse HEAD`
  supplies the 40-char SHA and the commit date supplies the timestamp.
- Publish this build to the **Review** project only — never the production app bundle.

## Local
```
node review-static/build.mjs          # → review-static/dist
python3 -m http.server -d review-static/dist 8080
```
`dist/` is generated (gitignored); rebuild reproduces it deterministically for a given commit.
