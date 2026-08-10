import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("PayPal authoritative amount boundary", () => {
  it("derives checkout amounts from persisted order or reservation totals", () => {
    for (const file of [
      "supabase/functions/create-eats-paypal-order/index.ts",
      "supabase/functions/create-grocery-paypal-order/index.ts",
      "supabase/functions/create-lodging-paypal-order/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("payableCents");
      expect(source).toContain("PayPal-Request-Id");
      expect(source).not.toContain("amount_cents / 100");
    }
  });

  it("rejects captured amount or currency mismatches before paid state", () => {
    for (const file of [
      "supabase/functions/capture-eats-paypal-order/index.ts",
      "supabase/functions/capture-grocery-paypal-order/index.ts",
      "supabase/functions/capture-lodging-paypal-order/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("amount or currency mismatch");
      expect(source).toContain("toUpperCase()");
      expect(source).toContain('"USD"');
    }
  });
});
