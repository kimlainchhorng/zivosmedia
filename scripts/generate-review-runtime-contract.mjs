// Generates the public, read-only ecosystem Review contract only after a
// successful Vite build. Keeping it out of public/ ensures non-Review builds
// cannot accidentally copy or precache a stale contract artifact.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const CONTRACT_RELATIVE_PATH = ".well-known/zivo-ecosystem-contract.json";
export const RUNTIME_CONTRACT_SCHEMA = "zivo-ecosystem-runtime/v1";
const FULL_GIT_SHA_RE = /^[0-9a-f]{40}$/i;

function isEnabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isExplicitlyClean(value) {
  return value === "false";
}

function exactBuildSha(env) {
  for (const candidate of [env.VERCEL_GIT_COMMIT_SHA, env.GIT_COMMIT_SHA]) {
    const sha = typeof candidate === "string" ? candidate.trim() : "";
    if (FULL_GIT_SHA_RE.test(sha)) return sha.toLowerCase();
  }
  return null;
}

/**
 * Returns the only public Review contract Media may publish, or null when the
 * build cannot make an exact, clean Review claim.
 */
export function createReviewRuntimeContract(env = process.env) {
  if (!isEnabled(env.ZIVO_ECOSYSTEM_REVIEW_MODE) || !isExplicitlyClean(env.ZIVO_ECOSYSTEM_GIT_DIRTY)) {
    return null;
  }

  const buildSha = exactBuildSha(env);
  if (!buildSha) return null;

  return {
    schemaVersion: RUNTIME_CONTRACT_SCHEMA,
    productId: "media",
    buildSha,
    reviewMode: true,
    gitDirty: false,
    inboundContracts: [{ id: "chat.paid-media-authority", version: "v1", from: "chat" }],
    outboundContracts: [{ id: "media.identity", version: "v1", to: "chat" }],
  };
}

/**
 * Writes to dist only after Vite has completed. A stale file is explicitly
 * removed whenever the Review/clean/SHA gates do not all pass, leaving hosts
 * with no artifact to serve rather than a misleading contract.
 */
export async function generateReviewRuntimeContract({ env = process.env, outDir = join(rootDir, "dist") } = {}) {
  const artifactPath = join(outDir, CONTRACT_RELATIVE_PATH);
  const contract = createReviewRuntimeContract(env);
  if (!contract) {
    await rm(artifactPath, { force: true });
    return { written: false, artifactPath, contract: null };
  }

  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(contract, null, 2)}\n`, "utf8");
  return { written: true, artifactPath, contract };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateReviewRuntimeContract();
}
