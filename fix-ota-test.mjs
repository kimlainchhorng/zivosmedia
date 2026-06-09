import { readFileSync, writeFileSync } from "node:fs";
const p = "src/test/otaDeployBypass.test.ts";
let c = readFileSync(p, "utf8");
// Fix the replacement pattern in the test to handle CRLF line endings
c = c.replace(
  'readFileSync(scriptPath, "utf8").replace("    mandatory,\\n    ...(releaseMessage", "    mandatory: false,\\n    ...(releaseMessage")',
  'readFileSync(scriptPath, "utf8").replace(/    mandatory,\\r?\\n    \\.\\.\\.\\(releaseMessage/, "    mandatory: false,\\n    ...(releaseMessage")'
);
writeFileSync(p, c, "utf8");
console.log("Fixed OTA test CRLF replacement");
