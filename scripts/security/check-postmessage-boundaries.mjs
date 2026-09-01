import { readFileSync } from "node:fs";
import path from "node:path";

const proxySource = readFileSync(
  path.join(process.cwd(), "supabase/functions/supplier-proxy/index.ts"),
  "utf8",
);
const modalSource = readFileSync(
  path.join(
    process.cwd(),
    "src/components/admin/store/autorepair/SupplierBrowserModal.tsx",
  ),
  "utf8",
);

const requiredProxyBoundaries = [
  "requireUser(req)",
  "requireUserNotBlocked(auth.userId)",
  "SUPPLIER_PROXY_RETIRED",
  "status: 410",
];

for (const boundary of requiredProxyBoundaries) {
  if (!proxySource.includes(boundary)) {
    throw new Error(`supplier-proxy retirement boundary missing: ${boundary}`);
  }
}

if (/\bfetch\s*\(/.test(proxySource) || proxySource.includes("postMessage")) {
  throw new Error(
    "retired supplier-proxy must not forward traffic or exchange browser messages",
  );
}

for (const forbidden of [
  "supplier-proxy",
  "fetchBlobUrl",
  "URL.createObjectURL",
  "<iframe",
  "postMessage",
  "window.location.assign",
]) {
  if (modalSource.includes(forbidden)) {
    throw new Error(
      `SupplierBrowserModal still contains retired embed behavior: ${forbidden}`,
    );
  }
}

if (
  !modalSource.includes('window.open(value, "_blank", "noopener,noreferrer")')
) {
  throw new Error(
    "SupplierBrowserModal must open supplier portals in an isolated external tab",
  );
}

if (!modalSource.includes("Allow pop-ups for ZIVO")) {
  throw new Error(
    "SupplierBrowserModal must keep the Admin workspace in place when pop-ups are blocked",
  );
}

console.log(
  "Supplier portal boundary check passed (relay retired; external HTTPS tab only).",
);
