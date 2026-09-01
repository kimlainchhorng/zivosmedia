import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("one-time SMS verification disclosure", () => {
  it("keeps phone verification distinct from marketing or recurring SMS", () => {
    const dialog = read("src/components/auth/PhoneOtpVerifyDialog.tsx");
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");
    const communicationConsent = read(
      "src/pages/legal/CommunicationConsent.tsx",
    );
    const app = read("src/App.tsx");
    const inlineLegalSheet = read(
      "src/components/checkout/InlineLegalSheet.tsx",
    );

    expect(dialog).toContain("you request one ZIVO verification message");
    expect(dialog).toContain(
      "Reply STOP to opt out of future SMS delivery or HELP for help.",
    );
    expect(dialog).toContain('to="/legal/privacy"');
    expect(dialog).toContain('to="/legal/terms"');

    expect(privacy).toContain(
      "not enroll a person in marketing or recurring SMS.",
    );
    expect(privacy).toContain(
      "does not share mobile phone numbers or SMS opt-in consent",
    );

    expect(communicationConsent).toContain(
      "Creating a ZIVO account does not itself enroll you in marketing SMS",
    );
    expect(communicationConsent).toContain(
      "Verification does not enable ongoing SMS, marketing SMS, or promotional calls.",
    );
    expect(communicationConsent).not.toContain(
      "BY CREATING A ZIVO ACCOUNT, YOU EXPRESSLY CONSENT",
    );

    expect(app).toMatch(
      /<Route\s+path="\/privacy"\s+element=\{\s*<PrivacyPolicy\s*\/>\s*\}\s*\/>/,
    );
    expect(inlineLegalSheet).toContain(
      '"/privacy": lazy(() => import("@/pages/legal/PrivacyPolicy"))',
    );
  });
});
