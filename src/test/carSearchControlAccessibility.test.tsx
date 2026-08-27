import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const phnomPenh = {
  value: "KTI",
  label: "Phnom Penh (KTI)",
  secondary: "Phnom Penh International",
  country: "Cambodia",
  type: "airport" as const,
};

const searchAirports = vi.fn(() => [phnomPenh]);
const getPopular = vi.fn(() => [phnomPenh]);
const getByCode = vi.fn((code: string) =>
  code === phnomPenh.value ? phnomPenh : undefined,
);

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/search/hooks/useLocationSearch", () => ({
  useAirportSearch: () => ({
    search: searchAirports,
    getPopular,
    getByCode,
    allOptions: [phnomPenh],
  }),
}));

import CarSearchFormPro from "@/components/search/CarSearchFormPro";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderForm = () =>
  render(
    <MemoryRouter>
      <CarSearchFormPro
        initialPickup="KTI"
        initialPickupDate={new Date(2026, 8, 2)}
        initialDropoffDate={new Date(2026, 8, 5)}
        navigateOnSearch={false}
      />
    </MemoryRouter>,
  );

describe("car search control accessibility", () => {
  it("names every prefilled search control", async () => {
    renderForm();

    expect(
      await screen.findByRole("combobox", { name: "Pickup Location" }),
    ).toHaveValue("Phnom Penh (KTI)");
    expect(
      screen.getByRole("button", {
        name: "Pickup date, September 2, 2026",
      }),
    ).toHaveAttribute("aria-required", "true");
    expect(
      screen.getByRole("button", {
        name: "Return date, September 5, 2026",
      }),
    ).toHaveAttribute("aria-required", "true");
    expect(
      screen.getByRole("combobox", { name: "Pickup time" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Return time" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Driver age" }),
    ).toHaveAccessibleDescription("Young driver fees may apply for ages 21-24");
  });

  it("gives the clear action a name, reliable target, and returns focus", async () => {
    renderForm();

    const input = await screen.findByRole("combobox", {
      name: "Pickup Location",
    });
    const clearButton = screen.getByRole("button", {
      name: "Clear Pickup Location",
    });

    expect(clearButton).toHaveClass("h-11", "w-11");
    fireEvent.click(clearButton);

    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue("");
  });
});
