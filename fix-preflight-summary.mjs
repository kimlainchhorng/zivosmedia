import { readFileSync, writeFileSync } from "node:fs";
// Sync production-preflight-summary.json apiWarnings/apiCritical with current api-readiness-report.md
const report = readFileSync("docs/api-readiness-report.md", "utf8");
const warnMatch = report.match(/- Warnings: (\d+)/);
const critMatch = report.match(/- Critical findings: (\d+)/);
const apiWarnings = warnMatch ? parseInt(warnMatch[1]) : 0;
const apiCritical = critMatch ? parseInt(critMatch[1]) : 0;

const s = JSON.parse(readFileSync("docs/production-preflight-summary.json", "utf8"));
s.counts.apiWarnings = apiWarnings;
s.counts.apiCritical = apiCritical;
writeFileSync("docs/production-preflight-summary.json", JSON.stringify(s, null, 2), "utf8");
console.log(`Updated production-preflight-summary.json: apiWarnings=${apiWarnings}, apiCritical=${apiCritical}`);
