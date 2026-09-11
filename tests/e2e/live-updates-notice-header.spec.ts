import { expect, test, type Page } from "@playwright/test";

/**
 * The "Live updates unavailable" notice is fixed chrome that used to render on
 * top of the header and swallow every tap aimed at it — the header menu and the
 * language button were unclickable for as long as the notice was up. These
 * tests force the notice on screen and then drive the header underneath it.
 */

/** Break the realtime transport so the circuit trips and the notice appears. */
async function breakRealtime(page: Page) {
  await page.addInitScript(() => {
    class DeadSocket extends EventTarget {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      readyState = 3;
      url: string;
      onopen: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string | URL) {
        super();
        this.url = String(url);
        setTimeout(() => {
          const error = new Event("error");
          this.onerror?.(error);
          this.dispatchEvent(error);
          const closed = new CloseEvent("close", { code: 1006, wasClean: false });
          this.onclose?.(closed);
          this.dispatchEvent(closed);
        }, 0);
      }
      send() {}
      close() {}
    }
    Object.defineProperty(window, "WebSocket", { configurable: true, writable: true, value: DeadSocket });
  });
}

const notice = (page: Page) => page.getByRole("status").filter({ hasText: /Live updates unavailable/i });

async function showNotice(page: Page) {
  await breakRealtime(page);
  await page.goto("/feed");
  await page.waitForLoadState("domcontentloaded");
  await expect(notice(page)).toBeVisible({ timeout: 30_000 });
}

/** The bottom edge of the route's top chrome, measured independently of the app. */
const chromeBottom = (page: Page) =>
  page.evaluate(() => {
    let lowest = 0;
    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      if (style.pointerEvents === "none") continue;
      const rect = element.getBoundingClientRect();
      if (rect.top > 8 || rect.height <= 0 || rect.height > 200) continue;
      if (rect.width < window.innerWidth * 0.5) continue;
      lowest = Math.max(lowest, rect.bottom);
    }
    return lowest;
  });

/**
 * The header collapses its control set by width: the hamburger is mobile-only,
 * the language button desktop-only. Drive whichever one this viewport shows.
 */
const SURFACES = [
  {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    control: (page: Page) => page.getByRole("button", { name: /^(EN|KM)$/ }).first(),
    opens: (page: Page) => page.getByRole("dialog").filter({ hasText: /select language|ជ្រើសរើសភាសា/i }),
  },
  {
    name: "mobile",
    viewport: { width: 390, height: 844 },
    control: (page: Page) => page.getByRole("button", { name: /open menu/i }).first(),
    opens: (page: Page) => page.getByRole("dialog").or(page.getByRole("menu")).first(),
  },
] as const;

for (const surface of SURFACES) {
  test.describe(`live updates notice over the ${surface.name} header`, () => {
    test.use({ viewport: surface.viewport });

    test("does not cover the header it is warning above", async ({ page }) => {
      await showNotice(page);
      const box = await notice(page).boundingBox();
      const bottom = await chromeBottom(page);
      expect(bottom).toBeGreaterThan(0);
      expect(box!.y).toBeGreaterThanOrEqual(bottom - 1);
    });

    test("lets a tap through to the header while it is on screen", async ({ page }) => {
      await showNotice(page);
      // Hit-test the notice's own centre: nothing in its subtree may claim the
      // point, or a header sitting beneath it would be unreachable.
      const claimed = await page.evaluate(() => {
        const element = document.querySelector('[role="status"]');
        if (!element) return "no-notice";
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit && element.contains(hit) ? "notice" : "through";
      });
      expect(claimed).toBe("through");

      // And the header is genuinely operable, not merely un-occluded.
      const control = surface.control(page);
      await expect(control).toBeVisible();
      await control.click({ timeout: 10_000 });
      await expect(surface.opens(page)).toBeVisible({ timeout: 10_000 });
    });

    test("keeps its own controls clickable", async ({ page }) => {
      await showNotice(page);
      const dismiss = notice(page).getByRole("button", { name: /dismiss|បិទ/i });
      await expect(dismiss).toBeVisible();
      await dismiss.click();
      await expect(notice(page)).toBeHidden();
    });
  });
}
