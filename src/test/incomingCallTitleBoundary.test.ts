import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/chat/IncomingCallListener.tsx"),
  "utf8",
);

describe("incoming-call document-title boundary", () => {
  it("does not restore a stale startup title before a call exists", () => {
    expect(source).toContain("if (!incoming) return;");
    expect(source).not.toMatch(
      /if \(!incoming\) \{[\s\S]*?document\.title = originalTitleRef\.current;[\s\S]*?\n\s*\}/,
    );
  });

  it("captures and restores the route title only around an active call", () => {
    const effectStart = source.indexOf(
      'if (typeof document === "undefined") return;',
    );
    const effectEnd = source.indexOf(
      "}, [closeBrowserCallNotification, incoming]);",
      effectStart,
    );
    const effect = source.slice(effectStart, effectEnd);

    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
    expect(
      effect.indexOf("originalTitleRef.current = document.title;"),
    ).toBeLessThan(effect.indexOf("const applyTitle = () =>"));
    expect(
      effect.match(/document\.title = originalTitleRef\.current;/g),
    ).toHaveLength(1);
    expect(effect).toContain("clearInterval(titleFlashTimerRef.current);");
  });
});
