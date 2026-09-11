import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const language = vi.hoisted(() => ({ current: "en" }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ currentLanguage: language.current }) }));
import ZivoBusinessRestaurantCards from "./ZivoBusinessRestaurantCards";

const restaurant = { id: "phkachan", kind: "restaurant", name_en: "Phkachan", name_km: "ផ្កាចន្ទន៍", menu_url: "https://zivobusiness.com/order/restaurant/phkachan?view=menu", is_open: false, prep_minutes: 25 };
const clients: QueryClient[] = [];
function catalog(merchants: unknown[] = [restaurant], products: unknown[] = []) {
  return new Response(JSON.stringify({ merchants, products }), { status: 200 });
}
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><ZivoBusinessRestaurantCards /></QueryClientProvider>);
}
beforeEach(() => {
  language.current = "en";
  vi.stubEnv("VITE_ZIVO_BUSINESS_CATALOG_URL", "https://catalog.example.test/restaurants");
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("customer Home Business restaurant menus", () => {
  it.each(["en", "km"])("renders menu-only restaurants honestly in %s", async (locale) => {
    language.current = locale;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalog()));
    show();
    const cta = locale === "km" ? "មើលម៉ឺនុយ" : "View menu";
    const link = await screen.findByRole("link", { name: new RegExp(cta) });
    const href = new URL(link.getAttribute("href")!);
    expect(href.searchParams.get("view")).toBe("menu");
    expect(href.searchParams.get("lang")).toBe(locale);
    expect(href.searchParams.get("source")).toBe("zivos");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(link).getByRole("heading")).toHaveTextContent(locale === "km" ? "ផ្កាចន្ទន៍" : "Phkachan");
    expect(screen.queryByText(/preparation|រៀបចំប្រហែល|Open menu & order|បើកម៉ឺនុយ និងកុម្ម៉ង់/)).not.toBeInTheDocument();
  });

  it("offers ordering only for an eligible open restaurant", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(catalog([{ ...restaurant, is_open: true, order_url: "https://zivobusiness.com/order/restaurant/phkachan" }], [{ id: "dish", merchant_id: "phkachan", category: "restaurant" }])));
    show();
    const link = await screen.findByRole("link", { name: /Open menu & order/ });
    expect(new URL(link.getAttribute("href")!).searchParams.has("view")).toBe(false);
    expect(screen.getByText("About 25 min preparation")).toBeInTheDocument();
  });

  it("shows missing configuration without fetching or offering retry", async () => {
    vi.stubEnv("VITE_ZIVO_BUSINESS_CATALOG_URL", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    show();
    expect(await screen.findByText("Restaurant menus are not connected here yet")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["empty", "invalid"])("keeps the %s state distinct without automatic/manual retries", async (state) => {
    const fetcher = vi.fn().mockResolvedValue(state === "empty" ? catalog([]) : new Response("invalid", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    show();
    expect(await screen.findByText(state === "empty" ? "No restaurant menus have been shared yet" : "Restaurant menus could not be loaded")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("retries a request failure once, then gives a working retry action", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(catalog());
    vi.stubGlobal("fetch", fetcher);
    show();
    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Restaurant menus could not be loaded");
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByRole("link", { name: /View menu/ })).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["en", "km"])("prioritizes a failed refresh over cached empty results in %s", async (locale) => {
    language.current = locale;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(catalog([]))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    show();
    const emptyMessage = locale === "km" ? "មិនទាន់មានម៉ឺនុយដែលបានចែករំលែកទេ" : "No restaurant menus have been shared yet";
    expect(await screen.findByText(emptyMessage)).toBeInTheDocument();

    await act(async () => {
      await clients[0].invalidateQueries({ queryKey: ["zivo-business-public-restaurants"] });
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(locale === "km" ? "មិនអាចផ្ទុកម៉ឺនុយបានឥឡូវនេះ" : "Restaurant menus could not be loaded");
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: locale === "km" ? "ព្យាយាមម្តងទៀត" : "Try again" })).toBeEnabled();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("mounts the catalog on the reachable customer Home without fixture merchants", () => {
    const home = readFileSync("src/pages/app/AppHome.tsx", "utf8");
    expect(home).toContain('import("@/components/home/ZivoBusinessRestaurantCards")');
    expect(home).toContain("<ZivoBusinessRestaurantCards />");
    expect(home).not.toContain("FeaturedEatsSection");
  });
});
