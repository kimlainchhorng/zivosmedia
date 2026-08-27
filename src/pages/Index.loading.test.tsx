import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHomeLoadingState } from "./Index";

describe("mobile Home launch fallback", () => {
  it("keeps slow Home launches visible and accessible", () => {
    render(<AppHomeLoadingState />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveClass("min-h-[100dvh]", "bg-background");
    expect(screen.getByText("ZIVO")).toBeVisible();
    expect(screen.getByText("Opening your home…")).toBeVisible();

    const spinner = status.querySelector(".animate-spin");
    expect(spinner).toHaveClass("motion-reduce:animate-none");
    expect(spinner?.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the same visible fallback for signed-in and signed-out Home", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/pages/Index.tsx"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(source).not.toContain(
      'fallback={<div className="min-h-screen bg-background" />}',
    );
    expect(source.match(/fallback={<AppHomeLoadingState \/>}/g)).toHaveLength(
      2,
    );
  });
});
