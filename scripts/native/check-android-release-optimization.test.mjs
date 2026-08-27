import assert from "node:assert/strict";
import test from "node:test";

import {
  parseArchiveEntriesFromUnzipList,
  parseDexEntriesFromUnzipList,
  validateAndroidReleaseOptimizationConfig,
  validateAndroidReleaseOptimizationEvidence,
} from "./check-android-release-optimization.mjs";

const validConfig = `
android {
  signingConfigs {
    release {
      minifyEnabled false
    }
  }
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
`;

function validEvidence(overrides = {}) {
  return {
    aabBytes: 1024,
    dexEntries: [{ path: "base/dex/classes.dex", bytes: 512 }],
    mappingText: "com.hizovo.app.MainActivity -> a.b:\n",
    usageText: "com.example.RemovedClass:\n",
    configurationText: "-optimizationpasses 5\n",
    seedsText:
      "com.hizovo.app.MainActivity\ncom.hizovo.app.PlayIntegrityPlugin\n",
    embeddedMappingBytes: 256,
    r8MetadataBytes: 64,
    ...overrides,
  };
}

test("accepts optimization only from the Android release build type", () => {
  assert.deepEqual(validateAndroidReleaseOptimizationConfig(validConfig), {
    minifyEnabled: true,
    shrinkResources: true,
    optimizedDefaultRules: true,
  });
});

test("rejects a release that disables R8 minification", () => {
  assert.throws(
    () =>
      validateAndroidReleaseOptimizationConfig(
        validConfig.replace("minifyEnabled true", "minifyEnabled false"),
      ),
    /minifyEnabled must be true/,
  );
});

test("rejects a release that disables resource shrinking", () => {
  assert.throws(
    () =>
      validateAndroidReleaseOptimizationConfig(
        validConfig.replace("shrinkResources true", "shrinkResources false"),
      ),
    /shrinkResources must be true/,
  );
});

test("rejects the non-optimized default ProGuard configuration", () => {
  assert.throws(
    () =>
      validateAndroidReleaseOptimizationConfig(
        validConfig.replace(
          "proguard-android-optimize.txt",
          "proguard-android.txt",
        ),
      ),
    /optimized Android default ProGuard configuration/,
  );
});

test("parses packaged DEX entries from an unzip listing", () => {
  const listing = `
      700  01-01-1981 01:01   base/dex/classes.dex
      300  01-01-1981 01:01   base/dex/classes2.dex
      256  01-01-1981 01:01   BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map
     1256                     3 files
    `;
  assert.deepEqual(parseDexEntriesFromUnzipList(listing), [
    { path: "base/dex/classes.dex", bytes: 700 },
    { path: "base/dex/classes2.dex", bytes: 300 },
  ]);
  assert.equal(
    parseArchiveEntriesFromUnzipList(listing).at(-1)?.path,
    "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map",
  );
});

test("accepts a non-empty optimized release artifact and R8 reports", () => {
  assert.deepEqual(
    validateAndroidReleaseOptimizationEvidence(validEvidence()),
    {
      aabBytes: 1024,
      dexBytes: 512,
      dexFiles: 1,
      embeddedMappingBytes: 256,
    },
  );
});

test("rejects missing obfuscation and removed-code evidence", () => {
  assert.throws(
    () =>
      validateAndroidReleaseOptimizationEvidence(
        validEvidence({ mappingText: "", usageText: "" }),
      ),
    /mapping report has no obfuscated class mappings; R8 usage report has no removed code entries/,
  );
});

test("rejects an AAB without embedded R8 metadata or preserved app plugins", () => {
  assert.throws(
    () =>
      validateAndroidReleaseOptimizationEvidence(
        validEvidence({
          seedsText: "",
          embeddedMappingBytes: 0,
          r8MetadataBytes: 0,
        }),
      ),
    /missing its embedded deobfuscation mapping; release AAB is missing its embedded R8 metadata; R8 seeds do not preserve com\.hizovo\.app\.MainActivity; R8 seeds do not preserve com\.hizovo\.app\.PlayIntegrityPlugin/,
  );
});
