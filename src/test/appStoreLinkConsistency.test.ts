import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const SRC = path.join(root, "src");
const CONFIG_REL = "src/config/appStoreLinks.ts";

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) out.push(path.relative(root, full));
  }
  return out;
}

const PLAY_URL = /https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+/g;
const APPLE_URL = /https:\/\/apps\.apple\.com\/[\w/.-]*/g;

describe("app store link consistency", () => {
  it("resolves only to package names that exist in the ZIVO LLC Play account", async () => {
    const links = await import("@/config/appStoreLinks");

    expect(links.ZIVO_ANDROID_PACKAGE).toBe("com.hizovo.app");
    expect(links.ZIVO_DRIVER_ANDROID_PACKAGE).toBe("com.zivo.driver");

    // Every one of these was live in src/ and resolves to a Play "not found"
    // page. com.myzivo.app is real but suspended, so the public site must not
    // link to it either. Checked against resolved values, not file text, so the
    // config is still free to name them in its explanatory comment.
    const resolved = [
      links.ZIVO_ANDROID_STORE_URL,
      links.ZIVO_DRIVER_ANDROID_STORE_URL,
      links.ZIVO_IOS_STORE_URL,
      links.ZIVO_DRIVER_IOS_STORE_URL,
    ].join("\n");

    for (const deadPackage of [
      "com.zivollc.app",
      "com.zivodriver.app",
      "com.hizovo.pos",
      "com.myzivo.app",
      "id=com.zivo&",
    ]) {
      expect(resolved).not.toContain(deadPackage);
    }
    expect(resolved).not.toMatch(/id=com\.zivo$/m);
  });

  it("keeps the driver apps distinct from the passenger app", async () => {
    const links = await import("@/config/appStoreLinks");

    // Sending a driver to the passenger app installs the wrong app, and its
    // login then refuses them with DRIVER_ACCOUNT.
    expect(links.ZIVO_IOS_APP_ID).toBe("6759480121");
    expect(links.ZIVO_DRIVER_IOS_APP_ID).toBe("6759507131");
    expect(links.ZIVO_DRIVER_IOS_STORE_URL).not.toBe(links.ZIVO_IOS_STORE_URL);
    expect(links.ZIVO_DRIVER_ANDROID_STORE_URL).not.toBe(
      links.ZIVO_ANDROID_STORE_URL,
    );

    const driverSheet = read("src/components/partner/DriverAppDownloadSheet.tsx");
    expect(driverSheet).toContain("ZIVO_DRIVER_IOS_STORE_URL");
    expect(driverSheet).not.toMatch(/\bZIVO_IOS_STORE_URL\b/);
  });

  it("has no store URL hardcoded anywhere outside the shared config", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      if (file === CONFIG_REL) continue;
      if (file.includes(`${path.sep}test${path.sep}`) || /\.test\.tsx?$/.test(file)) continue;

      const source = read(file);
      const hits = [
        ...(source.match(PLAY_URL) ?? []),
        ...(source.match(APPLE_URL) ?? []),
      ];
      if (hits.length > 0) offenders.push(`${file}: ${hits.join(", ")}`);
    }

    // These URLs previously lived in eleven files under four different, mostly
    // wrong values. Import from @/config/appStoreLinks instead of inlining one.
    expect(offenders).toEqual([]);
  });
});
