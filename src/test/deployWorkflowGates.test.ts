import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("deploy workflow gates", () => {
  it("keeps the security workflow scanning docs and markdown changes", () => {
    const workflow = read(".github/workflows/security.yml");

    expect(workflow).toContain("npm run security:scan");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("push:");
    expect(workflow).not.toContain("paths-ignore:");
    expect(workflow).not.toContain("docs/**");
    expect(workflow).not.toContain("**/*.md");
  });

  it("keeps production deploy gated by strict preflight before publish", () => {
    const workflow = read(".github/workflows/deploy-production.yml");

    expect(workflow).toContain('workflows: ["CI"]');
    expect(workflow).toContain("npm run deploy:preflight:strict -- --skip-build --skip-type-check");
    expect(workflow).toContain("npm run release:production-gate");
    expect(workflow).not.toContain("run: npm run release:gate");
    expect(workflow).not.toContain("run: npm run deploy:preflight:check-production-summary");
    expect(workflow).toContain("scripts/deploy/production-deploy-relevance.mjs");
    const relevanceScript = read("scripts/deploy/production-deploy-relevance.mjs");
    expect(relevanceScript).toContain("RELEVANT_PATHS");
    expect(relevanceScript).toContain("scripts\\/deploy");
    expect(relevanceScript).toContain("scripts\\/security");
    expect(relevanceScript).toContain("scripts\\/supabase");
    expect(relevanceScript).toContain("docs\\/production-deploy-secrets");
    expect(relevanceScript).toContain("docs\\/supabase-deploy-env-setup");
    expect(relevanceScript).toContain("docs\\/supabase-migration-auth-setup");
    expect(relevanceScript).toContain("docs\\/platform-upgrade-workflow");
    expect(relevanceScript).toContain("docs\\/end-to-end-platform-readiness");
    expect(relevanceScript).toContain("netlify");
    expect(workflow.indexOf("Production preflight")).toBeLessThan(workflow.indexOf("Deploy production to Netlify"));
    expect(workflow).toContain("SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(workflow).toContain("SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}");
    expect(workflow).toContain("VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}");
  });

  it("classifies production deploy relevant changes with the shared script", () => {
    const script = path.join(root, "scripts/deploy/production-deploy-relevance.mjs");
    const relevant = spawnSync(process.execPath, [script], {
      cwd: root,
      input: [
        "docs/production-deploy-secrets.md",
        "scripts/security/check-secrets.mjs",
        "netlify.toml",
      ].join("\n"),
      encoding: "utf8",
    });
    const irrelevant = spawnSync(process.execPath, [script], {
      cwd: root,
      input: [
        "docs/marketing-copy.md",
        "README.md",
      ].join("\n"),
      encoding: "utf8",
    });

    expect(relevant.status).toBe(0);
    expect(relevant.stdout).toContain("relevant=true");
    expect(irrelevant.status).toBe(0);
    expect(irrelevant.stdout).toContain("relevant=false");
  });

  it("writes production deploy relevance to the GitHub output file", () => {
    const script = path.join(root, "scripts/deploy/production-deploy-relevance.mjs");
    const dir = mkdtempSync(path.join(tmpdir(), "production-deploy-relevance-"));
    const output = path.join(dir, "github-output");

    try {
      const result = spawnSync(process.execPath, [script, "--github-output", output], {
        cwd: root,
        input: "./scripts/deploy/preflight.mjs\n/docs/random.md\n",
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("relevant=true");
      expect(readFileSync(output, "utf8")).toBe("relevant=true\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps direct Netlify builds gated by local preflight and secret scanning", () => {
    const config = read("netlify.toml");
    const netlifyBuild = read("scripts/deploy/netlify-build.mjs");

    expect(config).toContain('[build]');
    expect(config).toContain('command = "node scripts/deploy/netlify-build.mjs"');
    expect(config).toContain('publish = "dist"');
    expect(config).not.toContain('command = "npm run build"');
    expect(netlifyBuild).toContain('run("Security scan", ["run", "security:scan"])');
    expect(netlifyBuild).toContain('context !== "production"');
    expect(netlifyBuild).toContain('run("Local deploy preflight", ["run", "deploy:preflight:local"])');
    expect(netlifyBuild).toContain('run("Production build", ["run", "build"])');
  });

  it("keeps preview deploy gated by the Netlify preview build wrapper", () => {
    const standalonePreview = read(".github/workflows/netlify-preview.yml");
    const cdWorkflow = read(".github/workflows/cd.yml");

    for (const workflow of [standalonePreview, cdWorkflow]) {
      expect(workflow).toContain('node-version-file: ".nvmrc"');
      expect(workflow).toContain("Netlify preview build gate");
      expect(workflow).toContain("NETLIFY: \"true\"");
      expect(workflow).toContain("CONTEXT: deploy-preview");
      expect(workflow).toContain("node scripts/deploy/netlify-build.mjs");
      expect(workflow).not.toContain("npm run deploy:preflight:local");
      expect(workflow.indexOf("Netlify preview build gate")).toBeLessThan(workflow.indexOf("Deploy preview to Netlify"));
      expect(workflow).toContain("id: netlify-secrets");
      expect(workflow).toContain("steps.netlify-secrets.outputs.available == 'true'");
      expect(workflow).toContain("Skipping Netlify preview deploy because NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID is missing.");
    }
  });

  it("keeps Cloudflare deploy scripts gated by local preflight and secret scanning", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const readme = read("cloudflare/README.md");

    for (const scriptName of ["cloudflare:check", "cloudflare:pages:deploy"]) {
      const script = packageJson.scripts[scriptName];
      expect(script).toContain("npm run security:scan");
      expect(script).toContain("npm run deploy:preflight:local");
      expect(script.indexOf("npm run deploy:preflight:local")).toBeLessThan(script.indexOf("wrangler"));
    }

    // cloudflare:deploy runs the stricter production chain: strict preflight plus
    // release:production-gate (whose release:gate ends in `npm run security:scan`),
    // all before wrangler — a superset of the local gate the other scripts use.
    const deploy = packageJson.scripts["cloudflare:deploy"];
    expect(deploy).toContain("npm run deploy:preflight:strict");
    expect(deploy).toContain("npm run release:production-gate");
    expect(deploy.indexOf("npm run deploy:preflight:strict")).toBeLessThan(deploy.indexOf("wrangler"));
    expect(deploy.indexOf("npm run release:production-gate")).toBeLessThan(deploy.indexOf("wrangler"));

    expect(readme).toContain("Both Cloudflare deploy scripts run `npm run security:scan`");
    expect(readme).toContain("npm run deploy:preflight:local");
  });

  it("keeps an explicit local-env secret audit script available for incidents", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const securityDocs = read("scripts/security/README.md");
    const rotationRunbook = read("docs/supabase-secret-rotation-runbook.md");

    expect(packageJson.scripts["deploy:production-relevance"]).toBe("node scripts/deploy/production-deploy-relevance.mjs");
    expect(packageJson.scripts["release:gate"]).toBe("npm run deploy:preflight:test-summary-schema && npm run deploy:preflight:check-artifacts && npm run qa:platform-readiness && npm run qa:platform-readiness:check && npm run qa:edge-function-deploy-contracts && npm run qa:edge-function-slot-readiness && npm run qa:edge-function-browser-gates && npm run security:scan");
    expect(packageJson.scripts["release:gate"]).toContain("npm run qa:edge-function-browser-gates");
    expect(packageJson.scripts["release:production-gate"]).toBe("npm run release:gate && npm run deploy:preflight:check-production-summary");
    expect(packageJson.scripts["security:check-secrets:local"]).toBe("node scripts/security/check-secrets.mjs --include-local-env");
    expect(packageJson.scripts["security:check-supabase-token-fragments"]).toBe("node scripts/security/check-supabase-token-fragments.mjs");
    expect(packageJson.scripts["security:check-supabase-token-fragments:local"]).toBe("node scripts/security/check-supabase-token-fragments.mjs --include-local-env");
    expect(packageJson.scripts["security:scan"]).toContain("npm run security:check-supabase-token-fragments");
    expect(packageJson.scripts["security:scan:local"]).toContain("npm run security:check-secrets:local");
    expect(packageJson.scripts["security:scan:local"]).toContain("npm run security:check-supabase-token-fragments:local");
    expect(securityDocs).toContain("npm run security:check-secrets:local");
    expect(securityDocs).toContain("npm run security:scan:local");
    expect(securityDocs).toContain("npm run security:check-supabase-token-fragments");
    expect(rotationRunbook).toContain("npm run security:check-secrets:local");
    expect(rotationRunbook).toContain("npm run security:check-supabase-token-fragments");
    expect(rotationRunbook).toContain("npm run security:scan:local");
  });
});
