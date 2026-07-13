# DeepSeek run — 2026-06-15T21:54:13.517Z

- model: deepseek-chat
- task: ZIVO next security step. I now have a Supabase Management API personal token for the MAIN project (live payments + auth, slirphzzwcogdbkeicff). Leaked-password (HaveIBeenPwned) protection is currently OFF. QUESTION: is it safe to ENABLE it programmatically via PATCH https://api.supabase.com/v1/projects/{ref}/config/auth with body {password_hibp_enabled:true} on a LIVE auth project? Any risk to EXISTING users or to current sign-in sessions (vs only affecting new sign-ups / password changes)? Is it cleanly reversible? Also briefly rank this against the other remaining items (edge CORS wildcard, ip-api http in edge fns, npm dev-dep vulns, target_blank rel=noopener). Be concise.

---

# HIBP Password Protection — Analysis & Plan

## (1) Short Answer

**Yes, it's safe to enable.** `password_hibp_enabled` is a **sign-up / password-change gate only** — it checks the new password against HIBP's breached-password API *at the moment of creation/update*. It has **zero effect on existing sessions, existing passwords, or active logins**. Cleanly reversible via the same PATCH with `false`.

## (2) Risk Ranking (quick)

| Priority | Item | Risk | Fix |
|----------|------|------|-----|
| **1** | **Edge CORS wildcard** (`*`) in edge functions | **HIGH** — any website can call your edge fns, including Stripe-idempotency-key replay or wallet-drain attempts | Pin to specific origins |
| **2** | **`target="_blank"` rel=noopener** | **MEDIUM** — tab-napping (rare in SPA, but present in user-generated content / share links) | Bulk grep + fix |
| **3** | **HIBP password check** | **LOW** — no risk to existing users, only improves sign-up hygiene | Safe to enable now |
| **4** | **`ip-api.com` HTTP in edge fns** | **LOW** — plaintext IP geolocation (no secrets, but leaks user IPs to a third party over HTTP) | Upgrade to HTTPS |
| **5** | **npm dev-dep vulns** | **LOW** — dev-only, not in production bundle | `npm audit fix` |

## (3) Proposed Change

No repo file changes needed — this is a **Supabase project config** change only.

### Before (current state):
```bash
# password_hibp_enabled: false (default)
```

### After:
```bash
# password_hibp_enabled: true
```

### How to apply (owner runs one of these):

**Option A — Direct API call (recommended):**
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/slirphzzwcogdbkeicff/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password_hibp_enabled": true}'
```

**Option B — Supabase Dashboard:**
1. Go to [Supabase Dashboard → slirphzzwcogdbkeicff → Authentication → Settings](https://supabase.com/dashboard/project/slirphzzwcogdbkeicff/auth/settings)
2. Toggle **"Enable breached password protection"** ON
3. Save

### Verify:
```bash
curl -s "https://api.supabase.com/v1/projects/slirphzzwcogdbkeicff/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" | jq '.password_hibp_enabled'
# Should return: true
```

### Revert:
Same PATCH with `{"password_hibp_enabled": false}`.

## (4) Owner Must Verify

1. **No user-facing change** — existing users won't notice. Only new sign-ups or password changes with a known-breached password will see a "This password has been exposed in a data breach" error.
2. **HIBP API key** — Supabase uses their own HIBP API key (not yours), so no additional setup needed.
3. **Rate limit** — HIBP calls are per-password-check, not per-request-batch. No impact on auth throughput.
4. **Edge CORS wildcard** is the real urgent item — I'd prioritize that next.
