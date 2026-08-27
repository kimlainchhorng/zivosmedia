import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pathFromNativeOpenUrl } from "@/lib/nativeDeepLinks";

const appSource = readFileSync("src/App.tsx", "utf8");
const handlerStart = appSource.indexOf("function NativeDeepLinkHandler()");
const handlerEnd = appSource.indexOf(
  "function isCurrentZivoSoftwareHost",
  handlerStart,
);
const handlerSource = appSource.slice(handlerStart, handlerEnd);

describe("native deep-link handler stability", () => {
  it("preserves the complete hotel checkout route from the native URL", () => {
    const nativeUrl =
      "com.hizovo.app:///hotel/51518d9b-8621-4727-8a7e-a94765102f6b/book?room=44343963-7d73-4779-a5cb-cdf9a921ad43&ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR";

    expect(pathFromNativeOpenUrl(nativeUrl)).toBe(
      "/hotel/51518d9b-8621-4727-8a7e-a94765102f6b/book?room=44343963-7d73-4779-a5cb-cdf9a921ad43&ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR",
    );
  });

  it("registers Capacitor launch and open-url listeners independently of route changes", () => {
    const firstEffect = handlerSource.indexOf("  useEffect(() => {");
    const subscriptionEffect = handlerSource.slice(
      handlerSource.indexOf("  useEffect(() => {", firstEffect + 1),
    );

    expect(handlerSource).toContain("const navigateRef = useRef(navigate);");
    expect(handlerSource).toContain("navigateRef.current = navigate;");
    expect(subscriptionEffect).toContain("CapacitorApp.getLaunchUrl()");
    expect(subscriptionEffect).toContain(
      'CapacitorApp.addListener("appUrlOpen"',
    );
    expect(subscriptionEffect).toContain(
      "if (path) navigateRef.current(path, { replace });",
    );
    expect(subscriptionEffect).toContain("openUrl(launchUrl?.url, true);");
    expect(subscriptionEffect).toContain("openUrl(event.url);");
    expect(subscriptionEffect).toMatch(/\}, \[\]\);\s+return null;/);
  });
});
