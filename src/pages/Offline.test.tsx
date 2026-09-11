import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Offline from "./Offline";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), locale: "en" }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ locale: mocks.locale }),
}));

function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
}

describe("Offline recovery", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.locale = "en";
    connection(false);
  });
  afterEach(() => {
    cleanup();
    connection(true);
  });

  it("keeps an offline retry on the page and explains how to recover", () => {
    render(<Offline />);
    expect(
      screen.getByRole("heading", { name: "You're offline" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    expect(
      screen.getByText(
        "Your device is still offline. Reconnect, then try again.",
      ),
    ).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("reacts to reconnection without claiming service availability or navigating automatically", () => {
    render(<Offline />);
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    connection(true);
    expect(
      screen.getByRole("heading", { name: "Ready to try again" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Your device is still offline. Reconnect, then try again.",
      ),
    ).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Return to ZIVO" }));
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/", {
      replace: true,
    });
  });

  it("shows the correct initial connected state and updates on disconnection", () => {
    connection(true);
    render(<Offline />);
    expect(
      screen.getByRole("button", { name: "Return to ZIVO" }),
    ).toBeInTheDocument();
    connection(false);
    expect(
      screen.getByRole("button", { name: "Check connection" }),
    ).toBeInTheDocument();
  });

  it("checks the current device signal before a connection event is delivered", () => {
    render(<Offline />);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/", {
      replace: true,
    });
  });

  it("lets another service replace the fallback without a reload loop", () => {
    render(<Offline />);
    fireEvent.click(screen.getByRole("button", { name: "Hotels" }));
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("/hotels", {
      replace: true,
    });
  });

  it("renders Khmer recovery and connection changes", () => {
    mocks.locale = "km";
    render(<Offline />);
    expect(
      screen.getByRole("heading", { name: "អ្នកកំពុងនៅក្រៅបណ្ដាញ" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ពិនិត្យការតភ្ជាប់" }));
    expect(
      screen.getByText(
        "ឧបករណ៍របស់អ្នកនៅតែក្រៅបណ្ដាញ។ សូមភ្ជាប់អ៊ីនធឺណិត រួចសាកល្បងម្តងទៀត។",
      ),
    ).toBeInTheDocument();
    connection(true);
    expect(
      screen.getByRole("button", { name: "ត្រឡប់ទៅ ZIVO" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Check connection")).not.toBeInTheDocument();
  });
});
