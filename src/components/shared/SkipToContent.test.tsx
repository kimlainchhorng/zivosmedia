import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkipToContent } from "./SkipToContent";

describe("SkipToContent", () => {
  it("targets the shared main landmark above full-screen app layers", () => {
    render(<SkipToContent />);

    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link.className).toContain("focus:z-[2147483647]");
    expect(link.style.zIndex).toBe("2147483647");
  });
});
