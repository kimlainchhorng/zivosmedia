import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import LiveRatesGrid from "./LiveRatesGrid";

describe("LiveRatesGrid", () => {
  it("shows an accessible retry state for unavailable live rates instead of the ordinary empty state", () => {
    const onRetry = vi.fn();

    render(
      <MemoryRouter>
        <LiveRatesGrid
          properties={[]}
          isLoading={false}
          error="Live hotel rates are temporarily unavailable. Please try again."
          onRetry={onRetry}
          citySlug="phnom-penh"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/live hotel rates are unavailable/i);
    expect(screen.queryByText(/search for hotels to see real-time rates/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps the normal empty state for a confirmed empty response", () => {
    render(
      <MemoryRouter>
        <LiveRatesGrid properties={[]} isLoading={false} citySlug="phnom-penh" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/search for hotels to see real-time rates/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
