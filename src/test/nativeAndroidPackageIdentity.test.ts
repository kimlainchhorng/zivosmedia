import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("platform-specific Media package identity", () => {
  it("uses the new package for Android sync without a remote server", async () => {
    vi.stubEnv("ZIVO_NATIVE_PLATFORM", "android");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CAPACITOR_DEV_SERVER_URL", "http://localhost:5173");
    vi.resetModules();
    const { default: config } = await import("../../capacitor.config");
    expect(config.appId).toBe("com.zivosmedia.app");
    expect(config.appName).toBe("Zivo - Media");
    expect(config.server).toBeUndefined();
    expect(config.plugins?.Keyboard?.resize).toBe("native");
  });

  it("preserves the existing iOS bundle identity", async () => {
    vi.stubEnv("ZIVO_NATIVE_PLATFORM", "ios");
    vi.resetModules();
    const { default: config } = await import("../../capacitor.config");
    expect(config.appId).toBe("com.hizovo.app");
  });
});
