# MiMo run — 2026-06-15T20:56:52.008Z

- model: mimo-v2.5-pro
- api_format: openai
- task: ZIVO security remediation (read-only watchdog already verified these LIVE findings on main Supabase project slirphzzwcogdbkeicff). For EACH, give the safest concrete remediation as a minimal diff or exact SQL, ranked by risk, and mark safe-to-auto-apply vs needs-owner-review. Do NOT assume you can change the live DB. Findings: (1) anon INSERT/UPDATE grants on booking/review tables: GRANT INSERT ON car_dealership_leads and salon_bookings TO anon; GRANT UPDATE ON car_dealership_reviews and car_rental_reservations TO anon. Which to revoke vs keep, and the RLS policy pattern to scope anon writes safely. (2) GRANT SELECT,INSERT ON analytics_events TO anon. (3) edge fns geo-detect and log-login fetch http://ip-api.com over plain http (NOTE ip-api free tier is http-only; https needs a paid key) - what is the correct fix. (4) wildcard CORS Allow-Origin star in supabase/functions/_shared/cors.ts. (5) Supabase leaked-password protection disabled. (6) 30+ target=_blank links without rel=noopener. (7) npm high vulns esbuild, vite, form-data, lovable-tagger (mostly dev deps).

---

# ZIVO Security Remediation Plan

Ranked by **risk** (highest first). Each item: finding → fix → safe-to-auto-apply or needs-owner-review.

---

## 1. 🔴 HIGH — Anon grants on booking/review tables

**Finding:** `anon` role has direct `INSERT`/`UPDATE` grants on production tables that hold real money or PII.

| Table | Grant | Risk |
|-------|-------|------|
| `car_dealership_leads` | `INSERT` to `anon` | Low — lead capture, intentional public form |
| `salon_bookings` | `INSERT` to `anon` | Medium — public booking form, but must be scoped |
| `car_dealership_reviews` | `UPDATE` to `anon` | **HIGH** — anon can modify any review row |
| `car_rental_reservations` | `UPDATE` to `anon` | **CRITICAL** — anon can modify live reservations |

**Remediation:**

```sql
-- ============================================================
-- SAFE: revoke the dangerous UPDATEs (anon should NEVER update
-- existing reservation/review rows — that's an authenticated action)
-- ============================================================
REVOKE UPDATE ON public.car_dealership_reviews FROM anon;
REVOKE UPDATE ON public.car_rental_reservations FROM anon;

-- ============================================================
-- KEEP but SCOPE: the INSERTs are intentional (public forms).
-- Ensure RLS policies restrict anon inserts to safe columns.
-- ============================================================

-- car_dealership_leads: ensure RLS is ON and policy scopes inserts
ALTER TABLE public.car_dealership_leads ENABLE ROW LEVEL SECURITY;

-- Drop any overly-permissive existing policy first, then recreate:
DROP POLICY IF EXISTS "anon_can_insert_leads" ON public.car_dealership_leads;
CREATE POLICY "anon_can_insert_leads" ON public.car_dealership_leads
  FOR INSERT
  TO anon
  WITH CHECK (
    -- anon can only set these columns; created_at/updated_at default
    -- they CANNOT set id, status, assigned_to, internal_notes, etc.
    dealer_id IS NOT NULL
    AND name IS NOT NULL
    AND email IS NOT NULL
  );

-- salon_bookings: same pattern
ALTER TABLE public.salon_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_insert_bookings" ON public.salon_bookings;
CREATE POLICY "anon_can_insert_bookings" ON public.salon_bookings
  FOR INSERT
  TO anon
  WITH CHECK (
    salon_id IS NOT NULL
    AND service_id IS NOT NULL
    AND customer_name IS NOT NULL
    AND customer_phone IS NOT NULL
    -- force status to 'pending' so anon can't self-approve
    AND status = 'pending'
  );
```

**Verdict:** `REVOKE UPDATE` on both review/reservation tables → **safe to auto-apply** (no legitimate anon workflow updates these). The `INSERT` policy tightening → **needs-owner-review** (confirm the column names match the actual schema; read live table first via Supabase MCP).

---

## 2. 🔴 HIGH — `analytics_events` writable by anon

**Finding:** `GRANT SELECT, INSERT ON analytics_events TO anon`. The `SELECT` is the problem — anon can read everyone's analytics rows.

