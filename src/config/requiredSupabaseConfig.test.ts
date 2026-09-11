import { describe, expect, it } from "vitest";
import { requiredSupabaseConfigErrors as validate } from "./requiredSupabaseConfig";

const configured = { VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_" + "test".repeat(6) };
const jwt = (role: string, ref = "example") => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role, ref }))}.signature`;
describe("required Supabase build configuration", () => {
  it("accepts publishable and matching legacy anon keys", () => {
    expect(validate(configured)).toEqual([]);
    expect(validate({ ...configured, VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon") })).toEqual([]);
  });
  it("reports both missing variables without their values", () => {
    expect(validate({ VITE_SUPABASE_URL: " ", VITE_SUPABASE_PUBLISHABLE_KEY: "" })).toHaveLength(2);
  });
  it.each(["sb_secret_" + "private", "sbp_" + "management", jwt("service_role"), jwt("anon", "wrong"), "eyJ.invalid.key", "sb_publishable_..."])("rejects unsafe or placeholder keys (%#)", (key) => {
    const result = validate({ ...configured, VITE_SUPABASE_PUBLISHABLE_KEY: key });
    expect(result).toHaveLength(1);
    expect(result.join()).not.toContain(key);
  });
  it.each(["not a URL", "https://zivo-supabase-env-required.invalid", "http://example.supabase.co", "https://user:pass@example.supabase.co", "https://example.supabase.co/rest/v1", "https://example.supabase.co?key=private"])("rejects unusable project URLs (%#)", (url) => {
    expect(validate({ ...configured, VITE_SUPABASE_URL: url })).toHaveLength(1);
  });
});
