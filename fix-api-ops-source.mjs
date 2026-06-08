import { readFileSync, writeFileSync } from "node:fs";
const path = "src/test/workflows/api-operations-readiness.test.ts";
let content = readFileSync(path, "utf8");
// Fix corrupted source() line and ensure CRLF normalization
content = content.replace(
  /const source = \(file: string\) => readFileSync\(path\.join\(root, file\), "utf8"\)[^;]*;/s,
  'const source = (file: string) => readFileSync(path.join(root, file), "utf8").replace(/\\r\\n/g, "\\n");'
);
writeFileSync(path, content, "utf8");
console.log("Fixed source() in api-operations-readiness.test.ts");
