import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalAutoTranslator from "@/components/common/GlobalAutoTranslator";
import Offline from "./Offline";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ locale: "km", currentLanguage: "km" }),
}));

function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  act(() => window.dispatchEvent(new Event(online ? "online" : "offline")));
}

// Drive the translator's actual initial/debounced timers and promise work.
// No network or elapsed wall-clock sleep is needed.
async function flushTranslation() {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(300);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  mocks.navigate.mockReset();
  connection(false);
  // JSDOM has no layout. Expose rendered nodes to the real translator's
  // visibility filter so the regression cannot pass by scanning zero nodes.
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 20),
  ] as unknown as DOMRectList);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe("translate.googleapis.com");
      expect(url.searchParams.get("tl")).toBe("km");
      // Already-Khmer text can legitimately translate to itself. Returning
      // the source reproduces the stale-original restoration without relying
      // on any particular machine translation result.
      const source = url.searchParams.get("q");
      return { ok: true, json: async () => [[[source]]] };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  connection(true);
});

describe("localized Offline status with the global translator", () => {
  it("keeps the current Khmer connection state after cached translation and mutation-observer work", async () => {
    render(
      <>
        <Offline />
        <p data-testid="translation-probe">Translator regression probe</p>
        <GlobalAutoTranslator />
      </>,
    );
    await flushTranslation();
    expect(fetch).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "អ្នកកំពុងនៅក្រៅបណ្ដាញ" }),
    ).toBeInTheDocument();

    connection(true);
    const probe = screen.getByTestId("translation-probe");
    act(() => {
      probe.firstChild!.textContent = "Changed translation probe";
    });
    await flushTranslation();
    // Positive control: the real observer scanned the changed DOM and
    // restored its cached original on this deliberately unprotected sibling.
    expect(probe).toHaveTextContent("Translator regression probe");
    expect(
      screen.getByRole("heading", { name: "អាចសាកល្បងភ្ជាប់ឡើងវិញ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ត្រឡប់ទៅ ZIVO" }),
    ).toBeInTheDocument();

    connection(false);
    fireEvent.click(screen.getByRole("button", { name: "ពិនិត្យការតភ្ជាប់" }));
    await flushTranslation();
    expect(
      screen.getByRole("heading", { name: "អ្នកកំពុងនៅក្រៅបណ្ដាញ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "ឧបករណ៍របស់អ្នកនៅតែក្រៅបណ្ដាញ។ សូមភ្ជាប់អ៊ីនធឺណិត រួចសាកល្បងម្តងទៀត។",
      ),
    ).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
