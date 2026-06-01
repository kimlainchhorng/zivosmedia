import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scanner = path.join(root, "scripts/security/check-secrets.mjs");
const supabaseFragmentScanner = path.join(root, "scripts/security/check-supabase-token-fragments.mjs");

describe("secret scanner", () => {
  it("blocks pasted Supabase publishable keys", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeKey = `sb_publishable_${"abcdEFGH0123_-abcdEFGH0123_-"}`;

    try {
      writeFileSync(
        path.join(workspace, "leak.md"),
        `SUPABASE_PUBLISHABLE_KEY=${fakeKey}\n`,
      );

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase publishable key");
      expect(result.stderr).toContain("leak.md:1");
      expect(result.stderr).toContain("sb_publishable_[redacted");
      expect(result.stderr).not.toContain(fakeKey);
      expect(result.stderr).not.toContain(fakeKey.slice(0, 24));
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("blocks Supabase management access tokens", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeToken = `sbp_${"0123456789abcdef0123456789abcdefABCDwxyz"}`;

    try {
      writeFileSync(
        path.join(workspace, "leak.md"),
        `SUPABASE_ACCESS_TOKEN=${fakeToken}\n`,
      );

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase access token");
      expect(result.stderr).toContain("leak.md:1");
      expect(result.stderr).toContain("sbp_[redacted");
      expect(result.stderr).not.toContain(fakeToken);
      expect(result.stderr).not.toContain(fakeToken.slice(0, 24));
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("redacts non-Supabase secret families in findings", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeOpenAiKey = `sk-${"a".repeat(24)}T3BlbkFJ${"b".repeat(24)}`;

    try {
      writeFileSync(
        path.join(workspace, "leak.md"),
        `OPENAI_API_KEY=${fakeOpenAiKey}\n`,
      );

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("OpenAI API key");
      expect(result.stderr).toContain("sk-[redacted");
      expect(result.stderr).not.toContain(fakeOpenAiKey);
      expect(result.stderr).not.toContain(fakeOpenAiKey.slice(0, 24));
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("reports every matching secret occurrence with its own line number", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const firstToken = `sbp_${"a".repeat(40)}`;
    const secondToken = `sbp_${"b".repeat(40)}`;

    try {
      writeFileSync(
        path.join(workspace, "leak.md"),
        `FIRST=${firstToken}\nSAFE=value\nSECOND=${secondToken}\n`,
      );

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("leak.md:1");
      expect(result.stderr).toContain("leak.md:3");
      expect(result.stderr).toContain("2 potential secret(s) detected");
      expect(result.stderr).not.toContain(firstToken);
      expect(result.stderr).not.toContain(secondToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("scans deploy env files that use dotted env names", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeToken = `sbp_${"c".repeat(40)}`;

    try {
      writeFileSync(path.join(workspace, ".env.production"), `SUPABASE_ACCESS_TOKEN=${fakeToken}\n`);

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase access token");
      expect(result.stderr).toContain(".env.production:1");
      expect(result.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("skips local-only env files in the default repo scan", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeToken = `sbp_${"c".repeat(40)}`;

    try {
      writeFileSync(path.join(workspace, ".env.local"), `SUPABASE_ACCESS_TOKEN=${fakeToken}\n`);
      writeFileSync(path.join(workspace, ".env.production.local"), `SUPABASE_ACCESS_TOKEN=${fakeToken}\n`);

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("No leaked secrets detected");
      expect(result.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("can scan local-only env files when explicitly requested", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const fakeToken = `sbp_${"c".repeat(40)}`;

    try {
      writeFileSync(path.join(workspace, ".env.local"), `SUPABASE_ACCESS_TOKEN=${fakeToken}\n`);

      const result = spawnSync(process.execPath, [scanner, "--include-local-env"], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase access token");
      expect(result.stderr).toContain(".env.local:1");
      expect(result.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("scans GitHub workflow files for pasted secrets", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const workflowDir = path.join(workspace, ".github/workflows");
    const fakeToken = `sbp_${"d".repeat(40)}`;

    try {
      mkdirSync(workflowDir, { recursive: true });
      writeFileSync(path.join(workflowDir, "deploy.yml"), `env:\n  SUPABASE_ACCESS_TOKEN: ${fakeToken}\n`);

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase access token");
      expect(result.stderr).toContain(".github/workflows/deploy.yml:2");
      expect(result.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("skips generated native web bundles that are produced from scanned source", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-secret-scan-"));
    const androidAssets = path.join(workspace, "android/app/src/main/assets/public/assets");
    const iosAssets = path.join(workspace, "ios/App/App/public/assets");
    const fakeKey = `sb_publishable_${"abcdEFGH0123_-abcdEFGH0123_-"}`;

    try {
      mkdirSync(androidAssets, { recursive: true });
      mkdirSync(iosAssets, { recursive: true });
      writeFileSync(path.join(androidAssets, "client.js"), `const key="${fakeKey}";\n`);
      writeFileSync(path.join(iosAssets, "client.js"), `const key="${fakeKey}";\n`);

      const result = spawnSync(process.execPath, [scanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("No leaked secrets detected");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

describe("Supabase token fragment scanner", () => {
  it("blocks pasted Supabase token fragments without printing token material", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-token-fragment-scan-"));
    const fakeKey = `sb_publishable_${"abcdEFGH0123_-abcdEFGH0123_-"}`;

    try {
      writeFileSync(path.join(workspace, "leak.md"), `KEY=${fakeKey}\n`);

      const result = spawnSync(process.execPath, [supabaseFragmentScanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Supabase token fragment");
      expect(result.stderr).toContain("leak.md:1");
      expect(result.stderr).toContain("sb_publishable_[redacted");
      expect(result.stderr).not.toContain(fakeKey);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("scans hidden GitHub workflow files for Supabase token fragments", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-token-fragment-scan-"));
    const workflowDir = path.join(workspace, ".github/workflows");
    const fakeToken = `sbp_${"d".repeat(40)}`;

    try {
      mkdirSync(workflowDir, { recursive: true });
      writeFileSync(path.join(workflowDir, "deploy.yml"), `env:\n  TOKEN: ${fakeToken}\n`);

      const result = spawnSync(process.execPath, [supabaseFragmentScanner], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(".github/workflows/deploy.yml:2");
      expect(result.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("skips local env files by default and scans them when requested", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "zivo-token-fragment-scan-"));
    const fakeToken = `sbp_${"e".repeat(40)}`;

    try {
      writeFileSync(path.join(workspace, ".env.local"), `TOKEN=${fakeToken}\n`);

      const defaultResult = spawnSync(process.execPath, [supabaseFragmentScanner], {
        cwd: workspace,
        encoding: "utf8",
      });
      const localResult = spawnSync(process.execPath, [supabaseFragmentScanner, "--include-local-env"], {
        cwd: workspace,
        encoding: "utf8",
      });

      expect(defaultResult.status).toBe(0);
      expect(defaultResult.stdout).toContain("No Supabase token fragments detected");
      expect(localResult.status).toBe(1);
      expect(localResult.stderr).toContain(".env.local:1");
      expect(localResult.stderr).not.toContain(fakeToken);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
