# DeepSeek run — 2026-06-15T20:55:51.077Z

- model: deepseek-chat
- task: ZIVO security remediation (read-only watchdog already verified these LIVE findings on main Supabase project slirphzzwcogdbkeicff). For EACH, give the safest concrete remediation as a minimal diff or exact SQL, ranked by risk, and mark safe-to-auto-apply vs needs-owner-review. Do NOT assume you can change the live DB. Findings: (1) anon INSERT/UPDATE grants on booking/review tables: GRANT INSERT ON car_dealership_leads and salon_bookings TO anon; GRANT UPDATE ON car_dealership_reviews and car_rental_reservations TO anon. Which to revoke vs keep, and the RLS policy pattern to scope anon writes safely. (2) GRANT SELECT,INSERT ON analytics_events TO anon. (3) edge fns geo-detect and log-login fetch http://ip-api.com over plain http (NOTE ip-api free tier is http-only; https needs a paid key) - what is the correct fix. (4) wildcard CORS Allow-Origin star in supabase/functions/_shared/cors.ts. (5) Supabase leaked-password protection disabled. (6) 30+ target=_blank links without rel=noopener. (7) npm high vulns esbuild, vite, form-data, lovable-tagger (mostly dev deps).

---

# ZIVO Security Remediation — Ranked Plan & Diffs

## Risk Ranking & Summary

| # | Finding | Risk | Auto-apply? | Effort |
|---|---------|------|-------------|--------|
| 1 | anon INSERT/UPDATE on booking tables | **HIGH** — data corruption/theft | Needs review | 2 files |
| 2 | anon INSERT on `analytics_events` | **MEDIUM** — spam/abuse | Safe | 1 file |
| 3 | `http://ip-api.com` plain HTTP | **MEDIUM** — MITM on geo data | Needs review | 1 file |
| 4 | Wildcard CORS `*` | **MEDIUM** — broad origin access | Safe | 1 file |
| 5 | Supabase leaked-password protection disabled | **LOW** — config toggle | Needs owner | 0 files |
| 6 | `target=_blank` without `rel=noopener` | **LOW** — tab-napping | Safe | 1 glob |
| 7 | npm vulns (dev deps) | **LOW** — dev-only | Safe | 1 command |

---

## 1. anon INSERT/UPDATE on booking tables (HIGH)

### Plan
- **Revoke** `GRANT INSERT ON car_dealership_leads TO anon` and `GRANT INSERT ON salon_bookings TO anon` — these should go through authenticated RLS, not raw anon grants.
- **Keep** `GRANT UPDATE ON car_dealership_reviews TO anon` and `GRANT UPDATE ON car_rental_reservations TO anon` **only if** the RLS policies already scope them to the row owner. If not, revoke and add RLS.
- **Add RLS policies** on all 4 tables that enforce `auth.uid() = user_id` for INSERT/UPDATE.

### SQL (owner must apply via Supabase SQL editor)

```sql
-- 1. Revoke dangerous anon grants
REVOKE INSERT ON car_dealership_leads FROM anon;
REVOKE INSERT ON salon_bookings FROM anon;

-- 2. Check if UPDATE grants are safe (verify existing RLS first)
-- If RLS policies already exist that check auth.uid(), keep them.
-- If not, revoke and add policies:
-- REVOKE UPDATE ON car_dealership_reviews FROM anon;
-- REVOKE UPDATE ON car_rental_reservations FROM anon;

-- 3. Add RLS policies for safe anon writes (if not existing)
-- car_dealership_leads: anon can INSERT if they provide user_id matching auth.uid()
CREATE POLICY "anon_insert_own_leads" ON car_dealership_leads
  FOR INSERT TO anon
  WITH CHECK (auth.uid() = user_id);

-- salon_bookings: same pattern
CREATE POLICY "anon_insert_own_bookings" ON salon_bookings
  FOR INSERT TO anon
  WITH CHECK (auth.uid() = user_id);

-- car_dealership_reviews: anon can UPDATE own reviews
CREATE POLICY "anon_update_own_reviews" ON car_dealership_reviews
  FOR UPDATE TO anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- car_rental_reservations: anon can UPDATE own reservations
CREATE POLICY "anon_update_own_reservations" ON car_rental_reservations
  FOR UPDATE TO anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Verification
```sql
-- Check current grants
SELECT grantee, privilege_type, table_name 
FROM information_schema.role_table_grants 
WHERE grantee = 'anon';

