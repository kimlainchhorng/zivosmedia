import { readFileSync, writeFileSync } from "node:fs";

// 9 webhook handlers that have withSecurity but missing strictCors: true
const webhookHandlers = [
  "supabase/functions/driver-payout-failed/index.ts",
  "supabase/functions/driver-payout-paid/index.ts",
  "supabase/functions/software-subscription-active/index.ts",
  "supabase/functions/software-subscription-cancelled/index.ts",
  "supabase/functions/software-subscription-past-due/index.ts",
  "supabase/functions/travel-payment-failed/index.ts",
  "supabase/functions/travel-payment-paid/index.ts",
  "supabase/functions/travel-payment-refunded/index.ts",
  "supabase/functions/zivopay-stripe-webhook/index.ts",
];

for (const f of webhookHandlers) {
  let content = readFileSync(f, "utf8");
  // Add strictCors: true after allowedMethods: ["POST"],
  const before = `  allowedMethods: ["POST"],\n  skipBotDetection: true,`;
  const after = `  allowedMethods: ["POST"],\n  strictCors: true,\n  skipBotDetection: true,`;
  if (content.includes(before)) {
    content = content.replace(before, after);
    writeFileSync(f, content, "utf8");
    console.log(`Fixed strictCors in ${f}`);
  } else if (content.includes("allowedMethods")) {
    console.warn(`Unexpected structure in ${f} - manual check needed`);
  }
}

// Fix zivopay-stripe-webhook separately (different structure)
const swPath = "supabase/functions/zivopay-stripe-webhook/index.ts";
let sw = readFileSync(swPath, "utf8");
if (!sw.includes("strictCors: true")) {
  // Find and replace the options object
  sw = sw.replace(
    /serve\(withSecurity\("zivopay-stripe-webhook",\s*async \(req, ctx\) => \{/,
    (m) => m,
  );
  // It may have different structure - check
  const lines = sw.split("\n");
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('withSecurity("zivopay-stripe-webhook"')) {
      // Look for the options object after the handler
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes("allowedMethods")) {
          lines[j] = lines[j] + "\n  strictCors: true,";
          found = true;
          break;
        }
      }
    }
    if (found) break;
  }
  if (found) {
    writeFileSync(swPath, lines.join("\n"), "utf8");
    console.log("Fixed strictCors in zivopay-stripe-webhook/index.ts");
  } else {
    console.warn("Could not fix zivopay-stripe-webhook - check manually");
  }
}

// Fix zivosmedia-user-event-dispatch: add withSecurity wrapper
const dispatchPath = "supabase/functions/zivosmedia-user-event-dispatch/index.ts";
let dispatch = readFileSync(dispatchPath, "utf8");
if (!dispatch.includes("withSecurity")) {
  // Add import for withSecurity
  dispatch = dispatch.replace(
    'import { createClient, serve } from "../_shared/deps.ts";',
    'import { createClient, serve } from "../_shared/deps.ts";\nimport { withSecurity } from "../_shared/withSecurity.ts";'
  );
  // Wrap the serve call
  dispatch = dispatch.replace(
    "serve(async (req: Request) => {",
    'serve(\n  withSecurity("zivosmedia-user-event-dispatch", async (req, ctx) => {'
  );
  // Remove manual method check (withSecurity handles it via allowedMethods)
  dispatch = dispatch.replace(
    "  if (req.method !== \"POST\") return json({ error: \"method_not_allowed\" }, 405);\n\n  ",
    "  "
  );
  // Close the withSecurity call - replace the closing `});` of serve
  // The serve call ends with `});` on its own line
  dispatch = dispatch.replace(
    /\}\);\s*\n(\s*function json)/,
    `}, {\n  allowedMethods: ["POST"],\n  strictCors: true,\n  skipBotDetection: true,\n  skipWaf: true,\n}));\n\n$1`
  );
  writeFileSync(dispatchPath, dispatch, "utf8");
  console.log("Wrapped zivosmedia-user-event-dispatch with withSecurity");
}

console.log("Done.");