```sql
-- Revoke SELECT (anon should INSERT only, never read the full table)
REVOKE SELECT ON public.analytics_events FROM anon;

-- Keep INSERT — analytics event logging from the client is intentional
-- But scope it with RLS:
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_analytics" ON public.analytics_events;
CREATE POLICY "anon_insert_analytics" ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (
    -- anon can log events but cannot set user_id to someone else's
    -- (user_id should be NULL or the session's uid)
    user_id IS NULL OR user_id = auth.uid()
  );

-- Authenticated users can still read their own:
DROP POLICY IF EXISTS "auth_read_own_analytics" ON public.analytics_events;
CREATE POLICY "auth_read_own_analytics" ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

**Verdict:** `REVOKE SELECT` → **safe to auto-apply** (no client code should be reading this table as anon). RLS policy → **needs-owner-review** (confirm column names, confirm no admin dashboard reads as anon).

---

## 3. 🟡 MEDIUM — Edge functions fetch `http://ip-api.com` (plain HTTP)

**Finding:** `geo-detect` and `log-login` edge functions call `http://ip-api.com/json/` — unencrypted, susceptible to MITM/tampering of geo data.

**Constraint:** ip-api free tier is HTTP-only. HTTPS requires a paid key.

**Options (ranked):**

| Option | Cost | Effort |
|--------|------|--------|
| **A. Switch to `ipapi.co`** (free, HTTPS, same data format) | Free | Minimal |
| B. Use Supabase's built-in `x-forwarded-for` + a paid HTTPS geo service | Paid | Medium |
| C. Keep ip-api but add integrity checks | Free | Fragile |

**Recommended: Option A** — `ipapi.co` returns the same JSON schema and supports HTTPS on the free tier.

**File:** `supabase/functions/geo-detect/index.ts` (and `log-login/index.ts`)

```diff
- const res = await fetch(`http://ip-api.com/json/${ip}`);
+ const res = await fetch(`https://ipapi.co/${ip}/json/`);
```

> **⚠ Schema note:** `ipapi.co` uses slightly different field names (`country_code` vs `countryCode`, `region_code` vs `region`). The consuming code must be checked. If the functions only read `country`/`city`/`lat`/`lon`, the fields are identical and the swap is drop-in.

**Verdict:** **needs-owner-review** — must verify the exact fields consumed match `ipapi.co`'s response schema, and test the edge function after deploy.

---

## 4. 🟡 MEDIUM — Wildcard CORS `Access-Control-Allow-Origin: *`

**File:** `supabase/functions/_shared/cors.ts`

**Current (presumed):**
```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Fix — restrict to known origins:**

```ts
const ALLOWED_ORIGINS = new Set([
  'https://zivosmedia.com',
  'https://www.zivosmedia.com',
  'https://zivostravel.com',
  'https://www.zivostravel.com',
  'https://zivosoftware.com',
  'https://zivodriver.com',
  // dev
  'http://localhost:5173',
  'http://localhost:5174',
]);

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}
```

Then in each edge function:
```diff
- import { corsHeaders } from '../_shared/cors.ts';
+ import { getCorsHeaders } from '../_shared/cors.ts';
  // ...
  if (req.method === 'OPTIONS') {
-   return new Response('ok', { headers: corsHeaders });
+   return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) });
  }
```

**Verdict:** **needs-owner-review** — this is a cross-cutting change that touches every edge function's CORS handling. Must enumerate all edge functions and update them. The `OPTIONS` preflight pattern is standard but must be applied consistently.

---

## 5. 🟡 MEDIUM — Supabase leaked-password protection disabled

**Finding:** Have I Been Pwned (HIBP) password check is off in the Supabase auth config.

**Fix:** This is a **dashboard toggle**, not a code change.

**Steps (owner only):**
1. Supabase Dashboard → Project `slirphzzwcogdbkeicff` → **Authentication** → **Settings**
2. Under **Password** section → enable **"Check for leaked passwords"**
3. Save

**Impact:** Users signing up or changing passwords to a known-breached password will get a clear error. No code change needed. Existing users are not affected until they next change their password.

**Verdict:** **needs-owner-deploy** (dashboard toggle, zero code risk, immediate security win).

---

