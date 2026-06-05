import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const preflight = path.join(root, "scripts/deploy/env-preflight.mjs");
const mediaSupabaseUrl = "https://slirphzzwcogdbkeicff.supabase.co";
const mediaProjectId = "slirphzzwcogdbkeicff";

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fakeJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), "utf8")
      .toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("deploy env preflight", () => {
  it("requires a Supabase access token in strict production checks", () => {
    const result = spawnSync(process.execPath, [preflight, "--strict"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        SUPABASE_ANON_KEY: fakeJwt({ role: "anon" }),
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "supabase-access-token-missing"');
    expect(result.stdout).toContain("Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.");
  });

  it("rejects service-role JWTs configured as SUPABASE_ANON_KEY", () => {
    const result = spawnSync(process.execPath, [preflight, "--strict"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        SUPABASE_ANON_KEY: fakeJwt({ role: "service_role" }),
        SUPABASE_ACCESS_TOKEN: "configured-token-placeholder",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "anon-key-secret"');
    expect(result.stdout).toContain("SUPABASE_ANON_KEY contains a secret/service-role key.");
  });

  it("rejects Supabase management tokens configured as SUPABASE_ANON_KEY", () => {
    const result = spawnSync(process.execPath, [preflight, "--strict"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        SUPABASE_ANON_KEY: `sbp_${"a".repeat(40)}`,
        SUPABASE_ACCESS_TOKEN: "configured-token-placeholder",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "anon-key-management-token"');
    expect(result.stdout).toContain("SUPABASE_ANON_KEY contains a Supabase management access token.");
  });

  it("rejects Supabase management tokens in public VITE variables", () => {
    const result = spawnSync(process.execPath, [preflight, "--strict"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        VITE_SUPABASE_ACCESS_TOKEN: `sbp_${"a".repeat(40)}`,
        SUPABASE_ANON_KEY: fakeJwt({ role: "anon" }),
        SUPABASE_ACCESS_TOKEN: "configured-token-placeholder",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "vite-management-token-leak"');
    expect(result.stdout).toContain("VITE_SUPABASE_ACCESS_TOKEN contains a Supabase management access token.");
  });

  it("documents the optional channel OG function URL in deploy setup surfaces", () => {
    const script = read("scripts/deploy/env-preflight.mjs");
    const deployTemplate = read(".env.deploy.example");
    const setupDoc = read("docs/supabase-deploy-env-setup.md");
    const secretsDoc = read("docs/production-deploy-secrets.md");

    for (const text of [script, deployTemplate, setupDoc, secretsDoc]) {
      expect(text).toContain("CHANNEL_OG_FUNCTION_URL");
    }

    expect(deployTemplate).toContain("/functions/v1/channel-og");
    expect(setupDoc).toContain("custom Edge Function origin or proxy");
    expect(secretsDoc).toContain("Optional explicit `channel-og` Edge Function URL");
  });

  it("requires the dedicated software Supabase env for Cloudflare deploy checks", () => {
    const result = spawnSync(process.execPath, [preflight, "--require-software-domain"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: mediaSupabaseUrl,
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        VITE_SUPABASE_PROJECT_ID: mediaProjectId,
        VITE_ZIVO_SOFTWARE_SUPABASE_URL: "",
        VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY: "",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "VITE_ZIVO_SOFTWARE_SUPABASE_URL-missing"');
    expect(result.stdout).toContain('"id": "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY-missing"');
  });

  it("accepts the dedicated software Supabase env for Cloudflare deploy checks", () => {
    const result = spawnSync(process.execPath, [preflight, "--require-software-domain"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: mediaSupabaseUrl,
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        VITE_SUPABASE_PROJECT_ID: mediaProjectId,
        VITE_ZIVO_SOFTWARE_SUPABASE_URL: "https://ydxztoresbdeoeijhxww.supabase.co",
        VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_software_fake`,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"zivoSoftwareDomainRequired": true');
    expect(result.stdout).toContain('"zivoSoftwarePublishableKey": true');
  });

  it("rejects the software Supabase project as the default media backend", () => {
    const result = spawnSync(process.execPath, [preflight, "--require-software-domain"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://ydxztoresbdeoeijhxww.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_software_fake`,
        VITE_SUPABASE_PROJECT_ID: "ydxztoresbdeoeijhxww",
        VITE_ZIVO_SOFTWARE_SUPABASE_URL: "https://ydxztoresbdeoeijhxww.supabase.co",
        VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_software_fake`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "zivo-media-supabase-url-mismatch"');
    expect(result.stdout).toContain("VITE_SUPABASE_URL must point to https://slirphzzwcogdbkeicff.supabase.co");
  });

  it("documents the software Supabase env in deploy setup surfaces", () => {
    const script = read("scripts/deploy/env-preflight.mjs");
    const packageJson = read("package.json");
    const envTemplate = read(".env.example");
    const deployTemplate = read(".env.deploy.example");
    const setupDoc = read("docs/supabase-deploy-env-setup.md");
    const secretsDoc = read("docs/production-deploy-secrets.md");
    const cloudflareDoc = read("cloudflare/README.md");

    for (const text of [script, envTemplate, deployTemplate, setupDoc, secretsDoc, cloudflareDoc]) {
      expect(text).toContain("VITE_ZIVO_SOFTWARE_SUPABASE_URL");
      expect(text).toContain("VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY");
    }

    expect(script).toContain("--require-software-domain");
    expect(packageJson).toContain("npm run deploy:env-check -- --require-software-domain");
    expect(secretsDoc).toContain("ydxztoresbdeoeijhxww");
  });

  it("validates CHANNEL_OG_FUNCTION_URL when provided", () => {
    const result = spawnSync(process.execPath, [preflight, "--strict"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: `sb_${"publishable"}_fake`,
        SUPABASE_ANON_KEY: fakeJwt({ role: "anon" }),
        SUPABASE_ACCESS_TOKEN: "configured-token-placeholder",
        CHANNEL_OG_FUNCTION_URL: "http://example.supabase.co/functions/v1/channel-og",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"id": "channel-og-not-https"');
    expect(result.stdout).toContain("CHANNEL_OG_FUNCTION_URL should use https.");
  });
});
