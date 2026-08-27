import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAY_PUBLIC_POLICY_PAGES,
  validatePlayPolicyPageEvidence,
} from "./check-play-public-policy-pages.mjs";

const [privacyPage] = PLAY_PUBLIC_POLICY_PAGES;

function validEvidence(overrides = {}) {
  return {
    status: 200,
    contentType: "text/html; charset=utf-8",
    finalUrl: privacyPage.url,
    bodyText: privacyPage.requiredText.join("\n"),
    ...overrides,
  };
}

test("accepts every canonical rendered public policy page", () => {
  for (const definition of PLAY_PUBLIC_POLICY_PAGES) {
    const result = validatePlayPolicyPageEvidence(definition, {
      status: 200,
      contentType: "text/html; charset=utf-8",
      finalUrl: definition.url,
      bodyText: definition.requiredText.join("\n"),
    });
    assert.equal(result.url, new URL(definition.url).href);
  }
});

test("rejects an unavailable public policy page", () => {
  assert.throws(
    () =>
      validatePlayPolicyPageEvidence(
        privacyPage,
        validEvidence({ status: 404 }),
      ),
    /returned HTTP 404/,
  );
});

test("rejects a non-HTML response", () => {
  assert.throws(
    () =>
      validatePlayPolicyPageEvidence(
        privacyPage,
        validEvidence({ contentType: "application/pdf" }),
      ),
    /instead of text\/html/,
  );
});

test("rejects a redirect away from the canonical Play listing URL", () => {
  assert.throws(
    () =>
      validatePlayPolicyPageEvidence(
        privacyPage,
        validEvidence({ finalUrl: "https://zivosmedia.com/" }),
      ),
    /redirected to/,
  );
});

test("rejects a rendered page missing required public information", () => {
  assert.throws(
    () =>
      validatePlayPolicyPageEvidence(
        privacyPage,
        validEvidence({ bodyText: "Privacy Policy\nZIVO LLC" }),
      ),
    /missing visible text: privacy@zivosmedia\.com, Data Retention, Data Deletion/,
  );
});
