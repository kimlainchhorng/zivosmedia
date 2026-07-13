# MiMo run — 2026-06-25T02:17:30.850Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: ZIVO super-app push notifications are CODE-COMPLETE but not delivering in production. Both delivery + diagnostic functions are now attached. Write the EXACT owner runbook. Owner is a non-native English speaker who deploys himself: use plain short numbered steps and copy-paste commands. Do NOT call any tools or search files; everything you need is attached or stated. Fix these gaps, each with exact steps: (A) Android android/app/google-services.json MISSING (gitignored) -> download from Firebase console (Project settings > General > Your apps > Android app > google-services.json) to android/app/, and add to CI as a base64 secret. (B) iOS aps-environment=development in ios/App/App/App.entitlements AND edge secret APNS_ENV default development -> set production for TestFlight/App Store. (C) Set Supabase Edge Function secrets: FCM_SERVICE_ACCOUNT_JSON, APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID=com.hizovo.app, APNS_ENV=production, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. (D) code bug: send-test-notification checks FCM_SERVER_KEY but real sender uses FCM_SERVICE_ACCOUNT_JSON. Give exact steps to: get APNs .p8 auth key + Key ID + Team ID from Apple Developer (Certificates,Identifiers&Profiles > Keys), download FCM service-account JSON from Firebase (Project settings > Service accounts > Generate new private key), download google-services.json, generate a VAPID keypair (npx web-push generate-vapid-keys), and the exact 'supabase secrets set NAME=value' / 'supabase secrets set --env-file' commands. IMPORTANT: google-services.json and FCM_SERVICE_ACCOUNT_JSON must be the SAME Firebase project. Keep it tight and copy-paste runnable, max ~600 words.
- files: supabase/functions/send-push-notification/index.ts, supabase/functions/send-test-notification/index.ts

---

## (1) Plan

**A.** Write a copy-paste owner runbook covering all four gaps (A–D) — short numbered steps, no jargon.  
**B.** Fix the one code bug: `send-test-notification/index.ts` line 59 checks the retired `FCM_SERVER_KEY` instead of `FCM_SERVICE_ACCOUNT_JSON`, so the diagnostics panel always reports `fcm: false` even when the real sender works fine.  
**C.** Owner verifies with `supabase secrets list` + the diagnostics page.

---

## (2) Code change

**File:** `supabase/functions/send-test-notification/index.ts` — one line fix in the `diagnostics` object (around L59).

### Before
```ts
    fcm:    !!Deno.env.get("FCM_SERVER_KEY"),
```

### After
```ts
    fcm:    !!Deno.env.get("FCM_SERVICE_ACCOUNT_JSON"),
```

No other lines change. The real sender (`send-push-notification`) already reads `FCM_SERVICE_ACCOUNT_JSON` and mints an OAuth2 token — this just aligns the diagnostic so admins see `fcm: true` when it's actually configured.

---

## (3) Owner runbook — exact steps

> **All commands run in your terminal at the repo root.** Replace `<ANGLE BRACKETS>` with your real values.

### Step 0 — Get your credentials (one-time)

