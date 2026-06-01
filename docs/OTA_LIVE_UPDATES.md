# ZIVO Live Updates

ZIVO can ship most React, CSS, copy, pricing, layout, and feature-flag changes through the Capacitor web bundle without waiting for a new App Store or Play Store binary.

Apple still requires review for native app changes. Do not use OTA updates for new native plugins, new permissions, payment rule changes, hidden features, or anything that significantly changes the app from the version Apple reviewed.

## Deploy A Web Bundle

Create `.env.deploy` with the target Supabase project URL, anon/auth values, and service role key:

```bash
cp .env.deploy.example .env.deploy
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<legacy-anon-jwt-or-compatible-function-auth-key>
SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>
SUPABASE_SERVICE_ROLE_KEY=...
```

For GitHub production deploys, configure the full CI secret checklist in `docs/production-deploy-secrets.md`.

Then publish a new web bundle:

```bash
npm run deploy:update
```

That command:

1. runs the secret scanner
2. validates `package.json` and `--min-native-version` use `1.2.3` semver format
3. runs the strict production preflight gate
4. bumps the patch version in `package.json`
5. builds `dist/`
6. zips the web bundle
7. uploads it to the public Supabase Storage bucket `app-updates` as `application/zip` with one-year cache metadata because the filename is versioned
8. writes `latest.json` with version, URL, SHA-256 checksum, bundle size, activation mode, release metadata, JSON content type, and `cacheControl: "0"`

Use `npm run deploy:preflight:local` for a local report and `npm run deploy:preflight:strict` for the production gate. The strict gate blocks deploys when API/database readiness still has unresolved blockers.

Validate a release candidate without changing `package.json` or uploading to Supabase Storage:

```bash
npm run deploy:update:dry-run -- --message="Release candidate validation"
```

Dry-run mode still builds, zips, calculates the SHA-256 checksum and bundle size, and prints the `latest.json` manifest preview. Deploys and native clients reject OTA manifests that do not include a valid `1.2.3` version, valid 64-character SHA-256 checksum, required positive bundle size, required valid `createdAt` timestamp within the 180-day freshness window, required activation and mandatory metadata, valid metadata types, a trimmed non-empty optional release message, or an exact same-project Supabase Storage `app-updates/zivo-vX.Y.Z.zip` object URL matching the manifest version and containing no query strings or fragments. Mandatory prompt-mode is rejected, and immediate reloads must be marked mandatory. The deploy script also refuses to write `latest.json` if the Supabase public URL returned for the uploaded bundle does not match the new release version. Versioned zip bundles upload with `contentType: "application/zip"` and `cacheControl: "31536000"`. The native client fetches `latest.json` with a 10-second abort timeout, `cache: "no-store"`, `Accept: "application/json"`, a response content-type check, and a top-level object guard before reading manifest fields; after download, it verifies the bundle version still matches the manifest before queueing it and deletes mismatched bundles. Deploys upload the manifest with `contentType: "application/json"` and `cacheControl: "0"` so release checks do not intentionally reuse stale metadata.
Dry-run mode uses local preflight by default, so production Supabase credentials are not required unless you remove `--dry-run` and publish a real upload.
OTA bundles are capped at 50 MB by default. If an approved emergency release must exceed that limit, set `ZIVO_ALLOW_LARGE_OTA_BUNDLE=I_UNDERSTAND_THE_OTA_SIZE_RISK` and record the reason in the incident tracker.

## Activation Modes

Prompt users with a small reload banner:

```bash
npm run deploy:update -- --message="Feed and Go Live fixes are ready"
```

Queue the update for next launch without asking users to reload:

```bash
npm run deploy:update:next -- --message="Quiet background update"
```

Apply immediately after the bundle downloads:

```bash
npm run deploy:update:immediate -- --message="Critical hotfix"
```

Use immediate mode only for urgent fixes because it reloads the WebView. Immediate or mandatory OTA updates require a non-empty `--message` that names the customer-visible release reason. Release messages are capped at 240 characters.
Use only one activation mode flag per release; prompt mode uses no activation flag, next-launch uses `--next-launch`, and immediate uses `--immediate`.
Mandatory OTA updates must also use an explicit activation mode: `--next-launch --mandatory` or `--immediate`. Native clients reject mandatory prompt-mode manifests.
Deploys and native clients reject malformed `mandatory` values; if present, it must be a JSON boolean.
Deploys and native clients reject unknown activation values; accepted manifest values are `prompt`, `next_launch`, and `immediate`.

## Emergency Preflight Bypass

Do not skip preflight for normal OTA releases. If production recovery requires `--skip-preflight`, the operator must set:

```bash
ZIVO_ALLOW_OTA_SKIP_PREFLIGHT=I_UNDERSTAND_THE_RELEASE_RISK npm run deploy:update -- --skip-preflight --message="Emergency recovery"
```

Record the reason, incident owner, and follow-up validation in the incident tracker.

## Native Version Gate

If a web bundle depends on a minimum native binary version, block older installs:

```bash
npm run deploy:update -- --min-native-version=1.2.0 --message="New native shell required"
```

Older native apps will ignore that OTA bundle and continue using their current bundle.
Native clients reject malformed `minNativeVersion` values; use `1.2.3` semver format.

## Remote Config

Use `/admin/remote-config` for values that should change instantly without a new bundle: feature flags, text, pricing, region toggles, limits, and rollout switches. Those changes refresh from Supabase while the app is open.
