# MiMo run — 2026-06-25T02:15:54.455Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: ZIVO super-app push notifications are CODE-COMPLETE but not delivering in production. Write the EXACT owner runbook. Owner is a non-native English speaker who deploys himself, so use plain short numbered steps and copy-paste commands. KNOWN GAPS to fix: (A) Android android/app/google-services.json is MISSING (gitignored) -> must download from Firebase console and place there + add to CI build as a secret. (B) iOS aps-environment=development in App.entitlements AND edge secret APNS_ENV defaults to development -> need production for TestFlight/App Store builds. (C) Supabase Edge Function secrets to set: FCM_SERVICE_ACCOUNT_JSON, APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID=com.hizovo.app, APNS_ENV=production, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. (D) code bug: send-test-notification checks FCM_SERVER_KEY but the real sender (attached) uses FCM_SERVICE_ACCOUNT_JSON. For EACH gap give exact steps: how to get the APNs .p8 auth key + Key ID + Team ID from Apple Developer, how to download the FCM service-account JSON from Firebase console (Project settings > Service accounts), how to download google-services.json (Firebase > Android app), how to generate a VAPID keypair (web-push generate-vapid-keys), and the exact 'supabase secrets set NAME=value' commands. Note the project must be the SAME Firebase project across google-services.json and FCM_SERVICE_ACCOUNT_JSON. Keep it tight and runnable.
- files: supabase/functions/send-push-notification/index.ts

---

I need to see the `send-test-notification` function to fully characterize gap (D) before writing the runbook.

**MiMo agent** — running with `--file` on the test notification function:

Let me search for it.<tool_call>
<function=glob>
<parameter=pattern>supabase/functions/send-test-notification/**</parameter>
</function>
</tool_call><tool_call>
<function=glob>
<parameter=pattern>supabase/functions/*test*notification*/**</parameter>
</function>
</tool_call>
