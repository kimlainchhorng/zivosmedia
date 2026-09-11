import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectionDeferred } from "@/lib/connectionDeferred";
import BackgroundToolsRecoveryNotice from "./BackgroundToolsRecoveryNotice";

const language = vi.hoisted(() => ({ locale: "en" }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => language }));
function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  act(() => window.dispatchEvent(new Event(online ? "online" : "offline")));
}
const failure = () =>
  new TypeError(
    "Failed to fetch dynamically imported module: /assets/tools.js",
  );
beforeEach(() => {
  language.locale = "en";
  connection(true);
});
afterEach(() => {
  cleanup();
  connection(true);
});

describe("background tools recovery notice", () => {
  it("aggregates failures and clears only when all failed tools recover", async () => {
    const loadFirst = vi
      .fn()
      .mockRejectedValueOnce(failure())
      .mockResolvedValue({ default: () => <p>First ready</p> });
    const loadSecond = vi
      .fn()
      .mockRejectedValueOnce(failure())
      .mockRejectedValueOnce(failure())
      .mockResolvedValue({ default: () => <p>Second ready</p> });
    const First = connectionDeferred(loadFirst);
    const Second = connectionDeferred(loadSecond);
    render(
      <>
        <h1>Current page</h1>
        <First />
        <Second />
        <BackgroundToolsRecoveryNotice />
      </>,
    );
    expect(
      await screen.findByText("Some app tools couldn't load"),
    ).toBeInTheDocument();
    await waitFor(() => expect(loadSecond).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole("button", { name: "Reload ZIVO" })).toHaveLength(
      1,
    );
    connection(false);
    expect(screen.getByRole("button", { name: "Reload ZIVO" })).toBeDisabled();
    connection(true);
    expect(await screen.findByText("First ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload ZIVO" })).toBeEnabled();
    expect(
      screen.getByRole("heading", { name: "Current page" }),
    ).toBeInTheDocument();
    connection(false);
    connection(true);
    expect(await screen.findByText("Second ready")).toBeInTheDocument();
    expect(
      screen.queryByText("Some app tools couldn't load"),
    ).not.toBeInTheDocument();
  });

  it("removes a failure when its route unmounts and localizes recovery in Khmer", async () => {
    language.locale = "km";
    const Tools = connectionDeferred(async () => {
      throw failure();
    });
    const { rerender } = render(
      <>
        <Tools />
        <BackgroundToolsRecoveryNotice />
      </>,
    );
    expect(
      await screen.findByText("មុខងារខ្លះមិនអាចផ្ទុកបាន"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ផ្ទុក ZIVO ឡើងវិញ" }),
    ).toBeInTheDocument();
    rerender(<BackgroundToolsRecoveryNotice />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
