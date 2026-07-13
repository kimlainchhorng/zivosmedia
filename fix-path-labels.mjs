import { readFileSync, writeFileSync } from "node:fs";

const OLD = 'const summaryLabel = path.relative(root, summaryPath).replace(/\\\\/g, "/") || summaryPath;';
const NEW = 'const summaryLabel = (() => { const r = path.relative(root, summaryPath).replace(/\\\\/g, "/"); return r.startsWith("..") ? summaryPath : (r || summaryPath); })();';

for (const f of ["scripts/deploy/check-preflight-artifacts.mjs", "scripts/deploy/check-preflight-summary.mjs"]) {
  let c = readFileSync(f, "utf8");
  const old = `const summaryLabel = path.relative(root, summaryPath).replace(/\\\\/g, "/") || summaryPath;`;
  const rep = `const summaryLabel = (() => { const r = path.relative(root, summaryPath).replace(/\\\\/g, "/"); return r.startsWith("..") ? summaryPath : (r || summaryPath); })();`;
  if (c.includes(old)) {
    c = c.replace(old, rep);
    writeFileSync(f, c, "utf8");
    console.log(`Fixed: ${f}`);
  } else {
    // Try without escaped backslash (file may have different encoding)
    const old2 = `const summaryLabel = path.relative(root, summaryPath).replace(/\\/g, "/") || summaryPath;`;
    const rep2 = `const summaryLabel = (() => { const r = path.relative(root, summaryPath).replace(/\\/g, "/"); return r.startsWith("..") ? summaryPath : (r || summaryPath); })();`;
    if (c.includes(old2)) {
      c = c.replace(old2, rep2);
      writeFileSync(f, c, "utf8");
      console.log(`Fixed (alt): ${f}`);
    } else {
      console.warn(`No match in ${f} - checking byte content`);
      const idx = c.indexOf("const summaryLabel");
      console.log("Found at index:", idx, "=>", JSON.stringify(c.slice(idx, idx+80)));
    }
  }
}
