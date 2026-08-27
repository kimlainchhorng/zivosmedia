import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(
  resolve(process.cwd(), "src/App.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Chat outbox provider boundary", () => {
  it("mounts the deferred outbox exactly once inside AuthProvider", () => {
    expect(appSource.match(/<OutboxFlusher \/>/g) ?? []).toHaveLength(1);
    expect(
      appSource.match(/<DeferredPassiveChatOverlays \/>/g) ?? [],
    ).toHaveLength(1);

    const authStart = appSource.indexOf("<AuthProvider>");
    const authEnd = appSource.indexOf("</AuthProvider>", authStart);
    const deferredMount = appSource.indexOf("<DeferredPassiveChatOverlays />");

    expect(authStart).toBeGreaterThan(-1);
    expect(authEnd).toBeGreaterThan(authStart);
    expect(deferredMount).toBeGreaterThan(authStart);
    expect(deferredMount).toBeLessThan(authEnd);
  });

  it("keeps the existing startup delay and host exclusions", () => {
    const overlayStart = appSource.indexOf(
      "function DeferredPassiveChatOverlays()",
    );
    const overlayEnd = appSource.indexOf(
      "function DeferredRoutePrefetcher()",
      overlayStart,
    );
    const overlaySource = appSource.slice(overlayStart, overlayEnd);

    expect(overlaySource).toContain("useAfterFirstPaint(3200)");
    expect(overlaySource).toContain(
      "if (isCurrentZivoSoftwareHost()) return null;",
    );
    expect(overlaySource).toContain(
      "if (isCurrentZivoTravelHost()) return null;",
    );
    expect(overlaySource).toContain(
      "if (isCurrentZivoDriverHost()) return null;",
    );
    expect(overlaySource).toContain("<OutboxFlusher />");
  });
});
