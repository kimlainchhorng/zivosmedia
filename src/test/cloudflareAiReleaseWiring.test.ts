import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Cloudflare AI release wiring", () => {
  it("binds and migrates the per-user durable quota authority", () => {
    const wrangler = read("wrangler.toml");

    expect(wrangler).toContain('name = "AI_QUOTA"');
    expect(wrangler).toContain('class_name = "AiQuota"');
    expect(wrangler).toContain('new_sqlite_classes = ["AiQuota"]');
  });

  it("provisions the main-project publishable key before deploying the Worker", () => {
    const workflow = read(".github/workflows/deploy-cloudflare-production.yml");
    const provision = workflow.indexOf(
      "wrangler secret put SUPABASE_PUBLISHABLE_KEY",
    );
    const deploy = workflow.indexOf("wrangler deploy --keep-vars");

    expect(workflow).toContain(
      "SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}",
    );
    expect(provision).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(provision);
  });

  it("feeds a fresh live Edge Function policy snapshot into the release gate", () => {
    const workflow = read(".github/workflows/deploy-cloudflare-production.yml");
    const capture = workflow.indexOf("supabase functions list");
    const preflight = workflow.indexOf("npm run deploy:preflight:strict");

    expect(workflow).toContain("--output-format json");
    expect(workflow).toContain("ZIVO_EDGE_FUNCTIONS_LIVE_SNAPSHOT=%s");
    expect(capture).toBeGreaterThan(-1);
    expect(preflight).toBeGreaterThan(capture);
  });

  it("always deploys the exact main commit that passed CI with a pinned Wrangler", () => {
    const workflow = read(".github/workflows/deploy-cloudflare-production.yml");
    const packageJson = JSON.parse(read("package.json")) as {
      devDependencies?: Record<string, string>;
    };

    expect(workflow).toContain('echo "relevant=true" >> "$GITHUB_OUTPUT"');
    expect(workflow).not.toContain("git diff --name-only HEAD^ HEAD");
    expect(packageJson.devDependencies?.wrangler).toBe("4.127.1");
  });

  it("documents a publishable key without inviting a privileged credential", () => {
    const example = read("cloudflare/.dev.vars.example");
    const readme = read("cloudflare/README.md");

    expect(example).toContain(
      "SUPABASE_PUBLISHABLE_KEY=replace-with-main-project-publishable-key",
    );
    expect(readme).toContain("Never configure a secret/service-role key here");
    expect(readme).toContain(
      "npx wrangler secret put SUPABASE_PUBLISHABLE_KEY",
    );
  });
});
