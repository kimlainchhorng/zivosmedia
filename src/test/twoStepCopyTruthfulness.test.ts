import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const accountPage = read("src/pages/TwoStepAuthPage.tsx");
const chatSetupPage = read("src/pages/chat/settings/TwoStepSetupPage.tsx");
const chatPrivacyPage = read("src/pages/chat/settings/PrivacySecurityPage.tsx");
const accountSettingsPage = read("src/pages/account/AccountSettingsPage.tsx");
const onboardingPage = read("src/pages/OnboardingProgressPage.tsx");
const chatHubPage = read("src/pages/ChatHubPage.tsx");

describe("two-step security copy truthfulness", () => {
  it("describes the current sensitive-action scope", () => {
    expect(accountPage).toContain("supported sensitive account actions");
    expect(accountPage).toContain("does not currently run as a second prompt during account sign-in");
    expect(chatSetupPage).toContain("sensitive actions");
    expect(chatSetupPage).toContain("does not currently add a second prompt to the account sign-in flow");
    expect(accountSettingsPage).toContain("Extra protection for sensitive actions");
    expect(onboardingPage).toContain("Extra protection for sensitive actions");
    expect(chatHubPage).toContain("Sensitive-action confirmation");
  });

  it("does not promise a sign-in challenge that the current flow does not provide", () => {
    const surfaces = [accountPage, chatSetupPage, chatPrivacyPage, accountSettingsPage, onboardingPage, chatHubPage].join("\n");
    expect(surfaces).not.toMatch(/on top of your normal sign-in|isn't enough to sign in|Both must be correct on a new device|Extra login security|Extra security on top of password|Hacker protection/);
    expect(surfaces).not.toContain("required for sign-in");
  });
});
