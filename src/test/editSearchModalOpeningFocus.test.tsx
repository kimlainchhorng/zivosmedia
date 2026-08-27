import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => testState.isMobile,
}));

import { EditSearchModal } from "@/components/results/EditSearchModal";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  testState.isMobile = false;
});

function renderEditor(onFieldFocus = vi.fn()) {
  const onOpenChange = vi.fn();

  render(
    <EditSearchModal service="cars" open onOpenChange={onOpenChange}>
      <label htmlFor="test-pickup">Pickup Location</label>
      <input
        id="test-pickup"
        aria-label="Pickup Location"
        onFocus={onFieldFocus}
      />
    </EditSearchModal>,
  );

  return { onFieldFocus, onOpenChange };
}

describe("EditSearchModal opening focus", () => {
  it("focuses the desktop editor heading without opening the first field", async () => {
    const { onFieldFocus } = renderEditor();

    const heading = screen.getByRole("heading", { name: "Edit Car Search" });
    await waitFor(() => expect(heading).toHaveFocus());

    expect(onFieldFocus).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Edit Car Search");
  });

  it("uses the same quiet opening focus in the mobile sheet", async () => {
    testState.isMobile = true;
    const { onFieldFocus } = renderEditor();

    const heading = screen.getByRole("heading", { name: "Edit Car Search" });
    await waitFor(() => expect(heading).toHaveFocus());

    expect(onFieldFocus).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Edit Car Search");
  });

  it("keeps intentional field focus and the existing close control working", async () => {
    const { onFieldFocus, onOpenChange } = renderEditor();
    const field = screen.getByRole("textbox", { name: "Pickup Location" });

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Edit Car Search" }),
      ).toHaveFocus(),
    );

    field.focus();
    expect(field).toHaveFocus();
    expect(onFieldFocus).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
