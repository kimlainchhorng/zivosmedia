# Media restaurant-menu discovery release

Status: configured artifact built and dry-run verified; production deployment is blocked pending verified company identity details and a passing full application type check. No deployment or merchant opt-in has been performed.

## Target and rollback

- Worker: `zivo`, account `f4e145a3c077d14107181ca95aab3698`.
- Production domains: `zivosmedia.com` and `www.zivosmedia.com` only.
- Last observed production version: `6792b2b0-c00f-4267-bde6-69a3767f3943` (100% traffic), deployment `8164f994-01d7-4922-b5a2-0b04816590dc`.
- Re-read deployment state before publishing to rule out concurrent changes.
- Rollback command, only if needed for this authorized release: `node node_modules/wrangler/bin/wrangler.js rollback 6792b2b0-c00f-4267-bde6-69a3767f3943 --name zivo --message "Restore prior Media release"`.
- `wrangler.toml`, Worker code, ASSETS, ALLOWED_ORIGINS, R2 and Durable Object bindings are unchanged. The baseline Worker exactly matches the live Worker SHA-256 recorded in `release-manifest.json`.

## Reviewed source

Frozen checkout: `/tmp/zivo-media-menu-discovery-release-20260905/frozen`.
Base: `6a12e202ee8c67035c16c4f57f84ca3dfb8f158b`. Exactly nine reviewed implementation/test/documentation files are listed with hashes in `reviewed-source-manifest.json`. Generated preflight reports are release evidence; no backend source or database mutation is part of this Media release.

Use Node `24.19.0` from `/Users/kimlain/.local/share/fnm/node-versions/v24.19.0/installation/bin`. Dependencies were installed in this isolated checkout using `npm ci --no-audit --no-fund`; the shared working copy dependency directory was preserved. Do not replace this with its stale package tree.

## Public build configuration

The temporary copy of the original `.env.local` has been removed. To rebuild, `run-with-public-build-env.mjs` privately reads only these existing browser-public values from the original local environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ZIVO_SOFTWARE_SUPABASE_URL`, `VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ZIVO_RIDE_APP_URL`. Both existing Supabase public key pairs were verified against their respective projects; no values are reproduced in this document. The main Media project is `slirphzzwcogdbkeicff`. Restoring these existing public values corrects the verified missing-config warning in the previous live login bundle. The Software branch remains hostname-gated; this Worker has no Software hostname binding. No payment provider is activated.

The release-only `.env.production.local` adds:

```dotenv
VITE_ZIVO_BUSINESS_CATALOG_URL=https://gzyktwcanrrkosieecxs.supabase.co/functions/v1/public-merchant-catalog
```

This is a public, read-only catalog endpoint. It does not grant cross-product account access. Do not commit environment files or infer merchant opt-in. Subsequent builds must include this setting to retain discovery.

## Required checks

1. `node ../run-with-public-build-env.mjs npm run update` (standard app/Worker type checks, contract checks and final production build). Set the Node 24.19.0 PATH first. This loads only the approved public build values and never copies the original private environment file.
2. Focused catalog/cards/Home tests and scoped lint; final logs are alongside this recipe.
3. `node scripts/qa/zivo-business-restaurant-catalog-ui.mjs /tmp/zivo-media-menu-discovery-release-20260905/browser` (explicit mocked EN/Km public catalog fixtures, separate from live signed-out checks).
4. `node ../run-with-public-build-env.mjs node ../run-with-release-env.mjs npm run deploy:preflight:strict -- --skip-build --skip-type-check` checks live read-only inventory and strict release reports. Build and types are checked independently by step 1; those flags do not replace their required result.
5. `node ../run-with-public-build-env.mjs node ../run-with-release-env.mjs npm run release:production-gate`.
6. `node node_modules/wrangler/bin/wrangler.js deploy --dry-run --keep-vars --outdir ../final-worker` after the configured build; confirm bindings remain unchanged.

The separate strict-gate release runner obtains the existing authorized Supabase CLI credential from the macOS Keychain only into child-process memory. It does not save the credential. Public gate values and function inventory are private-permission local verification inputs. No server credentials are included in the Vite environment or built artifact.

## Pending verified input

The unchanged `scripts/deploy/check-business-identity.mjs` guard blocks `release:production-gate` because `src/config/legalContent.ts` lacks the registered-office street/city/postcode, Cambodia operating street/postcode, and public support phone. These must come from verified business information. The guard must pass normally before deployment; do not invent addresses or bypass it.

## Deployment and follow-through

The user has already approved this exact three-app publication; no new generic deployment permission is required. Parent review is internal coordination. Once the verified company details are supplied, the unchanged identity guard passes, and the standard full application type check passes, publish the frozen built artifact with `node node_modules/wrangler/bin/wrangler.js deploy --keep-vars --message "Publish opt-in Business restaurant menu discovery"`. Do not run native sync, commit/push, merchant opt-in writes, or unrelated release steps.

Verify the resulting version has 100% traffic, the two production domains load, the deployed asset hashes match the prepared artifact, the anonymous login lacks the disabled placeholder configuration warning, and real public catalog handling is truthful in English and Khmer. Do not submit authentication or order forms during the smoke check. Existing restaurants with no discovery consent must remain unlisted for new menu discovery.

The final configured build passed in 17.65 seconds. The Worker dry-run, seven other standard update checks, focused tests, strict preflight and browser fixtures passed. The two interrupted app-type attempts are retained as pending evidence, not passing results. Resume the standard update with its unchanged incremental cache and the public-env runner above.

## Durable handoff

This folder contains sanitized verification evidence, source and dist SHA-256 manifests, the compiled unchanged Worker, and exactly nine reviewed files in `source-overlay/`. It deliberately contains no environment file, private credential, dependency tree or full source clone. The current built `dist` remains in the frozen temporary checkout recorded above; the source overlay is durable here.

If the temporary checkout is no longer available, reconstruct an isolated checkout from the exact base commit recorded in `release-manifest.json`, copy each listed file from `source-overlay/` to the same relative path, install its locked dependencies under Node 24.19.0, and load only the five named existing public build values from the original local environment plus the public catalog setting. Regenerate live strict-gate evidence through the existing authorized read-only credential path; stale reports must not substitute for a fresh required gate. Incorporate only the owner-supplied verified company identity fields, run the normal full update and production release gate, build, and rehearse the unchanged Worker deployment. No new generic deployment approval is needed; the two unresolved requirements are verified identity facts and a normal passing app type check.
