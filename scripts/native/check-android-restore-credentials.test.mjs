import assert from "node:assert/strict";
import test from "node:test";

import {
  checkAndroidRestoreCredentials,
  computeAndroidAppOrigin,
  validateAssetLinks,
  validateCredentialDependencyConfig,
  validateRestoreCredentialsPluginSource,
  validateWebAuthSourceContracts,
  ZIVO_ANDROID_CERT_FINGERPRINTS,
  ZIVO_ANDROID_PLAY_CERT_FINGERPRINT,
  ZIVO_ANDROID_UPLOAD_CERT_FINGERPRINT,
} from "./check-android-restore-credentials.mjs";

const validGradle = `
dependencies {
  implementation 'androidx.credentials:credentials:1.6.0'
  implementation 'androidx.credentials:credentials-play-services-auth:1.6.0'
}
`;

const validPlugin = `
@CapacitorPlugin(name = "RestoreCredentials")
public class RestoreCredentialsPlugin {
  private static final long MINIMUM_GMS_VERSION = 24_220_000L;
  private static final int MAX_REQUEST_JSON_LENGTH = 262_144;
  @PluginMethod public void getAvailability(PluginCall call) { Build.VERSION_CODES.P; }
  @PluginMethod public void create(PluginCall call) { new CreateRestoreCredentialRequest(); }
  @PluginMethod public void get(PluginCall call) { new GetRestoreCredentialOption(); RestoreCredential credential; }
  @PluginMethod public void clear(PluginCall call) { TYPE_CLEAR_RESTORE_CREDENTIAL; }
  void fallback(E2eeUnavailableException error) {
    createRestoreCredential(call, requestJson, false);
    CreateRestoreCredentialResponse response;
  }
}
`;

const validAssetLinks = JSON.stringify([
  {
    relation: [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds",
    ],
    target: {
      namespace: "android_app",
      package_name: "com.hizovo.app",
      sha256_cert_fingerprints: [...ZIVO_ANDROID_CERT_FINGERPRINTS],
    },
  },
]);

const validWebSources = {
  clientSource: "experimental: { passkey: true }",
  runtimeSource: `
    import.meta.env.VITE_ANDROID_RESTORE_CREDENTIALS_ENABLED === "true";
    Capacitor.getPlatform() === "android";
    startRegistration(); verifyRegistration(); startAuthentication(); verifyAuthentication();
    ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY;
    passkey.friendly_name === ANDROID_RESTORE_CREDENTIAL_LABEL;
    dependencies.plugin.clear();
  `,
  authContextSource: `
    tryRestoreNativeSession();
    provisionNativeRestoreCredential(restoredSession.user.id);
    clearNativeRestoreCredential(currentUser?.id);
    supabase.auth.signOut({ scope: "local" });
  `,
  loginHistorySource: `
    clearNativeRestoreCredential(user?.id, { allDevices: true });
    supabase.auth.signOut({ scope: "global" });
  `,
  accountSecuritySource: `
    clearNativeRestoreCredential(user?.id, { allDevices: true });
    supabase.auth.signOut({ scope: 'global' });
  `,
};

test("accepts matching stable Credential Manager dependencies", () => {
  assert.deepEqual(validateCredentialDependencyConfig(validGradle), {
    version: "1.6.0",
  });
});

test("rejects old, preview, or mismatched Credential Manager dependencies", () => {
  assert.throws(
    () =>
      validateCredentialDependencyConfig(
        validGradle.replaceAll("1.6.0", "1.4.0"),
      ),
    /version 1\.5\.0 or newer/,
  );
  assert.throws(
    () =>
      validateCredentialDependencyConfig(
        validGradle.replaceAll("1.6.0", "1.7.0-alpha03"),
      ),
    /stable semantic version/,
  );
  assert.throws(
    () =>
      validateCredentialDependencyConfig(
        validGradle.replace(
          "credentials-play-services-auth:1.6.0",
          "credentials-play-services-auth:1.5.0",
        ),
      ),
    /must use the same version/,
  );
});

test("requires the Android create, restore, clear, and E2EE fallback flow", () => {
  const mainActivity = "registerPlugin(RestoreCredentialsPlugin.class);";
  assert.deepEqual(
    validateRestoreCredentialsPluginSource(validPlugin, mainActivity),
    { registered: true },
  );
  assert.throws(
    () =>
      validateRestoreCredentialsPluginSource(
        validPlugin.replace(
          "createRestoreCredential(call, requestJson, false);",
          "",
        ),
        mainActivity,
      ),
    /local fallback after E2EE failure is missing/,
  );
});

test("derives the Play and upload Android native passkey origins", () => {
  assert.equal(
    computeAndroidAppOrigin(ZIVO_ANDROID_PLAY_CERT_FINGERPRINT),
    "android:apk-key-hash:6kWZHpGKnzD57sKZGn9yZg6sSWgYS3QWqMQMHgDu-lI",
  );
  assert.equal(
    computeAndroidAppOrigin(ZIVO_ANDROID_UPLOAD_CERT_FINGERPRINT),
    "android:apk-key-hash:LLQQEib7T8lVhDnkgnTuPAwZVaH7h35Gs-1uhAuL2X4",
  );
});

test("requires the Digital Asset Links login-credentials relation", () => {
  assert.deepEqual(validateAssetLinks(validAssetLinks).androidOrigins, [
    "android:apk-key-hash:6kWZHpGKnzD57sKZGn9yZg6sSWgYS3QWqMQMHgDu-lI",
    "android:apk-key-hash:LLQQEib7T8lVhDnkgnTuPAwZVaH7h35Gs-1uhAuL2X4",
  ]);
  const missingLoginRelation = JSON.parse(validAssetLinks);
  missingLoginRelation[0].relation = missingLoginRelation[0].relation.filter(
    (relation) => relation !== "delegate_permission/common.get_login_creds",
  );
  assert.throws(
    () => validateAssetLinks(JSON.stringify(missingLoginRelation)),
    /login-credentials relation is missing/,
  );
  const missingPlayFingerprint = JSON.parse(validAssetLinks);
  missingPlayFingerprint[0].target.sha256_cert_fingerprints = [
    ZIVO_ANDROID_UPLOAD_CERT_FINGERPRINT,
  ];
  assert.throws(
    () => validateAssetLinks(JSON.stringify(missingPlayFingerprint)),
    /required Android signing fingerprint is missing/,
  );
});

test("requires an off-by-default flag and restore-key deletion before sign-out", () => {
  assert.deepEqual(validateWebAuthSourceContracts(validWebSources), {
    disabledByDefault: true,
    signOutProtected: true,
  });
  assert.throws(
    () =>
      validateWebAuthSourceContracts({
        ...validWebSources,
        loginHistorySource: 'supabase.auth.signOut({ scope: "global" });',
      }),
    /global sign-out must remove all labeled restore keys/,
  );
});

test("the checked-in Restore Credentials foundation passes its complete guard", () => {
  const result = checkAndroidRestoreCredentials();
  assert.equal(result.dependencyVersion, "1.6.0");
  assert.deepEqual(result.androidOrigins, [
    "android:apk-key-hash:6kWZHpGKnzD57sKZGn9yZg6sSWgYS3QWqMQMHgDu-lI",
    "android:apk-key-hash:LLQQEib7T8lVhDnkgnTuPAwZVaH7h35Gs-1uhAuL2X4",
  ]);
});
