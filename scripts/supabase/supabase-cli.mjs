import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function supabaseCommandCandidates(root = process.cwd()) {
  const localBin = path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "supabase.cmd" : "supabase",
  );

  return [
    ...(existsSync(localBin) ? [localBin] : []),
    "supabase",
  ];
}

export function runSupabaseCli(root, args, options = {}) {
  const candidates = supabaseCommandCandidates(root);
  let lastResult = null;

  for (const command of candidates) {
    const result = process.platform === "win32" && command.endsWith(".cmd")
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", "call", command, ...args], {
          cwd: root,
          encoding: "utf8",
          ...options,
        })
      : spawnSync(command, args, {
          cwd: root,
          encoding: "utf8",
          ...options,
        });
    lastResult = result;

    if (!result.error) return result;
  }

  return lastResult;
}

export function getSupabaseCli(root) {
  const result = runSupabaseCli(root, ["--version"]);

  if (!result || result.status !== 0) {
    return {
      installed: false,
      version: null,
      error: (result?.stderr || result?.stdout || result?.error?.message || "Supabase CLI is not installed or not on PATH.").trim(),
    };
  }

  return {
    installed: true,
    version: (result.stdout || result.stderr).trim(),
    error: null,
  };
}
