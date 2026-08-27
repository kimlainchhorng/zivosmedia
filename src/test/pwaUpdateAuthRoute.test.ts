import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("PWA update coverage on authentication routes", () => {
  it("mounts one update controller directly inside the application router", () => {
    const app = read("src/App.tsx");
    const mount = "<Suspense fallback={null}><PWAUpdatePrompt /></Suspense>";
    const routerStart = app.indexOf("<BrowserRouter");
    const updateMount = app.indexOf(mount);
    const authProvider = app.indexOf("<AuthProvider>");

    expect(app.match(/<PWAUpdatePrompt \/>/g)).toHaveLength(1);
    expect(routerStart).toBeGreaterThan(-1);
    expect(updateMount).toBeGreaterThan(routerStart);
    expect(updateMount).toBeLessThan(authProvider);
  });

  it("keeps the auth-route UI hidden without skipping update registration", () => {
    const prompt = read("src/components/shared/PWAUpdatePrompt.tsx");
    const hookCall = prompt.indexOf("usePWAUpdate()");
    const authRouteReturn = prompt.indexOf("if (!needRefresh || isNative || onAuthRoute) return null;");

    expect(hookCall).toBeGreaterThan(-1);
    expect(authRouteReturn).toBeGreaterThan(hookCall);
  });

  it("stops before web service-worker registration in Capacitor native shells", () => {
    const hook = read("src/hooks/usePWAUpdate.ts");
    const nativeGuard = hook.indexOf("if (Capacitor.isNativePlatform()) return;");
    const registrationImport = hook.indexOf("await import('virtual:pwa-register')");

    expect(nativeGuard).toBeGreaterThan(-1);
    expect(registrationImport).toBeGreaterThan(nativeGuard);
  });
});
