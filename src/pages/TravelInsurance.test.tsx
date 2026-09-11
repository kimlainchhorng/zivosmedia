import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const { platform } = vi.hoisted(() => ({ platform: vi.fn(() => "android") }));
vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: platform } }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
import TravelInsurance from "./TravelInsurance";

afterEach(() => { cleanup(); platform.mockReturnValue("android"); });

function openInsurance() {
  return render(
    <MemoryRouter initialEntries={["/travel-insurance"]}>
      <Routes>
        <Route path="/travel-insurance" element={<TravelInsurance />} />
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/help" element={<h1>Support</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Android travel insurance availability", () => {
  it("shows the unavailable state without unsupported offers or customer claims", () => {
    openInsurance();
    expect(screen.getByText("Insurance is not available in this app.")).toBeInTheDocument();
    expect(screen.queryByText("2M+")).not.toBeInTheDocument();
    expect(screen.queryByText("Compare Plans")).not.toBeInTheDocument();
    expect(screen.queryByText(/paid out in 36 hours/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Contact support" }));
    expect(screen.getByRole("heading", { name: "Support" })).toBeInTheDocument();
  });

  it("provides a working back action for a direct native link", () => {
    openInsurance();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
