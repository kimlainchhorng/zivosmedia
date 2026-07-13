# Runbook — zivoschat.com (Supabase Env Vars in Host/Deployment)

**Issue:** `zivoschat.com` renders the ZIVO Chat sign-in, but every viewport logs a console error:
`[supabase/client] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — using bundled public fallback until the site is re-published with env vars.`
The chat host was **built/published without the Supabase build-time env vars** and is running on a bundled fallback config.
**Class:** deployment env config. **Cannot be fixed by editing runtime code — these are build-time Vite vars set in the publishing environment.**
**This is a runbook, not a code change. No secret values are included — only variable names and where to obtain/set them.**

> Why it can't be a code fix: `src/integrations/supabase/client.ts` reads `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at **build time** (Vite inlines them). If the build that serves `zivoschat.com` is produced without them, it falls back to a bundled public value and logs the warning. The fix is to set the vars in the publishing environment and **re-publish**.

---

## 1. Expected configuration

| Field | Value |
|-------|-------|
| **Expected repo (web host)** | `kimlainchhorng/zivosmedia` — `zivoschat.com` is served by the same web build, host-routed to `/chat` |
| **Related repo (native chat app)** | `kimlainchhorng/ZIVO-CHAT` (separate Capacitor app; not the web host) |
| **Expected domain** | `zivoschat.com` (+ `www.zivoschat.com`); worker redirects `/` → `/chat` |
| **Expected deployment host** | Production zivosmedia web app. `cloudflare/README.md`: "point `zivoschat.com` … to the same Cloudflare-hosted app." Production is currently **Lovable**-published (mid-transition to Cloudflare) — **confirm** which host serves `zivoschat.com`. |
| **Supabase project (chat)** | `slirphzzwcogdbkeicff` (shared main project; chat CSP `report-uri` confirms this) |

---

## 2. DNS records to verify

`zivoschat.com` already resolves and returns 200 with a `302 → /chat`, so DNS is not the blocker — verify it points at the host you will re-publish.

```sh
nslookup zivoschat.com
curl -sI https://zivoschat.com            # expect 302 -> /chat
curl -sI https://zivoschat.com/chat       # expect 200
```

| Record | Expectation |
|--------|-------------|
| `zivoschat.com` | A/CNAME → the production app host; resolves, 302 → `/chat`. |
| `www.zivoschat.com` | CNAME → apex / same host. |

---

## 3. Cloudflare Pages / Workers routes to verify

- `zivoschat.com` is **not** in the `zivo` Worker routes (`wrangler.toml` = software + travel only) — consistent with Lovable serving it. Confirm the actual binding.
- The `/` → `/chat` redirect for chat hosts is handled by the app's edge worker (`public/_worker.js`, `CHAT_HOSTS`) — verify the published build includes it (it does on current `main`).
- If `zivoschat.com` is on Cloudflare Pages: project → **Custom domains** → `zivoschat.com` Active, and the **build configuration** for that project must define the env vars in §5.

---

## 4. Lovable publish status to verify

If production is on Lovable (most likely):
1. Open the Lovable project for `kimlainchhorng/zivosmedia` → **Project Settings → Environment Variables**.
2. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set (see §5). If absent → this is the root cause.
3. Add/correct them, then **Re-publish**. Vite vars are baked at build time, so a republish (new build) is **required** — setting the var without republishing does nothing.
4. Confirm the new publish is live (last-published commit/timestamp updated).

---

## 5. Env vars needed (names only — set in the publishing env, never commit values)

| Variable | Value source | Notes |
|----------|--------------|-------|
| `VITE_SUPABASE_URL` | `https://slirphzzwcogdbkeicff.supabase.co` | main project URL (not a secret) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → project `slirphzzwcogdbkeicff` → **Project Settings → API → Publishable/anon key** | **Use the publishable/anon key only.** `client.ts` throws if a service-role/secret key is supplied. Public-safe, but still set via env, not committed. |
| `VITE_SUPABASE_PROJECT_ID` (optional) | `slirphzzwcogdbkeicff` | used by the client for project identification |

> Do **not** put any service-role/secret key in a `VITE_*` variable — those are inlined into client JS. Only the publishable/anon key is safe client-side.

---

## 6. Cache purge steps

1. Re-publish/redeploy so a fresh build (with the env vars inlined) is produced.
2. Cloudflare → zone for `zivoschat.com` → **Caching → Purge Everything** (or `zivoschat.com/*`) to evict the old JS bundle.
3. Lovable republish invalidates the Lovable CDN; still hard-reload in an incognito profile (the old bundle hash may be cached locally).

---

## 7. Live acceptance criteria

- [ ] `zivoschat.com/chat` loads with **no** `[supabase/client] Missing VITE_SUPABASE_URL…` console error.
- [ ] The Supabase client connects to project `slirphzzwcogdbkeicff` (not the bundled fallback) — sign-in / session calls hit the real project.
- [ ] "Use your ZIVO Media account" sign-in works (auth succeeds end-to-end).
- [ ] `/` still redirects to `/chat`; unrelated routes stay gated to chat surfaces.
- [ ] No service-role/secret key is present in the shipped client bundle.

---

## 8. Who must do the manual dashboard action

| Action | Owner |
|--------|-------|
| Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in the publishing env (Lovable project settings or Cloudflare Pages build env) | Deploy/publish owner |
| Retrieve the publishable/anon key from Supabase | Supabase project owner (`slirphzzwcogdbkeicff`) |
| Re-publish / redeploy after setting vars | Deploy owner |
| Verify `zivoschat.com` host binding (Lovable vs Cloudflare) | Platform owner / Cloudflare admin |
| Cache purge after republish | Cloudflare account admin |
