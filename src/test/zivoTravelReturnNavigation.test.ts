import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const returnBarSource = readSource(
  "src/components/cross-app/CrossAppReturnBar.tsx",
);
const travelHomeSource = readSource("src/pages/ZivoTravelHome.tsx");

describe("Zivo Travel return navigation", () => {
  it("surfaces an explicit parent-app return in the sticky Travel header", () => {
    expect(travelHomeSource).toContain(
      '<CrossAppReturnBar adminHref="#travel-ops" compact />',
    );
    expect(returnBarSource).toContain('aria-label="Return to Zivosmedia home"');
    expect(returnBarSource).toContain('compact ? "Zivosmedia"');
  });

  it("keeps Travel Home distinct from the parent-app return", () => {
    expect(travelHomeSource).toContain('aria-label="Zivo Travel home"');
    expect(travelHomeSource).toContain('<Link to="/"');
  });

  it("uses a full local preview exit and preserves production SSO", () => {
    expect(returnBarSource).toContain("getZivoMediaHomeHref");
    expect(returnBarSource).toContain("href={mediaHomeHref}");
    expect(returnBarSource).toContain("if (isLocalPreviewReturn) return;");
    expect(returnBarSource).toContain("event.preventDefault()");
    expect(returnBarSource).toContain(
      "void goCrossDomain(ZIVO_MEDIA_ORIGIN, returnPath)",
    );
  });
});
