# MiMo advisor — Security review of a CORS allowlist tightening change in a Cloudflare Worker + Supabase edge functions (ZIVO React web app). I removed the retired domain myzivo.com from 3 allowlists: removed origins https://myzivo.com, https://www.myzivo.com, https://app.myzivo.com, https://preview.myzivo.com, and the suffix wildcard '.myzivo.com' from supabase/functions/_shared/cors.ts ALLOWED_ORIGIN_SUFFIXES. I KEPT live hosts: zivo-web.myzivo.workers.dev and zivo.myzivo.workers.dev (the worker), myzivo.lovable.app (Lovable deploy host), and com.myzivo.app (published mobile app package id). Test now asserts myzivo.com is rejected; build+test green. Answer concretely under 300 words: (1) Removing entries from an allowlist is a tightening change — is there ANY way removing an allowed origin could OPEN a security hole instead of closing one? (2) What else commonly references an old domain that I should grep for so it does not silently break: OAuth/Supabase redirect URLs, CSP connect-src, Stripe return/webhook URLs, password-reset/email links, sitemap/canonical, manifest, share/og urls? (3) The worker + functions only enforce this after redeploy — any ordering/risk-window concern between deploying worker vs supabase functions, or leaving myzivo.com DNS pointed at the app?

Files: (none)

**(1) Can removing an allowed origin open a hole?**

No. A tighter CORS allowlist cannot introduce a new vulnerability. The only realistic risk is *functional* breakage — legitimate requests from still-active code paths hitting the removed origin suddenly get blocked, causing silent failures users report as bugs. There's no security-inversion mechanism here.

One edge case: if you *replaced* entries rather than removed, a typo could accidentally match a broader set. Pure removal is strictly monotonic tightening.

**(2) Grep these for stale `myzivo.com` references:**

| Surface | What to grep | Why |
|---|---|---|
| **Supabase Auth** | `Site URL`, `Redirect URLs` in Dashboard → Authentication → URL config | OAuth + magic-link callbacks fail silently |
| **CSP headers** | `connect-src`, `frame-src`, `script-src` in worker response headers | Blocked fetches = silent JS failures |
| **Stripe** | `return_url`, `success_url`, webhook `endpoint_url` in Dashboard + code | Checkout redirects 404; webhooks stop signing |
| **Transactional email** | Reset/confirm email templates (Supabase Dashboard + any Resend/SendGrid templates) | Dead links in password-reset emails |
| **`<link rel="canonical">`**, **`og:url`**, **`manifest.json`** `start_url`, **`robots.txt`**, **`sitemap.xml`** | Source files + public/ folder | SEO/social/Google crawl breakage |
| **`com.myzivo.app`** Capacitor config | `server.url`, `allowNavigation` in `capacitor.config.ts` | If it still resolves to old domain, WebView loads stale origin |
| **Service Worker** | `scope`, any hardcoded origins in `sw.js` or Workbox config | Cache scope mismatch |
| **.env files / CI secrets** | `ORIGIN`, `BASE_URL`, `APP_URL`, `SITE_URL` | Build-time bake of wrong domain |

**(3) Deployment ordering / risk window:**

- **No gap between worker and Supabase functions** — both reject the old origin once *their* code is live. The risk window is the minutes *between* deploys where one is tightened and the other isn't, causing CORS mismatches on preflight. **Deploy the worker last** (it's the gateway) so both functions agree during the window.
- **DNS left pointing at the app is low risk** — CORS enforcement is origin-based, not IP-based. A stale DNS A-record serving `myzivo.com` content doesn't bypass the allowlist because the browser still sends `Origin: https://myzivo.com` which will now be *rejected*. The real risk is **user confusion**: if someone visits `myzivo.com` directly they see a broken page, not a redirect. **Point DNS to a 301 → `zivo.app`** (or your canonical domain) to avoid that.
