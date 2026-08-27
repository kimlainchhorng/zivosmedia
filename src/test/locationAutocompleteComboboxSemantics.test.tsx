import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import LocationAutocomplete, {
  type LocationOption,
} from "@/components/search/LocationAutocomplete";

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

describe("LocationAutocomplete combobox semantics", () => {
  it("connects keyboard navigation to the active suggestion", () => {
    const onChange = vi.fn();

    render(
      <LocationAutocomplete
        value=""
        onChange={onChange}
        options={[newYork]}
        searchFn={() => [newYork]}
        placeholder="Airport or city"
        label="Pickup Location"
      />,
    );

    const input = screen.getByRole("combobox", { name: "Pickup Location" });

    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");

    fireEvent.change(input, { target: { value: "New York" } });

    const listbox = screen.getByRole("listbox", {
      name: "Pickup Location suggestions",
    });
    const option = screen.getByRole("option", { name: /New York \(JFK\)/ });

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(option).toHaveAttribute("aria-selected", "false");

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(input).toHaveAttribute("aria-activedescendant", option.id);
    expect(option).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(newYork);
    expect(input).toHaveValue("New York (JFK)");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("announces an empty search while keeping the popup relationship", () => {
    render(
      <LocationAutocomplete
        value=""
        onChange={vi.fn()}
        options={[]}
        searchFn={() => []}
        placeholder="Airport or city"
        label="Pickup Location"
      />,
    );

    const input = screen.getByRole("combobox", { name: "Pickup Location" });
    fireEvent.change(input, { target: { value: "zz" } });

    const listbox = screen.getByRole("listbox", {
      name: "Pickup Location suggestions",
    });

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(screen.getByRole("status")).toHaveTextContent("No results found");
  });
});
