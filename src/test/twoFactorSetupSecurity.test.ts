import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/components/auth/TwoFactorSetupDialog.tsx"),
  "utf8",
);

describe("two-factor QR rendering", () => {
  it("renders the MFA URI with the local QR component instead of injecting SVG markup", () => {
    expect(source).toContain('import { QRCodeSVG } from "qrcode.react";');
    expect(source).toContain("<QRCodeSVG value={qrUri}");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
