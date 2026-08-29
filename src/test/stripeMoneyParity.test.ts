/**
 * The Stripe minor-unit rules exist twice: `src/lib/currency.ts` for the
 * browser and `supabase/functions/_shared/stripeMoney.ts` for Edge Functions
 * (Deno can't import the browser module). Both decide what a customer is
 * charged and what they are told they were charged, so a silent divergence
 * means the button and the receipt disagree with the actual charge.
 *
 * Mirrors the cross-repo guard already used for the ride KHR rate.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  STRIPE_ZERO_DECIMAL_CURRENCIES,
  STRIPE_THREE_DECIMAL_CURRENCIES,
} from "@/lib/currency";

const EDGE_SOURCE = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/stripeMoney.ts"),
  "utf8",
);

function parseSet(name: string): string[] {
  const match = new RegExp(`${name}[^=]*=\\s*new Set\\(\\[([^\\]]*)\\]`, "s").exec(EDGE_SOURCE);
  if (!match) throw new Error(`${name} not found in stripeMoney.ts`);
  return [...match[1].matchAll(/"([A-Z]{3})"/g)].map((m) => m[1]).sort();
}

describe("Stripe minor-unit parity between browser and Edge Functions", () => {
  it("agrees on the zero-decimal currencies", () => {
    expect(parseSet("STRIPE_ZERO_DECIMAL_CURRENCIES")).toEqual(
      [...STRIPE_ZERO_DECIMAL_CURRENCIES].sort(),
    );
  });

  it("agrees on the three-decimal currencies", () => {
    expect(parseSet("STRIPE_THREE_DECIMAL_CURRENCIES")).toEqual(
      [...STRIPE_THREE_DECIMAL_CURRENCIES].sort(),
    );
  });

  it("keeps both formatters off narrowSymbol", () => {
    // narrowSymbol collapses CAD/SGD/HKD/AUD/NZD to a bare "$" in en-US, so
    // neither copy may ask Intl for it. Matches the option, not prose about it.
    const usesNarrowSymbol = /currencyDisplay:\s*["']narrowSymbol["']/;
    expect(EDGE_SOURCE).not.toMatch(usesNarrowSymbol);
    expect(
      readFileSync(resolve(process.cwd(), "src/lib/currency.ts"), "utf8"),
    ).not.toMatch(usesNarrowSymbol);
  });

  it("still points readers at the browser copy", () => {
    expect(EDGE_SOURCE).toContain("src/lib/currency.ts");
  });
});
