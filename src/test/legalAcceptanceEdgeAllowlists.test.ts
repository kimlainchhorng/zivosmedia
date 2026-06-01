import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

const policyTypes = [
  "terms",
  "privacy",
  "refunds",
  "cancellation",
  "seller_of_travel",
  "transportation",
  "car_rental",
  "insurance",
  "cookies",
  "marketing",
];

const roleTypes = [
  "customer",
  "driver",
  "car_owner",
  "fleet_owner",
  "restaurant_partner",
  "shop_owner",
  "creator",
  "merchant",
  "admin",
];

describe("legal acceptance edge allowlists", () => {
  it("keeps frontend legal types aligned with the server-side acceptance allowlists", () => {
    const edgeFunction = read("supabase/functions/legal-acceptance-record/index.ts");
    const legalTypes = read("src/types/legal.ts");

    for (const policyType of policyTypes) {
      expect(edgeFunction).toContain(`"${policyType}"`);
      expect(legalTypes).toContain(`| '${policyType}'`);
    }

    for (const roleType of roleTypes) {
      expect(edgeFunction).toContain(`"${roleType}"`);
      expect(legalTypes).toContain(`| '${roleType}'`);
    }
  });

  it("keeps policy and role acceptance authenticated, sanitized, and audited server-side", () => {
    const edgeFunction = read("supabase/functions/legal-acceptance-record/index.ts");
    const legalHook = read("src/hooks/useLegalCompliance.ts");

    expect(edgeFunction).toContain("Authentication required");
    expect(edgeFunction).toContain("getAuthenticatedUser(req");
    expect(edgeFunction).toContain("cleanEnum(body.policy_type, POLICY_TYPES)");
    expect(edgeFunction).toContain("cleanEnum(body.role_type, ROLE_TYPES)");
    expect(edgeFunction).toContain("cleanText(body.page_url, MAX_URL)");
    expect(edgeFunction).toContain("cleanUuid(body.role_terms_id)");
    expect(edgeFunction).toContain('from("user_consent_logs")');
    expect(edgeFunction).toContain('from("role_terms_acceptance")');
    expect(edgeFunction).toContain('from("legal_audit_log")');
    expect(edgeFunction).toContain("policy_consent_recorded");
    expect(edgeFunction).toContain("role_terms_accepted");
    expect(edgeFunction).toContain("strictCors: true");

    expect(legalHook).toContain('functions.invoke("legal-acceptance-record"');
    expect(legalHook).not.toMatch(/from\("user_consent_logs"\)[\s\S]{0,160}\.insert/);
    expect(legalHook).not.toMatch(/from\("role_terms_acceptance"\)[\s\S]{0,160}\.insert/);
  });
});
