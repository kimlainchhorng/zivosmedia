import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

export const PLAY_PUBLIC_POLICY_PAGES = Object.freeze([
  Object.freeze({
    id: "privacy",
    label: "Privacy Policy",
    url: "https://zivosmedia.com/legal/privacy",
    requiredText: Object.freeze([
      "Privacy Policy",
      "ZIVO LLC",
      "privacy@zivosmedia.com",
      "Data Retention",
      "Data Deletion",
    ]),
  }),
  Object.freeze({
    id: "account-deletion",
    label: "Account deletion",
    url: "https://zivosmedia.com/delete-account",
    requiredText: Object.freeze([
      "Delete Your ZIVO Account",
      "Request deletion from the web",
      "privacy@zivosmedia.com",
      "What is deleted",
      "What may be retained",
    ]),
  }),
]);

function normalizeVisibleText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function validatePlayPolicyPageEvidence(definition, evidence) {
  const failures = [];
  const status = Number(evidence.status);
  const contentType = String(evidence.contentType || "");
  const expectedUrl = new URL(definition.url).href;

  let finalUrl = "";
  try {
    finalUrl = new URL(evidence.finalUrl).href;
  } catch {
    failures.push(
      `returned an invalid final URL (${String(evidence.finalUrl || "missing")})`,
    );
  }

  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    failures.push(
      `returned HTTP ${Number.isFinite(status) ? status : "unknown"}`,
    );
  }
  if (!contentType.toLowerCase().includes("text/html")) {
    failures.push(
      `returned ${contentType || "an unknown content type"} instead of text/html`,
    );
  }
  if (finalUrl && finalUrl !== expectedUrl) {
    failures.push(
      `redirected to ${finalUrl} instead of staying on ${expectedUrl}`,
    );
  }

  const visibleText = normalizeVisibleText(evidence.bodyText);
  const missingText = definition.requiredText.filter(
    (marker) => !visibleText.includes(normalizeVisibleText(marker)),
  );
  if (missingText.length > 0) {
    failures.push(`is missing visible text: ${missingText.join(", ")}`);
  }

  if (failures.length > 0) {
    throw new Error(
      `${definition.label} public-page check failed: ${failures.join("; ")}`,
    );
  }

  return {
    id: definition.id,
    label: definition.label,
    url: expectedUrl,
    status,
  };
}

function readTimeoutMs() {
  const timeoutMs = Number(process.env.PLAY_POLICY_PAGE_TIMEOUT_MS || "30000");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("PLAY_POLICY_PAGE_TIMEOUT_MS must be a positive number.");
  }
  return timeoutMs;
}

export async function checkPlayPublicPolicyPages() {
  const timeoutMs = readTimeoutMs();
  const channel = process.env.PLAY_POLICY_BROWSER_CHANNEL || "chrome";
  const browser = await chromium.launch({ channel, headless: true });
  const results = [];

  console.log(
    "Checking live Google Play privacy and account-deletion pages...",
  );

  try {
    for (const definition of PLAY_PUBLIC_POLICY_PAGES) {
      const page = await browser.newPage();
      try {
        const response = await page.goto(definition.url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        if (!response) {
          throw new Error(
            `${definition.label} did not return a document response.`,
          );
        }

        await page
          .locator("body")
          .waitFor({ state: "visible", timeout: timeoutMs });
        await page.waitForFunction(
          (marker) =>
            document.body?.innerText
              .toLocaleLowerCase("en-US")
              .includes(marker),
          definition.requiredText[0].toLocaleLowerCase("en-US"),
          { timeout: timeoutMs },
        );

        const result = validatePlayPolicyPageEvidence(definition, {
          status: response.status(),
          contentType: response.headers()["content-type"],
          finalUrl: page.url(),
          bodyText: await page.locator("body").innerText(),
        });
        results.push(result);
        console.log(`✓ ${result.label}: ${result.status} ${result.url}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith(`${definition.label} `)) {
          throw error;
        }
        throw new Error(
          `${definition.label} public-page check failed: ${message}`,
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    "Google Play public policy pages are reachable and visibly complete.",
  );
  return results;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  checkPlayPublicPolicyPages().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
