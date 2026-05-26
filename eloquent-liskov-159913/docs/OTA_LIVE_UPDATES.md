# ZIVO Live Updates

ZIVO can ship most React, CSS, copy, pricing, layout, and feature-flag changes through the Capacitor web bundle without waiting for a new App Store or Play Store binary.

Apple still requires review for native app changes. Do not use OTA updates for new native plugins, new permissions, payment rule changes, hidden features, or anything that significantly changes the app from the version Apple reviewed.

## Deploy A Web Bundle

Create `.env.deploy` with the target Supabase project URL and service role key:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Then publish a new web bundle:

```bash
npm run deploy:update
```

That command:

1. runs the strict production preflight gate
2. bumps the patch version in `package.json`
3. builds `dist/`
4. zips the web bundle
5. uploads it to the public Supabase Storage bucket `app-updates`
6. writes `latest.json` with version, URL, SHA-256 checksum, activation mode, and release metadata

Use `npm run deploy:preflight` for a local report and `npm run deploy:preflight:strict` for the production gate. The strict gate blocks deploys when API/database readiness still has unresolved blockers.

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

Use immediate mode only for urgent fixes because it reloads the WebView.

## Native Version Gate

If a web bundle depends on a minimum native binary version, block older installs:

```bash
npm run deploy:update -- --min-native-version=1.2.0 --message="New native shell required"
```

Older native apps will ignore that OTA bundle and continue using their current bundle.

## Remote Config

Use `/admin/remote-config` for values that should change instantly without a new bundle: feature flags, text, pricing, region toggles, limits, and rollout switches. Those changes refresh from Supabase while the app is open.
