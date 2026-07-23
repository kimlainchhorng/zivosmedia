import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = () =>
  readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8").replace(/\r\n/g, "\n");

describe("desktop navigation provider placement", () => {
  it("keeps the desktop navigation inside CurrencyProvider", () => {
    const app = appSource();
    const currencyProviderStart = app.indexOf("<CurrencyProvider>");
    const desktopNav = app.lastIndexOf("<DesktopNavBootstrap />");
    const currencyProviderEnd = app.indexOf("</CurrencyProvider>", currencyProviderStart);

    expect(currencyProviderStart).toBeGreaterThan(-1);
    expect(desktopNav).toBeGreaterThan(currencyProviderStart);
    expect(currencyProviderEnd).toBeGreaterThan(desktopNav);
  });
});
