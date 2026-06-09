import { readFileSync, writeFileSync } from "node:fs";

{
  const p = "src/test/feedMobileVisualContracts.test.ts";
  let c = readFileSync(p, "utf8");
  c = c.replace(
    `expect(feed).toContain('(["For You", "Friends", "Following"] as const)');`,
    `expect(feed).toContain('["For You", "Friends", "Following", "Travel", "Eat"] as const');`
  );
  writeFileSync(p, c, "utf8");
  console.log("Fixed feedMobileVisualContracts.test.ts");
}

{
  const p = "src/test/feedResponsiveShellContracts.test.ts";
  let c = readFileSync(p, "utf8");
  c = c.replace(
    `expect(feed).toContain('(["For You", "Friends", "Following"] as const).map((label) => (');`,
    `expect(feed).toContain('FEED_TABS.map((label) => (');`
  );
  writeFileSync(p, c, "utf8");
  console.log("Fixed feedResponsiveShellContracts.test.ts");
}
