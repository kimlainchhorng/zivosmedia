import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("account deletion and data rights links", () => {
  it("keeps public account deletion information on the canonical delete-account route", () => {
    const app = read("src/App.tsx");
    const deletionInfo = read("src/pages/AccountDeletionInfo.tsx");

    expect(app).toContain('path="/delete-account"');
    expect(app).toContain('path="/account-deletion"');
    expect(deletionInfo).toContain('canonical="https://hizivo.com/delete-account"');
    expect(deletionInfo).toContain('href="mailto:privacy@hizivo.com?subject=Delete%20my%20ZIVO%20account"');
    expect(deletionInfo).toContain('href="mailto:support@hizivo.com?subject=Delete%20my%20ZIVO%20account"');
    expect(deletionInfo).toContain('to="/legal/privacy"');
    expect(deletionInfo).toContain('to="/legal/data-retention"');
    expect(deletionInfo).not.toContain("www.zivosmedia.com/account-deletion");
    expect(deletionInfo).not.toContain('to="/privacy-policy"');
  });

  it("keeps cookie and compliance privacy links on data-rights and canonical legal routes", () => {
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");
    const compliance = read("src/pages/ComplianceCenter.tsx");

    expect(cookiePolicy).toContain('to="/legal/privacy"');
    expect(cookiePolicy).toContain('to="/account/data-rights#cookies"');
    expect(cookiePolicy).toContain('to="/legal/terms"');
    expect(cookiePolicy).not.toContain('to="/privacy"');
    expect(cookiePolicy).not.toContain('to="/account/privacy"');
    expect(cookiePolicy).not.toContain('to="/terms"');

    expect(compliance).toContain('{ name: "Privacy Controls", href: "/account/data-rights"');
    expect(compliance).toContain('to="/account/data-rights"');
    expect(compliance).not.toContain('{ name: "Privacy Controls", href: "/account/privacy"');
    expect(compliance).not.toContain('to="/account/privacy"');
  });
});