**A. APNs key (.p8)**
1. Go to [Apple Developer → Certificates, Identifiers & Profiles → Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Click **"+"**, name it "Zivo Push", check **Apple Push Notifications service (APNs)**, click Continue/Register.
3. Download the `.p8` file. Note the **Key ID** (10 chars, shown on the key page) and your **Team ID** (Account → Membership).
4. Copy the key contents to one line:
```bash
cat AuthKey_<KEY_ID>.p8 | tr -d '\n'
```
Paste that long string (including `-----BEGIN PRIVATE KEY-----`) as the value of `APNS_PRIVATE_KEY` below.

**B. Firebase — service account JSON (Android FCM)**
1. Go to [Firebase Console](https://console.firebase.google.com) → your ZIVO project → **Project settings** (gear) → **Service accounts** tab.
2. Click **"Generate new private key"** → save the downloaded JSON file.
3. Copy the entire file contents as one line (or use it directly in the secrets command below).

**C. Firebase — google-services.json (Android app)**
1. Same Firebase project → **Project settings** → **General** tab → scroll to **Your apps** → click the Android app (package `com.hizovo.app`).
2. Click **"Download google-services.json"**.
3. Place it in your repo:
```bash
cp ~/Downloads/google-services.json android/app/google-services.json
```
4. For CI, base64-encode it and add as a GitHub secret:
```bash
cat android/app/google-services.json | base64 -w0
# Copy the output → GitHub repo → Settings → Secrets → Actions → new secret:
#   name: GOOGLE_SERVICES_JSON_BASE64
#   value: (paste)
```

> ⚠️ **Same Firebase project** for both `.json` files (B + C). They must share the same `project_id`.

**D. VAPID keypair (web push)**
```bash
npx web-push generate-vapid-keys
```
Copy the two keys it prints (`Public Key` and `Private Key`). Also note the subject (your admin email or `mailto:admin@zivostravel.com`).

---

### Step 1 — Set all Supabase Edge Function secrets

Create a file `push-secrets.env` (do NOT commit it):

```bash
cat > push-secrets.env << 'EOF'
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"YOUR_PROJECT","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...whole key...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@YOUR_PROJECT.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40YOUR_PROJECT.iam.gserviceaccount.com"}
APNS_KEY_ID=YOUR_10_CHAR_KEY_ID
APNS_TEAM_ID=YOUR_10_CHAR_TEAM_ID
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...(whole p8 key on one line)...-----END PRIVATE KEY-----
APNS_BUNDLE_ID=com.hizovo.app
APNS_ENV=production
VAPID_PUBLIC_KEY=BN...your_public_key...
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@hizovo.com
EOF
```

Then push them all at once:

```bash
supabase secrets set --env-file push-secrets.env
```

Verify they're set:

```bash
supabase secrets list
```

You should see all 9 keys listed. Then delete the local file:

```bash
rm push-secrets.env
```

---

### Step 2 — Fix the iOS entitlement (production)

Open `ios/App/App/App.entitlements` and change:

```xml
<key>aps-environment</key>
<string>development</string>
```

to:

```xml
<key>aps-environment</key>
<string>production</string>
```

> **Apple requires `production` for TestFlight and App Store builds.** `development` only works with Xcode-debug builds.

---

### Step 3 — Redeploy the edge functions

```bash
supabase functions deploy send-push-notification
supabase functions deploy send-test-notification
```

---

### Step 4 — Verify everything

1. Open your app → **Admin → Notifications → Analytics** (or wherever the test panel lives).
2. Click **"Send test notification"**.
3. Check the response JSON:
   - `diagnostics.fcm` must be **`true`** (was falsely `false` before the bug fix).
   - `diagnostics.apns` must be **`true`**.
   - `diagnostics.vapid` must be **`true`**.
   - `dispatch.push.sent` should be **> 0** if you have a registered device.
4. Confirm the notification arrives on your Android/iOS device and browser.

---

### Quick-reference: which secret goes where

| Secret | Where it's used | Source |
|---|---|---|
| `FCM_SERVICE_ACCOUNT_JSON` | `send-push-notification` → `sendFCM()` | Firebase → Service accounts → Generate key |
| `APNS_KEY_ID` | `send-push-notification` → `sendAPNS()` | Apple → Keys → Key ID |
| `APNS_TEAM_ID` | same | Apple → Account → Team ID |
| `APNS_PRIVATE_KEY` | same | Apple → Keys → Download `.p8` |
| `APNS_BUNDLE_ID` | same | `com.hizovo.app` (your iOS bundle ID) |
| `APNS_ENV` | same — selects `api.push.apple.com` vs sandbox | `production` for TestFlight/App Store |
| `VAPID_PUBLIC_KEY` | `send-push-notification` → `sendVAPIDWebPush()` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | same | same |
| `VAPID_SUBJECT` | same | `mailto:admin@hizovo.com` or your email |
| `google-services.json` | Android build (Capacitor/Firebase SDK) | Firebase → Project settings → Android app |

### Deploy checklist

- [ ] `android/app/google-services.json` exists + `GOOGLE_SERVICES_JSON_BASE64` in CI secrets
- [ ] `ios/App/App/App.entitlements` says `aps-environment` = `production`
- [ ] All 9 secrets set (`supabase secrets list`)
- [ ] `FCM_SERVICE_ACCOUNT_JSON` and `google-services.json` are from the **same** Firebase project
- [ ] `supabase functions deploy send-push-notification` succeeded
- [ ] `supabase functions deploy send-test-notification` succeeded
- [ ] Test notification shows `fcm: true, apns: true, vapid: true` and delivers to device
