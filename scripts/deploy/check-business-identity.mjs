/**
 * Fail a production deploy while the published business identity is incomplete.
 *
 * WHY
 * COMPANY_INFO drives the footer, /contact, the Terms, and the Organization
 * schema. Unset fields render as NOTHING rather than a placeholder — which is
 * the right behaviour (an invented address in front of a payment processor is
 * worse than no address) but it also means an incomplete identity ships
 * silently: every page looks fine, and the business simply has no address.
 *
 * A payment-processor review reads a merchant with no published address and no
 * phone as a merchant it cannot verify. So this makes the omission loud at
 * deploy time instead of discovering it from a review decision.
 *
 * WHAT IS REQUIRED
 * Only what a reviewer actually looks for, and only what cannot be derived:
 * a registered street address, an operations street address, a support phone,
 * and a statement descriptor. Everything else in COMPANY_INFO already has a
 * real value.
 *
 * USAGE
 *   node scripts/deploy/check-business-identity.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const source = readFileSync(
  path.join(process.cwd(), "src", "config", "legalContent.ts"),
  "utf8",
);

/** Read a string field from a named block of the COMPANY_INFO literal. */
function field(block, key) {
  const blockMatch = source.match(new RegExp(`${block}:\\s*\\{([\\s\\S]*?)\\n  \\}`));
  const scope = blockMatch ? blockMatch[1] : source;
  const valueMatch = scope.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  return valueMatch ? valueMatch[1].trim() : "";
}

const missing = [];

if (!field("registeredAddress", "line1")) {
  missing.push({
    what: "Registered office street address",
    where: "COMPANY_INFO.registeredAddress.line1 (and city / postalCode)",
    why: "The address of the entity that holds the payment account.",
  });
}

if (!field("operationsAddress", "line1")) {
  missing.push({
    what: "Operations street address",
    where: "COMPANY_INFO.operationsAddress.line1 (and postalCode)",
    why: "Where the business actually trades, in Cambodia.",
  });
}

if (!source.match(/supportPhone:\s*"([^"]+)"/)) {
  missing.push({
    what: "Support phone number",
    where: "COMPANY_INFO.supportPhone",
    why: "A reachable voice line. Leave empty rather than list one that does not answer.",
  });
}

const descriptor = source.match(/statementDescriptor:\s*"([^"]+)"/);
if (!descriptor) {
  missing.push({
    what: "Card statement descriptor",
    where: "COMPANY_INFO.statementDescriptor",
    why: "Must match what the payment account is configured with, or every unrecognised line becomes a dispute.",
  });
}

if (missing.length === 0) {
  console.log("✓ Published business identity is complete.");
  process.exit(0);
}

console.error("\n✗ Published business identity is incomplete.\n");
console.error("  These render as nothing today, so the site ships with no business address.");
console.error("  Fill them in src/config/legalContent.ts:\n");
for (const item of missing) {
  console.error(`  • ${item.what}`);
  console.error(`      set:  ${item.where}`);
  console.error(`      why:  ${item.why}\n`);
}
console.error("  Then re-run: npm run check:business-identity\n");
process.exit(1);