-- Check existing RLS policies
SELECT tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('car_dealership_leads', 'salon_bookings', 'car_dealership_reviews', 'car_rental_reservations');
```

---

## 2. anon INSERT on `analytics_events` (MEDIUM)

### Plan
- **Keep** the grant — analytics events need anon writes for page views.
- **Add rate-limiting RLS** to prevent abuse.

### SQL (safe to apply)

```sql
-- Add rate-limiting policy (1 event per 10 seconds per IP)
CREATE POLICY "rate_limit_analytics" ON analytics_events
  FOR INSERT TO anon
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM analytics_events a
      WHERE a.ip_address = current_setting('request.headers')::json->>'x-forwarded-for'
      AND a.created_at > now() - interval '10 seconds'
    )
  );
```

---

## 3. `http://ip-api.com` plain HTTP (MEDIUM)

### Plan
- **Keep** `http://` — ip-api free tier is HTTP-only. The MITM risk is low (geo-ip data is not sensitive).
- **Add a comment** documenting why HTTP is intentional.
- **Add a fallback** that silently fails if the request is blocked.

### Diff: `supabase/functions/_shared/geo.ts`

```typescript
// BEFORE:
const res = await fetch(`http://ip-api.com/json/${ip}`);

// AFTER:
// NOTE: ip-api free tier is HTTP-only (HTTPS requires paid key).
// Geo-IP data is non-sensitive; MITM risk is acceptable.
// If this becomes sensitive, upgrade to paid ip-api or use Cloudflare's
// cf-ipcountry header (free, HTTPS).
const res = await fetch(`http://ip-api.com/json/${ip}`, {
  signal: AbortSignal.timeout(3000), // 3s timeout to avoid hanging
});
```

---

## 4. Wildcard CORS `*` (MEDIUM)

### Plan
- **Restrict** to the known domains from `AGENTS.md`.

### Diff: `supabase/functions/_shared/cors.ts`

```typescript
// BEFORE:
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AFTER:
const ALLOWED_ORIGINS = [
  'https://zivosmedia.com',
  'https://zivostravel.com',
  'https://zivosoftware.com',
  'https://zivoschat.com',
  'https://zivodriver.com',
  'http://localhost:5173',
  'http://localhost:5174',
];

export const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://zivosmedia.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});
```

**Note:** This changes the function signature — all edge functions that import `corsHeaders` must be updated to pass the request origin. If that's too broad, a simpler fix:

```typescript
// SAFER MINIMAL FIX (no signature change):
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://zivosmedia.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 5. Supabase leaked-password protection disabled (LOW)

### Plan
- **Owner action only** — this is a Supabase Dashboard toggle, not code.

### Steps for owner
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/slirphzzwcogdbkeicff)
2. **Authentication → Settings → Security**
3. Enable **"Leaked password protection"**
4. Optionally enable **"Rate limiting"** for auth endpoints

---

## 6. `target=_blank` without `rel=noopener` (LOW)

### Plan
- **Global regex find/replace** — safe, additive change.

### Diff (find all occurrences)

```bash
# Find all target="_blank" without rel="noopener"
grep -rn 'target="_blank"' src/ --include="*.tsx" --include="*.ts" | grep -v 'rel="noopener' | grep -v 'rel="noreferrer'
```

### Fix (one-liner per file, example):

```tsx
// BEFORE:
<a href="https://example.com" target="_blank">Link</a>

// AFTER:
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>
```

**Auto-fix script** (safe to run):

```bash
# Add rel="noopener noreferrer" to all target="_blank" links that don't have it
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/target="_blank"\([^r]*\)/target="_blank" rel="noopener noreferrer"\1/g' {} \;
```

---

## 7. npm high vulns (dev deps) (LOW)

### Plan
- **Run `npm audit fix`** — safe for dev dependencies.

### Command

```bash
npm audit fix --audit-level=high
```

If that fails (breaking changes), pin safe versions:

```bash
# Check current versions
npm ls esbuild vite form-data lovable-tagger --depth=0

# Update to safe versions (example — verify actual safe versions first)
npm install --save-dev esbuild@^0.25.0 vite@^6.0.0
```

---

## Summary: What the owner must do

| # | Action | Who |
|---|--------|-----|
| 1 | Run SQL to revoke anon grants + add RLS policies | **Owner** (SQL editor) |
| 2 | Run SQL for analytics rate-limiting | **Owner** (SQL editor) |
| 3 | Apply `geo.ts` diff | **Claude/Codex** (safe) |
| 4 | Apply `cors.ts` diff | **Claude/Codex** (safe) |
| 5 | Toggle leaked-password protection in Supabase Dashboard | **Owner** |
| 6 | Run sed command for `rel=noopener` | **Claude/Codex** (safe) |
| 7 | Run `npm audit fix` | **Claude/Codex** (safe) |

**Priority order:** 1 → 3 → 4 → 6 → 2 → 7 → 5
