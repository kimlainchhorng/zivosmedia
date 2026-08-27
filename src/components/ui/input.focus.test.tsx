import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "@/components/ui/input";

describe("shared Input keyboard focus", () => {
  it("uses the same visible ring contract as the other shared controls", () => {
    render(<Input aria-label="Destination" />);

    const input = screen.getByRole("textbox", { name: "Destination" });
    expect(input).toHaveClass(
      "focus-visible:outline-none",
      "focus-visible:ring-2",
      "focus-visible:ring-ring",
      "focus-visible:ring-offset-2",
      "focus-visible:border-foreground",
    );
    expect(input).not.toHaveClass("focus-visible:ring-0");
  });
});
