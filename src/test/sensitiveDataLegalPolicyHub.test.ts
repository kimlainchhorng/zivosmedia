import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("sensitive data legal policy hub", () => {
  it("keeps sensitive data legal hub links resolvable through the legal route surface", () => {
    const app = read("src/App.tsx");
    const legalHub = read("src/pages/account/LegalPoliciesPage.tsx");

    expect(app).toContain('path="/legal/*"');
    expect(legalHub).toContain('label: "Biometric Data Policy", href: "/legal/biometric-data"');
    expect(legalHub).toContain('label: "Location Data Policy", href: "/legal/location-data"');
    expect(legalHub).toContain('label: "Facial Recognition Policy", href: "/legal/facial-recognition"');
  });

  it("keeps location policy tied to consent, service fulfillment, and retention limits", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");
    const retention = read("src/pages/legal/DataRetentionPolicy.tsx");

    expect(genericLegal).toContain('"/legal/location-data"');
    expect(genericLegal).toContain("precise GPS location during active rides");
    expect(genericLegal).toContain("nearby discovery, live sharing, check-ins");
    expect(genericLegal).toContain("Precise location is collected only when you grant device permission");
    expect(genericLegal).toContain("disable location access in iOS or Android settings");
    expect(genericLegal).toContain("pickup and drop-off locations with drivers");
    expect(genericLegal).toContain("delivery addresses with merchants and couriers");
    expect(genericLegal).toContain("Data Retention Policy");
    expect(genericLegal).toContain("privacy@zivosmedia.com");
    expect(privacy).toContain("Precise GPS location during trips/deliveries");
    expect(retention).toContain("location data");
  });

  it("keeps biometric policy specific about consent, alternatives, storage, and deletion", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");

    expect(genericLegal).toContain('"/legal/biometric-data"');
    expect(genericLegal).toContain("biometric identifiers and biometric information");
    expect(genericLegal).toContain("face geometry, liveness checks, voiceprints");
    expect(genericLegal).toContain("identity verification, liveness detection");
    expect(genericLegal).toContain("We do not sell biometric identifiers or biometric information");
    expect(genericLegal).toContain("obtains consent before collecting or processing biometric identifiers");
    expect(genericLegal).toContain("alternative verification path");
    expect(genericLegal).toContain("encryption, access controls, audit logging");
    expect(genericLegal).toContain("deleted or de-identified according to the Data Retention Policy");
  });

  it("keeps facial recognition policy specific about face detection, restrictions, and rights", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");
    const goLive = read("src/pages/GoLivePage.tsx");

    expect(genericLegal).toContain('"/legal/facial-recognition"');
    expect(genericLegal).toContain("Face Detection vs. Recognition");
    expect(genericLegal).toContain("detect a face on-device");
    expect(genericLegal).toContain("without identifying you");
    expect(genericLegal).toContain("face geometry used for identity verification");
    expect(genericLegal).toContain("liveness detection for driver, merchant, creator");
    expect(genericLegal).toContain("underage-access prevention");
    expect(genericLegal).toContain("does not use facial recognition to identify people in public posts");
    expect(genericLegal).toContain("sell face geometry");
    expect(genericLegal).toContain("disable camera permissions in device settings");
    expect(genericLegal).toContain("privacy@zivosmedia.com");
    expect(goLive).toContain("Allow camera access and try again.");
  });
});
