import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";

it.each(["production", "development"])("direct Vite %s build fails before bundling without Supabase env", (mode) => {
  const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", mode], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    env: { ...process.env, VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
    encoding: "utf8",
    timeout: 15_000,
  });
  expect(result.status).not.toBe(0);
  const output = result.stdout + result.stderr;
  expect(output).toContain("[zivosmedia] Build stopped:");
  expect(output).toContain("Missing VITE_SUPABASE_URL");
  expect(output).toContain("Missing VITE_SUPABASE_PUBLISHABLE_KEY");
  expect(output).not.toContain("transforming");
});