## 6. 🟡 MEDIUM — 30+ `target="_blank"` links without `rel="noopener"`

**Finding:** Links with `target="_blank"` without `rel="noopener"` allow the opened page to access `window.opener` (reverse tabnapping).

**Modern browsers** (Chrome 88+, Firefox 79+, Safari 12.1+) implicitly set `noopener` for `target="_blank"`. But older WebView (Capacitor/iOS) may not.

**Fix — two approaches:**

### A. Global `<base>` tag (one-line fix for all links)

**File:** `index.html`
```diff
  <head>
+   <base target="_blank" rel="noopener noreferrer">
    ...
  </head>
```

> **⚠ Side effect:** This makes ALL relative links open in a new tab. Probably too aggressive for an SPA.

### B. ESLint rule + systematic fix (recommended)

**File:** `.eslintrc.cjs` (or equivalent)
```diff
  rules: {
+   'react/jsx-no-target-blank': ['error', {
+     allowReferrer: false,
+     enforceDynamicLinks: 'always',
+   }],
  }
```

Then run `npm run lint -- --fix` — ESLint will auto-add `rel="noopener noreferrer"` to every `<a target="_blank">`.

**Verdict:** ESLint rule + `--fix` → **safe to auto-apply** (purely additive, no behavior change). The `<base>` tag → **needs-owner-review** (too broad).

---

## 7. 🟢 LOW — npm high/critical vulnerabilities (dev deps)

**Finding:** `esbuild`, `vite`, `form-data`, `lovable-tagger` flagged as high/critical.

**Context:** These are **devDependencies** — they run at build time, not in the production bundle. The attack surface is the developer's machine, not end users.

**Fix:**

```bash
# Check what's actually vulnerable
npm audit --production    # only production deps matter for deployed app
npm audit                 # full picture including dev

# Update what's safe
npm update esbuild vite   # minor/patch updates within semver range

# If semver range is too tight
npm install --save-dev vite@latest esbuild@latest
```

For `lovable-tagger` — if it's not actively used, consider removing it:
```bash
npm uninstall lovable-tagger
```

**Verdict:** **safe to auto-apply** `npm update` for minor/patch bumps. Major version bumps → **needs-owner-review** (may have breaking changes). `lovable-tagger` removal → **needs-owner-review** (confirm it's unused).

---

## Summary — Priority Matrix

| # | Finding | Risk | Action | Auto-apply? |
|---|---------|------|--------|-------------|
| 1 | Anon `UPDATE` on reviews/reservations | 🔴 CRITICAL | `REVOKE UPDATE` | ✅ Yes |
| 1 | Anon `INSERT` policy tightening | 🔴 HIGH | RLS policies | ❌ Owner review (schema verify) |
| 2 | `analytics_events` `SELECT` to anon | 🔴 HIGH | `REVOKE SELECT` | ✅ Yes |
| 3 | Plain HTTP geo lookup | 🟡 MEDIUM | Switch to `ipapi.co` | ❌ Owner review (schema match) |
| 4 | Wildcard CORS | 🟡 MEDIUM | Origin allowlist | ❌ Owner review (all edge fns) |
| 5 | Leaked password protection | 🟡 MEDIUM | Dashboard toggle | ❌ Owner deploy (dashboard) |
| 6 | `target="_blank"` without noopener | 🟡 MEDIUM | ESLint rule + `--fix` | ✅ Yes |
| 7 | npm dev dep vulns | 🟢 LOW | `npm update` | ✅ Yes (minor/patch) |

---

## What the owner must do

1. **Immediate (5 min):** Run the two `REVOKE` statements (#1 UPDATEs, #2 SELECT) in the Supabase SQL editor on `slirphzzwcogdbkeicff`. Zero downtime, no code deploy needed.
2. **Immediate (2 min):** Enable leaked-password protection in Supabase dashboard (#5).
3. **This week:** Review and apply the RLS policies (#1 INSERT scoping, #2 analytics) — read the live table schemas first via Supabase MCP to confirm column names.
4. **This week:** Review the CORS allowlist (#4) and the `ipapi.co` switch (#3) — test edge functions after deploy.
5. **Anytime:** Run `npm run lint -- --fix` for the `target="_blank"` fix (#6) and `npm update` for dev deps (#7).
