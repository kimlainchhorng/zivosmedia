import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import LocationAutocomplete, {
  type LocationOption,
} from "@/components/search/LocationAutocomplete";

const phnomPenh: LocationOption = {
  value: "KTI",
  label: "Phnom Penh (KTI)",
  secondary: "Phnom Penh International",
  country: "Cambodia",
  type: "airport",
};

const newYork: LocationOption = {
  value: "JFK",
  label: "New York (JFK)",
  secondary: "John F. Kennedy International",
  country: "USA",
  type: "airport",
};

afterEach(() => {
  cleanup();
});

describe("LocationAutocomplete selected-value focus", () => {
  it("keeps a settled selected location quiet on focus", () => {
    const searchFn = vi.fn(() => [newYork]);
    const popularFn = vi.fn(() => [newYork]);

    render(
      <LocationAutocomplete
        value={phnomPenh.value}
        displayValue={phnomPenh.label}
        onChange={vi.fn()}
        onDisplayChange={vi.fn()}
        options={[phnomPenh, newYork]}
        searchFn={searchFn}
        popularFn={popularFn}
        placeholder="Airport or city"
        label="Pickup Location"
      />,
    );

    screen.getByRole("combobox", { name: "Pickup Location" }).focus();

    expect(searchFn).not.toHaveBeenCalled();
    expect(popularFn).not.toHaveBeenCalled();
    expect(screen.queryByText("No results found")).not.toBeInTheDocument();
    expect(screen.queryByText("Results")).not.toBeInTheDocument();
    expect(screen.queryByText("Popular")).not.toBeInTheDocument();
  });

  it("still opens matching choices when the user starts typing", () => {
    const onChange = vi.fn();
    const onDisplayChange = vi.fn();
    const searchFn = vi.fn(() => [newYork]);

    render(
      <LocationAutocomplete
        value={phnomPenh.value}
        displayValue={phnomPenh.label}
        onChange={onChange}
        onDisplayChange={onDisplayChange}
        options={[phnomPenh, newYork]}
        searchFn={searchFn}
        popularFn={() => [newYork]}
        placeholder="Airport or city"
        label="Pickup Location"
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Pickup Location" }),
      {
        target: { value: "New York" },
      },
    );

    expect(searchFn).toHaveBeenCalledWith("New York", 8);
    expect(onDisplayChange).toHaveBeenCalledWith("New York");
    expect(onChange).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("option", { name: /New York \(JFK\)/ }),
    ).toBeInTheDocument();
  });
});
