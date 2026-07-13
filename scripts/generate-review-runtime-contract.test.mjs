import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CONTRACT_RELATIVE_PATH,
  createReviewRuntimeContract,
  generateReviewRuntimeContract,
} from "./generate-review-runtime-contract.mjs";

const VERCEL_SHA = "0123456789abcdef0123456789abcdef01234567";
const GIT_SHA = "fedcba9876543210fedcba9876543210fedcba98";

test("generator writes Media's exact static Review contract only for a clean exact build", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "zivo-media-review-contract-"));
  try {
    const result = await generateReviewRuntimeContract({
      outDir,
      env: {
        ZIVO_ECOSYSTEM_REVIEW_MODE: "true",
        ZIVO_ECOSYSTEM_GIT_DIRTY: "false",
        VERCEL_GIT_COMMIT_SHA: VERCEL_SHA.toUpperCase(),
        GIT_COMMIT_SHA: GIT_SHA,
      },
    });

    assert.equal(result.written, true);
    const contract = JSON.parse(await readFile(join(outDir, CONTRACT_RELATIVE_PATH), "utf8"));
    assert.deepEqual(contract, {
      schemaVersion: "zivo-ecosystem-runtime/v1",
      productId: "media",
      buildSha: VERCEL_SHA,
      reviewMode: true,
      gitDirty: false,
      inboundContracts: [{ id: "chat.paid-media-authority", version: "v1", from: "chat" }],
      outboundContracts: [{ id: "media.identity", version: "v1", to: "chat" }],
    });
    assert.equal("actions" in contract, false);
    assert.equal(/secret|token|password|key/i.test(JSON.stringify(contract)), false);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("generator removes stale artifacts when Review, cleanliness, or SHA proof is absent", async () => {
  for (const env of [
    { ZIVO_ECOSYSTEM_REVIEW_MODE: "false", ZIVO_ECOSYSTEM_GIT_DIRTY: "false", VERCEL_GIT_COMMIT_SHA: VERCEL_SHA },
    { ZIVO_ECOSYSTEM_REVIEW_MODE: "true", ZIVO_ECOSYSTEM_GIT_DIRTY: "true", VERCEL_GIT_COMMIT_SHA: VERCEL_SHA },
    { ZIVO_ECOSYSTEM_REVIEW_MODE: "true", ZIVO_ECOSYSTEM_GIT_DIRTY: "false", VERCEL_GIT_COMMIT_SHA: "short-sha", GIT_COMMIT_SHA: "" },
  ]) {
    const outDir = await mkdtemp(join(tmpdir(), "zivo-media-review-contract-"));
    const artifactPath = join(outDir, CONTRACT_RELATIVE_PATH);
    try {
      await mkdir(dirname(artifactPath), { recursive: true });
      await writeFile(artifactPath, "stale", "utf8");

      const result = await generateReviewRuntimeContract({ outDir, env });
      assert.equal(result.written, false);
      await assert.rejects(access(artifactPath, constants.F_OK));
      assert.equal(createReviewRuntimeContract(env), null);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }
});

test("generator accepts an exact generic CI SHA when Vercel metadata is absent", () => {
  assert.equal(
    createReviewRuntimeContract({
      ZIVO_ECOSYSTEM_REVIEW_MODE: "true",
      ZIVO_ECOSYSTEM_GIT_DIRTY: "false",
      VERCEL_GIT_COMMIT_SHA: "",
      GIT_COMMIT_SHA: GIT_SHA,
    }).buildSha,
    GIT_SHA,
  );
});
