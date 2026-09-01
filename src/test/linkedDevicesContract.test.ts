import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const hook = read("src/hooks/useLinkedDevices.ts");
const canonicalPage = read("src/pages/account/LinkedDevicesPage.tsx");
const compatibilityPage = read("src/pages/DevicesPage.tsx");
const libraryPage = read("src/pages/LibraryPage.tsx");
const loginActivityPage = read("src/pages/LoginActivityPage.tsx");
const app = read("src/App.tsx");

describe("registered-device frontend contract", () => {
  it("uses the server-owned linked registry and closes the first-visit race", () => {
    expect(hook).toContain('from("linked_devices")');
    expect(hook).toContain(".select(LINKED_DEVICE_COLUMNS)");
    expect(hook).toContain("device_fingerprint");
    expect(hook).toContain("Registered devices are temporarily unavailable");
    expect(hook).toContain("finally");
    expect(hook).toMatch(
      /await registerCurrentDevice\(\);\s*await fetchDevices\(\);/,
    );
    expect(hook).not.toContain(
      'void supabase.functions.invoke("device-register"',
    );
    expect(hook).toContain('functions.invoke("linked-device-manage"');
    expect(hook).not.toMatch(/from\("linked_devices"\)[\s\S]{0,180}\.delete/);
  });

  it("keeps the legacy route as a protected compatibility alias", () => {
    expect(compatibilityPage).toContain("Navigate");
    expect(compatibilityPage).toContain('to="/account/linked-devices"');
    expect(compatibilityPage).not.toContain("user_devices");
    expect(app).toMatch(
      /<Route\s+path="\/devices"\s+element=\{\s*<ProtectedRoute>\s*<DevicesPage\s*\/>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    );
    expect(libraryPage).toContain('title: "Registered devices"');
    expect(libraryPage).toContain(
      'description: "Devices linked to this account"',
    );
  });

  it("derives this device from its fingerprint and avoids session overclaims", () => {
    expect(canonicalPage).toContain(
      "device.device_fingerprint === currentFingerprint",
    );
    expect(canonicalPage).not.toMatch(/\[\.\.\.devices\]\.sort/);
    expect(canonicalPage).toContain("registered devices");
    expect(canonicalPage).toMatch(
      /not proof that an Auth\s+session is currently active/,
    );
    expect(canonicalPage).toContain("retryRegistration");
    expect(canonicalPage).toContain("Other Auth sessions signed out");
    expect(canonicalPage).toContain("Sign out of other Auth sessions?");
    expect(canonicalPage).not.toContain("Signed out from all other devices");
    expect(loginActivityPage).toContain('navigate("/devices")');
    expect(loginActivityPage).toContain(
      "registered-device records and live Auth sessions",
    );
    expect(loginActivityPage).not.toContain("current sessions");
  });

  it("does not leave a browser user_devices reader or delete path in the flow", () => {
    expect(
      [
        hook,
        canonicalPage,
        compatibilityPage,
        libraryPage,
        loginActivityPage,
      ].join("\n"),
    ).not.toContain("user_devices");
  });
});
