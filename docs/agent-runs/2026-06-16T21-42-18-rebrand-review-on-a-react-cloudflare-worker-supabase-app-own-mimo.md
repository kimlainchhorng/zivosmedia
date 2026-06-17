# MiMo advisor — Rebrand review on a React + Cloudflare Worker + Supabase app. Owner wants every 'myzivo' string replaced with 'zivosmedia'. Already done safely: removed dead myzivo.com CORS origins, renamed a share fallback host, a legal audit tag, two comments. The REMAINING myzivo references are tied to live infrastructure and I propose NOT renaming them in code alone: (1) com.myzivo.app = the PUBLISHED mobile app package id, used in public/.well-known/assetlinks.json, a Play Integrity check (verify-play-integrity), native deep-link URL schemes (nativeDeepLinks.ts), and pages AdminAppStoreAssets/UsernameRedirectPage/PublicUserProfilePage. (2) myzivo.lovable.app = the Lovable project deploy host, in urlSafety.ts ZIVO_OWNED_HOSTS + contentLinkValidation trusted-host checks. (3) zivo-web.myzivo.workers.dev / zivo.myzivo.workers.dev = the Cloudflare account workers.dev subdomain in the allowlists. Answer concretely, under 250 words: (Q1) Confirm or correct: renaming these three in CODE ALONE, while the app store listing / Lovable project / Cloudflare account still use 'myzivo', BREAKS the live app (Android App Links domain verification, Play Integrity package match, host-trust allowlists) rather than being cosmetic. (Q2) For a genuine full rebrand, what is the correct ORDER of operations across external systems (Google Play/App Store, Lovable, Cloudflare, DNS) vs the code change so installed users do not break?

Files: (none)

## Q1: Confirmed — code-only rename BREAKS the live app

You are correct on all three:

- **`com.myzivo.app`**: This is the published Android `applicationId`. Renaming it in `assetlinks.json`, deep-link configs, or Play Integrity checks without updating the **actual app listing in Google Play Console** (which requires a new package ID + republish) causes: App Links domain verification failure, Play Integrity token mismatch, and deep-link routing breakage. iOS equivalent (associated domains entitlement) has the same contract.

- **`myzivo.lovable.app`**: Removing this from `ZIVO_OWNED_HOSTS` / `contentLinkValidation` means every existing shared link using that host gets flagged as untrusted or blocked. Not cosmetic — it's a security-gating allowlist.

- **`*.myzivo.workers.dev`**: Removing from allowlists while Workers still serve live endpoints (e.g., `verify-play-integrity`) causes origin mismatch failures. The Worker subdomain is assigned by Cloudflare, not user-chosen — you can't rename it without creating new Workers.

## Q2: Correct order of operations

1. **Cloudflare**: Create new Workers under the desired subdomain (or bind a custom domain), deploy, update DNS.
2. **Lovable**: Migrate the project to new deploy host (or add custom domain), confirm the new URL resolves.
3. **Google Play / App Store**: Publish a new app build with the new package ID / bundle ID under the new listing. This is a **new app submission** — existing users get migrated via an app update that detects the legacy package and redirects.
4. **DNS**: Point new branded domains, verify SSL, update `assetlinks.json` / `apple-app-site-association` on the **new** domain.
5. **Code**: Only AFTER steps 1–4 are live, ship the final code rename — allowlists, deep links, package checks, host constants — in a single coordinated release.

Ship code last. Infrastructure first.
