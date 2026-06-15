# MiMo run — 2026-06-15T21:54:42.506Z

- model: mimo-v2.5-pro
- api_format: openai
- task: ZIVO next security step. I now have a Supabase Management API personal token for the MAIN project (live payments + auth, slirphzzwcogdbkeicff). Leaked-password (HaveIBeenPwned) protection is currently OFF. QUESTION: is it safe to ENABLE it programmatically via PATCH https://api.supabase.com/v1/projects/{ref}/config/auth with body {password_hibp_enabled:true} on a LIVE auth project? Any risk to EXISTING users or to current sign-in sessions (vs only affecting new sign-ups / password changes)? Is it cleanly reversible? Also briefly rank this against the other remaining items (edge CORS wildcard, ip-api http in edge fns, npm dev-dep vulns, target_blank rel=noopener). Be concise.

---

## (1) Plan — Enable HIBP leaked-password check

**What it does:** When `password_hibp_enabled: true`, Supabase Auth hashes the first 5 chars of every password with SHA-1 and checks the k-Anonymity prefix against the HaveIBeenPwned API. A match → reject with `AuthWeakPasswordError`.

**Safety on a live project:**

| Concern | Answer |
|---------|--------|
| **Existing users / active sessions** | **No impact.** The check runs only at the moment of password *verification* — i.e., sign-in, sign-up, or password-change. Existing sessions (JWTs) are unaffected. Users whose current password happens to be in a breach list will **not** be kicked out; they'll only hit the block next time they try to sign in or change their password. |
| **New sign-ups** | Blocked if the chosen password is in HIBP. Good. |
| **Password resets** | Blocked if the new password is in HIBP. Good. |
| **Sign-in of existing users with breached passwords** | They can still sign in — Supabase Auth's HIBP check applies to the *plaintext submission*, not the stored hash. Wait — actually: Supabase's implementation checks at sign-in too (it hashes the submitted password and checks HIBP before comparing to the stored hash). So **an existing user with a HIBP-listed password WILL be blocked at next sign-in.** This is the one real risk: a small % of users get locked out until they reset. Supabase returns `AuthWeakPasswordError` which the client can surface as "your password appeared in a data breach, please reset." |
| **Reversibility** | Fully reversible — PATCH the same endpoint with `password_hibp_enabled: false`. Instant, no restart needed. |
| **Rate limits** | HIBP's k-Anonymity API is free and rate-limit-friendly (prefix-only). Supabase caches responses. No latency concern. |

**The one risk to flag:** Existing users whose passwords are in HIBP will get `AuthWeakPasswordError` on next sign-in. Your client needs to handle that error gracefully (show "please reset your password"). If it doesn't, those users are effectively locked out until you either disable the flag or they use a password-reset flow.

**Recommendation:** Enable it. It's the single highest-value security toggle in Supabase. The user-lockout risk is small (most breached passwords are already rotated) and the fix (password reset) is the correct behavior anyway.

---

## (2) The change

This is a **Management API call**, not a code change. No file diff needed.

```bash
curl -X PATCH \
  "https://api.supabase.com/v1/projects/slirphzzwcogdbkeicff/config/auth" \
  -H "Authorization: Bearer <YOUR_MANAGEMENT_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"password_hibp_enabled": true}'
```

**No repo file changes.** This is a Supabase platform config toggle.

---

## (3) Owner must verify / do

1. **Before running:** Confirm your client handles `AuthWeakPasswordError` (or the equivalent `weak_password` error code) on sign-in. Quick grep:

   ```bash
   grep -ri "weak_password\|AuthWeakPasswordError\|weak.password" src/
   ```

   If nothing shows up, add a handler in your auth sign-in flow that shows "Your password appeared in a data breach. Please reset your password." and links to the reset flow. **This is the critical pre-check.**

2. **Run the PATCH** with your Management API token.

3. **Test:** Try signing in with a known-breached password (e.g., `Password123!` on a throwaway account) — confirm you get the error and the client surfaces it.

4. **To reverse:** `PATCH` with `{"password_hibp_enabled": false}`.

---

## (4) Security backlog ranking

| Rank | Item | Why | Effort |
|------|------|-----|--------|
| **1** | **HIBP password check** ← this task | Blocks the #1 credential-stuffing vector. Zero code deploy (API toggle). Highest ROI. | 5 min + client error handler |
| **2** | **`target="_blank" rel="noopener"`** | Prevents `window.opener` tab-napping on every external link. Quick sweep. | 30 min grep + fix |
| **3** | **Edge function CORS wildcard** | If any edge function returns `Access-Control-Allow-Origin: *`, any origin can call it. Tighten to your domains. | 1 hr audit + fix |
| **4** | **`ip-api.com` HTTP in edge functions** | Plaintext HTTP leaks the user's IP to any network observer + the response can be tampered. Switch to HTTPS (`ip-api.com` supports it on port 443, though their free tier officially doesn't — or switch to `ipapi.co` which does). | 30 min |
| **5** | **npm dev-dep vulns** | Dev dependencies don't ship to production. Audit with `npm audit` but lowest urgency unless there's a build-time RCE. | 1 hr |

**TL;DR:** Enable HIBP first — it's a 5-minute platform toggle with the highest security payoff. Add the client-side error handler if missing, then run the PATCH.
