import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function copyDeployWorkspace(options: { buildScript?: string; packageVersion?: string; supabaseStub?: string } = {}) {
  const workspace = path.join(tmpdir(), `zivo-ota-deploy-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(path.join(workspace, "scripts"), { recursive: true });
  mkdirSync(path.join(workspace, "scripts", "deploy"), { recursive: true });
  mkdirSync(path.join(workspace, "dist"), { recursive: true });
  mkdirSync(path.join(workspace, "node_modules", "@supabase", "supabase-js"), { recursive: true });
  mkdirSync(path.join(workspace, "node_modules", "dotenv"), { recursive: true });
  copyFileSync(path.join(root, "scripts/deploy-update.mjs"), path.join(workspace, "scripts/deploy-update.mjs"));
  writeFileSync(path.join(workspace, "package.json"), JSON.stringify({ version: options.packageVersion ?? "1.2.3", scripts: { build: options.buildScript ?? "node missing-build.js" }, dependencies: {} }, null, 2) + "\n");
  writeFileSync(path.join(workspace, "dist", "index.html"), "<html><body>ota</body></html>\n");
  writeFileSync(path.join(workspace, "scripts", "deploy", "preflight.mjs"), "console.log('local preflight args=' + process.argv.slice(2).join(' '));\n");
  writeFileSync(path.join(workspace, "node_modules", "@supabase", "supabase-js", "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(path.join(workspace, "node_modules", "@supabase", "supabase-js", "index.js"), options.supabaseStub ?? "export function createClient() { throw new Error('should not upload after build failure'); }\n");
  writeFileSync(path.join(workspace, "node_modules", "dotenv", "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(path.join(workspace, "node_modules", "dotenv", "index.js"), "export function config() { return {}; }\n");
  return workspace;
}

describe("OTA deploy bypass guard", () => {
  it("refuses --skip-preflight without explicit release-risk acknowledgement", () => {
    const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? "",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--skip-preflight requires ZIVO_ALLOW_OTA_SKIP_PREFLIGHT=I_UNDERSTAND_THE_RELEASE_RISK");
    expect(result.stderr).not.toContain("Deploying ZIVO");
    expect(result.stderr).not.toContain("Uploading bundle");
  });

  it("restores package.json version when OTA deploy fails after the version bump", () => {
    const workspace = copyDeployWorkspace();

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Deploying ZIVO v1.2.4");
      expect(result.stderr).toContain("OTA deploy failed. Restored package.json version bump.");
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses malformed package versions before build or upload work starts", () => {
    const workspace = copyDeployWorkspace({ packageVersion: "1.2.beta" });

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("package.json version must be a valid semver version like 1.2.3");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses malformed native version gates before build or upload work starts", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight", "--min-native-version=ios-1.2"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("--min-native-version must be a valid semver version like 1.2.3");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses immediate or mandatory OTA updates without a release message", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight", "--immediate"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('immediate or mandatory OTA updates require --message="Release reason"');
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses oversized OTA release messages before build or upload work starts", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", `--message=${"x".repeat(241)}`], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("OTA release message must be 240 characters or fewer");
      expect(result.stdout).not.toContain("Running local dry-run preflight");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses conflicting OTA activation modes before build or upload work starts", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--immediate", "--next-launch", "--message=Conflicting modes"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Choose only one OTA activation mode flag: --immediate, --next-launch");
      expect(result.stdout).not.toContain("Running local dry-run preflight");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses mandatory prompt-mode OTA updates before build or upload work starts", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--mandatory", "--message=Required update"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("--mandatory requires an explicit OTA activation mode");
      expect(result.stdout).not.toContain("Running local dry-run preflight");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("dry-runs the OTA bundle without Supabase credentials, package writes, or uploads", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Dry run: validating ZIVO v1.2.4 without package write or Supabase upload");
      expect(result.stdout).toContain("OTA dry run complete. No package.json changes were written and nothing was uploaded.");
      expect(result.stdout).toContain("Manifest preview");
      expect(result.stdout).toContain("dry-run://zivo-v1.2.4.zip");
      expect(result.stdout).toContain("Bundle size:");
      expect(result.stdout).toContain('"bundleSizeBytes"');
      expect(result.stdout).not.toContain("Uploading bundle");
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid activation value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace('    : "prompt";', '    : "surprise_reload";')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA activation value: surprise_reload");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid version value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("version: newVersion,", 'version: "1.2.beta",')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA version value: 1.2.beta");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid dry-run URL value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("createManifestPayload(`dry-run://${zipName}`, checksum, bundleSizeBytes)", 'createManifestPayload("https://evil.test/zivo.zip", checksum, bundleSizeBytes)')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA dry-run URL value: https://evil.test/zivo.zip");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid createdAt timestamp", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("createdAt: new Date().toISOString(),", 'createdAt: "not-a-date",')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA manifest createdAt timestamp: not-a-date");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid release message value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("...(releaseMessage ? { message: releaseMessage } : {}),", "message: 42,")
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA message value: 42");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with a non-boolean mandatory value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("const mandatory = args.includes(\"--mandatory\") || activation === \"immediate\";", 'const mandatory = "false";')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA mandatory value: false");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an immediate OTA manifest without mandatory metadata", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace(/ {4}mandatory,\r?\n {4}\.\.\.\(releaseMessage/, "    mandatory: false,\n    ...(releaseMessage")
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--immediate", "--message=Emergency reload"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA activation consistency: immediate updates must be mandatory");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid checksum value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace('const checksum = createHash("sha256").update(zipData).digest("hex");', 'const checksum = "not-a-sha";')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA checksum value: not-a-sha");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid bundle size value", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("const bundleSizeBytes = zipData.byteLength;", 'const bundleSizeBytes = "12";')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA bundleSizeBytes value: 12");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses to create an OTA manifest with an invalid native version gate", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const scriptPath = path.join(workspace, "scripts/deploy-update.mjs");
      writeFileSync(
        scriptPath,
        readFileSync(scriptPath, "utf8").replace("...(minNativeVersion ? { minNativeVersion } : {}),", 'minNativeVersion: "ios-1.2",')
      );
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid OTA minNativeVersion value: ios-1.2");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("blocks oversized OTA bundles before manifest upload unless explicitly acknowledged", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
          ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES: "1",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("OTA bundle size");
      expect(result.stderr).toContain("exceeds limit 1 bytes");
      expect(result.stderr).toContain("ZIVO_ALLOW_LARGE_OTA_BUNDLE=I_UNDERSTAND_THE_OTA_SIZE_RISK");
      expect(result.stderr).toContain("OTA dry run failed. No package.json changes were written.");
      expect(result.stdout).not.toContain("Manifest preview");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("refuses invalid OTA size-limit configuration before preflight or build starts", () => {
    const workspace = copyDeployWorkspace();

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES: "large",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES must be a positive number.");
      expect(result.stdout).not.toContain("Running local dry-run preflight");
      expect(result.stdout).not.toContain("Building");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("allows oversized OTA dry-runs with an explicit size-risk acknowledgement", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--skip-preflight", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
          ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES: "1",
          ZIVO_ALLOW_LARGE_OTA_BUNDLE: "I_UNDERSTAND_THE_OTA_SIZE_RISK",
        },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("override acknowledged");
      expect(result.stdout).toContain("Manifest preview");
      expect(result.stdout).toContain('"bundleSizeBytes"');
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("uses local preflight by default for dry-run releases", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
    });

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--dry-run", "--message=Dry run"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Running local dry-run preflight");
      expect(result.stdout).toContain("local preflight args=--skip-build --skip-type-check");
      expect(result.stdout).toContain("OTA dry run complete");
      expect(result.stdout).not.toContain("Running production preflight");
      expect(result.stdout).not.toContain("Uploading bundle");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);

  it("uploads OTA storage objects with cache metadata matched to their paths", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
      supabaseStub: `
const uploads = [];
export function createClient() {
  return {
    storage: {
      listBuckets: async () => ({ data: [{ name: "app-updates" }] }),
      from: () => ({
        upload: async (name, body, options) => {
          uploads.push({ name, options });
          globalThis.__uploads = uploads;
          return { error: null };
        },
        remove: async () => ({ error: null }),
        getPublicUrl: (name) => ({ data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/app-updates/" + name } }),
      }),
    },
  };
}
process.on("exit", () => console.error("uploads=" + JSON.stringify(globalThis.__uploads ?? [])));
`,
    });

    try {
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain('"name":"zivo-v1.2.4.zip"');
      expect(result.stderr).toContain('"contentType":"application/zip"');
      expect(result.stderr).toContain('"cacheControl":"31536000"');
      expect(result.stderr).toContain('"name":"latest.json"');
      expect(result.stderr).toContain('"contentType":"application/json"');
      expect(result.stderr).toContain('"cacheControl":"0"');
      expect(result.stderr).toContain('"upsert":true');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("removes the uploaded bundle when OTA manifest update fails", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
      supabaseStub: `
const removed = [];
export function createClient() {
  return {
    storage: {
      listBuckets: async () => ({ data: [{ name: "app-updates" }] }),
      from: () => ({
        upload: async (name) => name === "latest.json" ? { error: { message: "manifest rejected" } } : { error: null },
        remove: async (names) => {
          removed.push(...names);
          globalThis.__removed = removed;
          return { error: null };
        },
        getPublicUrl: (name) => ({ data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/app-updates/" + name } }),
      }),
    },
  };
}
process.on("exit", () => console.error("removed=" + JSON.stringify(globalThis.__removed ?? [])));
`,
    });

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Removed uploaded OTA bundle zivo-v1.2.4.zip.");
      expect(result.stderr).toContain("manifest rejected");
      expect(result.stderr).toContain('removed=["zivo-v1.2.4.zip"]');
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);

  it("removes the uploaded bundle when Supabase returns an unexpected public URL", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
      supabaseStub: `
const removed = [];
export function createClient() {
  return {
    storage: {
      listBuckets: async () => ({ data: [{ name: "app-updates" }] }),
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async (names) => {
          removed.push(...names);
          globalThis.__removed = removed;
          return { error: null };
        },
        getPublicUrl: () => ({ data: { publicUrl: "https://evil.example/zivo-v1.2.4.zip" } }),
      }),
    },
  };
}
process.on("exit", () => console.error("removed=" + JSON.stringify(globalThis.__removed ?? [])));
`,
    });

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Unexpected OTA bundle URL: https://evil.example/zivo-v1.2.4.zip");
      expect(result.stderr).toContain("Removed uploaded OTA bundle zivo-v1.2.4.zip.");
      expect(result.stderr).toContain('removed=["zivo-v1.2.4.zip"]');
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("removes the uploaded bundle when Supabase returns a mismatched bundle version URL", () => {
    const workspace = copyDeployWorkspace({
      buildScript: "node -e \"require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/index.html','ok')\"",
      supabaseStub: `
const removed = [];
export function createClient() {
  return {
    storage: {
      listBuckets: async () => ({ data: [{ name: "app-updates" }] }),
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async (names) => {
          removed.push(...names);
          globalThis.__removed = removed;
          return { error: null };
        },
        getPublicUrl: () => ({ data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/app-updates/zivo-v1.2.3.zip" } }),
      }),
    },
  };
}
process.on("exit", () => console.error("removed=" + JSON.stringify(globalThis.__removed ?? [])));
`,
    });

    try {
      const originalPackageJson = readFileSync(path.join(workspace, "package.json"), "utf8");
      const result = spawnSync(process.execPath, ["scripts/deploy-update.mjs", "--skip-preflight"], {
        cwd: workspace,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          npm_config_cache: path.join(workspace, ".npm-cache"),
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-placeholder",
          ZIVO_ALLOW_OTA_SKIP_PREFLIGHT: "I_UNDERSTAND_THE_RELEASE_RISK",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Unexpected OTA bundle URL: https://example.supabase.co/storage/v1/object/public/app-updates/zivo-v1.2.3.zip");
      expect(result.stderr).toContain("Removed uploaded OTA bundle zivo-v1.2.4.zip.");
      expect(result.stderr).toContain('removed=["zivo-v1.2.4.zip"]');
      expect(readFileSync(path.join(workspace, "package.json"), "utf8")).toBe(originalPackageJson);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
