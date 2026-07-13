import { readFileSync, writeFileSync } from "node:fs";

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
  if (content.includes("strictCors: true")) {
    console.log(`Already has strictCors: ${f}`);
    continue;
  }
  // Insert strictCors: true after allowedMethods line (handles both CRLF and LF)
  const newContent = content.replace(
    /(\s+allowedMethods:\s*\["POST"\],)/,
    "$1\n  strictCors: true,"
  );
  if (newContent !== content) {
    writeFileSync(f, newContent, "utf8");
    console.log(`Fixed: ${f}`);
  } else {
    console.warn(`No match: ${f}`);
  }
}

// Fix zivosmedia-user-event-dispatch: already done by previous script, just verify
const dispatchPath = "supabase/functions/zivosmedia-user-event-dispatch/index.ts";
const dispatch = readFileSync(dispatchPath, "utf8");
if (dispatch.includes("withSecurity")) {
  console.log("zivosmedia-user-event-dispatch already has withSecurity");
} else {
  console.warn("zivosmedia-user-event-dispatch still missing withSecurity - check manually");
}

console.log("Done.");
