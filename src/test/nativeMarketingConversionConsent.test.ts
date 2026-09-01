import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("native third-party marketing boundary", () => {
  it("blocks Meta browser and server conversion tracking in installed apps", () => {
    const meta = source("src/services/metaConversion.ts");
    const marketing = source("src/services/marketingTracking.ts");

    const metaGuard = meta.indexOf(
      "if (Capacitor.isNativePlatform() || !isMarketingConsentGranted()) return;",
    );
    const metaInvoke = meta.indexOf(
      'supabase.functions.invoke("meta-conversion-handler"',
    );
    expect(metaGuard).toBeGreaterThan(-1);
    expect(metaInvoke).toBeGreaterThan(metaGuard);

    const nativeGuard = marketing.indexOf(
      "if (Capacitor.isNativePlatform()) return false;",
    );
    const consentGuard = marketing.indexOf(
      "return isMarketingConsentGranted();",
    );
    expect(nativeGuard).toBeGreaterThan(-1);
    expect(consentGuard).toBeGreaterThan(nativeGuard);
  });

  it("does not capture or upload Google ad attribution without web consent", () => {
    const google = source("src/lib/googleAdsConversion.ts");
    const guards = google.match(
      /Capacitor\.isNativePlatform\(\) \|\| !isMarketingConsentGranted\(\)/g,
    );
    expect(guards).toHaveLength(2);
    expect(google).toContain("return { ok: false, skipped: true };");
  });
});
